export default function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  retryText = 'Try again',
  onRetry,
  action,
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-lg border border-danger/30 bg-panel p-8 text-center"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-danger/40 bg-danger/10 text-danger">
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
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-muted max-w-sm">{message}</p>
      {action && <div className="mt-4">{action}</div>}
      {!action && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-panel-2 px-4 py-2 text-sm font-medium text-ink border border-line transition-colors hover:border-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text"
        >
          {retryText}
        </button>
      )}
    </div>
  );
}
