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

/**
 * Converts a date string (YYYY-MM-DD) into UTC ISO strings covering the user's
 * local day half-open interval [00:00, next 00:00).
 *
 * @param {string} dateString Date formatted as YYYY-MM-DD
 * @returns {{ from: string, to: string }|null}
 */
export function localDayWindowUtc(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day)
  ) {
    return null;
  }

  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

/**
 * Generates 30-minute slot cells in local time for a given day.
 *
 * @param {string} dateString Date formatted as YYYY-MM-DD
 * @param {object} [options={}]
 * @param {number} [options.startHour=7] Starting hour (0-23)
 * @param {number} [options.endHour=22] Ending hour (0-24)
 * @returns {Array<{ startIso: string, endIso: string, label: string }>}
 */
export function buildDaySlots(dateString, { startHour = 7, endHour = 22 } = {}) {
  if (!dateString || typeof dateString !== 'string') {
    return [];
  }

  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day)
  ) {
    return [];
  }

  const slots = [];

  for (let h = startHour; h < endHour; h += 1) {
    const padHour = String(h).padStart(2, '0');

    // First half-hour slot: h:00 to h:30
    const start0 = new Date(year, month - 1, day, h, 0, 0, 0);
    const end0 = new Date(year, month - 1, day, h, 30, 0, 0);
    slots.push({
      startIso: start0.toISOString(),
      endIso: end0.toISOString(),
      label: `${padHour}:00`,
    });

    // Second half-hour slot: h:30 to (h+1):00
    const start1 = new Date(year, month - 1, day, h, 30, 0, 0);
    const end1 = new Date(year, month - 1, day, h + 1, 0, 0, 0);
    slots.push({
      startIso: start1.toISOString(),
      endIso: end1.toISOString(),
      label: `${padHour}:30`,
    });
  }

  return slots;
}

/**
 * Formats a local start and end time range with a duration string,
 * e.g. "10:00-11:30 (1h 30m)".
 *
 * @param {string|Date} startIso
 * @param {string|Date} endIso
 * @returns {string}
 */
export function formatLocalRange(startIso, endIso) {
  if (!startIso || !endIso) {
    return '';
  }

  const startParts = utcIsoToLocalParts(startIso);
  const endParts = utcIsoToLocalParts(endIso);

  if (!startParts || !endParts) {
    return '';
  }

  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    return `${startParts.time}-${endParts.time}`;
  }

  const diffMinutes = Math.max(0, Math.round((endMs - startMs) / (60 * 1000)));
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;

  let duration = '';
  if (hours > 0 && mins > 0) {
    duration = `${hours}h ${mins}m`;
  } else if (hours > 0) {
    duration = `${hours}h`;
  } else {
    duration = `${mins}m`;
  }

  return `${startParts.time}-${endParts.time} (${duration})`;
}

export default {
  localToUtcIso,
  utcIsoToLocalParts,
  localDayWindowUtc,
  buildDaySlots,
  formatLocalRange,
};
