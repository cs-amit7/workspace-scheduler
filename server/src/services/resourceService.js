import { Resource } from '../models/Resource.js';
import { Booking } from '../models/Booking.js';
import { ApiError } from '../utils/ApiError.js';

export function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listResources({ query = {}, user } = {}) {
  const filter = {};
  const isAdmin = user && user.role === 'admin';

  if (!isAdmin || !query.includeInactive) {
    filter.isActive = true;
  }

  if (query.type) {
    filter.type = query.type;
  }

  if (query.amenity && query.amenity.length > 0) {
    filter.amenities = { $all: query.amenity };
  }

  if (query.minCapacity !== undefined && query.minCapacity !== null) {
    filter.capacity = { $gte: query.minCapacity };
  }

  if (query.q && query.q.trim().length > 0) {
    filter.name = { $regex: new RegExp(escapeRegex(query.q.trim()), 'i') };
  }

  if (query.availableFrom && query.availableTo) {
    const overlappingBookings = await Booking.find({
      status: 'confirmed',
      start: { $lt: new Date(query.availableTo) },
      end: { $gt: new Date(query.availableFrom) },
    }).distinct('resource');

    filter._id = { $nin: overlappingBookings };
  }

  const page = query.page || 1;
  const limit = query.limit || 12;
  const skip = (page - 1) * limit;

  const [total, data] = await Promise.all([
    Resource.countDocuments(filter),
    Resource.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
  ]);

  return {
    data,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total: Number(total),
    },
  };
}

export async function getResourceById(id, user) {
  const resource = await Resource.findById(id);
  if (!resource) {
    throw new ApiError('NOT_FOUND', 404, 'Resource not found');
  }

  if (!resource.isActive && user?.role !== 'admin') {
    throw new ApiError('NOT_FOUND', 404, 'Resource not found');
  }

  return resource;
}

export async function getResourceAvailability(id, from, to, user) {
  const resource = await Resource.findById(id);
  if (!resource) {
    throw new ApiError('NOT_FOUND', 404, 'Resource not found');
  }

  if (!resource.isActive && user?.role !== 'admin') {
    throw new ApiError('NOT_FOUND', 404, 'Resource not found');
  }

  const bookings = await Booking.find({
    resource: resource._id,
    status: 'confirmed',
    start: { $lt: new Date(to) },
    end: { $gt: new Date(from) },
  }).sort({ start: 1 });

  const booked = bookings.map((b) => ({
    start: b.start.toISOString(),
    end: b.end.toISOString(),
  }));

  return {
    resourceId: String(resource._id),
    from,
    to,
    booked,
  };
}

export async function createResource(data) {
  const resource = await Resource.create(data);
  return resource;
}

export async function updateResource(id, data) {
  const resource = await Resource.findById(id);
  if (!resource) {
    throw new ApiError('NOT_FOUND', 404, 'Resource not found');
  }

  Object.assign(resource, data);
  await resource.save();
  return resource;
}

export async function softDeleteResource(id) {
  const resource = await Resource.findById(id);
  if (!resource) {
    throw new ApiError('NOT_FOUND', 404, 'Resource not found');
  }

  resource.isActive = false;
  await resource.save();
  return resource;
}

export default {
  escapeRegex,
  listResources,
  getResourceById,
  getResourceAvailability,
  createResource,
  updateResource,
  softDeleteResource,
};
