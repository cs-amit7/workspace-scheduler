import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    start: {
      type: Date,
      required: true,
    },
    end: {
      type: Date,
      required: true,
    },
    slots: {
      type: [Date],
      default: [],
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: false,
  }
);

// Atomic double-booking prevention: no two confirmed bookings can share a slot on the same resource
bookingSchema.index(
  { resource: 1, slots: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'confirmed' },
  }
);

// Overlap and availability queries
bookingSchema.index({ resource: 1, start: 1, end: 1 });

// User's bookings query
bookingSchema.index({ user: 1, start: -1 });

export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
export default Booking;
