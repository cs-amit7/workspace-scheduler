import { setupTestDB, teardownTestDB, clearTestDB } from '../helpers/db.js';
import { User } from '../../src/models/User.js';
import { Resource } from '../../src/models/Resource.js';
import { Booking } from '../../src/models/Booking.js';

describe('Booking Model & Index Constraints', () => {
  let testUser;
  let anotherUser;
  let testResource;

  beforeAll(async () => {
    await setupTestDB();
    await Promise.all([User.syncIndexes(), Resource.syncIndexes(), Booking.syncIndexes()]);
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    await Promise.all([User.syncIndexes(), Resource.syncIndexes(), Booking.syncIndexes()]);

    testUser = await User.create({
      name: 'Alice Developer',
      email: 'alice@example.com',
      role: 'user',
    });

    anotherUser = await User.create({
      name: 'Bob Architect',
      email: 'bob@example.com',
      role: 'user',
    });

    testResource = await Resource.create({
      name: 'Orion Room',
      type: 'room',
      capacity: 8,
      location: 'Floor 2',
      amenities: ['WiFi', 'Projector'],
    });
  });

  test('inserting two confirmed bookings for the same resource with an overlapping slot throws error code 11000', async () => {
    const slot1 = new Date('2026-11-01T10:00:00.000Z');
    const slot2 = new Date('2026-11-01T10:30:00.000Z');
    const slot3 = new Date('2026-11-01T11:00:00.000Z');

    // Booking 1: 10:00 to 11:00 (slots 10:00, 10:30)
    await Booking.create({
      resource: testResource._id,
      user: testUser._id,
      start: slot1,
      end: slot3,
      slots: [slot1, slot2],
      status: 'confirmed',
    });

    // Booking 2: 10:30 to 11:30 (slots 10:30, 11:00) -> overlaps at slot2 (10:30)
    let duplicateError = null;
    try {
      await Booking.create({
        resource: testResource._id,
        user: anotherUser._id,
        start: slot2,
        end: new Date('2026-11-01T11:30:00.000Z'),
        slots: [slot2, slot3],
        status: 'confirmed',
      });
    } catch (err) {
      duplicateError = err;
    }

    expect(duplicateError).not.toBeNull();
    expect(duplicateError.code).toBe(11000);
  });

  test('a booking with status "cancelled" and slots [] does not block a new confirmed booking on the same slot', async () => {
    const slot1 = new Date('2026-11-01T14:00:00.000Z');
    const slot2 = new Date('2026-11-01T14:30:00.000Z');
    const slotEnd = new Date('2026-11-01T15:00:00.000Z');

    // First create a confirmed booking
    const originalBooking = await Booking.create({
      resource: testResource._id,
      user: testUser._id,
      start: slot1,
      end: slotEnd,
      slots: [slot1, slot2],
      status: 'confirmed',
    });

    // Cancel it: status becomes 'cancelled' and slots becomes []
    originalBooking.status = 'cancelled';
    originalBooking.slots = [];
    originalBooking.cancelledAt = new Date();
    await originalBooking.save();

    // Now insert a new confirmed booking on the exact same slots
    const newBooking = await Booking.create({
      resource: testResource._id,
      user: anotherUser._id,
      start: slot1,
      end: slotEnd,
      slots: [slot1, slot2],
      status: 'confirmed',
    });

    expect(newBooking).toBeDefined();
    expect(newBooking._id).toBeDefined();
    expect(newBooking.status).toBe('confirmed');
    expect(newBooking.slots).toHaveLength(2);

    const allBookings = await Booking.find({ resource: testResource._id });
    expect(allBookings).toHaveLength(2);
  });

  test('two confirmed bookings on different resources can share the same slot without error', async () => {
    const secondResource = await Resource.create({
      name: 'Desk 101',
      type: 'desk',
      capacity: 1,
      location: 'Floor 1',
    });

    const slot = new Date('2026-11-01T09:00:00.000Z');
    const end = new Date('2026-11-01T09:30:00.000Z');

    const booking1 = await Booking.create({
      resource: testResource._id,
      user: testUser._id,
      start: slot,
      end,
      slots: [slot],
      status: 'confirmed',
    });

    const booking2 = await Booking.create({
      resource: secondResource._id,
      user: anotherUser._id,
      start: slot,
      end,
      slots: [slot],
      status: 'confirmed',
    });

    expect(booking1.status).toBe('confirmed');
    expect(booking2.status).toBe('confirmed');
  });
});
