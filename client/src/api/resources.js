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

/**
 * Fetch a single resource by ID.
 * @param {string} id
 * @param {object} [options={}]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ data: object }>}
 */
export async function getResource(id, options = {}) {
  return client(`/resources/${id}`, {
    signal: options?.signal,
  });
}

/**
 * Fetch booked availability intervals for a resource.
 * @param {string} id
 * @param {object} [window={}]
 * @param {string} [window.from]
 * @param {string} [window.to]
 * @param {object} [options={}]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ data: object }>}
 */
export async function getAvailability(id, window = {}, options = {}) {
  const params = new URLSearchParams();
  if (window?.from) {
    params.append('from', window.from);
  }
  if (window?.to) {
    params.append('to', window.to);
  }
  const qs = params.toString() ? `?${params.toString()}` : '';
  const signal = options?.signal || window?.signal;

  return client(`/resources/${id}/availability${qs}`, {
    signal,
  });
}

/**
 * Create a new resource.
 * @param {object} body
 * @param {object} [options={}]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ data: object }>}
 */
export async function createResource(body = {}, options = {}) {
  const signal = options?.signal || body?.signal;
  let finalBody = body;
  if (body && typeof body === 'object' && 'signal' in body) {
    const next = { ...body };
    delete next.signal;
    finalBody = next;
  }
  return client('/resources', {
    method: 'POST',
    body: finalBody,
    signal,
  });
}

/**
 * Partially update a resource by ID.
 * @param {string} id
 * @param {object} body
 * @param {object} [options={}]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ data: object }>}
 */
export async function updateResource(id, body = {}, options = {}) {
  const signal = options?.signal || body?.signal;
  let finalBody = body;
  if (body && typeof body === 'object' && 'signal' in body) {
    const next = { ...body };
    delete next.signal;
    finalBody = next;
  }
  return client(`/resources/${id}`, {
    method: 'PATCH',
    body: finalBody,
    signal,
  });
}

/**
 * Soft-disable a resource by ID.
 * @param {string} id
 * @param {object} [options={}]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ data: object }>}
 */
export async function disableResource(id, options = {}) {
  return client(`/resources/${id}`, {
    method: 'DELETE',
    signal: options?.signal,
  });
}

export default {
  listResources,
  buildResourceQuery,
  getResource,
  getAvailability,
  createResource,
  updateResource,
  disableResource,
};

