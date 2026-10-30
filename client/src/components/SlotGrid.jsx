import { useState, useRef, useEffect } from 'react';
import { nextSelection } from '../utils/selection.js';

/**
 * SlotGrid component for browsing and selecting 30-minute availability cells.
 *
 * @param {object} props
 * @param {Array<{ startIso: string, endIso: string, label: string, isPast?: boolean }>} props.cells
 * @param {Set<number>|Array<number>} [props.bookedIndexes=[]]
 * @param {object|null} [props.selection=null] Current selection { startIndex, endIndex, reason }
 * @param {(selection: object|null) => void} [props.onSelect] Selection change callback
 * @param {number} [props.columns=4] Column count for row-by-row arrow key navigation
 * @param {number} [props.maxCells=8] Maximum selectable 30-minute cells (4 hours)
 */
export default function SlotGrid({
  cells = [],
  bookedIndexes = [],
  selection = null,
  onSelect,
  columns = 4,
  maxCells = 8,
}) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [localReason, setLocalReason] = useState(null);
  const cellRefs = useRef([]);

  const startIndex = selection?.startIndex ?? selection?.start ?? null;
  const endIndex = selection?.endIndex ?? selection?.end ?? null;
  const activeReason = selection?.reason || localReason;

  const isBooked = (idx) => {
    if (!bookedIndexes) return false;
    if (bookedIndexes instanceof Set) return bookedIndexes.has(idx);
    if (Array.isArray(bookedIndexes)) return bookedIndexes.includes(idx);
    return false;
  };

  const isPast = (idx) => {
    const cell = cells[idx];
    if (!cell) return false;
    if (typeof cell.isPast === 'boolean') return cell.isPast;
    if (cell.startIso) {
      const time = new Date(cell.startIso).getTime();
      if (!Number.isNaN(time)) {
        return time <= Date.now();
      }
    }
    return false;
  };

  const handleCellClick = (idx) => {
    const next = nextSelection(selection, idx, cells, bookedIndexes, maxCells);
    if (next?.reason) {
      setLocalReason(next.reason);
    } else {
      setLocalReason(null);
    }
    if (onSelect) {
      onSelect(next);
    }
  };

  const handleKeyDown = (e, idx) => {
    let targetIdx = null;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        targetIdx = Math.min(cells.length - 1, idx + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        targetIdx = Math.max(0, idx - 1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        targetIdx = Math.min(cells.length - 1, idx + columns);
        break;
      case 'ArrowUp':
        e.preventDefault();
        targetIdx = Math.max(0, idx - columns);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleCellClick(idx);
        return;
      default:
        return;
    }

    if (targetIdx !== null && targetIdx !== idx) {
      setFocusedIndex(targetIdx);
      cellRefs.current[targetIdx]?.focus();
    }
  };

  // Reset reason when selection is cleared or updated from outside
  useEffect(() => {
    if (!selection?.reason) {
      setLocalReason(null);
    }
  }, [selection]);

  return (
    <div className="w-full">
      <div
        role="grid"
        aria-label="Available slots"
        className="overflow-x-auto rounded-lg border border-line bg-panel p-4"
      >
        <div role="row" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {cells.map((cell, idx) => {
            const booked = isBooked(idx);
            const past = isPast(idx);
            const selected =
              startIndex !== null &&
              startIndex !== undefined &&
              endIndex !== null &&
              endIndex !== undefined &&
              idx >= startIndex &&
              idx <= endIndex;

            const isAriaDisabled = booked || past;

            let cellStyle = 'bg-panel-2 text-ink border-line hover:border-brand-text';
            if (selected) {
              cellStyle = 'bg-brand text-white border-brand shadow-sm';
            } else if (booked) {
              cellStyle = 'bg-booked-pattern text-muted border-line/60 cursor-not-allowed';
            } else if (past) {
              cellStyle = 'bg-panel text-muted/50 border-line/40 opacity-50 cursor-not-allowed';
            }

            return (
              <button
                key={cell.startIso || idx}
                ref={(el) => {
                  cellRefs.current[idx] = el;
                }}
                type="button"
                role="gridcell"
                tabIndex={focusedIndex === idx ? 0 : -1}
                aria-selected={selected}
                aria-disabled={isAriaDisabled ? 'true' : undefined}
                disabled={past}
                onClick={() => handleCellClick(idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className={`relative flex items-center justify-center rounded-lg border py-2 px-3 font-mono text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text ${cellStyle}`}
              >
                <span>{cell.label}</span>
                {booked && <span className="sr-only">Booked</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-xs font-mono text-muted" aria-hidden="true">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-brand" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-booked-pattern border border-line" />
          <span>Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-panel-2 border border-line" />
          <span>Free</span>
        </div>
      </div>

      {/* Inline reason alert */}
      {activeReason && (
        <div
          role="alert"
          data-testid="slot-grid-reason"
          className="mt-3 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs font-medium text-danger"
        >
          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {activeReason === 'booked' && 'Selected window cannot include booked slots.'}
            {activeReason === 'past' && 'Selected window cannot include past slots.'}
            {activeReason === 'too-long' && 'Bookings cannot exceed 4 hours (8 slots).'}
            {activeReason !== 'booked' && activeReason !== 'past' && activeReason !== 'too-long' && activeReason}
          </span>
        </div>
      )}
    </div>
  );
}
