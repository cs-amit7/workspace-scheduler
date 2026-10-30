const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Formats an ISO timestamp or Date into a short local date string,
 * e.g. "Tue, 15 Jan 2030". Returns an empty string for invalid or missing input.
 *
 * @param {string|Date} iso UTC ISO string or Date instance
 * @returns {string} Formatted short local date or empty string
 */
export function formatLongDate(iso) {
  if (!iso) {
    return '';
  }

  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const weekday = WEEKDAYS[date.getDay()];
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();

  return `${weekday}, ${day} ${month} ${year}`;
}

export default {
  formatLongDate,
};
