/**
 * Integration tests: Resources API (Phase 4a + 4b)
 *
 * Uses an in-memory MongoDB. Tokens are obtained from POST /api/auth/demo.
 * Phase 4a: GET list + pagination meta, each filter, availableFrom/To overlap logic,
 *   availableFrom without availableTo → 400, unknown id → 404, malformed id → 400,
 *   inactive hidden from users, availability window > 7 days → 400, no user data.
 * Phase 4b: POST / PATCH / DELETE — admin-only write endpoints.
 */
import request from 'supertest';
import mongoose from 'mongoose';
import { setupTestDB, clearTestDB, teardownTestDB } from '../helpers/db.js';
import app from '../../src/app.js';
import { Resource } from '../../src/models/Resource.js';
import { Booking } from '../../src/models/Booking.js';
import { User } from '../../src/models/User.js';

// ── helpers ───────────────────────────────────────────────────────────────────

async function getDemoToken(role = 'user') {
  const res = await request(app).post('/api/auth/demo').send({ role });
  expect(res.status).toBe(200);
  return res.body.data.token;
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ── test suite ────────────────────────────────────────────────────────────────

describe('Resources API — Phase 4a (read endpoints)', () => {
  let userToken;
  let adminToken;

  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    userToken = await getDemoToken('user');
    adminToken = await getDemoToken('admin');
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  // ── GET /api/resources — list ───────────────────────────────────────────────

  describe('GET /api/resources', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app).get('/api/resources');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns default list with pagination meta (page 1, limit 12, total)', async () => {
      await Resource.insertMany([
        { name: 'Alpha Room', type: 'room', capacity: 4, location: 'F1', isActive: true },
        { name: 'Beta Desk', type: 'desk', capacity: 1, location: 'F2', isActive: true },
      ]);

      const res = await request(app)
        .get('/api/resources')
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toMatchObject({ page: 1, limit: 12, total: 2 });
    });

    it('returns correct pagination meta when page and limit are specified', async () => {
      // Insert 5 resources
      await Resource.insertMany(
        Array.from({ length: 5 }, (_, i) => ({
          name: `Room ${i + 1}`,
          type: 'room',
          capacity: 4,
          location: 'F1',
          isActive: true,
        }))
      );

      const res = await request(app)
        .get('/api/resources?page=2&limit=2')
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toMatchObject({ page: 2, limit: 2, total: 5 });
    });

    it('returns 400 when limit exceeds 50', async () => {
      const res = await request(app)
        .get('/api/resources?limit=51')
        .set(authHeader(userToken));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('results are sorted by name', async () => {
      await Resource.insertMany([
        { name: 'Zebra Room', type: 'room', capacity: 4, location: 'F1', isActive: true },
        { name: 'Apple Desk', type: 'desk', capacity: 1, location: 'F1', isActive: true },
        { name: 'Mango Room', type: 'room', capacity: 4, location: 'F1', isActive: true },
      ]);

      const res = await request(app)
        .get('/api/resources')
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      const names = res.body.data.map((r) => r.name);
      expect(names).toEqual(['Apple Desk', 'Mango Room', 'Zebra Room']);
    });

    // ── filter: type ──────────────────────────────────────────────────────────

    it('filter by type=room returns only rooms', async () => {
      await Resource.insertMany([
        { name: 'Room A', type: 'room', capacity: 4, location: 'F1', isActive: true },
        { name: 'Desk A', type: 'desk', capacity: 1, location: 'F1', isActive: true },
      ]);

      const res = await request(app)
        .get('/api/resources?type=room')
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Room A');
      expect(res.body.meta.total).toBe(1);
    });

    it('filter by type=desk returns only desks', async () => {
      await Resource.insertMany([
        { name: 'Room B', type: 'room', capacity: 4, location: 'F1', isActive: true },
        { name: 'Desk B', type: 'desk', capacity: 1, location: 'F1', isActive: true },
      ]);

      const res = await request(app)
        .get('/api/resources?type=desk')
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Desk B');
    });

    it('returns 400 for invalid type value', async () => {
      const res = await request(app)
        .get('/api/resources?type=office')
        .set(authHeader(userToken));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    // ── filter: amenity (ALL must match) ──────────────────────────────────────

    it('filter by single amenity returns only matching resources', async () => {
      await Resource.insertMany([
        { name: 'WiFi Room', type: 'room', capacity: 4, location: 'F1', amenities: ['WiFi'], isActive: true },
        { name: 'No WiFi Room', type: 'room', capacity: 4, location: 'F1', amenities: [], isActive: true },
      ]);

      const res = await request(app)
        .get('/api/resources?amenity=WiFi')
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('WiFi Room');
    });

    it('filter by multiple amenities requires ALL to match', async () => {
      await Resource.insertMany([
        {
          name: 'Full Suite',
          type: 'room',
          capacity: 8,
          location: 'F1',
          amenities: ['WiFi', 'Projector', 'Whiteboard'],
          isActive: true,
        },
        {
          name: 'WiFi Only',
          type: 'room',
          capacity: 4,
          location: 'F1',
          amenities: ['WiFi'],
          isActive: true,
        },
        {
          name: 'No Amenities',
          type: 'room',
          capacity: 4,
          location: 'F1',
          amenities: [],
          isActive: true,
        },
      ]);

      const res = await request(app)
        .get('/api/resources?amenity=WiFi&amenity=Projector')
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Full Suite');
    });

    // ── filter: minCapacity ───────────────────────────────────────────────────

    it('filter by minCapacity returns resources with capacity >= value', async () => {
      await Resource.insertMany([
        { name: 'Small', type: 'desk', capacity: 1, location: 'F1', isActive: true },
        { name: 'Medium', type: 'room', capacity: 4, location: 'F1', isActive: true },
        { name: 'Large', type: 'room', capacity: 12, location: 'F1', isActive: true },
      ]);

      const res = await request(app)
        .get('/api/resources?minCapacity=4')
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      const names = res.body.data.map((r) => r.name);
      expect(names).toContain('Medium');
      expect(names).toContain('Large');
      expect(names).not.toContain('Small');
    });

    // ── filter: q (name search) ───────────────────────────────────────────────

    it('filter by q does a case-insensitive name search', async () => {
      await Resource.insertMany([
        { name: 'Orion Meeting Room', type: 'room', capacity: 8, location: 'F2', isActive: true },
        { name: 'Nebula Desk', type: 'desk', capacity: 1, location: 'F1', isActive: true },
      ]);

      const res = await request(app)
        .get('/api/resources?q=orion')
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Orion Meeting Room');
    });

    it('q search escapes regex special characters', async () => {
      await Resource.insertMany([
        { name: 'Room (A)', type: 'room', capacity: 4, location: 'F1', isActive: true },
        { name: 'Room B', type: 'room', capacity: 4, location: 'F1', isActive: true },
      ]);

      // '(A)' contains regex metacharacters — should still match literally
      const res = await request(app)
        .get('/api/resources?q=(A)')
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Room (A)');
    });

    // ── filter: availableFrom / availableTo ───────────────────────────────────

    it('availableFrom without availableTo returns 400', async () => {
      const res = await request(app)
        .get('/api/resources?availableFrom=2030-01-01T09:00:00.000Z')
        .set(authHeader(userToken));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('availableTo without availableFrom returns 400', async () => {
      const res = await request(app)
        .get('/api/resources?availableTo=2030-01-01T09:00:00.000Z')
        .set(authHeader(userToken));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('availableFrom >= availableTo returns 400', async () => {
      const res = await request(app)
        .get(
          '/api/resources?availableFrom=2030-01-01T10:00:00.000Z&availableTo=2030-01-01T09:00:00.000Z'
        )
        .set(authHeader(userToken));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('excludes a resource that has a confirmed booking overlapping the window', async () => {
      // Resource with overlapping booking: booking 09:00-10:00, window 09:30-10:30 → overlap
      const [booked] = await Resource.insertMany([
        { name: 'Busy Room', type: 'room', capacity: 4, location: 'F1', isActive: true },
      ]);

      // Need a real user for the booking reference
      const user = await User.findOne({});
      await Booking.create({
        resource: booked._id,
        user: user._id,
        start: new Date('2030-01-01T09:00:00.000Z'),
        end: new Date('2030-01-01T10:00:00.000Z'),
        slots: [new Date('2030-01-01T09:00:00.000Z'), new Date('2030-01-01T09:30:00.000Z')],
        status: 'confirmed',
      });

      const res = await request(app)
        .get(
          '/api/resources?availableFrom=2030-01-01T09:30:00.000Z&availableTo=2030-01-01T10:30:00.000Z'
        )
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      const names = res.body.data.map((r) => r.name);
      expect(names).not.toContain('Busy Room');
    });

    it('keeps a resource whose booking is adjacent (non-overlapping) to the window', async () => {
      // Booking ends at 09:00 exactly, window starts at 09:00 → booking.end NOT > availableFrom is false
      // Actually overlap condition: booking.start < availableTo AND booking.end > availableFrom
      // Adjacent: booking.end == availableFrom → booking.end > availableFrom is FALSE → no overlap ✓
      const [adjacent] = await Resource.insertMany([
        { name: 'Adjacent Room', type: 'room', capacity: 4, location: 'F1', isActive: true },
      ]);

      const user = await User.findOne({});
      await Booking.create({
        resource: adjacent._id,
        user: user._id,
        start: new Date('2030-01-01T08:00:00.000Z'),
        end: new Date('2030-01-01T09:00:00.000Z'), // ends exactly at window start
        slots: [new Date('2030-01-01T08:00:00.000Z'), new Date('2030-01-01T08:30:00.000Z')],
        status: 'confirmed',
      });

      const res = await request(app)
        .get(
          '/api/resources?availableFrom=2030-01-01T09:00:00.000Z&availableTo=2030-01-01T10:00:00.000Z'
        )
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      const names = res.body.data.map((r) => r.name);
      expect(names).toContain('Adjacent Room');
    });

    it('cancelled bookings do not block the resource from appearing', async () => {
      const [cancelledResource] = await Resource.insertMany([
        { name: 'Cancelled Booking Room', type: 'room', capacity: 4, location: 'F1', isActive: true },
      ]);

      const user = await User.findOne({});
      await Booking.create({
        resource: cancelledResource._id,
        user: user._id,
        start: new Date('2030-01-01T09:00:00.000Z'),
        end: new Date('2030-01-01T10:00:00.000Z'),
        slots: [], // cancelled → slots empty
        status: 'cancelled',
      });

      const res = await request(app)
        .get(
          '/api/resources?availableFrom=2030-01-01T09:00:00.000Z&availableTo=2030-01-01T10:00:00.000Z'
        )
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      const names = res.body.data.map((r) => r.name);
      expect(names).toContain('Cancelled Booking Room');
    });

    // ── filter: inactive resources ────────────────────────────────────────────

    it('does not return inactive resources to normal users', async () => {
      await Resource.insertMany([
        { name: 'Active Room', type: 'room', capacity: 4, location: 'F1', isActive: true },
        { name: 'Inactive Room', type: 'room', capacity: 4, location: 'F1', isActive: false },
      ]);

      const res = await request(app)
        .get('/api/resources')
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      const names = res.body.data.map((r) => r.name);
      expect(names).toContain('Active Room');
      expect(names).not.toContain('Inactive Room');
    });

    it('returns inactive resources to admin when includeInactive=true', async () => {
      await Resource.insertMany([
        { name: 'Active Room', type: 'room', capacity: 4, location: 'F1', isActive: true },
        { name: 'Inactive Room', type: 'room', capacity: 4, location: 'F1', isActive: false },
      ]);

      const res = await request(app)
        .get('/api/resources?includeInactive=true')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      const names = res.body.data.map((r) => r.name);
      expect(names).toContain('Active Room');
      expect(names).toContain('Inactive Room');
    });

    it('ignores includeInactive=true when requested by a normal user', async () => {
      await Resource.insertMany([
        { name: 'Active Room', type: 'room', capacity: 4, location: 'F1', isActive: true },
        { name: 'Inactive Room', type: 'room', capacity: 4, location: 'F1', isActive: false },
      ]);

      const res = await request(app)
        .get('/api/resources?includeInactive=true')
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      const names = res.body.data.map((r) => r.name);
      expect(names).not.toContain('Inactive Room');
    });
  });

  // ── GET /api/resources/:id ──────────────────────────────────────────────────

  describe('GET /api/resources/:id', () => {
    it('returns 401 when no token', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/api/resources/${fakeId}`);
      expect(res.status).toBe(401);
    });

    it('returns 400 VALIDATION_ERROR for a malformed (non-ObjectId) id', async () => {
      const res = await request(app)
        .get('/api/resources/bad-id')
        .set(authHeader(userToken));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 NOT_FOUND for a valid ObjectId that does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/resources/${nonExistentId}`)
        .set(authHeader(userToken));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 200 with the resource for a known active resource', async () => {
      const [resource] = await Resource.insertMany([
        { name: 'Known Room', type: 'room', capacity: 8, location: 'F3', isActive: true },
      ]);

      const res = await request(app)
        .get(`/api/resources/${resource._id}`)
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ name: 'Known Room', type: 'room' });
    });

    it('returns 404 for an inactive resource when requested by a normal user', async () => {
      const [inactive] = await Resource.insertMany([
        { name: 'Inactive Room', type: 'room', capacity: 4, location: 'F1', isActive: false },
      ]);

      const res = await request(app)
        .get(`/api/resources/${inactive._id}`)
        .set(authHeader(userToken));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 200 for an inactive resource when requested by an admin', async () => {
      const [inactive] = await Resource.insertMany([
        { name: 'Inactive Room', type: 'room', capacity: 4, location: 'F1', isActive: false },
      ]);

      const res = await request(app)
        .get(`/api/resources/${inactive._id}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });
  });

  // ── GET /api/resources/:id/availability ──────────────────────────────────────

  describe('GET /api/resources/:id/availability', () => {
    let activeResource;

    beforeEach(async () => {
      [activeResource] = await Resource.insertMany([
        { name: 'Avail Room', type: 'room', capacity: 4, location: 'F1', isActive: true },
      ]);
    });

    it('returns 401 when no token', async () => {
      const res = await request(app).get(
        `/api/resources/${activeResource._id}/availability?from=2030-01-01T09:00:00.000Z&to=2030-01-01T10:00:00.000Z`
      );
      expect(res.status).toBe(401);
    });

    it('returns 400 for malformed resource id', async () => {
      const res = await request(app)
        .get(
          '/api/resources/not-an-id/availability?from=2030-01-01T09:00:00.000Z&to=2030-01-01T10:00:00.000Z'
        )
        .set(authHeader(userToken));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when from is missing', async () => {
      const res = await request(app)
        .get(`/api/resources/${activeResource._id}/availability?to=2030-01-01T10:00:00.000Z`)
        .set(authHeader(userToken));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when to is missing', async () => {
      const res = await request(app)
        .get(`/api/resources/${activeResource._id}/availability?from=2030-01-01T09:00:00.000Z`)
        .set(authHeader(userToken));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when from >= to', async () => {
      const res = await request(app)
        .get(
          `/api/resources/${activeResource._id}/availability?from=2030-01-01T10:00:00.000Z&to=2030-01-01T09:00:00.000Z`
        )
        .set(authHeader(userToken));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when window exceeds 7 days', async () => {
      const res = await request(app)
        .get(
          `/api/resources/${activeResource._id}/availability?from=2030-01-01T00:00:00.000Z&to=2030-01-09T00:00:00.001Z`
        )
        .set(authHeader(userToken));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('window of exactly 7 days is allowed', async () => {
      const res = await request(app)
        .get(
          `/api/resources/${activeResource._id}/availability?from=2030-01-01T00:00:00.000Z&to=2030-01-08T00:00:00.000Z`
        )
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
    });

    it('returns 404 for unknown resource id', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(
          `/api/resources/${nonExistentId}/availability?from=2030-01-01T09:00:00.000Z&to=2030-01-01T10:00:00.000Z`
        )
        .set(authHeader(userToken));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns the correct envelope shape with resourceId, from, to, booked array', async () => {
      const res = await request(app)
        .get(
          `/api/resources/${activeResource._id}/availability?from=2030-01-01T09:00:00.000Z&to=2030-01-01T17:00:00.000Z`
        )
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        resourceId: activeResource._id.toString(),
        from: '2030-01-01T09:00:00.000Z',
        to: '2030-01-01T17:00:00.000Z',
        booked: [],
      });
    });

    it('lists confirmed bookings overlapping the window', async () => {
      const user = await User.findOne({});
      await Booking.create({
        resource: activeResource._id,
        user: user._id,
        start: new Date('2030-01-01T10:00:00.000Z'),
        end: new Date('2030-01-01T11:00:00.000Z'),
        slots: [new Date('2030-01-01T10:00:00.000Z'), new Date('2030-01-01T10:30:00.000Z')],
        status: 'confirmed',
      });

      const res = await request(app)
        .get(
          `/api/resources/${activeResource._id}/availability?from=2030-01-01T09:00:00.000Z&to=2030-01-01T17:00:00.000Z`
        )
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      expect(res.body.data.booked).toHaveLength(1);
      expect(res.body.data.booked[0]).toMatchObject({
        start: '2030-01-01T10:00:00.000Z',
        end: '2030-01-01T11:00:00.000Z',
      });
    });

    it('response NEVER contains user data in booked intervals', async () => {
      const user = await User.findOne({});
      await Booking.create({
        resource: activeResource._id,
        user: user._id,
        start: new Date('2030-01-01T10:00:00.000Z'),
        end: new Date('2030-01-01T11:00:00.000Z'),
        slots: [new Date('2030-01-01T10:00:00.000Z'), new Date('2030-01-01T10:30:00.000Z')],
        status: 'confirmed',
      });

      const res = await request(app)
        .get(
          `/api/resources/${activeResource._id}/availability?from=2030-01-01T09:00:00.000Z&to=2030-01-01T17:00:00.000Z`
        )
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      const interval = res.body.data.booked[0];
      // Only start and end should be present — no user, userId, email, etc.
      expect(interval).not.toHaveProperty('user');
      expect(interval).not.toHaveProperty('userId');
      expect(Object.keys(interval)).toEqual(expect.arrayContaining(['start', 'end']));
      expect(Object.keys(interval)).toHaveLength(2);
    });

    it('does not list cancelled bookings in booked intervals', async () => {
      const user = await User.findOne({});
      await Booking.create({
        resource: activeResource._id,
        user: user._id,
        start: new Date('2030-01-01T10:00:00.000Z'),
        end: new Date('2030-01-01T11:00:00.000Z'),
        slots: [],
        status: 'cancelled',
      });

      const res = await request(app)
        .get(
          `/api/resources/${activeResource._id}/availability?from=2030-01-01T09:00:00.000Z&to=2030-01-01T17:00:00.000Z`
        )
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      expect(res.body.data.booked).toHaveLength(0);
    });

    it('returns 404 for inactive resource when requested by user', async () => {
      const [inactive] = await Resource.insertMany([
        { name: 'Inactive Avail Room', type: 'room', capacity: 4, location: 'F1', isActive: false },
      ]);

      const res = await request(app)
        .get(
          `/api/resources/${inactive._id}/availability?from=2030-01-01T09:00:00.000Z&to=2030-01-01T10:00:00.000Z`
        )
        .set(authHeader(userToken));

      expect(res.status).toBe(404);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4b — Admin write endpoints: POST / PATCH / DELETE
// ─────────────────────────────────────────────────────────────────────────────

describe('Resources API — Phase 4b (admin write endpoints)', () => {
  let userToken;
  let adminToken;

  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    userToken = await getDemoToken('user');
    adminToken = await getDemoToken('admin');
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  // ── helpers ────────────────────────────────────────────────────────────────

  const validBody = {
    name: 'Orion Room',
    type: 'room',
    capacity: 8,
    location: 'Floor 2',
    amenities: ['WiFi', 'Projector'],
    description: 'Glass-walled meeting room',
  };

  // ── POST /api/resources ────────────────────────────────────────────────────

  describe('POST /api/resources', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app).post('/api/resources').send(validBody);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns 403 FORBIDDEN when called by a non-admin user', async () => {
      const res = await request(app)
        .post('/api/resources')
        .set(authHeader(userToken))
        .send(validBody);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('admin creates a resource and receives 201 with the created document', async () => {
      const res = await request(app)
        .post('/api/resources')
        .set(authHeader(adminToken))
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        name: 'Orion Room',
        type: 'room',
        capacity: 8,
        location: 'Floor 2',
        amenities: ['WiFi', 'Projector'],
        description: 'Glass-walled meeting room',
        isActive: true,
      });
      expect(res.body.data._id).toBeDefined();
    });

    it('created resource persists in the database', async () => {
      const res = await request(app)
        .post('/api/resources')
        .set(authHeader(adminToken))
        .send(validBody);

      expect(res.status).toBe(201);
      const found = await Resource.findById(res.body.data._id);
      expect(found).not.toBeNull();
      expect(found.name).toBe('Orion Room');
    });

    it('amenities default to [] when omitted', async () => {
      // Send only the required fields — omit optional amenities and description
      const bodyNoExtras = { name: validBody.name, type: validBody.type, capacity: validBody.capacity, location: validBody.location };
      const res = await request(app)
        .post('/api/resources')
        .set(authHeader(adminToken))
        .send(bodyNoExtras);

      expect(res.status).toBe(201);
      expect(res.body.data.amenities).toEqual([]);
    });

    it('returns 400 VALIDATION_ERROR when name is missing', async () => {
      const body = { type: validBody.type, capacity: validBody.capacity, location: validBody.location };
      const res = await request(app)
        .post('/api/resources')
        .set(authHeader(adminToken))
        .send(body);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toBeInstanceOf(Array);
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });

    it('returns 400 when type is not room or desk', async () => {
      const res = await request(app)
        .post('/api/resources')
        .set(authHeader(adminToken))
        .send({ ...validBody, type: 'lounge' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when capacity is less than 1', async () => {
      const res = await request(app)
        .post('/api/resources')
        .set(authHeader(adminToken))
        .send({ ...validBody, capacity: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when capacity is not an integer', async () => {
      const res = await request(app)
        .post('/api/resources')
        .set(authHeader(adminToken))
        .send({ ...validBody, capacity: 2.5 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when amenities array has more than 20 items', async () => {
      const res = await request(app)
        .post('/api/resources')
        .set(authHeader(adminToken))
        .send({ ...validBody, amenities: Array.from({ length: 21 }, (_, i) => `Amenity${i}`) });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when amenities array contains an empty string', async () => {
      const res = await request(app)
        .post('/api/resources')
        .set(authHeader(adminToken))
        .send({ ...validBody, amenities: ['WiFi', ''] });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when an unknown field is supplied (strict schema)', async () => {
      const res = await request(app)
        .post('/api/resources')
        .set(authHeader(adminToken))
        .send({ ...validBody, unknownField: 'should be rejected' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── PATCH /api/resources/:id ───────────────────────────────────────────────

  describe('PATCH /api/resources/:id', () => {
    let existingResource;

    beforeEach(async () => {
      [existingResource] = await Resource.insertMany([
        { name: 'Alpha Room', type: 'room', capacity: 4, location: 'F1', isActive: true },
      ]);
    });

    it('returns 401 when no token is provided', async () => {
      const res = await request(app)
        .patch(`/api/resources/${existingResource._id}`)
        .send({ name: 'Updated' });
      expect(res.status).toBe(401);
    });

    it('returns 403 FORBIDDEN when called by a non-admin user', async () => {
      const res = await request(app)
        .patch(`/api/resources/${existingResource._id}`)
        .set(authHeader(userToken))
        .send({ name: 'Updated' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 400 for a malformed (non-ObjectId) id param', async () => {
      const res = await request(app)
        .patch('/api/resources/not-an-id')
        .set(authHeader(adminToken))
        .send({ name: 'Updated' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 NOT_FOUND for a valid ObjectId that does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .patch(`/api/resources/${nonExistentId}`)
        .set(authHeader(adminToken))
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('admin partially updates a resource — name only — and receives 200', async () => {
      const res = await request(app)
        .patch(`/api/resources/${existingResource._id}`)
        .set(authHeader(adminToken))
        .send({ name: 'Beta Room' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Beta Room');
      // Other fields remain unchanged
      expect(res.body.data.type).toBe('room');
      expect(res.body.data.capacity).toBe(4);
    });

    it('admin can update multiple fields at once', async () => {
      const res = await request(app)
        .patch(`/api/resources/${existingResource._id}`)
        .set(authHeader(adminToken))
        .send({ name: 'Gamma Room', capacity: 10, amenities: ['TV'] });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ name: 'Gamma Room', capacity: 10, amenities: ['TV'] });
    });

    it('admin can set isActive=false via PATCH', async () => {
      const res = await request(app)
        .patch(`/api/resources/${existingResource._id}`)
        .set(authHeader(adminToken))
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it('admin can re-activate a disabled resource via PATCH isActive=true', async () => {
      // First disable it
      await Resource.findByIdAndUpdate(existingResource._id, { isActive: false });

      const res = await request(app)
        .patch(`/api/resources/${existingResource._id}`)
        .set(authHeader(adminToken))
        .send({ isActive: true });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(true);
    });

    it('returns 400 when an unknown field is supplied (strict schema)', async () => {
      const res = await request(app)
        .patch(`/api/resources/${existingResource._id}`)
        .set(authHeader(adminToken))
        .send({ unknownField: 'nope' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when capacity is invalid (e.g. 0) in PATCH body', async () => {
      const res = await request(app)
        .patch(`/api/resources/${existingResource._id}`)
        .set(authHeader(adminToken))
        .send({ capacity: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── DELETE /api/resources/:id ──────────────────────────────────────────────

  describe('DELETE /api/resources/:id', () => {
    let activeResource;

    beforeEach(async () => {
      [activeResource] = await Resource.insertMany([
        { name: 'To Delete Room', type: 'desk', capacity: 1, location: 'F3', isActive: true },
      ]);
    });

    it('returns 401 when no token is provided', async () => {
      const res = await request(app).delete(`/api/resources/${activeResource._id}`);
      expect(res.status).toBe(401);
    });

    it('returns 403 FORBIDDEN when called by a non-admin user', async () => {
      const res = await request(app)
        .delete(`/api/resources/${activeResource._id}`)
        .set(authHeader(userToken));

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 400 for a malformed (non-ObjectId) id param', async () => {
      const res = await request(app)
        .delete('/api/resources/bad-id')
        .set(authHeader(adminToken));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 NOT_FOUND for a valid ObjectId that does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .delete(`/api/resources/${nonExistentId}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('admin soft-disables a resource: returns 200 with isActive=false', async () => {
      const res = await request(app)
        .delete(`/api/resources/${activeResource._id}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(activeResource._id.toString());
      expect(res.body.data.isActive).toBe(false);
    });

    it('soft-disabled resource is actually updated in the database', async () => {
      await request(app)
        .delete(`/api/resources/${activeResource._id}`)
        .set(authHeader(adminToken));

      const found = await Resource.findById(activeResource._id);
      expect(found.isActive).toBe(false);
      // Document still exists — it is NOT a hard delete
      expect(found).not.toBeNull();
    });

    it('soft-disabled resource disappears from the normal GET /resources list', async () => {
      await request(app)
        .delete(`/api/resources/${activeResource._id}`)
        .set(authHeader(adminToken));

      const res = await request(app)
        .get('/api/resources')
        .set(authHeader(userToken));

      expect(res.status).toBe(200);
      const ids = res.body.data.map((r) => r._id);
      expect(ids).not.toContain(activeResource._id.toString());
    });

    it('soft-disabled resource appears in GET /resources?includeInactive=true for an admin', async () => {
      await request(app)
        .delete(`/api/resources/${activeResource._id}`)
        .set(authHeader(adminToken));

      const res = await request(app)
        .get('/api/resources?includeInactive=true')
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      const ids = res.body.data.map((r) => r._id);
      expect(ids).toContain(activeResource._id.toString());
    });

    it('calling DELETE twice on the same resource still returns 200 (idempotent soft-disable)', async () => {
      // First delete
      await request(app)
        .delete(`/api/resources/${activeResource._id}`)
        .set(authHeader(adminToken));

      // Second delete — resource exists but is already inactive; service finds it and sets isActive=false again
      const res = await request(app)
        .delete(`/api/resources/${activeResource._id}`)
        .set(authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });
  });
});
