import { describe, it, expect } from 'vitest';
import { localToUtcIso, utcIsoToLocalParts } from './time.js';

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
});
