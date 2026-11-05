import { useState, useRef, useEffect } from 'react';
import useNow from '../hooks/useNow.js';
import { nextSlotBoundary, buildTeaserSlots, formatLocalRange } from '../utils/time.js';
import { nextSelection } from '../utils/selection.js';

export default function SlotTeaser({ now: propNow } = {}) {
  const hookNow = useNow(15000);
  const now = propNow ?? hookNow;

  const [selection, setSelection] = useState(null);
  const [hasClicked, setHasClicked] = useState(false);

  const boundary = nextSlotBoundary(now);
  const boundaryTime = boundary ? boundary.getTime() : null;
  const cells = buildTeaserSlots(now);

  const prevBoundaryTimeRef = useRef(boundaryTime);

  useEffect(() => {
    if (prevBoundaryTimeRef.current !== boundaryTime) {
      prevBoundaryTimeRef.current = boundaryTime;
      setSelection(null);
    }
  }, [boundaryTime]);

  const handleCellClick = (idx) => {
    if (!hasClicked) {
      setHasClicked(true);
    }

    const next = nextSelection(selection, idx, cells, [], 8);
    if (!next || next.startIndex === null || next.startIndex === undefined) {
      setSelection(null);
    } else {
      setSelection(next);
    }
  };

  const hasRange =
    selection &&
    selection.startIndex !== null &&
    selection.startIndex !== undefined &&
    selection.endIndex !== null &&
    selection.endIndex !== undefined;

  let statusText = 'Tap a slot to try it.';
  if (hasRange && cells[selection.startIndex] && cells[selection.endIndex]) {
    const rangeFormatted = formatLocalRange(
      cells[selection.startIndex].startIso,
      cells[selection.endIndex].endIso
    );
    statusText = `${rangeFormatted} Sign in to book it.`;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {cells.map((cell, idx) => {
          const isSelected =
            hasRange &&
            idx >= selection.startIndex &&
            idx <= selection.endIndex;

          const isFirstPulse = !hasClicked && idx === 0 && !isSelected;

          const cellClass = isSelected
            ? 'bg-brand text-white border-brand shadow-sm'
            : 'bg-panel-2 text-ink border-line hover:border-brand-text focus-visible:border-brand-text';

          const pulseClass = isFirstPulse ? 'animate-soft-pulse motion-reduce:animate-none' : '';

          return (
            <button
              key={cell.startIso}
              type="button"
              aria-pressed={isSelected ? 'true' : 'false'}
              onClick={() => handleCellClick(idx)}
              className={`relative flex items-center justify-center rounded-lg border py-2 px-3 font-mono text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text ${cellClass} ${pulseClass}`}
            >
              {cell.label}
            </button>
          );
        })}
      </div>

      <div
        role="status"
        aria-live="polite"
        className="text-center font-sans text-xs text-muted"
      >
        {statusText}
      </div>
    </div>
  );
}
