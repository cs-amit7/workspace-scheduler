let unauthorizedHandler = null;
let initialAuthMeCompleted = false;

/**
 * Register a callback to be invoked on 401 Unauthenticated responses,
 * except for the initial /auth/me check.
 * @param {Function|null} fn
 */
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

/**
 * Reset internal state for unauthorized handler (primarily for tests).
 */
export function _resetUnauthorizedState() {
  unauthorizedHandler = null;
  initialAuthMeCompleted = false;
}

/**
 * Fetch wrapper with default credentials, JSON handling, and normalized API errors.
 * @param {string} endpoint
 * @param {RequestInit & { skipUnauthorizedHandler?: boolean }} [options={}]
 * @returns {Promise<any>}
 */
export async function client(endpoint, options = {}) {
  const baseUrl = import.meta.env.VITE_API_BASE || '/api';
  const url =
    endpoint.startsWith('http://') || endpoint.startsWith('https://')
      ? endpoint
      : `${baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  const fetchOptions = {
    ...options,
    credentials: options.credentials || 'include',
    headers,
    ...(options.signal ? { signal: options.signal } : {}),
  };

  if (
    fetchOptions.body !== undefined &&
    fetchOptions.body !== null &&
    typeof fetchOptions.body === 'object' &&
    !(fetchOptions.body instanceof FormData) &&
    !(fetchOptions.body instanceof Blob) &&
    !(fetchOptions.body instanceof URLSearchParams)
  ) {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    fetchOptions.body = JSON.stringify(fetchOptions.body);
  }

  const res = await fetch(url, fetchOptions);

  if (res.status === 204) {
    return null;
  }

  if (!res.ok) {
    let errorData = null;
    try {
      errorData = await res.json();
    } catch {
      // response body was not valid JSON
    }

    const apiError = errorData?.error;
    const message = apiError?.message || res.statusText || 'Request failed';
    const error = new Error(message);
    error.status = res.status;
    error.code = apiError?.code || `HTTP_${res.status}`;
    error.details = apiError?.details;

    const isAuthMe = typeof endpoint === 'string' && endpoint.includes('/auth/me');
    const isInitialAuthMe = isAuthMe && !initialAuthMeCompleted;
    if (isAuthMe) {
      initialAuthMeCompleted = true;
    }

    const skipHandler = Boolean(options.skipUnauthorizedHandler) || isInitialAuthMe;

    if (res.status === 401 && !skipHandler && typeof unauthorizedHandler === 'function') {
      unauthorizedHandler(error);
    }

    throw error;
  }

  const isAuthMe = typeof endpoint === 'string' && endpoint.includes('/auth/me');
  if (isAuthMe) {
    initialAuthMeCompleted = true;
  }

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await res.json();
  }

  const text = await res.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export { client as apiClient };
export default client;
