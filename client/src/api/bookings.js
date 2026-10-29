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

export default {
  listMyBookings,
};
