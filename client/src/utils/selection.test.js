import { describe, it, expect } from 'vitest';
import { nextSelection } from './selection.js';

describe('nextSelection', () => {
  // Mock 20 cells: 10 future, 2 past
  const mockCells = Array.from({ length: 20 }, (_, idx) => ({
    label: `${String(idx + 7).padStart(2, '0')}:00`,
    startIso: new Date(Date.now() + (idx + 1) * 3600 * 1000).toISOString(),
    isPast: false,
  }));

  it('selects one cell on first click', () => {
    const result = nextSelection(null, 3, mockCells, []);
    expect(result).not.toBeNull();
    expect(result.startIndex).toBe(3);
    expect(result.endIndex).toBe(3);
    expect(result.reason).toBeNull();
  });

  it('extends range when a second click is at or after the start', () => {
    const initial = { startIndex: 2, endIndex: 2, start: 2, end: 2 };
    const extended = nextSelection(initial, 5, mockCells, []);
    expect(extended).not.toBeNull();
    expect(extended.startIndex).toBe(2);
    expect(extended.endIndex).toBe(5);
    expect(extended.reason).toBeNull();
  });

  it('restarts selection on a click before the start', () => {
    const current = { startIndex: 5, endIndex: 7, start: 5, end: 7 };
    const restarted = nextSelection(current, 2, mockCells, []);
    expect(restarted).not.toBeNull();
    expect(restarted.startIndex).toBe(2);
    expect(restarted.endIndex).toBe(2);
    expect(restarted.reason).toBeNull();
  });

  it('blocks selection and returns reason "booked" when extending across a booked cell', () => {
    const current = { startIndex: 2, endIndex: 3, start: 2, end: 3 };
    const bookedIndexes = [4];
    const blocked = nextSelection(current, 6, mockCells, bookedIndexes);
    expect(blocked.startIndex).toBe(2);
    expect(blocked.endIndex).toBe(3);
    expect(blocked.reason).toBe('booked');
  });

  it('blocks selection when first click is on a booked cell', () => {
    const blocked = nextSelection(null, 4, mockCells, [4]);
    expect(blocked.startIndex).toBeNull();
    expect(blocked.reason).toBe('booked');
  });

  it('blocks selection and returns reason "too-long" when range exceeds maxCells (8)', () => {
    const current = { startIndex: 2, endIndex: 2, start: 2, end: 2 };
    // startIndex 2 to 10 is 9 cells (> 8 cells = 4 hours)
    const tooLong = nextSelection(current, 10, mockCells, [], 8);
    expect(tooLong.startIndex).toBe(2);
    expect(tooLong.endIndex).toBe(2);
    expect(tooLong.reason).toBe('too-long');

    // Exactly 8 cells (2 to 9) should succeed
    const valid8 = nextSelection(current, 9, mockCells, [], 8);
    expect(valid8.startIndex).toBe(2);
    expect(valid8.endIndex).toBe(9);
    expect(valid8.reason).toBeNull();
  });

  it('toggles off and returns null when clicking the only selected cell again', () => {
    const single = { startIndex: 4, endIndex: 4, start: 4, end: 4 };
    const cleared = nextSelection(single, 4, mockCells, []);
    expect(cleared).toBeNull();
  });

  it('reduces range when clicking the start cell of a multi-cell selection', () => {
    const range = { startIndex: 2, endIndex: 5, start: 2, end: 5 };
    const reduced = nextSelection(range, 2, mockCells, []);
    expect(reduced).not.toBeNull();
    expect(reduced.startIndex).toBe(2);
    expect(reduced.endIndex).toBe(2);
    expect(reduced.reason).toBeNull();

    // Clicking it again now toggles off
    const toggled = nextSelection(reduced, 2, mockCells, []);
    expect(toggled).toBeNull();
  });

  it('blocks selection and returns reason "past" when clicking or extending into a past cell', () => {
    const cellsWithPast = [
      { label: '07:00', isPast: true },
      { label: '07:30', isPast: false },
      { label: '08:00', isPast: false },
    ];

    // Clicking past cell directly
    const directPast = nextSelection(null, 0, cellsWithPast, []);
    expect(directPast.reason).toBe('past');

    // Extending from future into past (e.g. if cell became past)
    const futureSelected = { startIndex: 1, endIndex: 1, start: 1, end: 1 };
    const extendedIntoPast = nextSelection(futureSelected, 0, cellsWithPast, []);
    // Click before start restarts, but cell 0 is past
    expect(extendedIntoPast.reason).toBe('past');
  });
});
