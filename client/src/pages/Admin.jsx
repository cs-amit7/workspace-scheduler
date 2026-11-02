import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import useResources from '../hooks/useResources.js';
import { disableResource, updateResource } from '../api/resources.js';
import ResourceForm from '../components/ResourceForm.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Pagination from '../components/Pagination.jsx';
import Skeleton from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import AmenityBadge from '../components/AmenityBadge.jsx';

export default function Admin() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL query params
  const urlPage = parseInt(searchParams.get('page') || '1', 10);
  const page = isNaN(urlPage) || urlPage < 1 ? 1 : urlPage;
  const urlQ = searchParams.get('q') || '';
  const type = searchParams.get('type') || '';
  const showDisabledParam = searchParams.get('showDisabled');
  const showDisabled = showDisabledParam !== 'false'; // Defaults to true

  // Local state for debounced search
  const [searchInput, setSearchInput] = useState(urlQ);

  // Sync searchInput when urlQ changes externally
  useEffect(() => {
    setSearchInput(urlQ);
  }, [urlQ]);

  // Debounce search input (300ms) to URL
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

  // Build params for useResources hook
  const resourceParams = useMemo(() => {
    const params = {
      page,
      limit: 12,
    };
    if (showDisabled) {
      params.includeInactive = true;
    }
    if (urlQ) {
      params.q = urlQ;
    }
    if (type) {
      params.type = type;
    }
    return params;
  }, [page, showDisabled, urlQ, type]);

  const { items, meta, loading, error, reload } = useResources(resourceParams);

  // Modals & action states
  const [formOpen, setFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);

  const [disablingResource, setDisablingResource] = useState(null);
  const [disableBusy, setDisableBusy] = useState(false);
  const [disableError, setDisableError] = useState(null);

  // Notices and alerts
  const [notice, setNotice] = useState(null);
  const [alertError, setAlertError] = useState(null);

  function handleTypeChange(e) {
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
        next.delete('showDisabled'); // default is true
      } else {
        next.set('showDisabled', 'false');
      }
      next.delete('page');
      return next;
    });
  }

  function handlePageChange(newPage) {
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
      reload();
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
      reload();
    } catch (err) {
      setAlertError(err?.message || 'Failed to enable resource');
    }
  }

  const totalPages = meta?.total ? Math.ceil(meta.total / (meta.limit || 12)) : 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Title & Toolbar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-sans text-ink">Admin</h1>
          <p className="mt-1 text-sm text-muted">Manage workspace rooms, desks, and availability.</p>
        </div>
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
            value={type}
            onChange={handleTypeChange}
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

      {/* Main Content Area */}
      {loading ? (
        <div data-testid="admin-loading" className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to load resources"
          message={error.message || 'Unable to retrieve resource list.'}
          onRetry={reload}
        />
      ) : items.length === 0 ? (
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
                {items.map((res) => {
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

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
            </div>
          )}
        </>
      )}

      {/* Create / Edit Modal Form */}
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
          reload();
        }}
      />

      {/* Disable Confirmation Dialog */}
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
    </div>
  );
}
