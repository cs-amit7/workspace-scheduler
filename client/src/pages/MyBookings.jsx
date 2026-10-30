import { useState, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import useMyBookings from '../hooks/useMyBookings.js';
import useNow from '../hooks/useNow.js';
import BookingCard from '../components/BookingCard.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Pagination from '../components/Pagination.jsx';
import Skeleton from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { cancelBooking } from '../api/bookings.js';
import { formatLongDate } from '../utils/format.js';
import { formatLocalRange } from '../utils/time.js';

/**
 * MyBookings page displaying the authenticated user's bookings.
 *
 * Features:
 * - Upcoming and Past tabs with URL sync (?when=past) and keyboard navigation
 * - Times labelled with the user's local timezone
 * - Skeletons during loading, ErrorState with retry, cold-start notice
 * - Contextual empty states for Upcoming and Past
 * - Pagination only when totalPages > 1
 * - Accessible cancellation modal with double-submit guard and stale list recovery
 */
export default function MyBookings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const now = useNow();

  // Active tab: 'upcoming' (default) or 'past'
  const activeTab = searchParams.get('when') === 'past' ? 'past' : 'upcoming';

  const pageParam = parseInt(searchParams.get('page'), 10);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const { items, meta, loading, error, slow, reload } = useMyBookings({
    when: activeTab,
    page,
    limit: 10,
  });

  // Cancel dialog state
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  // Success notice state
  const [notice, setNotice] = useState(null);

  // Tab button refs for keyboard arrow navigation
  const upcomingTabRef = useRef(null);
  const pastTabRef = useRef(null);

  const timeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';
    } catch {
      return 'local';
    }
  }, []);

  const totalPages =
    meta && meta.total && meta.limit
      ? Math.max(1, Math.ceil(meta.total / meta.limit))
      : 1;

  const handleTabChange = (targetTab) => {
    setNotice(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (targetTab === 'past') {
        next.set('when', 'past');
      } else {
        next.delete('when');
      }
      next.delete('page');
      return next;
    });
  };

  const handleKeyDownTabs = (event, currentTab) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const targetTab = currentTab === 'upcoming' ? 'past' : 'upcoming';
      handleTabChange(targetTab);
      if (targetTab === 'past') {
        pastTabRef.current?.focus();
      } else {
        upcomingTabRef.current?.focus();
      }
    }
  };

  const handlePageChange = (newPage) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newPage <= 1) {
        next.delete('page');
      } else {
        next.set('page', String(newPage));
      }
      return next;
    });

    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo(0, 0);
    }
  };

  const handleOpenCancel = (booking) => {
    setCancelError(null);
    setBookingToCancel(booking);
  };

  const handleCloseCancel = () => {
    if (!cancelling) {
      setBookingToCancel(null);
      setCancelError(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel || cancelling) {
      return;
    }

    setCancelling(true);
    setCancelError(null);

    const bookingId = bookingToCancel._id || bookingToCancel.id;
    const isLastItemOnPage = items.length === 1 && page > 1;

    try {
      await cancelBooking(bookingId);
      setBookingToCancel(null);
      setCancelling(false);
      setNotice('Booking cancelled. That time is free for others again.');

      if (isLastItemOnPage) {
        // Page change triggers useMyBookings refetch; do not call reload()
        handlePageChange(page - 1);
      } else {
        reload();
      }
    } catch (err) {
      setCancelling(false);
      setCancelError(err?.message || 'Failed to cancel booking.');

      const statusCode =
        err?.status ||
        err?.statusCode ||
        (typeof err?.code === 'number' ? err.code : null);

      if (statusCode === 404 || statusCode === 409) {
        reload();
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold font-sans text-ink">My Bookings</h1>
        <p className="mt-1 text-sm text-muted">
          Times shown in your local time ({timeZone})
        </p>
      </header>

      {/* Tabs */}
      <div className="mb-6 border-b border-line">
        <div
          role="tablist"
          aria-label="Booking history tabs"
          className="flex space-x-6"
        >
          <button
            ref={upcomingTabRef}
            type="button"
            role="tab"
            id="tab-upcoming"
            aria-selected={activeTab === 'upcoming'}
            aria-controls="panel-upcoming"
            tabIndex={activeTab === 'upcoming' ? 0 : -1}
            onClick={() => handleTabChange('upcoming')}
            onKeyDown={(e) => handleKeyDownTabs(e, 'upcoming')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text ${
              activeTab === 'upcoming'
                ? 'border-brand-text text-brand-text'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Upcoming
          </button>

          <button
            ref={pastTabRef}
            type="button"
            role="tab"
            id="tab-past"
            aria-selected={activeTab === 'past'}
            aria-controls="panel-past"
            tabIndex={activeTab === 'past' ? 0 : -1}
            onClick={() => handleTabChange('past')}
            onKeyDown={(e) => handleKeyDownTabs(e, 'past')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text ${
              activeTab === 'past'
                ? 'border-brand-text text-brand-text'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Past
          </button>
        </div>
      </div>

      {/* Dismissible status notice */}
      {notice && (
        <div
          role="status"
          data-testid="cancel-notice"
          className="mb-6 flex items-center justify-between rounded-lg border border-ok/40 bg-ok/10 px-4 py-3 text-sm text-ok"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notice"
            className="ml-3 text-ok hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-brand-text rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Cold-start server notice */}
      {slow && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 flex items-center gap-2 rounded-lg border border-line bg-panel-2 px-4 py-3 text-sm text-amber"
        >
          <span className="h-2 w-2 rounded-full bg-amber animate-ping" />
          <span>Waking up the server, this can take up to a minute...</span>
        </div>
      )}

      {/* Tab panel */}
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {/* Loading skeletons */}
        {loading && (
          <div data-testid="bookings-loading" className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col justify-between rounded-lg border border-line bg-panel p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="mt-4">
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <ErrorState
            title="Failed to load bookings"
            message={error.message || 'An error occurred while fetching your bookings.'}
            retryText="Retry"
            onRetry={reload}
          />
        )}

        {/* Empty state */}
        {!loading && !error && items.length === 0 && (
          <>
            {activeTab === 'upcoming' ? (
              <EmptyState
                title="No upcoming bookings"
                message="You do not have any upcoming bookings scheduled."
                action={
                  <Link
                    to="/"
                    className="inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text"
                  >
                    Browse workspaces
                  </Link>
                }
              />
            ) : (
              <EmptyState
                title="No past bookings"
                message="You have no previous booking history."
              />
            )}
          </>
        )}

        {/* Bookings list */}
        {!loading && !error && items.length > 0 && (
          <>
            <div className="space-y-4">
              {items.map((booking) => (
                <BookingCard
                  key={booking._id || booking.id}
                  booking={booking}
                  now={now}
                  onCancel={handleOpenCancel}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirm cancel dialog */}
      <ConfirmDialog
        open={Boolean(bookingToCancel)}
        title="Cancel this booking?"
        message={
          bookingToCancel && (
            <div>
              <p className="font-semibold text-ink">
                {bookingToCancel.resource?.name || 'Unknown resource'}
              </p>
              <p className="mt-1 font-mono text-xs text-muted">
                {formatLongDate(bookingToCancel.start)} ·{' '}
                {formatLocalRange(bookingToCancel.start, bookingToCancel.end)}
              </p>
              <p className="mt-3 text-sm text-muted">
                Cancelling this booking frees the time for others again.
              </p>
            </div>
          )
        }
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        busyLabel="Cancelling..."
        busy={cancelling}
        error={cancelError}
        onConfirm={handleConfirmCancel}
        onCancel={handleCloseCancel}
      />
    </div>
  );
}
