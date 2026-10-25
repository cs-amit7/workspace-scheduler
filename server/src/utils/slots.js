/**
 * slots.js — pure helpers for 30-minute slot alignment and expansion.
 *
 * Why pure functions here: keeps bookingService testable without DB mocks.
 */

const SLOT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Returns true if the Date is on a 30-minute UTC boundary with no sub-minute
 * precision (seconds === 0 && milliseconds === 0 && minutes is 0 or 30).
 *
 * @param {Date} date
 * @returns {boolean}
 */
export function isAligned(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return false;
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  const ms = date.getUTCMilliseconds();
  return (minutes === 0 || minutes === 30) && seconds === 0 && ms === 0;
}

/**
 * Returns an array of Date objects — one per 30-minute slot start — covering
 * the half-open interval [start, end).
 *
 * Precondition: start < end, both aligned (callers must validate first).
 *
 * @param {Date} start
 * @param {Date} end
 * @returns {Date[]}
 */
export function expandSlots(start, end) {
  const slots = [];
  let cursor = start.getTime();
  const endMs = end.getTime();
  while (cursor < endMs) {
    slots.push(new Date(cursor));
    cursor += SLOT_MS;
  }
  return slots;
}

export default { isAligned, expandSlots };
