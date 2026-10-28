import { Link } from 'react-router-dom';
import AmenityBadge from './AmenityBadge.jsx';

/**
 * ResourceCard component for room and desk items.
 *
 * @param {object} props
 * @param {object} props.resource
 * @param {string} props.resource._id
 * @param {string} props.resource.name
 * @param {'room'|'desk'} props.resource.type
 * @param {number} props.resource.capacity
 * @param {string} props.resource.location
 * @param {string[]} [props.resource.amenities]
 */
export default function ResourceCard({ resource }) {
  if (!resource) {
    return null;
  }

  const {
    _id,
    id,
    name,
    type = 'room',
    capacity = 1,
    location,
    amenities = [],
  } = resource;

  const resourceId = _id || id;
  const isRoom = type === 'room';
  const leftColorClass = isRoom ? 'border-l-type-room' : 'border-l-type-desk';

  return (
    <article
      data-testid="resource-card"
      className={`flex flex-col justify-between rounded-lg border border-line ${leftColorClass} border-l-4 bg-panel p-5 transition-colors hover:border-r-muted/50 hover:border-t-muted/50 hover:border-b-muted/50`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
              {type}
            </span>
            <h3 className="truncate text-base font-semibold text-ink" title={name}>
              {name}
            </h3>
            {location && (
              <p className="mt-0.5 text-xs text-muted truncate">{location}</p>
            )}
          </div>

          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center bg-panel-2 text-xs font-mono font-bold text-ink"
            style={{
              clipPath:
                'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
            }}
            aria-label={`Capacity ${capacity}`}
            title={`Capacity ${capacity}`}
          >
            {capacity}
          </div>
        </div>

        {amenities.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5" aria-label="Amenities">
            {amenities.map((amenity) => (
              <AmenityBadge key={amenity} name={amenity} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-line/50 pt-3">
        <Link
          to={`/resources/${resourceId}`}
          className="inline-flex items-center text-sm font-medium text-brand-text hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text rounded transition-colors"
        >
          View slots
        </Link>
      </div>
    </article>
  );
}
