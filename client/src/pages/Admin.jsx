import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import useResources from '../hooks/useResources.js';
import useAllBookings from '../hooks/useAllBookings.js';
import useNow from '../hooks/useNow.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { listResources, disableResource, updateResource } from '../api/resources.js';
import { cancelBooking } from '../api/bookings.js';
import ResourceForm from '../components/ResourceForm.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Pagination from '../components/Pagination.jsx';
import Skeleton from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import AmenityBadge from '../components/AmenityBadge.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Container from '../components/Container.jsx';
import { getBookingStatus, isCancellable } from '../utils/status.js';
import { formatLocalRange, localDayWindowUtc } from '../utils/time.js';
import { formatLongDate } from '../utils/format.js';

export default function Admin() {
  useDocumentTitle('Admin | Workspace');

  const [searchParams, setSearchParams] = useSearchParams();
  const now = useNow();

  // Active tab: 'resources' (default) or 'bookings'
  const activeTab = searchParams.get('tab') === 'bookings' ? 'bookings' : 'resources';

  const resourcesTabRef = useRef(null);
  const bookingsTabRef = useRef(null);

  // General notices and alerts
  const [notice, setNotice] = useState(null);
  const [alertError, setAlertError] = useState(null);

  // -------------------------------------------------------------
  // RESOURCES TAB STATE & HOOKS
  // -------------------------------------------------------------
  const urlResourcePage = parseInt(searchParams.get('page') || '1', 10);
  const resourcePage = isNaN(urlResourcePage) || urlResourcePage < 1 ? 1 : urlResourcePage;
  const urlQ = searchParams.get('q') || '';
  const resourceTypeFilter = searchParams.get('type') || '';
  const showDisabledParam = searchParams.get('showDisabled');
  const showDisabled = showDisabledParam !== 'false'; // Defaults to true

  const [searchInput, setSearchInput] = useState(urlQ);

  useEffect(() => {
    setSearchInput(urlQ);
  }, [urlQ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== urlQ) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (trimmed) {
            next.set('q', trimmed);
          } else {
            next.delete('q');
          }
          next.delete('page');
          return next;
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, urlQ, setSearchParams]);

  const resourceParams = useMemo(() => {
    const params = {
      page: resourcePage,
      limit: 12,
    };
    if (showDisabled) {
      params.includeInactive = true;
    }
    if (urlQ) {
      params.q = urlQ;
    }
    if (resourceTypeFilter) {
      params.type = resourceTypeFilter;
    }
    return params;
  }, [resourcePage, showDisabled, urlQ, resourceTypeFilter]);

  const {
    items: resourceItems,
    meta: resourceMeta,
    loading: resourceLoading,
    error: resourceError,
    reload: reloadResources,
  } = useResources(resourceParams);

  // Modals & action states for Resources
  const [formOpen, setFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);

  const [disablingResource, setDisablingResource] = useState(null);
  const [disableBusy, setDisableBusy] = useState(false);
  const [disableError, setDisableError] = useState(null);

  // -------------------------------------------------------------
  // BOOKINGS TAB STATE & HOOKS
  // -------------------------------------------------------------
  const urlBookingPage = parseInt(searchParams.get('page') || '1', 10);
  const bookingPage = isNaN(urlBookingPage) || urlBookingPage < 1 ? 1 : urlBookingPage;
  const bookingStatus = searchParams.get('status') || '';
  const bookingResourceId = searchParams.get('resourceId') || '';
  const bookingFrom = searchParams.get('from') || '';
  const bookingTo = searchParams.get('to') || '';

  // Date range validation
  const isDateRangeInvalid = Boolean(bookingFrom && bookingTo && bookingFrom > bookingTo);
  const fromUtc = bookingFrom && !isDateRangeInvalid ? localDayWindowUtc(bookingFrom)?.from : undefined;
  const toUtc = bookingTo && !isDateRangeInvalid ? localDayWindowUtc(bookingTo)?.to : undefined;

  const [resourceOptions, setResourceOptions] = useState([]);

  useEffect(() => {
    if (activeTab !== 'bookings') {
      return;
    }
    let isMounted = true;
    listResources({ includeInactive: true, limit: 50 })
      .then((res) => {
        if (isMounted && res?.data) {
          setResourceOptions(res.data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  const bookingsHookParams = useMemo(
    () => ({
      status: bookingStatus || undefined,
      resourceId: bookingResourceId || undefined,
      from: fromUtc,
      to: toUtc,
      page: bookingPage,
      limit: 15,
      enabled: activeTab === 'bookings' && !isDateRangeInvalid,
    }),
    [activeTab, bookingStatus, bookingResourceId, fromUtc, toUtc, bookingPage, isDateRangeInvalid]
  );

  const {
    items: bookingsItems,
    meta: bookingsMeta,
    loading: bookingsLoading,
    error: bookingsError,
    reload: reloadBookings,
  } = useAllBookings(bookingsHookParams);

  // Booking Cancellation State
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(false);
  const [cancelBookingError, setCancelBookingError] = useState(null);

  // -------------------------------------------------------------
  // TAB HANDLERS
  // -------------------------------------------------------------
  const handleTabChange = (targetTab) => {
    setNotice(null);
    setAlertError(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (targetTab === 'bookings') {
        next.set('tab', 'bookings');
      } else {
        next.delete('tab');
      }
      next.delete('page');
      return next;
    });
  };

  const handleKeyDownTabs = (event, currentTab) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const targetTab = currentTab === 'resources' ? 'bookings' : 'resources';
      handleTabChange(targetTab);
      if (targetTab === 'bookings') {
        bookingsTabRef.current?.focus();
      } else {
        resourcesTabRef.current?.focus();
      }
    }
  };

  // -------------------------------------------------------------
  // RESOURCE HANDLERS
  // -------------------------------------------------------------
  function handleResourceTypeChange(e) {
    const nextType = e.target.value;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextType) {
        next.set('type', nextType);
      } else {
        next.delete('type');
      }
      next.delete('page');
      return next;
    });
  }

  function handleShowDisabledChange(e) {
    const checked = e.target.checked;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (checked) {
        next.delete('showDisabled');
      } else {
        next.set('showDisabled', 'false');
      }
      next.delete('page');
      return next;
    });
  }

  function handleResourcePageChange(newPage) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newPage > 1) {
        next.set('page', String(newPage));
      } else {
        next.delete('page');
      }
      return next;
    });
  }

  async function handleConfirmDisable() {
    if (!disablingResource) return;
    setDisableBusy(true);
    setDisableError(null);
    try {
      await disableResource(disablingResource._id);
      const disabledName = disablingResource.name;
      setDisablingResource(null);
      setNotice(`Resource "${disabledName}" disabled successfully.`);
      reloadResources();
    } catch (err) {
      setDisableError(err?.message || 'Failed to disable resource');
    } finally {
      setDisableBusy(false);
    }
  }

  async function handleEnable(res) {
    setAlertError(null);
    try {
      await updateResource(res._id, { isActive: true });
      setNotice(`Resource "${res.name}" enabled successfully.`);
      reloadResources();
    } catch (err) {
      setAlertError(err?.message || 'Failed to enable resource');
    }
  }

  // -------------------------------------------------------------
  // BOOKINGS HANDLERS
  // -------------------------------------------------------------
  function handleBookingStatusChange(e) {
    const val = e.target.value;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) {
        next.set('status', val);
      } else {
        next.delete('status');
      }
      next.delete('page');
      return next;
    });
  }

  function handleBookingResourceChange(e) {
    const val = e.target.value;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) {
        next.set('resourceId', val);
      } else {
        next.delete('resourceId');
      }
      next.delete('page');
      return next;
    });
  }

  function handleBookingDateChange(key, val) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) {
        next.set(key, val);
      } else {
        next.delete(key);
      }
      next.delete('page');
      return next;
    });
  }

  function handleBookingPageChange(newPage) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newPage > 1) {
        next.set('page', String(newPage));
      } else {
        next.delete('page');
      }
      return next;
    });
  }

  const handleConfirmCancelBooking = async () => {
    if (!bookingToCancel || cancellingBooking) {
      return;
    }

    setCancellingBooking(true);
    setCancelBookingError(null);

    const bookingId = bookingToCancel._id || bookingToCancel.id;
    const isLastItemOnPage = bookingsItems.length === 1 && bookingPage > 1;

    try {
      await cancelBooking(bookingId);
      setBookingToCancel(null);
      setCancellingBooking(false);
      setNotice('Booking cancelled. That time is free for others again.');

      if (isLastItemOnPage) {
        handleBookingPageChange(bookingPage - 1);
      } else {
        reloadBookings();
      }
    } catch (err) {
      setCancellingBooking(false);
      setCancelBookingError(err?.message || 'Failed to cancel booking.');

      const statusCode =
        err?.status ||
        err?.statusCode ||
        (typeof err?.code === 'number' ? err.code : null);

      if (statusCode === 404 || statusCode === 409) {
        reloadBookings();
      }
    }
  };

  const resourceTotalPages = resourceMeta?.total
    ? Math.ceil(resourceMeta.total / (resourceMeta.limit || 12))
    : 1;

  const bookingsTotalPages = bookingsMeta?.total
    ? Math.ceil(bookingsMeta.total / (bookingsMeta.limit || 15))
    : 1;

  return (
    <Container className="py-8">
      {/* Title & Toolbar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-sans text-ink">Admin</h1>
          <p className="mt-1 text-sm text-muted">Manage workspace rooms, desks, and bookings.</p>
        </div>
        {activeTab === 'resources' && (
          <button
            type="button"
            onClick={() => {
              setEditingResource(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New resource
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-line">
        <div role="tablist" aria-label="Admin management tabs" className="flex space-x-6">
          <button
            ref={resourcesTabRef}
            type="button"
            role="tab"
            id="tab-resources"
            aria-selected={activeTab === 'resources'}
            aria-controls="panel-resources"
            tabIndex={activeTab === 'resources' ? 0 : -1}
            onClick={() => handleTabChange('resources')}
            onKeyDown={(e) => handleKeyDownTabs(e, 'resources')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text ${
              activeTab === 'resources'
                ? 'border-brand-text text-brand-text'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Resources
          </button>
          <button
            ref={bookingsTabRef}
            type="button"
            role="tab"
            id="tab-bookings"
            aria-selected={activeTab === 'bookings'}
            aria-controls="panel-bookings"
            tabIndex={activeTab === 'bookings' ? 0 : -1}
            onClick={() => handleTabChange('bookings')}
            onKeyDown={(e) => handleKeyDownTabs(e, 'bookings')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text ${
              activeTab === 'bookings'
                ? 'border-brand-text text-brand-text'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Bookings
          </button>
        </div>
      </div>

      {/* Dismissible success notice */}
      {notice && (
        <div
          role="status"
          data-testid="admin-notice"
          className="mb-6 flex items-center justify-between rounded-lg border border-ok/30 bg-ok/10 p-4 text-sm text-ok"
        >
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notice"
            className="rounded p-1 text-ok/80 hover:text-ok focus:outline-none focus:ring-1 focus:ring-ok"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Alert banner for enable/general failures */}
      {alertError && (
        <div
          role="alert"
          data-testid="admin-alert"
          className="mb-6 flex items-center justify-between rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
        >
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{alertError}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlertError(null)}
            aria-label="Dismiss error"
            className="rounded p-1 text-danger/80 hover:text-danger focus:outline-none focus:ring-1 focus:ring-danger"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Tab Panel */}
      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {/* ========================================================= */}
        {/* RESOURCES TAB CONTENT                                     */}
        {/* ========================================================= */}
        {activeTab === 'resources' && (
          <div>
            {/* Toolbar filters */}
            <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-line bg-panel p-4">
              {/* Search Input */}
              <div className="min-w-[200px] flex-1">
                <label htmlFor="admin-search-input" className="sr-only">
                  Search resources
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    id="admin-search-input"
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by name..."
                    className="block w-full rounded-lg border border-line bg-panel-2 py-2 pl-9 pr-3 text-sm text-ink placeholder-muted focus:border-brand-text focus:outline-none focus:ring-1 focus:ring-brand-text"
                  />
                </div>
              </div>

              {/* Type Select */}
              <div className="w-40">
                <label htmlFor="admin-type-select" className="sr-only">
                  Filter by type
                </label>
                <select
                  id="admin-type-select"
                  value={resourceTypeFilter}
                  onChange={handleResourceTypeChange}
                  className="block w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink focus:border-brand-text focus:outline-none focus:ring-1 focus:ring-brand-text"
                >
                  <option value="">All types</option>
                  <option value="room">Rooms</option>
                  <option value="desk">Desks</option>
                </select>
              </div>

              {/* Show Disabled Checkbox */}
              <div className="flex items-center">
                <label
                  htmlFor="admin-show-disabled"
                  className="flex items-center gap-2 text-sm text-ink cursor-pointer select-none"
                >
                  <input
                    id="admin-show-disabled"
                    type="checkbox"
                    checked={showDisabled}
                    onChange={handleShowDisabledChange}
                    className="h-4 w-4 rounded border-line bg-panel-2 text-brand focus:ring-brand-text"
                  />
                  <span>Show disabled</span>
                </label>
              </div>
            </div>

            {/* Resources Table Area */}
            {resourceLoading ? (
              <div data-testid="admin-loading" className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : resourceError ? (
              <ErrorState
                title="Failed to load resources"
                message={resourceError.message || 'Unable to retrieve resource list.'}
                onRetry={reloadResources}
              />
            ) : resourceItems.length === 0 ? (
              <EmptyState
                title="No resources found"
                message="No resources match the selected filters."
              />
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-line bg-panel shadow-sm">
                  <table className="w-full border-collapse text-left text-sm text-ink">
                    <caption className="sr-only">Workspace resources</caption>
                    <thead className="sticky top-0 z-10 border-b border-line bg-panel text-xs uppercase tracking-wider text-muted">
                      <tr>
                        <th scope="col" className="px-4 py-3.5 font-semibold">
                          Name
                        </th>
                        <th scope="col" className="px-4 py-3.5 font-semibold">
                          Type
                        </th>
                        <th scope="col" className="px-4 py-3.5 font-semibold">
                          Capacity
                        </th>
                        <th scope="col" className="px-4 py-3.5 font-semibold">
                          Location
                        </th>
                        <th scope="col" className="px-4 py-3.5 font-semibold">
                          Amenities
                        </th>
                        <th scope="col" className="px-4 py-3.5 font-semibold">
                          Status
                        </th>
                        <th scope="col" className="px-4 py-3.5 font-semibold text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {resourceItems.map((res) => {
                        const isActive = res.isActive !== false;
                        return (
                          <tr
                            key={res._id}
                            data-testid={`resource-row-${res._id}`}
                            className="transition-colors hover:bg-panel-2"
                          >
                            <td className="px-4 py-3 font-medium text-ink">
                              <div className="font-semibold">{res.name}</div>
                              {res.description && (
                                <div className="truncate max-w-xs text-xs text-muted">{res.description}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 capitalize text-muted">{res.type}</td>
                            <td className="px-4 py-3 font-mono text-muted">{res.capacity}</td>
                            <td className="px-4 py-3 text-muted">{res.location}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {res.amenities && res.amenities.length > 0 ? (
                                  res.amenities.map((amenity) => (
                                    <AmenityBadge key={amenity} name={amenity} />
                                  ))
                                ) : (
                                  <span className="text-xs text-muted">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {isActive ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/30 bg-ok/10 px-2.5 py-0.5 text-xs font-medium text-ok">
                                  <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel-2 px-2.5 py-0.5 text-xs font-medium text-muted">
                                  Disabled
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingResource(res);
                                    setFormOpen(true);
                                  }}
                                  className="rounded border border-line bg-panel-2 px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-line/40 focus:outline-none focus:ring-1 focus:ring-brand-text"
                                >
                                  Edit
                                </button>
                                {isActive ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDisableError(null);
                                      setDisablingResource(res);
                                    }}
                                    className="rounded border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/20 focus:outline-none focus:ring-1 focus:ring-danger"
                                  >
                                    Disable
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleEnable(res)}
                                    className="rounded border border-ok/30 bg-ok/10 px-2.5 py-1 text-xs font-medium text-ok transition-colors hover:bg-ok/20 focus:outline-none focus:ring-1 focus:ring-ok"
                                  >
                                    Enable
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {resourceTotalPages > 1 && (
                  <div className="mt-6 flex justify-center">
                    <Pagination
                      page={resourcePage}
                      totalPages={resourceTotalPages}
                      onChange={handleResourcePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* BOOKINGS TAB CONTENT                                      */}
        {/* ========================================================= */}
        {activeTab === 'bookings' && (
          <div>
            {/* Toolbar filters for Bookings */}
            <div className="mb-6 rounded-lg border border-line bg-panel p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Status Filter */}
                <div>
                  <label
                    htmlFor="admin-booking-status"
                    className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted"
                  >
                    Status
                  </label>
                  <select
                    id="admin-booking-status"
                    value={bookingStatus}
                    onChange={handleBookingStatusChange}
                    className="block w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink focus:border-brand-text focus:outline-none focus:ring-1 focus:ring-brand-text"
                  >
                    <option value="">All</option>
                    <option value="confirmed">confirmed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>

                {/* Resource Filter */}
                <div>
                  <label
                    htmlFor="admin-booking-resource"
                    className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted"
                  >
                    Resource
                  </label>
                  <select
                    id="admin-booking-resource"
                    value={bookingResourceId}
                    onChange={handleBookingResourceChange}
                    className="block w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink focus:border-brand-text focus:outline-none focus:ring-1 focus:ring-brand-text"
                  >
                    <option value="">All resources</option>
                    {resourceOptions.map((res) => (
                      <option key={res._id} value={res._id}>
                        {res.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* From Date Filter */}
                <div>
                  <label
                    htmlFor="admin-booking-from"
                    className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted"
                  >
                    From
                  </label>
                  <input
                    id="admin-booking-from"
                    type="date"
                    value={bookingFrom}
                    onChange={(e) => handleBookingDateChange('from', e.target.value)}
                    className="block w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink focus:border-brand-text focus:outline-none focus:ring-1 focus:ring-brand-text"
                  />
                </div>

                {/* To Date Filter */}
                <div>
                  <label
                    htmlFor="admin-booking-to"
                    className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted"
                  >
                    To
                  </label>
                  <input
                    id="admin-booking-to"
                    type="date"
                    value={bookingTo}
                    onChange={(e) => handleBookingDateChange('to', e.target.value)}
                    className="block w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink focus:border-brand-text focus:outline-none focus:ring-1 focus:ring-brand-text"
                  />
                </div>
              </div>

              {/* Inline Date Range Error */}
              {isDateRangeInvalid && (
                <p
                  id="admin-booking-date-error"
                  role="alert"
                  className="mt-3 text-xs font-medium text-danger"
                >
                  From date must be on or before To date.
                </p>
              )}
            </div>

            {/* Bookings Table Area */}
            {bookingsLoading ? (
              <div data-testid="bookings-loading" className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : bookingsError ? (
              <ErrorState
                title="Failed to load bookings"
                message={bookingsError.message || 'Unable to retrieve bookings list.'}
                onRetry={reloadBookings}
              />
            ) : bookingsItems.length === 0 ? (
              <EmptyState
                title="No bookings found"
                message="No bookings match the selected filters."
              />
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-line bg-panel shadow-sm">
                  <table className="w-full border-collapse text-left text-sm text-ink">
                    <caption className="sr-only">All workspace bookings</caption>
                    <thead className="sticky top-0 z-10 border-b border-line bg-panel text-xs uppercase tracking-wider text-muted">
                      <tr>
                        <th scope="col" className="px-4 py-3.5 font-semibold">
                          Resource
                        </th>
                        <th scope="col" className="px-4 py-3.5 font-semibold">
                          User
                        </th>
                        <th scope="col" className="px-4 py-3.5 font-semibold">
                          Date
                        </th>
                        <th scope="col" className="px-4 py-3.5 font-semibold">
                          Time
                        </th>
                        <th scope="col" className="px-4 py-3.5 font-semibold">
                          Status
                        </th>
                        <th scope="col" className="px-4 py-3.5 font-semibold text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {bookingsItems.map((booking) => {
                        const cancellable = isCancellable(booking, now);
                        const computedStatus = getBookingStatus(booking, now);

                        return (
                          <tr
                            key={booking._id || booking.id}
                            data-testid={`booking-row-${booking._id || booking.id}`}
                            className="transition-colors hover:bg-panel-2"
                          >
                            <td className="px-4 py-3 font-medium text-ink">
                              <div className="font-semibold">
                                {booking.resource?.name || 'Unknown resource'}
                              </div>
                              {booking.resource?.location && (
                                <div className="text-xs text-muted">{booking.resource.location}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-ink">
                              <div className="font-medium">{booking.user?.name || 'Unknown user'}</div>
                              <div className="text-xs text-muted">{booking.user?.email || '—'}</div>
                            </td>
                            <td className="px-4 py-3 font-mono text-muted">
                              {formatLongDate(booking.start)}
                            </td>
                            <td className="px-4 py-3 font-mono text-muted">
                              {formatLocalRange(booking.start, booking.end)}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={computedStatus} />
                            </td>
                            <td className="px-4 py-3 text-right">
                              {cancellable ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancelBookingError(null);
                                    setBookingToCancel(booking);
                                  }}
                                  className="rounded border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/20 focus:outline-none focus:ring-1 focus:ring-danger"
                                >
                                  Cancel
                                </button>
                              ) : (
                                <span className="text-xs text-muted">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {bookingsTotalPages > 1 && (
                  <div className="mt-6 flex justify-center">
                    <Pagination
                      page={bookingPage}
                      totalPages={bookingsTotalPages}
                      onChange={handleBookingPageChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Resource Create / Edit Modal Form */}
      <ResourceForm
        open={formOpen}
        resource={editingResource}
        onClose={() => {
          setFormOpen(false);
          setEditingResource(null);
        }}
        onSuccess={(savedResource) => {
          const actionText = editingResource ? 'updated' : 'created';
          setNotice(`Resource "${savedResource?.name || editingResource?.name || ''}" ${actionText} successfully.`);
          reloadResources();
        }}
      />

      {/* Disable Resource Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(disablingResource)}
        title="Disable this resource?"
        message={`Are you sure you want to disable "${disablingResource?.name}"? Existing bookings stay, but nobody will be able to book it.`}
        confirmLabel="Disable"
        cancelLabel="Cancel"
        busy={disableBusy}
        error={disableError}
        onCancel={() => {
          if (!disableBusy) {
            setDisablingResource(null);
            setDisableError(null);
          }
        }}
        onConfirm={handleConfirmDisable}
      />

      {/* Cancel Booking Confirmation Dialog */}
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
              {bookingToCancel.user && (
                <p className="mt-1 text-xs text-muted">
                  Booked by: {bookingToCancel.user.name} ({bookingToCancel.user.email})
                </p>
              )}
              <p className="mt-3 text-sm text-muted">
                Cancelling this booking frees the time for others again.
              </p>
            </div>
          )
        }
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        busyLabel="Cancelling..."
        busy={cancellingBooking}
        error={cancelBookingError}
        onConfirm={handleConfirmCancelBooking}
        onCancel={() => {
          if (!cancellingBooking) {
            setBookingToCancel(null);
            setCancelBookingError(null);
          }
        }}
      />
    </Container>
  );
}
