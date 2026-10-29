import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import useResources from '../hooks/useResources.js';
import ResourceCard from '../components/ResourceCard.jsx';
import Pagination from '../components/Pagination.jsx';
import Skeleton from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import StatStrip from '../components/StatStrip.jsx';
import FilterBar from '../components/FilterBar.jsx';
import { localToUtcIso } from '../utils/time.js';

/**
 * Dashboard page displaying:
 * - Slim hero banner (.bg-brand-gradient)
 * - StatStrip with 4 parallel metric counters
 * - FilterBar with full URL search query synchronization
 * - Resources grid with pagination, loading skeletons, and empty/error states
 */
export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();

  const pageParam = parseInt(searchParams.get('page'), 10);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const date = searchParams.get('date') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  // Availability is applied only when date, from, and to are all set and from < to
  const isAvailabilityValid = Boolean(date && from && to && from < to);
  const availableFrom = isAvailabilityValid ? localToUtcIso(date, from) : undefined;
  const availableTo = isAvailabilityValid ? localToUtcIso(date, to) : undefined;

  const type = searchParams.get('type') || undefined;
  const minCapacity = searchParams.get('minCapacity') || undefined;
  const amenities = searchParams.getAll('amenity');
  const q = searchParams.get('q') || undefined;

  const queryParams = useMemo(
    () => ({
      page,
      limit: 12,
      ...(type ? { type } : {}),
      ...(minCapacity ? { minCapacity } : {}),
      ...(amenities.length > 0 ? { amenity: amenities } : {}),
      ...(q ? { q } : {}),
      ...(availableFrom ? { availableFrom } : {}),
      ...(availableTo ? { availableTo } : {}),
    }),
    [page, type, minCapacity, amenities, q, availableFrom, availableTo]
  );

  const { items, meta, loading, error, slow, reload } = useResources(queryParams);

  const totalPages =
    meta && meta.total && meta.limit
      ? Math.max(1, Math.ceil(meta.total / meta.limit))
      : 1;

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

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="sr-only">Dashboard</h1>

      {/* Slim hero */}
      <div className="mb-6 rounded-lg bg-brand-gradient p-6 text-white sm:p-8">
        <h2 className="font-sans text-2xl font-bold sm:text-3xl">Find your spot.</h2>
        <p className="mt-1 text-sm text-white/90">Book rooms & desks in seconds.</p>
      </div>

      {/* Stat counters strip */}
      <div className="mb-6">
        <StatStrip />
      </div>

      {/* Filter bar */}
      <div className="mb-6">
        <FilterBar onClear={handleClearFilters} />
      </div>

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

      {loading && (
        <div
          data-testid="resources-loading"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              data-testid="resource-skeleton-card"
              className="flex flex-col justify-between rounded-lg border border-line bg-panel p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-7 w-7 rounded" />
                </div>
                <div className="mt-4 flex gap-1.5">
                  <Skeleton className="h-5 w-14 rounded" />
                  <Skeleton className="h-5 w-16 rounded" />
                </div>
              </div>
              <div className="mt-6 border-t border-line/50 pt-3">
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <ErrorState
          title="Failed to load resources"
          message={error.message || 'An error occurred while fetching resources.'}
          retryText="Retry"
          onRetry={reload}
        />
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="No resources found"
          message="No resources match your filters."
          actionText="Clear filters"
          onAction={handleClearFilters}
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div
            data-testid="resources-grid"
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {items.map((resource) => (
              <ResourceCard
                key={resource._id || resource.id}
                resource={resource}
              />
            ))}
          </div>

          <div className="mt-8">
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={handlePageChange}
            />
          </div>
        </>
      )}
    </div>
  );
}
