import client from './client.js';

/**
 * Build URL query string from params object.
 * - Omits empty, null, and undefined values.
 * - Handles arrays (such as amenity) as repeated key=val parameters.
 * @param {object} [params={}]
 * @returns {string}
 */
export function buildResourceQuery(params = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    const paramKey = key === 'amenities' ? 'amenity' : key;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== '') {
          searchParams.append(paramKey, String(item));
        }
      }
    } else {
      searchParams.append(paramKey, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * List resources with optional query parameters and AbortSignal.
 * @param {object} [params={}]
 * @param {object} [options={}]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ data: Array, meta: object }>}
 */
export async function listResources(params = {}, options = {}) {
  const queryString = buildResourceQuery(params);
  return client(`/resources${queryString}`, {
    signal: options?.signal,
  });
}

export default {
  listResources,
  buildResourceQuery,
};
