import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// ── Reusable fragments ────────────────────────────────────────────────────────

const objectIdString = z.string().regex(objectIdRegex, 'Must be a valid 24-character hex ObjectId');

const isoDateString = z
  .string()
  .datetime({ offset: true, message: 'Must be a valid ISO 8601 UTC datetime string' });

const paginationQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
};

// ── POST /bookings body ───────────────────────────────────────────────────────

export const createBookingSchema = {
  body: z
    .object({
      resourceId: objectIdString,
      start: isoDateString,
      end: isoDateString,
    })
    .strict(),
};

// ── GET /bookings/me query ────────────────────────────────────────────────────

export const listMineSchema = {
  query: z.object({
    when: z.enum(['upcoming', 'past', 'all']).default('upcoming'),
    ...paginationQuery,
  }),
};

// ── GET /bookings (admin) query ───────────────────────────────────────────────

export const listAllSchema = {
  query: z.object({
    resourceId: objectIdString.optional(),
    userId: objectIdString.optional(),
    from: isoDateString.optional(),
    to: isoDateString.optional(),
    status: z.enum(['confirmed', 'cancelled']).optional(),
    ...paginationQuery,
  }),
};

// ── Params for :id routes ─────────────────────────────────────────────────────

export const bookingIdParamSchema = {
  params: z.object({
    id: objectIdString,
  }),
};

export default {
  createBookingSchema,
  listMineSchema,
  listAllSchema,
  bookingIdParamSchema,
};
