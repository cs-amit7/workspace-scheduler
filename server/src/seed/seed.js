import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { Resource } from '../models/Resource.js';
import { Booking } from '../models/Booking.js';

export const rooms = [
  {
    name: 'Orion Room',
    type: 'room',
    capacity: 8,
    location: 'Floor 2 - East Wing',
    amenities: ['WiFi', 'Projector', 'Whiteboard', 'Video Conferencing'],
    description: 'Boardroom setup with 4K display and video conferencing bar',
    isActive: true,
  },
  {
    name: 'Pegasus Room',
    type: 'room',
    capacity: 6,
    location: 'Floor 1 - North Wing',
    amenities: ['WiFi', 'Video Conferencing', 'Whiteboard'],
    description: 'Collaboration room for medium-sized team standups and planning',
    isActive: true,
  },
  {
    name: 'Andromeda Room',
    type: 'room',
    capacity: 12,
    location: 'Floor 3 - Executive Suite',
    amenities: ['WiFi', 'Projector', 'Video Conferencing', 'Whiteboard', 'Coffee Machine'],
    description: 'Flagship executive meeting room with panoramic city views',
    isActive: true,
  },
  {
    name: 'Cassiopeia Room',
    type: 'room',
    capacity: 10,
    location: 'Floor 3 - South Wing',
    amenities: ['WiFi', 'Projector', 'Whiteboard'],
    description: 'Spacious workshop and presentation space with modular seating',
    isActive: true,
  },
  {
    name: 'Cygnus Room',
    type: 'room',
    capacity: 4,
    location: 'Floor 1 - Central Hub',
    amenities: ['WiFi', 'Monitor', 'Whiteboard'],
    description: 'Compact huddle room for quick syncs and brainstorming',
    isActive: true,
  },
  {
    name: 'Draco Room',
    type: 'room',
    capacity: 4,
    location: 'Floor 2 - West Wing',
    amenities: ['WiFi', 'Video Conferencing'],
    description: 'Quiet meeting room suitable for remote interviews and 1-on-1s',
    isActive: true,
  },
  {
    name: 'Phoenix Room',
    type: 'room',
    capacity: 8,
    location: 'Floor 2 - Central Hub',
    amenities: ['WiFi', 'Projector', 'Video Conferencing', 'Whiteboard'],
    description: 'Versatile design review and cross-functional sync room',
    isActive: true,
  },
  {
    name: 'Lyra Room',
    type: 'room',
    capacity: 6,
    location: 'Floor 4 - Sky Lounge',
    amenities: ['WiFi', 'Monitor', 'Whiteboard'],
    description: 'Sunlit corner meeting space with writable floor-to-ceiling glass',
    isActive: true,
  },
  {
    name: 'Aquila Room',
    type: 'room',
    capacity: 6,
    location: 'Floor 4 - Quiet Corner',
    amenities: ['WiFi', 'Video Conferencing', 'Monitor'],
    description: 'Acoustically insulated video conference and client demo room',
    isActive: true,
  },
  {
    name: 'Centaurus Room',
    type: 'room',
    capacity: 10,
    location: 'Floor 3 - Innovation Lab',
    amenities: ['WiFi', 'Projector', 'Video Conferencing', 'Whiteboard'],
    description: 'High-capacity seminar room equipped for interactive workshops',
    isActive: true,
  },
  {
    name: 'Ursa Major Room',
    type: 'room',
    capacity: 12,
    location: 'Floor 1 - Main Concourse',
    amenities: ['WiFi', 'Projector', 'Video Conferencing', 'Whiteboard', 'Sound System'],
    description: 'Large all-hands briefing and departmental review hall',
    isActive: true,
  },
  {
    name: 'Ursa Minor Room',
    type: 'room',
    capacity: 4,
    location: 'Floor 1 - Quiet Zone',
    amenities: ['WiFi', 'Whiteboard'],
    description: 'Intimate focus and agile sprint review room',
    isActive: true,
  },
];

export const desks = Array.from({ length: 20 }, (_, index) => {
  const number = 101 + index;
  const floor = number < 111 ? 1 : 2;
  const zone =
    number <= 105
      ? 'Focus Pod'
      : number <= 110
        ? 'Window Row'
        : number <= 115
          ? 'Collaborative Area'
          : 'Quiet Library Zone';

  const amenities =
    number <= 105
      ? ['WiFi', 'Ergonomic Chair', 'Dual Monitor']
      : number <= 110
        ? ['WiFi', 'Standing Desk', 'Ergonomic Chair']
        : number <= 115
          ? ['WiFi', 'Monitor', 'Power Strip']
          : ['WiFi', 'Standing Desk', 'Dual Monitor', 'Ergonomic Chair'];

  return {
    name: `Desk ${number}`,
    type: 'desk',
    capacity: 1,
    location: `Floor ${floor} - ${zone}`,
    amenities,
    description: `Individual workspace desk #${number} with dedicated power and high-speed network`,
    isActive: true,
  };
});

export const seedResources = [...rooms, ...desks];

export async function seed({ closeConnection = false } = {}) {
  let shouldDisconnect = false;

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(config.MONGODB_URI, {
      maxPoolSize: 10,
    });
    shouldDisconnect = true;
  }

  // Ensure indexes for all three models are synchronized
  await Promise.all([User.syncIndexes(), Resource.syncIndexes(), Booking.syncIndexes()]);

  // Upsert all resources idempotently by name
  const ops = seedResources.map((resource) => ({
    updateOne: {
      filter: { name: resource.name },
      update: { $set: resource },
      upsert: true,
    },
  }));

  const result = await Resource.bulkWrite(ops);

  const roomCount = await Resource.countDocuments({ type: 'room' });
  const deskCount = await Resource.countDocuments({ type: 'desk' });
  const totalCount = await Resource.countDocuments();

  if (shouldDisconnect || closeConnection) {
    await mongoose.disconnect();
  }

  return {
    upsertedCount: result.upsertedCount || 0,
    matchedCount: result.matchedCount || 0,
    modifiedCount: result.modifiedCount || 0,
    counts: {
      rooms: roomCount,
      desks: deskCount,
      total: totalCount,
    },
  };
}

const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  seed({ closeConnection: true })
    .then((summary) => {
      console.log('Database seeded successfully:');
      console.log(`- Rooms: ${summary.counts.rooms}`);
      console.log(`- Desks: ${summary.counts.desks}`);
      console.log(`- Total: ${summary.counts.total}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to seed database:', error);
      process.exit(1);
    });
}
