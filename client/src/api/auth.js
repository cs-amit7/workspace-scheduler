import client from './client.js';

export const GOOGLE_LOGIN_URL = '/api/auth/google';

/**
 * Fetch the currently authenticated user's profile.
 * @param {object} [options]
 * @returns {Promise<any>}
 */
export async function getMe(options = {}) {
  return client('/auth/me', options);
}

/**
 * Log in via demo endpoint.
 * @param {object|string} [params]
 * @returns {Promise<any>}
 */
export async function demoLogin(params = { role: 'user' }) {
  const body = typeof params === 'string' ? { role: params } : params;
  return client('/auth/demo', {
    method: 'POST',
    body: { role: 'user', ...body },
  });
}

/**
 * Log out and clear the auth cookie.
 * @param {object} [options]
 * @returns {Promise<any>}
 */
export async function logout(options = {}) {
  return client('/auth/logout', {
    method: 'POST',
    ...options,
  });
}
