import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AMENITIES } from '../utils/amenities.js';

/**
 * FilterBar component managing dashboard search and filtering controls.
 *
 * All filters are synced directly with the URL search parameters:
 * - type: '' | 'room' | 'desk'
 * - minCapacity: number string
 * - amenity: repeated string query param
 * - q: text search (debounced 300ms)
 * - date, from, to: availability inputs (with inline validation)
 *
 * Changing any filter resets the page param.
 */
export default function FilterBar({ onClear }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const type = searchParams.get('type') || '';
  const minCapacity = searchParams.get('minCapacity') || '';
  const selectedAmenities = searchParams.getAll('amenity');
  const urlQ = searchParams.get('q') || '';
  const date = searchParams.get('date') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  // Local state for debouncing text search
  const [searchInput, setSearchInput] = useState(urlQ);

  // Keep search input in sync if URL query parameter changes externally
  useEffect(() => {
    setSearchInput(urlQ);
  }, [urlQ]);

  // Debounce search text input by 300 ms
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      const current = searchParams.get('q') || '';
      if (trimmed !== current) {
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
  }, [searchInput, searchParams, setSearchParams]);

  // Availability validation
  const hasAnyAvailability = Boolean(date || from || to);
  const hasAllAvailability = Boolean(date && from && to);
  const isAvailabilityInverted = hasAllAvailability && from >= to;

  let availabilityError = '';
  if (hasAnyAvailability && !hasAllAvailability) {
    availabilityError = 'Date, start time, and end time are all required.';
  } else if (isAvailabilityInverted) {
    availabilityError = 'Start time must be earlier than end time.';
  }

  const handleTypeChange = (e) => {
    const val = e.target.value;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) {
        next.set('type', val);
      } else {
        next.delete('type');
      }
      next.delete('page');
      return next;
    });
  };

  const handleCapacityChange = (e) => {
    const val = e.target.value;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val && parseInt(val, 10) > 0) {
        next.set('minCapacity', val);
      } else {
        next.delete('minCapacity');
      }
      next.delete('page');
      return next;
    });
  };

  const handleAmenityToggle = (amenityName, checked) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const current = next.getAll('amenity');
      next.delete('amenity');

      const updated = checked
        ? [...current, amenityName]
        : current.filter((item) => item !== amenityName);

      for (const item of updated) {
        next.append('amenity', item);
      }
      next.delete('page');
      return next;
    });
  };

  const handleAvailabilityChange = (key, val) => {
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
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
    if (typeof onClear === 'function') {
      onClear();
    }
  };

  return (
    <div
      data-testid="filter-bar"
      className="space-y-4 rounded-lg border border-line bg-panel p-4"
    >
      {/* Top row: Search, Type, Min Capacity, Clear */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div>
          <label
            htmlFor="filter-search"
            className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted"
          >
            Search
          </label>
          <input
            id="filter-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name..."
            className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand-text focus:outline-none focus:ring-1 focus:ring-brand-text"
          />
        </div>

        {/* Type Select */}
        <div>
          <label
            htmlFor="filter-type"
            className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted"
          >
            Type
          </label>
          <select
            id="filter-type"
            value={type}
            onChange={handleTypeChange}
            className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink focus:border-brand-text focus:outline-none focus:ring-1 focus:ring-brand-text"
          >
            <option value="">All</option>
            <option value="room">Room</option>
            <option value="desk">Desk</option>
          </select>
        </div>

        {/* Minimum Capacity */}
        <div>
          <label
            htmlFor="filter-min-capacity"
            className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted"
          >
            Min Capacity
          </label>
          <input
            id="filter-min-capacity"
            type="number"
            min="1"
            value={minCapacity}
            onChange={handleCapacityChange}
            placeholder="e.g. 4"
            className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand-text focus:outline-none focus:ring-1 focus:ring-brand-text"
          />
        </div>

        {/* Clear Filters Button */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleClearFilters}
            className="w-full rounded-lg border border-line bg-panel-2 px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-panel hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text"
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* Middle row: Availability inputs (Date, From, To) */}
      <div className="rounded-lg border border-line/60 bg-panel-2/50 p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label
              htmlFor="filter-date"
              className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted"
            >
              Date
            </label>
            <input
              id="filter-date"
              type="date"
              value={date}
              onChange={(e) => handleAvailabilityChange('date', e.target.value)}
              className="w-full rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-sm text-ink focus:border-brand-text focus:outline-none focus:ring-1 focus:ring-brand-text"
            />
          </div>

          <div>
            <label
              htmlFor="filter-from"
              className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted"
            >
              From
            </label>
            <input
              id="filter-from"
              type="time"
              step="1800"
              value={from}
              onChange={(e) => handleAvailabilityChange('from', e.target.value)}
              className="w-full rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-sm text-ink focus:border-brand-text focus:outline-none focus:ring-1 focus:ring-brand-text"
            />
          </div>

          <div>
            <label
              htmlFor="filter-to"
              className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted"
            >
              To
            </label>
            <input
              id="filter-to"
              type="time"
              step="1800"
              value={to}
              onChange={(e) => handleAvailabilityChange('to', e.target.value)}
              className="w-full rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-sm text-ink focus:border-brand-text focus:outline-none focus:ring-1 focus:ring-brand-text"
            />
          </div>
        </div>

        {/* Inline availability validation error */}
        {availabilityError && (
          <p
            id="availability-error"
            role="alert"
            className="mt-2 text-xs font-medium text-danger"
          >
            {availabilityError}
          </p>
        )}
      </div>

      {/* Bottom section: Amenities checkbox group */}
      <fieldset className="space-y-2 border-t border-line/50 pt-3">
        <legend className="text-xs font-medium uppercase tracking-wider text-muted">
          Amenities
        </legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {AMENITIES.map((amenity) => {
            const isChecked = selectedAmenities.includes(amenity);
            return (
              <label
                key={amenity}
                htmlFor={`amenity-${amenity.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                className="flex cursor-pointer select-none items-center gap-2 text-xs text-ink"
              >
                <input
                  id={`amenity-${amenity.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  type="checkbox"
                  value={amenity}
                  checked={isChecked}
                  onChange={(e) => handleAmenityToggle(amenity, e.target.checked)}
                  className="h-4 w-4 rounded border-line bg-panel-2 text-brand focus:ring-2 focus:ring-brand-text"
                />
                <span>{amenity}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
