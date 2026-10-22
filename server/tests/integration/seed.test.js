import { setupTestDB, teardownTestDB, clearTestDB } from '../helpers/db.js';
import { Resource } from '../../src/models/Resource.js';
import { User } from '../../src/models/User.js';
import { Booking } from '../../src/models/Booking.js';
import { seed } from '../../src/seed/seed.js';

describe('Seed Script Idempotency and Data Integrity', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  test('the seed runs twice with identical counts', async () => {
    // First seed execution
    const firstResult = await seed();

    expect(firstResult.counts.rooms).toBe(12);
    expect(firstResult.counts.desks).toBe(20);
    expect(firstResult.counts.total).toBe(32);

    const initialTotal = await Resource.countDocuments();
    const initialRooms = await Resource.countDocuments({ type: 'room' });
    const initialDesks = await Resource.countDocuments({ type: 'desk' });

    expect(initialTotal).toBe(32);
    expect(initialRooms).toBe(12);
    expect(initialDesks).toBe(20);

    // Second seed execution
    const secondResult = await seed();

    const secondTotal = await Resource.countDocuments();
    const secondRooms = await Resource.countDocuments({ type: 'room' });
    const secondDesks = await Resource.countDocuments({ type: 'desk' });

    // Counts must be identical
    expect(secondResult.counts.total).toBe(firstResult.counts.total);
    expect(secondResult.counts.rooms).toBe(firstResult.counts.rooms);
    expect(secondResult.counts.desks).toBe(firstResult.counts.desks);

    expect(secondTotal).toBe(initialTotal);
    expect(secondRooms).toBe(initialRooms);
    expect(secondDesks).toBe(initialDesks);
  });

  test('seeded rooms have capacities 4-12 and varied amenities', async () => {
    await seed();

    const rooms = await Resource.find({ type: 'room' });
    expect(rooms).toHaveLength(12);

    for (const room of rooms) {
      expect(room.capacity).toBeGreaterThanOrEqual(4);
      expect(room.capacity).toBeLessThanOrEqual(12);
      expect(Array.isArray(room.amenities)).toBe(true);
      expect(room.amenities.length).toBeGreaterThan(0);
      expect(room.isActive).toBe(true);
    }

    const uniqueRoomCapacities = new Set(rooms.map((r) => r.capacity));
    expect(uniqueRoomCapacities.size).toBeGreaterThanOrEqual(3);
  });

  test('seeded desks have capacity 1 and varied amenities', async () => {
    await seed();

    const desks = await Resource.find({ type: 'desk' });
    expect(desks).toHaveLength(20);

    for (const desk of desks) {
      expect(desk.capacity).toBe(1);
      expect(Array.isArray(desk.amenities)).toBe(true);
      expect(desk.amenities.length).toBeGreaterThan(0);
      expect(desk.isActive).toBe(true);
    }
  });

  test('syncIndexes created expected indexes on all models', async () => {
    await seed();

    const userIndexes = await User.collection.indexes();
    const resourceIndexes = await Resource.collection.indexes();
    const bookingIndexes = await Booking.collection.indexes();

    // User should have email unique index and googleId index
    const emailIndex = userIndexes.find((idx) => idx.key.email === 1);
    expect(emailIndex).toBeDefined();
    expect(emailIndex.unique).toBe(true);

    const googleIdIndex = userIndexes.find((idx) => idx.key.googleId === 1);
    expect(googleIdIndex).toBeDefined();

    // Resource should have type + isActive index
    const resourceTypeIndex = resourceIndexes.find(
      (idx) => idx.key.type === 1 && idx.key.isActive === 1
    );
    expect(resourceTypeIndex).toBeDefined();

    // Booking should have unique partial index on resource + slots with status 'confirmed'
    const bookingSlotIndex = bookingIndexes.find(
      (idx) => idx.key.resource === 1 && idx.key.slots === 1
    );
    expect(bookingSlotIndex).toBeDefined();
    expect(bookingSlotIndex.unique).toBe(true);
    expect(bookingSlotIndex.partialFilterExpression).toEqual({
      status: 'confirmed',
    });

    // Booking should also have resource + start + end and user + start indexes
    const bookingStartEndIndex = bookingIndexes.find(
      (idx) => idx.key.resource === 1 && idx.key.start === 1 && idx.key.end === 1
    );
    expect(bookingStartEndIndex).toBeDefined();

    const bookingUserIndex = bookingIndexes.find(
      (idx) => idx.key.user === 1 && idx.key.start === -1
    );
    expect(bookingUserIndex).toBeDefined();
  });
});
