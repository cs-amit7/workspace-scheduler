import request from 'supertest';
import { setupTestDB, teardownTestDB } from '../helpers/db.js';
import app from '../../src/app.js';
import { Resource } from '../../src/models/Resource.js';
import { Booking } from '../../src/models/Booking.js';

const PARALLEL = 25;
const TIMEOUT = 60000; // parallel requests against a real mongod can be slow on Windows

const plus = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

// A UTC time on a 30-minute boundary, N days from today.
function slotAt(daysFromNow, hour = 10, minute = 0) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + daysFromNow);
    d.setUTCHours(hour, minute, 0, 0);
    return d;
}

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

async function loginDemo(role) {
    const res = await request(app).post('/api/auth/demo').send({ role });
    expect(res.status).toBe(200);
    return res.body.data.token;
}

describe('Booking concurrency (the database guard)', () => {
    let tokens;
    let resource;
    let base; // 10:00 UTC, two days ahead

    const post = (token, start, end) =>
        request(app)
            .post('/api/bookings')
            .set(authHeader(token))
            .send({
                resourceId: String(resource._id),
                start: start.toISOString(),
                end: end.toISOString(),
            });

    const confirmedBookings = () =>
        Booking.find({ resource: resource._id, status: 'confirmed' }).sort({ start: 1 }).lean();

    // The invariant that must ALWAYS hold: no slot belongs to two confirmed bookings,
    // and no two confirmed windows overlap.
    async function expectNoDoubleBooking() {
        const confirmed = await confirmedBookings();

        const allSlots = confirmed.flatMap((b) => b.slots.map((s) => s.toISOString()));
        expect(new Set(allSlots).size).toBe(allSlots.length);

        for (let i = 1; i < confirmed.length; i += 1) {
            expect(confirmed[i].start.getTime()).toBeGreaterThanOrEqual(confirmed[i - 1].end.getTime());
        }
        return confirmed;
    }

    beforeAll(async () => {
        await setupTestDB();
        // Without the unique partial index this test would (correctly) fail.
        await Booking.syncIndexes();
        tokens = [await loginDemo('user'), await loginDemo('admin')];
    }, TIMEOUT);

    beforeEach(async () => {
        await Booking.deleteMany({});
        await Resource.deleteMany({});
        resource = await Resource.create({
            name: 'Race Room',
            type: 'room',
            capacity: 8,
            location: 'Floor 1',
        });
        base = slotAt(2, 10, 0);
    });

    afterAll(async () => {
        await teardownTestDB();
    });

    it(
        `${PARALLEL} parallel requests for the same slot -> exactly one wins`,
        async () => {
            const start = base;
            const end = plus(base, 60);

            const results = await Promise.all(
                Array.from({ length: PARALLEL }, (_, i) => post(tokens[i % tokens.length], start, end))
            );

            const created = results.filter((r) => r.status === 201);
            const conflicts = results.filter((r) => r.status === 409);

            expect(results.every((r) => r.status === 201 || r.status === 409)).toBe(true); // no 5xx
            expect(created).toHaveLength(1);
            expect(conflicts).toHaveLength(PARALLEL - 1);
            expect(conflicts.every((r) => r.body.error.code === 'SLOT_TAKEN')).toBe(true);

            const confirmed = await expectNoDoubleBooking();
            expect(confirmed).toHaveLength(1);
            expect(confirmed[0].slots).toHaveLength(2);
        },
        TIMEOUT
    );

    it(
        'overlapping but different windows in parallel -> exactly one wins',
        async () => {
            // Every window below contains the 10:30-11:00 slot, so at most one can succeed.
            const windows = [
                [-30, 60], // 09:30 - 11:00
                [0, 60], //  10:00 - 11:00
                [0, 120], // 10:00 - 12:00
                [30, 90], // 10:30 - 11:30
                [30, 60], // 10:30 - 11:00
                [-60, 90], // 09:00 - 11:30
            ];
            const requests = [];
            for (let round = 0; round < 4; round += 1) {
                windows.forEach(([from, to], i) => {
                    requests.push(
                        post(tokens[(round + i) % tokens.length], plus(base, from), plus(base, to))
                    );
                });
            }

            const results = await Promise.all(requests);
            const created = results.filter((r) => r.status === 201);
            const conflicts = results.filter((r) => r.status === 409);

            expect(results.every((r) => r.status === 201 || r.status === 409)).toBe(true);
            expect(created).toHaveLength(1);
            expect(conflicts).toHaveLength(requests.length - 1);

            const confirmed = await expectNoDoubleBooking();
            expect(confirmed).toHaveLength(1);
        },
        TIMEOUT
    );

    it(
        'parallel requests for different, non-overlapping slots all succeed (no false conflicts)',
        async () => {
            const results = await Promise.all(
                Array.from({ length: 8 }, (_, i) =>
                    post(tokens[i % tokens.length], plus(base, i * 30), plus(base, (i + 1) * 30))
                )
            );

            expect(results.every((r) => r.status === 201)).toBe(true);
            const confirmed = await expectNoDoubleBooking();
            expect(confirmed).toHaveLength(8);
        },
        TIMEOUT
    );

    it(
        'a storm of 60 mixed overlapping and adjacent requests never double-books a slot',
        async () => {
            const requests = Array.from({ length: 60 }, (_, i) => {
                const startSlot = (i * 7) % 6; // 0..5
                const lengthSlots = 1 + ((i * 5) % 4); // 1..4
                const start = plus(base, startSlot * 30);
                return post(tokens[i % tokens.length], start, plus(start, lengthSlots * 30));
            });

            const results = await Promise.all(requests);

            expect(results.every((r) => r.status === 201 || r.status === 409)).toBe(true);
            expect(results.filter((r) => r.status === 201).length).toBeGreaterThanOrEqual(1);

            const confirmed = await expectNoDoubleBooking();
            // Every 201 corresponds to one confirmed booking, and vice versa.
            expect(confirmed).toHaveLength(results.filter((r) => r.status === 201).length);
        },
        TIMEOUT
    );

    it(
        'cancelling while others try to rebook the same slot never leaves two confirmed bookings',
        async () => {
            const start = base;
            const end = plus(base, 60);

            const original = await post(tokens[0], start, end);
            expect(original.status).toBe(201);

            const cancelRequest = request(app)
                .delete(`/api/bookings/${original.body.data._id}`)
                .set(authHeader(tokens[0]));
            const rebooks = Array.from({ length: 10 }, () => post(tokens[1], start, end));

            const results = await Promise.all([cancelRequest, ...rebooks]);
            const [cancelResult, ...rebookResults] = results;

            expect(cancelResult.status).toBe(200);
            expect(rebookResults.every((r) => r.status === 201 || r.status === 409)).toBe(true);
            // At most one rebook can ever succeed, and only if it ran after the cancel.
            expect(rebookResults.filter((r) => r.status === 201).length).toBeLessThanOrEqual(1);

            const confirmed = await expectNoDoubleBooking();
            expect(confirmed.length).toBeLessThanOrEqual(1);
        },
        TIMEOUT
    );
});