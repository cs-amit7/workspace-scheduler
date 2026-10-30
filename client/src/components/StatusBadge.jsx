/**
 * StatusBadge component displays the computed booking status badge.
 *
 * Badges:
 * - Upcoming: info colour
 * - Active: ok colour with a pulsing dot
 * - Completed: muted
 * - Cancelled: muted
 *
 * Renders nothing for unknown or missing statuses.
 *
 * @param {object} props
 * @param {'upcoming'|'active'|'completed'|'cancelled'} [props.status]
 */
export default function StatusBadge({ status }) {
  if (!status) {
    return null;
  }

  const normalized = String(status).toLowerCase();

  switch (normalized) {
    case 'upcoming':
      return (
        <span
          data-testid="status-badge"
          className="inline-flex items-center rounded-full border border-info/30 bg-info/15 px-2.5 py-0.5 text-xs font-medium text-info"
        >
          Upcoming
        </span>
      );

    case 'active':
      return (
        <span
          data-testid="status-badge"
          className="inline-flex items-center rounded-full border border-ok/30 bg-ok/15 px-2.5 py-0.5 text-xs font-medium text-ok"
        >
          <span className="relative mr-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
          </span>
          Active
        </span>
      );

    case 'completed':
      return (
        <span
          data-testid="status-badge"
          className="inline-flex items-center rounded-full border border-line bg-panel-2 px-2.5 py-0.5 text-xs font-medium text-muted"
        >
          Completed
        </span>
      );

    case 'cancelled':
      return (
        <span
          data-testid="status-badge"
          className="inline-flex items-center rounded-full border border-line bg-panel-2 px-2.5 py-0.5 text-xs font-medium text-muted"
        >
          Cancelled
        </span>
      );

    default:
      return null;
  }
}
