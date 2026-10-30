/**
 * Helper to check if a slot index is booked.
 * Supports Set or Array of booked indices.
 *
 * @param {number} idx
 * @param {Set<number>|Array<number>} bookedIndexes
 * @returns {boolean}
 */
function isIndexBooked(idx, bookedIndexes) {
  if (!bookedIndexes) return false;
  if (bookedIndexes instanceof Set) return bookedIndexes.has(idx);
  if (Array.isArray(bookedIndexes)) return bookedIndexes.includes(idx);
  return false;
}

/**
 * Helper to check if a slot index is in the past.
 * Checks explicit `isPast` flag on cell or compares `startIso` with current time.
 *
 * @param {number} idx
 * @param {Array<{ startIso?: string, isPast?: boolean }>} cells
 * @returns {boolean}
 */
function isIndexPast(idx, cells) {
  const cell = cells?.[idx];
  if (!cell) return false;
  if (typeof cell.isPast === 'boolean') return cell.isPast;
  if (cell.startIso) {
    const time = new Date(cell.startIso).getTime();
    if (!Number.isNaN(time)) {
      return time <= Date.now();
    }
  }
  return false;
}

/**
 * Pure function to calculate the next slot selection state.
 *
 * Rules:
 * 1. First click selects one cell.
 * 2. A second click at or after the start extends the range to that cell (inclusive).
 * 3. A click before the start restarts the selection.
 * 4. A range may not include a booked or past cell and may not exceed maxCells (4 hours):
 *    in those cases return the current selection plus a reason string ('booked', 'past' or 'too-long').
 * 5. Clicking the only selected cell again clears it (returns null).
 *
 * @param {{ startIndex?: number, endIndex?: number, start?: number, end?: number }|null} current
 * @param {number} clickedIndex
 * @param {Array<object>} cells
 * @param {Set<number>|Array<number>} bookedIndexes
 * @param {number} [maxCells=8]
 * @returns {{ startIndex: number|null, endIndex: number|null, start: number|null, end: number|null, reason: string|null }|null}
 */
export function nextSelection(current, clickedIndex, cells, bookedIndexes, maxCells = 8) {
  if (clickedIndex < 0 || !cells || clickedIndex >= cells.length) {
    return current || null;
  }

  const currentStart = current?.startIndex ?? current?.start ?? null;
  const currentEnd = current?.endIndex ?? current?.end ?? null;
  const hasSelection = currentStart !== null && currentStart !== undefined;

  // Rule 5: Clicking the only selected cell again clears it.
  if (hasSelection && currentStart === currentEnd && clickedIndex === currentStart) {
    return null;
  }

  // Rule 1 & Rule 3: No active selection, or click before current start restarts selection
  if (!hasSelection || clickedIndex < currentStart) {
    if (isIndexBooked(clickedIndex, bookedIndexes)) {
      return {
        ...(current || {}),
        startIndex: currentStart,
        endIndex: currentEnd,
        start: currentStart,
        end: currentEnd,
        reason: 'booked',
      };
    }

    if (isIndexPast(clickedIndex, cells)) {
      return {
        ...(current || {}),
        startIndex: currentStart,
        endIndex: currentEnd,
        start: currentStart,
        end: currentEnd,
        reason: 'past',
      };
    }

    return {
      startIndex: clickedIndex,
      endIndex: clickedIndex,
      start: clickedIndex,
      end: clickedIndex,
      reason: null,
    };
  }

  // Rule 2 & Rule 4: Extending range [currentStart, clickedIndex]
  const count = clickedIndex - currentStart + 1;
  if (count > maxCells) {
    return {
      ...(current || {}),
      startIndex: currentStart,
      endIndex: currentEnd,
      start: currentStart,
      end: currentEnd,
      reason: 'too-long',
    };
  }

  // Verify none of the cells in the extended range are booked
  for (let i = currentStart; i <= clickedIndex; i += 1) {
    if (isIndexBooked(i, bookedIndexes)) {
      return {
        ...(current || {}),
        startIndex: currentStart,
        endIndex: currentEnd,
        start: currentStart,
        end: currentEnd,
        reason: 'booked',
      };
    }
  }

  // Verify none of the cells in the extended range are in the past
  for (let i = currentStart; i <= clickedIndex; i += 1) {
    if (isIndexPast(i, cells)) {
      return {
        ...(current || {}),
        startIndex: currentStart,
        endIndex: currentEnd,
        start: currentStart,
        end: currentEnd,
        reason: 'past',
      };
    }
  }

  return {
    startIndex: currentStart,
    endIndex: clickedIndex,
    start: currentStart,
    end: clickedIndex,
    reason: null,
  };
}

export default { nextSelection };
