import { describe, it, expect } from 'vitest';
import { formatLongDate } from './format.js';

describe('formatLongDate', () => {
  it('formats a date into a short local date string like "Tue, 15 Jan 2030"', () => {
    // Construct local date to prevent timezone shift issues across environments
    const date = new Date(2030, 0, 15, 10, 30); // 15 Jan 2030, which was a Tuesday
    expect(formatLongDate(date)).toBe('Tue, 15 Jan 2030');
    expect(formatLongDate(date.toISOString())).toBe('Tue, 15 Jan 2030');
  });

  it('returns empty string for missing, null, or invalid input', () => {
    expect(formatLongDate('')).toBe('');
    expect(formatLongDate(null)).toBe('');
    expect(formatLongDate(undefined)).toBe('');
    expect(formatLongDate('invalid-date')).toBe('');
    expect(formatLongDate(NaN)).toBe('');
  });
});
