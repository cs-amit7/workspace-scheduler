import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';
import { getBookingStatus, isCancellable } from '../utils/status.js';
import { formatLongDate } from '../utils/format.js';
import { formatLocalRange } from '../utils/time.js';

/**
 * BookingCard component displays a single booking with resource info,
 * status badge, date/time, and a conditional cancel button.
 *
 * @param {object} props
 * @param {object} props.booking Booking object
 * @param {Date|string|number} props.now Current reference time
 * @param {(booking: object) => void} [props.onCancel] Callback when cancel button clicked
 */
export default function BookingCard({ booking, now, onCancel }) {
  if (!booking) {
    return null;
  }

  const { resource, start, end } = booking;
  const status = getBookingStatus(booking, now);
  const canCancel = isCancellable(booking, now);

  const resourceName = resource?.name || 'Unknown resource';
  const resourceId = resource?._id || resource?.id;
  const resourceType = resource?.type || 'room';
  const resourceLocation = resource?.location;

  const isRoom = resourceType === 'room';
  const leftColorClass = isRoom ? 'border-l-type-room' : 'border-l-type-desk';

  const dateStr = formatLongDate(start);
  const rangeStr = formatLocalRange(start, end);
  const isCancelled = status === 'cancelled';

  const cancelAriaLabel = `Cancel booking for ${resourceName} on ${dateStr}, ${rangeStr}`;

  return (
    <article
      data-testid="booking-card"
      className={`flex flex-col justify-between rounded-lg border border-line ${leftColorClass} border-l-4 bg-panel p-5 transition-colors`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
              {resourceType}
            </span>
            <div className="mt-0.5">
              {resource && resourceId ? (
                <Link
                  to={`/resources/${resourceId}`}
                  className="truncate text-base font-semibold text-ink hover:text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text rounded transition-colors block"
                  title={resourceName}
                >
                  {resourceName}
                </Link>
              ) : (
                <h3 className="truncate text-base font-semibold text-ink" title={resourceName}>
                  {resourceName}
                </h3>
              )}
            </div>
            {resourceLocation && (
              <p className="mt-0.5 truncate text-xs text-muted">{resourceLocation}</p>
            )}
          </div>

          <div className="flex-shrink-0">
            <StatusBadge status={status} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs font-mono text-muted">
          <span>{dateStr}</span>
          {dateStr && rangeStr && <span className="text-muted/60">·</span>}
          <span className={isCancelled ? 'line-through text-muted' : 'text-ink'}>
            {rangeStr}
          </span>
        </div>
      </div>

      {canCancel && (
        <div className="mt-5 border-t border-line/50 pt-3 flex justify-end">
          <button
            type="button"
            aria-label={cancelAriaLabel}
            onClick={() => onCancel?.(booking)}
            className="rounded border border-line bg-panel-2 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-danger hover:text-danger focus:outline-none focus:ring-2 focus:ring-brand-text"
          >
            Cancel booking
          </button>
        </div>
      )}
    </article>
  );
}
