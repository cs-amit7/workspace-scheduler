import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['room', 'desk'],
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    amenities: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

resourceSchema.index({ type: 1, isActive: 1 });

export const Resource = mongoose.models.Resource || mongoose.model('Resource', resourceSchema);
export default Resource;
