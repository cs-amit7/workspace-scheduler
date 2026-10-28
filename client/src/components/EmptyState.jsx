export default function EmptyState({
  title = 'No results found',
  message = 'No items match your criteria.',
  actionText,
  onAction,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-panel p-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-line bg-panel-2 text-muted">
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-muted max-w-sm">{message}</p>
      {action && <div className="mt-4">{action}</div>}
      {!action && actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
