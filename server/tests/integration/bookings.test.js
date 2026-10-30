import request from 'supertest';
import mongoose from 'mongoose';
import { setupTestDB, teardownTestDB } from '../helpers/db.js';
import app from '../../src/app.js';
import { Resource } from '../../src/models/Resource.js';
import { Booking } from '../../src/models/Booking.js';
import { expandSlots } from '../../src/utils/slots.js';

// ── helpers ───────────────────────────────────────────────────────────────────

const plus = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

// A UTC time on a 30-minute boundary, N days from today (negative = past).
function slotAt(daysFromNow, hour = 10, minute = 0) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + daysFromNow);
    d.setUTCHours(hour, minute, 0, 0);
    return d;
}

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

// The JWT "sub" claim is the user id, so we can read it without extra calls.
function userIdFromToken(token) {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub;
}

async function loginDemo(role) {
    const res = await request(app).post('/api/auth/demo').send({ role });
    expect(res.status).toBe(200);
    const { token } = res.body.data;
    return { token, id: userIdFromToken(token) };
}

const postBooking = (token, body) =>
    request(app).post('/api/bookings').set(authHeader(token)).send(body);

async function insertBooking({ resource, userId, start, end, status = 'confirmed' }) {
    return Booking.create({
        resource: resource._id,
        user: userId,
        start,
        end,
        slots: status === 'confirmed' ? expandSlots(start, end) : [],
        status,
    });
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('Bookings API', () => {
    let user;
    let admin;
    let resource;

    const body = (start, end, resourceId = resource._id) => ({
        resourceId: String(resourceId),
        start: start.toISOString(),
        end: end.toISOString(),
    });

    beforeAll(async () => {
        await setupTestDB();
        // The unique partial index is what prevents double-booking: make sure it exists.
        await Booking.syncIndexes();
        user = await loginDemo('user');
        admin = await loginDemo('admin');
    });

    beforeEach(async () => {
        await Booking.deleteMany({});
        await Resource.deleteMany({});
        resource = await Resource.create({
            name: 'Orion Room',
            type: 'room',
            capacity: 8,
            location: 'Floor 2',
            amenities: ['WiFi'],
        });
    });

    afterAll(async () => {
        await teardownTestDB();
    });

    // ── POST /api/bookings ─────────────────────────────────────────────────────

    describe('POST /api/bookings', () => {
        it('rejects requests without a token', async () => {
            const res = await request(app).post('/api/bookings').send({});
            expect(res.status).toBe(401);
            expect(res.body.error.code).toBe('UNAUTHENTICATED');
        });

        it('creates a booking (201) and stores one slot per 30 minutes', async () => {
            const start = slotAt(2, 10);
            const res = await postBooking(user.token, body(start, plus(start, 90)));

            expect(res.status).toBe(201);
            expect(res.body.data.status).toBe('confirmed');
            expect(String(res.body.data.resource)).toBe(String(resource._id));
            expect(String(res.body.data.user)).toBe(user.id);
            expect(res.body.data.slots).toBeUndefined();

            const stored = await Booking.findById(res.body.data._id);
            expect(stored.slots).toHaveLength(3);
        });

        it('accepts a booking of exactly 4 hours', async () => {
            const start = slotAt(2, 10);
            const res = await postBooking(user.token, body(start, plus(start, 240)));
            expect(res.status).toBe(201);
        });

        it('returns 409 SLOT_TAKEN for an exact duplicate, including the conflicting window', async () => {
            const start = slotAt(2, 10);
            const end = plus(start, 60);

            const first = await postBooking(user.token, body(start, end));
            expect(first.status).toBe(201);

            const dup = await postBooking(admin.token, body(start, end));
            expect(dup.status).toBe(409);
            expect(dup.body.error.code).toBe('SLOT_TAKEN');
            expect(new Date(dup.body.error.details.conflict.start).toISOString()).toBe(start.toISOString());
            expect(new Date(dup.body.error.details.conflict.end).toISOString()).toBe(end.toISOString());
        });

        it.each([
            ['starts before and runs into it', -30, 60],
            ['starts inside it', 30, 60],
            ['sits fully inside it', 0, 30],
            ['fully covers it', -60, 180],
        ])('rejects a window that %s with 409 SLOT_TAKEN', async (_label, offsetMin, lengthMin) => {
            const start = slotAt(2, 10);
            const first = await postBooking(user.token, body(start, plus(start, 60)));
            expect(first.status).toBe(201);

            const res = await postBooking(
                admin.token,
                body(plus(start, offsetMin), plus(start, offsetMin + lengthMin))
            );
            expect(res.status).toBe(409);
            expect(res.body.error.code).toBe('SLOT_TAKEN');
        });

        it('allows adjacent bookings (end of one equals start of the next)', async () => {
            const start = slotAt(2, 10);
            const a = await postBooking(user.token, body(start, plus(start, 60)));
            const b = await postBooking(user.token, body(plus(start, 60), plus(start, 120)));
            const c = await postBooking(admin.token, body(plus(start, -60), start));

            expect(a.status).toBe(201);
            expect(b.status).toBe(201);
            expect(c.status).toBe(201);
        });

        it('allows the same time on a different resource', async () => {
            const other = await Resource.create({
                name: 'Nova Room',
                type: 'room',
                capacity: 4,
                location: 'Floor 3',
            });
            const start = slotAt(2, 10);

            const a = await postBooking(user.token, body(start, plus(start, 60)));
            const b = await postBooking(user.token, body(start, plus(start, 60), other._id));

            expect(a.status).toBe(201);
            expect(b.status).toBe(201);
        });

        it.each([
            ['end before start', (s) => [s, plus(s, -60)]],
            ['end equal to start', (s) => [s, s]],
            ['a start that is not on a 30-minute boundary', (s) => [plus(s, 15), plus(s, 75)]],
            ['an end that is not on a 30-minute boundary', (s) => [s, plus(s, 45)]],
            ['a booking longer than 4 hours', (s) => [s, plus(s, 270)]],
        ])('rejects %s with 400 VALIDATION_ERROR', async (_label, build) => {
            const [start, end] = build(slotAt(2, 10));
            const res = await postBooking(user.token, body(start, end));
            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('rejects a booking that starts in the past', async () => {
            const start = slotAt(-1, 10);
            const res = await postBooking(user.token, body(start, plus(start, 60)));
            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('rejects a booking more than 30 days ahead', async () => {
            const start = slotAt(31, 10);
            const res = await postBooking(user.token, body(start, plus(start, 60)));
            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('rejects missing fields, unknown fields and a malformed resourceId', async () => {
            const start = slotAt(2, 10);
            const valid = body(start, plus(start, 60));

            const missing = await postBooking(user.token, { resourceId: valid.resourceId });
            const extra = await postBooking(user.token, { ...valid, note: 'hello' });
            const badId = await postBooking(user.token, { ...valid, resourceId: 'not-an-id' });

            for (const res of [missing, extra, badId]) {
                expect(res.status).toBe(400);
                expect(res.body.error.code).toBe('VALIDATION_ERROR');
            }
        });

        it('returns 409 INVALID_STATE for a disabled resource', async () => {
            await Resource.updateOne({ _id: resource._id }, { isActive: false });
            const start = slotAt(2, 10);
            const res = await postBooking(user.token, body(start, plus(start, 60)));
            expect(res.status).toBe(409);
            expect(res.body.error.code).toBe('INVALID_STATE');
        });

        it('returns 404 for an unknown resource', async () => {
            const start = slotAt(2, 10);
            const res = await postBooking(
                user.token,
                body(start, plus(start, 60), new mongoose.Types.ObjectId())
            );
            expect(res.status).toBe(404);
            expect(res.body.error.code).toBe('NOT_FOUND');
        });
    });

    // ── GET /api/bookings/me ───────────────────────────────────────────────────

    describe('GET /api/bookings/me', () => {
        it('separates upcoming and past bookings and never exposes slots', async () => {
            const past = slotAt(-3, 10);
            await insertBooking({ resource, userId: user.id, start: past, end: plus(past, 60) });

            const future = slotAt(3, 10);
            const created = await postBooking(user.token, body(future, plus(future, 60)));
            expect(created.status).toBe(201);

            const upcoming = await request(app).get('/api/bookings/me').set(authHeader(user.token));
            expect(upcoming.status).toBe(200);
            expect(upcoming.body.data).toHaveLength(1);
            expect(upcoming.body.meta).toEqual({ page: 1, limit: 12, total: 1 });
            expect(upcoming.body.data[0].resource.name).toBe('Orion Room');
            expect(upcoming.body.data[0].slots).toBeUndefined();

            const pastList = await request(app)
                .get('/api/bookings/me?when=past')
                .set(authHeader(user.token));
            expect(pastList.body.data).toHaveLength(1);
            expect(new Date(pastList.body.data[0].start).toISOString()).toBe(past.toISOString());

            const all = await request(app).get('/api/bookings/me?when=all').set(authHeader(user.token));
            expect(all.body.meta.total).toBe(2);
        });

        it('sorts upcoming bookings by start time, soonest first', async () => {
            const later = slotAt(5, 14);
            const sooner = slotAt(3, 9);
            await postBooking(user.token, body(later, plus(later, 60)));
            await postBooking(user.token, body(sooner, plus(sooner, 60)));

            const res = await request(app).get('/api/bookings/me').set(authHeader(user.token));
            const starts = res.body.data.map((b) => new Date(b.start).getTime());
            expect(starts).toEqual([sooner.getTime(), later.getTime()]);
        });

        it("does not include other users' bookings", async () => {
            const start = slotAt(3, 10);
            await postBooking(admin.token, body(start, plus(start, 60)));

            const res = await request(app).get('/api/bookings/me').set(authHeader(user.token));
            expect(res.status).toBe(200);
            expect(res.body.meta.total).toBe(0);
        });

        it('includes cancelled bookings with their status', async () => {
            const start = slotAt(3, 10);
            const created = await postBooking(user.token, body(start, plus(start, 60)));
            await request(app)
                .delete(`/api/bookings/${created.body.data._id}`)
                .set(authHeader(user.token));

            const res = await request(app).get('/api/bookings/me?when=all').set(authHeader(user.token));
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].status).toBe('cancelled');
        });
        it('moves a cancelled future booking from upcoming to past', async () => {
            const start = slotAt(3, 10);
            const created = await postBooking(user.token, body(start, plus(start, 60)));
            await request(app)
                .delete(`/api/bookings/${created.body.data._id}`)
                .set(authHeader(user.token));

            const upcoming = await request(app)
                .get('/api/bookings/me?when=upcoming')
                .set(authHeader(user.token));
            expect(upcoming.body.meta.total).toBe(0);

            const past = await request(app)
                .get('/api/bookings/me?when=past')
                .set(authHeader(user.token));
            expect(past.body.meta.total).toBe(1);
            expect(past.body.data[0].status).toBe('cancelled');
        });
    });

    // ── DELETE /api/bookings/:id ───────────────────────────────────────────────

    describe('DELETE /api/bookings/:id', () => {
        async function createAs(actor, daysAhead = 3) {
            const start = slotAt(daysAhead, 10);
            const end = plus(start, 60);
            const res = await postBooking(actor.token, body(start, end));
            expect(res.status).toBe(201);
            return { id: res.body.data._id, start, end };
        }

        it('requires authentication', async () => {
            const res = await request(app).delete(`/api/bookings/${new mongoose.Types.ObjectId()}`);
            expect(res.status).toBe(401);
        });

        it('lets the owner cancel, clearing slots and setting cancelledAt', async () => {
            const { id } = await createAs(user);
            const res = await request(app).delete(`/api/bookings/${id}`).set(authHeader(user.token));

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('cancelled');

            const stored = await Booking.findById(id);
            expect(stored.slots).toHaveLength(0);
            expect(stored.cancelledAt).not.toBeNull();
        });

        it("forbids a different non-admin user from cancelling someone else's booking", async () => {
            const { id } = await createAs(admin);
            const res = await request(app).delete(`/api/bookings/${id}`).set(authHeader(user.token));

            expect(res.status).toBe(403);
            expect(res.body.error.code).toBe('FORBIDDEN');
            expect((await Booking.findById(id)).status).toBe('confirmed');
        });

        it("lets an admin cancel another user's booking", async () => {
            const { id } = await createAs(user);
            const res = await request(app).delete(`/api/bookings/${id}`).set(authHeader(admin.token));
            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('cancelled');
        });

        it('returns 409 INVALID_STATE when cancelling twice', async () => {
            const { id } = await createAs(user);
            await request(app).delete(`/api/bookings/${id}`).set(authHeader(user.token));
            const again = await request(app).delete(`/api/bookings/${id}`).set(authHeader(user.token));

            expect(again.status).toBe(409);
            expect(again.body.error.code).toBe('INVALID_STATE');
        });

        it('returns 409 INVALID_STATE for a booking that has already ended', async () => {
            const past = slotAt(-2, 10);
            const ended = await insertBooking({
                resource,
                userId: user.id,
                start: past,
                end: plus(past, 60),
            });

            const res = await request(app)
                .delete(`/api/bookings/${ended._id}`)
                .set(authHeader(user.token));
            expect(res.status).toBe(409);
            expect(res.body.error.code).toBe('INVALID_STATE');
        });

        it('returns 404 for an unknown id and 400 for a malformed id', async () => {
            const unknown = await request(app)
                .delete(`/api/bookings/${new mongoose.Types.ObjectId()}`)
                .set(authHeader(user.token));
            const malformed = await request(app)
                .delete('/api/bookings/not-an-id')
                .set(authHeader(user.token));

            expect(unknown.status).toBe(404);
            expect(malformed.status).toBe(400);
        });

        it('frees the time so it can be booked again after cancelling', async () => {
            const { id, start, end } = await createAs(user);
            await request(app).delete(`/api/bookings/${id}`).set(authHeader(user.token));

            const rebook = await postBooking(admin.token, body(start, end));
            expect(rebook.status).toBe(201);
        });
    });

    // ── GET /api/bookings (admin) ──────────────────────────────────────────────

    describe('GET /api/bookings (admin)', () => {
        it('forbids normal users', async () => {
            const res = await request(app).get('/api/bookings').set(authHeader(user.token));
            expect(res.status).toBe(403);
            expect(res.body.error.code).toBe('FORBIDDEN');
        });

        it('lets an admin list and filter all bookings', async () => {
            const a = slotAt(3, 10);
            const b = slotAt(4, 10);
            await postBooking(user.token, body(a, plus(a, 60)));
            const second = await postBooking(admin.token, body(b, plus(b, 60)));
            await request(app)
                .delete(`/api/bookings/${second.body.data._id}`)
                .set(authHeader(admin.token));

            const all = await request(app).get('/api/bookings').set(authHeader(admin.token));
            expect(all.status).toBe(200);
            expect(all.body.meta.total).toBe(2);

            const cancelled = await request(app)
                .get('/api/bookings?status=cancelled')
                .set(authHeader(admin.token));
            expect(cancelled.body.meta.total).toBe(1);

            const byResource = await request(app)
                .get(`/api/bookings?resourceId=${resource._id}`)
                .set(authHeader(admin.token));
            expect(byResource.body.meta.total).toBe(2);
        });
    });
});