/**
 * Booking status and cancellation helper utilities.
 */

/**
 * Computes the client-side display status for a booking.
 *
 * Status rules:
 * - 'cancelled' if booking.status is 'cancelled' (overrides the clock)
 * - 'upcoming'  when now < start
 * - 'active'    when start <= now < end
 * - 'completed' when now >= end
 * - null        for missing or invalid input
 *
 * @param {object} booking Booking object with status, start, end
 * @param {Date|string|number} now Current reference time
 * @returns {'cancelled'|'upcoming'|'active'|'completed'|null}
 */
export function getBookingStatus(booking, now) {
  if (!booking || typeof booking !== 'object') {
    return null;
  }

  if (booking.status === 'cancelled') {
    return 'cancelled';
  }

  if (!now || !booking.start || !booking.end) {
    return null;
  }

  const nowDate = now instanceof Date ? now : new Date(now);
  const startDate = booking.start instanceof Date ? booking.start : new Date(booking.start);
  const endDate = booking.end instanceof Date ? booking.end : new Date(booking.end);

  const nowMs = nowDate.getTime();
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  if (Number.isNaN(nowMs) || Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return null;
  }

  if (nowMs < startMs) {
    return 'upcoming';
  }

  if (startMs <= nowMs && nowMs < endMs) {
    return 'active';
  }

  if (nowMs >= endMs) {
    return 'completed';
  }

  return null;
}

/**
 * Determines whether a booking is cancellable.
 * True only for status 'confirmed' with end > now.
 *
 * @param {object} booking Booking object
 * @param {Date|string|number} now Current reference time
 * @returns {boolean}
 */
export function isCancellable(booking, now) {
  if (!booking || typeof booking !== 'object' || booking.status !== 'confirmed') {
    return false;
  }

  if (!now || !booking.end) {
    return false;
  }

  const nowDate = now instanceof Date ? now : new Date(now);
  const endDate = booking.end instanceof Date ? booking.end : new Date(booking.end);

  const nowMs = nowDate.getTime();
  const endMs = endDate.getTime();

  if (Number.isNaN(nowMs) || Number.isNaN(endMs)) {
    return false;
  }

  return endMs > nowMs;
}

export default {
  getBookingStatus,
  isCancellable,
};
