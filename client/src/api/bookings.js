import client from './client.js';

/**
 * List the authenticated user's bookings with optional query parameters and AbortSignal.
 *
 * @param {object} [params={}] Query parameters (e.g. { when: 'upcoming'|'past'|'all', page, limit })
 * @param {object} [options={}]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ data: Array, meta?: object }>}
 */
export async function listMyBookings(params = {}, options = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return client(`/bookings/me${queryString ? `?${queryString}` : ''}`, {
    signal: options?.signal,
  });
}

/**
 * Cancel a booking by ID.
 * @param {string} id Booking ID
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ data: object }>}
 */
export async function cancelBooking(id, options = {}) {
  return client(`/bookings/${id}`, {
    method: 'DELETE',
    signal: options?.signal,
  });
}

/**
 * Create a booking. Times must be UTC ISO strings on 30-minute boundaries.
 * @param {{ resourceId: string, start: string, end: string }} booking
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function createBooking({ resourceId, start, end }, options = {}) {
  return client('/bookings', {
    method: 'POST',
    body: { resourceId, start, end },
    signal: options?.signal,
  });
}

export default {
  listMyBookings,
  createBooking,
  cancelBooking,
};