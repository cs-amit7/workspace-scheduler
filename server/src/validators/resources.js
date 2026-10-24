import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const idParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid resource ID format'),
});

export const listResourcesSchema = {
  query: z
    .object({
      type: z.enum(['room', 'desk']).optional(),
      amenity: z
        .preprocess((val) => {
          if (val === undefined || val === null) return undefined;
          return Array.isArray(val) ? val : [val];
        }, z.array(z.string().trim().min(1, 'Amenity string cannot be empty')))
        .optional(),
      minCapacity: z.coerce.number().int().min(1).optional(),
      q: z.string().trim().optional(),
      availableFrom: z.string().datetime({ message: 'availableFrom must be a valid UTC ISO string' }).optional(),
      availableTo: z.string().datetime({ message: 'availableTo must be a valid UTC ISO string' }).optional(),
      includeInactive: z
        .preprocess((val) => {
          if (val === 'true' || val === true) return true;
          if (val === 'false' || val === false) return false;
          return undefined;
        }, z.boolean())
        .optional()
        .default(false),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(12),
    })
    .refine(
      (data) =>
        (data.availableFrom && data.availableTo) || (!data.availableFrom && !data.availableTo),
      {
        message: 'availableFrom and availableTo must be provided together',
        path: ['availableTo'],
      }
    )
    .refine(
      (data) => {
        if (data.availableFrom && data.availableTo) {
          return new Date(data.availableFrom).getTime() < new Date(data.availableTo).getTime();
        }
        return true;
      },
      {
        message: 'availableFrom must be earlier than availableTo',
        path: ['availableFrom'],
      }
    ),
};

export const getResourceSchema = {
  params: idParamSchema,
};

export const getAvailabilitySchema = {
  params: idParamSchema,
  query: z
    .object({
      from: z.string().datetime({ message: 'from must be a valid UTC ISO string' }),
      to: z.string().datetime({ message: 'to must be a valid UTC ISO string' }),
    })
    .refine(
      (data) => new Date(data.from).getTime() < new Date(data.to).getTime(),
      {
        message: 'from must be earlier than to',
        path: ['from'],
      }
    )
    .refine(
      (data) => new Date(data.to).getTime() - new Date(data.from).getTime() <= SEVEN_DAYS_MS,
      {
        message: 'availability window must be at most 7 days',
        path: ['to'],
      }
    ),
};

export const createResourceSchema = {
  body: z
    .object({
      name: z.string().trim().min(1, 'Name is required'),
      type: z.enum(['room', 'desk']),
      capacity: z.number().int().min(1, 'Capacity must be an integer >= 1'),
      location: z.string().trim().min(1, 'Location is required'),
      amenities: z
        .array(z.string().trim().min(1, 'Amenity string cannot be empty'))
        .max(20, 'Amenities array can contain at most 20 items')
        .default([]),
      description: z.string().trim().optional().default(''),
    })
    .strict(),
};

export const updateResourceSchema = {
  params: idParamSchema,
  body: z
    .object({
      name: z.string().trim().min(1, 'Name cannot be empty').optional(),
      type: z.enum(['room', 'desk']).optional(),
      capacity: z.number().int().min(1, 'Capacity must be an integer >= 1').optional(),
      location: z.string().trim().min(1, 'Location cannot be empty').optional(),
      amenities: z
        .array(z.string().trim().min(1, 'Amenity string cannot be empty'))
        .max(20, 'Amenities array can contain at most 20 items')
        .optional(),
      description: z.string().trim().optional(),
      isActive: z.boolean().optional(),
    })
    .strict(),
};

export const deleteResourceSchema = {
  params: idParamSchema,
};

export default {
  idParamSchema,
  listResourcesSchema,
  getResourceSchema,
  getAvailabilitySchema,
  createResourceSchema,
  updateResourceSchema,
  deleteResourceSchema,
};
