import { describe, it, expect } from 'vitest';
import { getBookingStatus, isCancellable } from './status.js';

describe('status utilities', () => {
  describe('getBookingStatus', () => {
    const startIso = '2026-10-10T10:00:00.000Z';
    const endIso = '2026-10-10T11:30:00.000Z';
    const baseBooking = {
      status: 'confirmed',
      start: startIso,
      end: endIso,
    };

    it('returns null for missing or invalid inputs', () => {
      expect(getBookingStatus(null, new Date())).toBeNull();
      expect(getBookingStatus(undefined, new Date())).toBeNull();
      expect(getBookingStatus('invalid', new Date())).toBeNull();
      expect(getBookingStatus(baseBooking, null)).toBeNull();
      expect(getBookingStatus(baseBooking, 'not-a-date')).toBeNull();
      expect(getBookingStatus({ ...baseBooking, start: 'invalid' }, new Date())).toBeNull();
      expect(getBookingStatus({ ...baseBooking, end: 'invalid' }, new Date())).toBeNull();
    });

    it('returns "upcoming" when now < start', () => {
      const now = new Date('2026-10-10T09:59:59.999Z');
      expect(getBookingStatus(baseBooking, now)).toBe('upcoming');
    });

    it('boundary: returns "active" when now == start', () => {
      const now = new Date('2026-10-10T10:00:00.000Z');
      expect(getBookingStatus(baseBooking, now)).toBe('active');
    });

    it('returns "active" when start < now < end', () => {
      const now = new Date('2026-10-10T10:45:00.000Z');
      expect(getBookingStatus(baseBooking, now)).toBe('active');
    });

    it('boundary: returns "completed" when now == end', () => {
      const now = new Date('2026-10-10T11:30:00.000Z');
      expect(getBookingStatus(baseBooking, now)).toBe('completed');
    });

    it('returns "completed" when now > end', () => {
      const now = new Date('2026-10-10T12:00:00.000Z');
      expect(getBookingStatus(baseBooking, now)).toBe('completed');
    });

    it('returns "cancelled" overriding the clock even if now < start, during, or past end', () => {
      const cancelled = { ...baseBooking, status: 'cancelled' };

      expect(getBookingStatus(cancelled, new Date('2026-10-10T08:00:00.000Z'))).toBe('cancelled');
      expect(getBookingStatus(cancelled, new Date('2026-10-10T10:00:00.000Z'))).toBe('cancelled');
      expect(getBookingStatus(cancelled, new Date('2026-10-10T10:45:00.000Z'))).toBe('cancelled');
      expect(getBookingStatus(cancelled, new Date('2026-10-10T11:30:00.000Z'))).toBe('cancelled');
      expect(getBookingStatus(cancelled, new Date('2026-10-10T15:00:00.000Z'))).toBe('cancelled');
      // Even with null now or dates, status 'cancelled' returns 'cancelled'
      expect(getBookingStatus({ status: 'cancelled' }, null)).toBe('cancelled');
    });
  });

  describe('isCancellable', () => {
    const endIso = '2026-10-10T11:30:00.000Z';

    it('returns true only for status "confirmed" with end > now', () => {
      const booking = { status: 'confirmed', end: endIso };
      const beforeEnd = new Date('2026-10-10T11:29:59.000Z');
      expect(isCancellable(booking, beforeEnd)).toBe(true);
    });

    it('returns false when now == end or now > end', () => {
      const booking = { status: 'confirmed', end: endIso };
      const atEnd = new Date('2026-10-10T11:30:00.000Z');
      const afterEnd = new Date('2026-10-10T11:30:01.000Z');

      expect(isCancellable(booking, atEnd)).toBe(false);
      expect(isCancellable(booking, afterEnd)).toBe(false);
    });

    it('returns false when status is not "confirmed"', () => {
      const beforeEnd = new Date('2026-10-10T09:00:00.000Z');
      expect(isCancellable({ status: 'cancelled', end: endIso }, beforeEnd)).toBe(false);
      expect(isCancellable({ status: 'pending', end: endIso }, beforeEnd)).toBe(false);
    });

    it('returns false for missing or invalid inputs', () => {
      expect(isCancellable(null, new Date())).toBe(false);
      expect(isCancellable({}, new Date())).toBe(false);
      expect(isCancellable({ status: 'confirmed', end: 'invalid' }, new Date())).toBe(false);
      expect(isCancellable({ status: 'confirmed', end: endIso }, null)).toBe(false);
    });
  });
});
