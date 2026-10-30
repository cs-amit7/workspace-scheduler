import { useId } from 'react';

/**
 * Format a Date object to YYYY-MM-DD local string.
 * @param {Date} date
 * @returns {string}
 */
function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse a YYYY-MM-DD string to a Date object at local midnight.
 * @param {string} str
 * @returns {Date}
 */
function fromDateString(str) {
  if (!str || typeof str !== 'string') {
    return new Date();
  }
  const [y, m, d] = str.split('-').map((n) => parseInt(n, 10));
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) {
    return new Date();
  }
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * DatePicker component with labelled date input, previous-day, and next-day buttons.
 * Constrained to [today, today + 30 days].
 *
 * @param {object} props
 * @param {string} props.value Current date (YYYY-MM-DD)
 * @param {(newDate: string) => void} props.onChange Callback when date changes
 * @param {string} [props.label='Date'] Accessible label
 * @param {string} [props.className]
 */
export default function DatePicker({
  value,
  onChange,
  label = 'Date',
  className = '',
}) {
  const inputId = useId();

  const now = new Date();
  const minDateStr = toDateString(now);

  const maxDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);
  const maxDateStr = toDateString(maxDate);

  const currentDateStr = value || minDateStr;
  const isPrevDisabled = currentDateStr <= minDateStr;
  const isNextDisabled = currentDateStr >= maxDateStr;

  const handlePrev = () => {
    if (isPrevDisabled) return;
    const current = fromDateString(currentDateStr);
    current.setDate(current.getDate() - 1);
    const newStr = toDateString(current);
    onChange(newStr < minDateStr ? minDateStr : newStr);
  };

  const handleNext = () => {
    if (isNextDisabled) return;
    const current = fromDateString(currentDateStr);
    current.setDate(current.getDate() + 1);
    const newStr = toDateString(current);
    onChange(newStr > maxDateStr ? maxDateStr : newStr);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    onChange(val);
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={inputId} className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePrev}
          disabled={isPrevDisabled}
          aria-label="Previous day"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel-2 text-ink transition-colors hover:border-brand-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <input
          id={inputId}
          type="date"
          value={currentDateStr}
          min={minDateStr}
          max={maxDateStr}
          onChange={handleInputChange}
          className="flex-1 rounded-lg border border-line bg-panel-2 px-3 py-1.5 font-mono text-sm text-ink transition-colors hover:border-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text"
        />

        <button
          type="button"
          onClick={handleNext}
          disabled={isNextDisabled}
          aria-label="Next day"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel-2 text-ink transition-colors hover:border-brand-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
