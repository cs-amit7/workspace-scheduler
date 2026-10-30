import { describe, it, expect } from 'vitest';
import {
  localToUtcIso,
  utcIsoToLocalParts,
  localDayWindowUtc,
  buildDaySlots,
  formatLocalRange,
} from './time.js';

describe('time utils', () => {
  it('converts local date and time to a UTC ISO string and back (round-trip)', () => {
    const inputDate = '2026-10-05';
    const inputTime = '14:30';

    const iso = localToUtcIso(inputDate, inputTime);
    expect(iso).toBeDefined();
    expect(typeof iso).toBe('string');
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    const parts = utcIsoToLocalParts(iso);
    expect(parts).not.toBeNull();
    expect(parts.date).toBe(inputDate);
    expect(parts.time).toBe(inputTime);
    expect(parts.dateString).toBe(inputDate);
    expect(parts.timeString).toBe(inputTime);
  });

  it('handles midnight and end of day round-trips properly', () => {
    const midnightIso = localToUtcIso('2026-01-01', '00:00');
    const midnightParts = utcIsoToLocalParts(midnightIso);
    expect(midnightParts.date).toBe('2026-01-01');
    expect(midnightParts.time).toBe('00:00');

    const eodIso = localToUtcIso('2026-12-31', '23:30');
    const eodParts = utcIsoToLocalParts(eodIso);
    expect(eodParts.date).toBe('2026-12-31');
    expect(eodParts.time).toBe('23:30');
  });

  it('returns null for invalid or missing inputs', () => {
    expect(localToUtcIso(null, '10:00')).toBeNull();
    expect(localToUtcIso('2026-10-05', null)).toBeNull();
    expect(localToUtcIso('', '')).toBeNull();
    expect(localToUtcIso('not-a-date', '10:00')).toBeNull();
    expect(localToUtcIso('2026-10-05', 'invalid')).toBeNull();

    expect(utcIsoToLocalParts(null)).toBeNull();
    expect(utcIsoToLocalParts('')).toBeNull();
    expect(utcIsoToLocalParts('invalid-date-string')).toBeNull();
  });

  describe('localDayWindowUtc', () => {
    it('returns {from, to} as UTC ISO strings covering the local day [00:00, next 00:00)', () => {
      const window = localDayWindowUtc('2026-10-05');
      expect(window).not.toBeNull();
      expect(typeof window.from).toBe('string');
      expect(typeof window.to).toBe('string');

      const startParts = utcIsoToLocalParts(window.from);
      const endParts = utcIsoToLocalParts(window.to);
      expect(startParts.date).toBe('2026-10-05');
      expect(startParts.time).toBe('00:00');
      expect(endParts.date).toBe('2026-10-06');
      expect(endParts.time).toBe('00:00');

      const durationMs = new Date(window.to).getTime() - new Date(window.from).getTime();
      expect(durationMs).toBe(24 * 60 * 60 * 1000);
    });

    it('returns null for missing or invalid date strings', () => {
      expect(localDayWindowUtc(null)).toBeNull();
      expect(localDayWindowUtc('')).toBeNull();
      expect(localDayWindowUtc('invalid-date')).toBeNull();
    });
  });

  describe('buildDaySlots', () => {
    it('generates 30-minute cells with correct count and labels for default hours 7..22', () => {
      const slots = buildDaySlots('2026-10-05');
      // 15 hours * 2 = 30 slots
      expect(slots).toHaveLength(30);

      expect(slots[0].label).toBe('07:00');
      expect(slots[1].label).toBe('07:30');
      expect(slots[28].label).toBe('21:00');
      expect(slots[29].label).toBe('21:30');

      // Verify local time matches
      const firstStart = utcIsoToLocalParts(slots[0].startIso);
      const firstEnd = utcIsoToLocalParts(slots[0].endIso);
      expect(firstStart.time).toBe('07:00');
      expect(firstEnd.time).toBe('07:30');

      const lastEnd = utcIsoToLocalParts(slots[29].endIso);
      expect(lastEnd.time).toBe('22:00');
    });

    it('respects custom startHour and endHour options', () => {
      const slots = buildDaySlots('2026-10-05', { startHour: 9, endHour: 11 });
      // 2 hours * 2 = 4 slots: 09:00, 09:30, 10:00, 10:30
      expect(slots).toHaveLength(4);
      expect(slots.map((s) => s.label)).toEqual(['09:00', '09:30', '10:00', '10:30']);
    });

    it('returns empty array for invalid inputs', () => {
      expect(buildDaySlots(null)).toEqual([]);
      expect(buildDaySlots('')).toEqual([]);
      expect(buildDaySlots('invalid')).toEqual([]);
    });
  });

  describe('formatLocalRange', () => {
    it('formats range like "10:00-11:30 (1h 30m)"', () => {
      const startIso = localToUtcIso('2026-10-05', '10:00');
      const endIso = localToUtcIso('2026-10-05', '11:30');
      expect(formatLocalRange(startIso, endIso)).toBe('10:00-11:30 (1h 30m)');
    });

    it('formats single slot (30m) and exact hours (1h, 4h)', () => {
      const startIso = localToUtcIso('2026-10-05', '10:00');
      const slotEndIso = localToUtcIso('2026-10-05', '10:30');
      const oneHourEndIso = localToUtcIso('2026-10-05', '11:00');
      const fourHoursEndIso = localToUtcIso('2026-10-05', '14:00');

      expect(formatLocalRange(startIso, slotEndIso)).toBe('10:00-10:30 (30m)');
      expect(formatLocalRange(startIso, oneHourEndIso)).toBe('10:00-11:00 (1h)');
      expect(formatLocalRange(startIso, fourHoursEndIso)).toBe('10:00-14:00 (4h)');
    });

    it('returns empty string for missing or invalid ISO arguments', () => {
      expect(formatLocalRange(null, null)).toBe('');
      expect(formatLocalRange('2026-10-05T00:00:00Z', null)).toBe('');
    });
  });
});
