/**
 * Time utility functions for converting between local date/time strings
 * and UTC ISO 8601 strings.
 */

/**
 * Converts a local date string (YYYY-MM-DD) and local time string (HH:mm)
 * into a UTC ISO 8601 string.
 *
 * @param {string} dateString Date formatted as YYYY-MM-DD
 * @param {string} timeString Time formatted as HH:mm
 * @returns {string|null} UTC ISO string or null if invalid
 */
export function localToUtcIso(dateString, timeString) {
  if (!dateString || !timeString || typeof dateString !== 'string' || typeof timeString !== 'string') {
    return null;
  }

  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const [hourStr, minuteStr] = timeString.split(':');

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const hours = parseInt(hourStr, 10);
  const minutes = parseInt(minuteStr, 10);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return null;
  }

  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (Number.isNaN(localDate.getTime())) {
    return null;
  }

  return localDate.toISOString();
}

/**
 * Converts a UTC ISO string into local date (YYYY-MM-DD) and time (HH:mm) parts.
 *
 * @param {string|Date} iso UTC ISO 8601 string or Date instance
 * @returns {{ date: string, time: string, dateString: string, timeString: string }|null}
 */
export function utcIsoToLocalParts(iso) {
  if (!iso) {
    return null;
  }

  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hours}:${minutes}`;

  return {
    date: dateStr,
    time: timeStr,
    dateString: dateStr,
    timeString: timeStr,
  };
}

export default {
  localToUtcIso,
  utcIsoToLocalParts,
};
