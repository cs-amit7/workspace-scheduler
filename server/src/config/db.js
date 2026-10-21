import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDB(uri = config.MONGODB_URI) {
  if (config.NODE_ENV === 'test' || process.env.NODE_ENV === 'test') {
    return;
  }
  return mongoose.connect(uri, {
    maxPoolSize: 10,
  });
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
