import { useState, useMemo, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useResource } from '../hooks/useResource.js';
import { useAvailability } from '../hooks/useAvailability.js';
import { createBooking } from '../api/bookings.js';
import { localDayWindowUtc, buildDaySlots, formatLocalRange } from '../utils/time.js';
import DatePicker from '../components/DatePicker.jsx';
import SlotGrid from '../components/SlotGrid.jsx';
import AmenityBadge from '../components/AmenityBadge.jsx';
import Skeleton from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * ResourceDetail page: workspace info, DatePicker, availability SlotGrid and
 * the booking panel (select a window, confirm, handle conflicts).
 */
export default function ResourceDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Today's local date string (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const selectedDate = searchParams.get('date') || todayStr;

  const [selection, setSelection] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const inFlight = useRef(false);

  const {
    data: resource,
    loading: resourceLoading,
    error: resourceError,
    reload: reloadResource,
  } = useResource(id);

  // Local day as a UTC window [00:00, next 00:00)
  const dayWindow = useMemo(() => localDayWindowUtc(selectedDate), [selectedDate]);

  const {
    data: availability,
    loading: availLoading,
    error: availError,
    reload: reloadAvail,
  } = useAvailability(id, dayWindow);

  const cells = useMemo(() => buildDaySlots(selectedDate), [selectedDate]);

  // Map booked intervals to cell indexes
  const bookedIndexes = useMemo(() => {
    const set = new Set();
    const bookedList = availability?.booked || [];
    if (!cells.length || !bookedList.length) return set;

    cells.forEach((cell, idx) => {
      const cStart = new Date(cell.startIso).getTime();
      const cEnd = new Date(cell.endIso).getTime();
      const isBooked = bookedList.some((b) => {
        const bStart = new Date(b.start).getTime();
        const bEnd = new Date(b.end).getTime();
        return cStart < bEnd && cEnd > bStart;
      });
      if (isBooked) {
        set.add(idx);
      }
    });

    return set;
  }, [cells, availability]);

  // The chosen window as UTC ISO strings, or null until a range is picked
  const selectedWindow = useMemo(() => {
    if (!Number.isInteger(selection?.startIndex) || !Number.isInteger(selection?.endIndex)) {
      return null;
    }
    const startCell = cells[selection.startIndex];
    const endCell = cells[selection.endIndex];
    if (!startCell || !endCell) return null;
    return { start: startCell.startIso, end: endCell.endIso };
  }, [selection, cells]);

  const selectionSummary = selectedWindow
    ? formatLocalRange(selectedWindow.start, selectedWindow.end)
    : null;

  const handleSelect = (next) => {
    setBookingError(null);
    setConfirmation(null);
    setSelection(next);
  };

  const handleDateChange = (newDate) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('date', newDate);
      return next;
    });
    setSelection(null);
    setBookingError(null);
    setConfirmation(null);
  };

  const handleConfirm = async () => {
    if (!selectedWindow || inFlight.current) return;

    inFlight.current = true;
    setSubmitting(true);
    setBookingError(null);
    setConfirmation(null);

    try {
      await createBooking({
        resourceId: id,
        start: selectedWindow.start,
        end: selectedWindow.end,
      });
      setConfirmation(formatLocalRange(selectedWindow.start, selectedWindow.end));
      setSelection(null);
      reloadAvail();
    } catch (err) {
      if (err?.code === 'SLOT_TAKEN') {
        // Someone else got there first: refresh the grid so the taken slots show as booked.
        setBookingError('Someone just booked part of that time. Please pick another slot.');
        setSelection(null);
        reloadAvail();
      } else if (err?.status === 429) {
        setBookingError('Too many booking attempts. Please wait a few minutes and try again.');
      } else {
        setBookingError(err?.message || 'Could not complete the booking. Please try again.');
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  if (resourceLoading) {
    return (
      <div data-testid="resource-detail-loading" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (resourceError) {
    if (resourceError.status === 404) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-16">
          <EmptyState
            title="Resource not found"
            message="The workspace or room you are looking for does not exist or has been removed."
            action={
              <Link
                to="/"
                className="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text"
              >
                Back to dashboard
              </Link>
            }
          />
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorState
          title="Failed to load resource"
          message={resourceError.message || 'An unexpected error occurred.'}
          retryText="Retry"
          onRetry={reloadResource}
        />
      </div>
    );
  }

  if (!resource) {
    return null;
  }

  const {
    name,
    type = 'room',
    capacity = 1,
    location,
    amenities = [],
    description,
  } = resource;

  const isRoom = type === 'room';
  const leftColorClass = isRoom ? 'border-l-type-room' : 'border-l-type-desk';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs font-mono text-muted" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-brand-text transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-ink truncate">{name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left column: resource info and slot grid */}
        <div className="space-y-6 lg:col-span-2">
          <section className={`rounded-lg border border-line ${leftColorClass} border-l-4 bg-panel p-6`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
                  {type}
                </span>
                <h1 className="mt-0.5 text-2xl sm:text-3xl font-bold font-sans text-ink">
                  {name}
                </h1>
                {location && <p className="mt-1 text-sm text-muted font-sans">{location}</p>}
              </div>

              {/* Hexagon capacity badge */}
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center bg-panel-2 text-xs font-mono font-bold text-ink"
                style={{
                  clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                }}
                aria-label={`Capacity ${capacity}`}
                title={`Capacity ${capacity}`}
              >
                {capacity}
              </div>
            </div>

            {amenities.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2" aria-label="Amenities">
                {amenities.map((amenity) => (
                  <AmenityBadge key={amenity} name={amenity} />
                ))}
              </div>
            )}

            {description && (
              <p className="mt-4 text-sm text-muted leading-relaxed border-t border-line/50 pt-4">
                {description}
              </p>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink font-sans">Available slots</h2>
                <p className="text-xs text-muted">
                  Choose a date and select consecutive slots up to 4 hours.
                </p>
              </div>

              <DatePicker
                value={selectedDate}
                onChange={handleDateChange}
                label="Date"
                className="sm:w-64"
              />
            </div>

            {availError ? (
              <div className="mt-4">
                <ErrorState
                  title="Failed to load availability"
                  message={availError.message || 'Could not fetch booked slots.'}
                  retryText="Retry availability"
                  onRetry={reloadAvail}
                />
              </div>
            ) : availLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-48 w-full rounded-lg" />
              </div>
            ) : (
              <SlotGrid
                cells={cells}
                bookedIndexes={bookedIndexes}
                selection={selection}
                onSelect={handleSelect}
              />
            )}
          </section>
        </div>

        {/* Right column: booking panel */}
        <div>
          <div className="sticky top-6 rounded-lg border border-line bg-panel p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink font-sans">Book this {type}</h2>
            <p className="mt-1 text-xs text-muted">Select slots on the grid to create a booking.</p>

            <div className="mt-6 space-y-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
                  Date
                </span>
                <p className="mt-0.5 font-mono text-sm text-ink">{selectedDate}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted">
                  Times shown in your local time ({timeZone})
                </p>
              </div>

              <div className="border-t border-line/60 pt-4">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
                  Selected window
                </span>
                {selectionSummary ? (
                  <p
                    data-testid="selection-summary"
                    className="mt-1 font-mono text-base font-semibold text-brand-text"
                  >
                    {selectionSummary}
                  </p>
                ) : (
                  <p className="mt-1 text-xs italic text-muted">
                    No slots selected yet. Click a free slot to begin.
                  </p>
                )}
              </div>

              <div className="space-y-3 border-t border-line/60 pt-4">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!selectedWindow || submitting}
                  className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Booking...' : 'Confirm booking'}
                </button>

                {bookingError && (
                  <p
                    role="alert"
                    data-testid="booking-error"
                    className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger"
                  >
                    {bookingError}
                  </p>
                )}

                {confirmation && (
                  <div
                    role="status"
                    data-testid="booking-confirmation"
                    className="rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 text-xs text-ok"
                  >
                    <p className="font-semibold">Booked!</p>
                    <p className="mt-0.5 font-mono">
                      {selectedDate} {confirmation}
                    </p>
                    <Link
                      to="/my-bookings"
                      className="mt-1 inline-block underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text"
                    >
                      View my bookings
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}