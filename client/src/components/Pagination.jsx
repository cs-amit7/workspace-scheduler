/**
 * Pagination component with Previous, Next, and numbered page buttons.
 *
 * @param {object} props
 * @param {number} props.page Current page (1-based)
 * @param {number} props.totalPages Total number of pages
 * @param {(newPage: number) => void} props.onChange Page change callback
 */
export default function Pagination({ page = 1, totalPages = 1, onChange }) {
  if (totalPages <= 0) {
    return null;
  }

  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  // Generate page numbers
  const pages = [];
  for (let i = 1; i <= totalPages; i += 1) {
    pages.push(i);
  }

  const baseButtonClasses =
    'inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text';

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        disabled={isFirstPage}
        onClick={() => onChange && onChange(page - 1)}
        aria-label="Previous page"
        className={`${baseButtonClasses} ${
          isFirstPage
            ? 'cursor-not-allowed border-line bg-panel-2 text-muted opacity-50'
            : 'border-line bg-panel text-ink hover:bg-panel-2 hover:border-muted/50'
        }`}
      >
        Previous
      </button>

      <div className="flex items-center gap-1" role="group" aria-label="Page selection">
        {pages.map((p) => {
          const isActive = p === page;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChange && onChange(p)}
              aria-label={`Page ${p}`}
              aria-current={isActive ? 'page' : undefined}
              className={`${baseButtonClasses} h-9 min-w-[2.25rem] px-2.5 ${
                isActive
                  ? 'border-brand bg-brand font-semibold text-white'
                  : 'border-line bg-panel text-ink hover:bg-panel-2 hover:border-muted/50'
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={isLastPage}
        onClick={() => onChange && onChange(page + 1)}
        aria-label="Next page"
        className={`${baseButtonClasses} ${
          isLastPage
            ? 'cursor-not-allowed border-line bg-panel-2 text-muted opacity-50'
            : 'border-line bg-panel text-ink hover:bg-panel-2 hover:border-muted/50'
        }`}
      >
        Next
      </button>
    </nav>
  );
}
