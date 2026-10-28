import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import client, { setUnauthorizedHandler, _resetUnauthorizedState } from './client.js';

describe('API client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    _resetUnauthorizedState();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('turns an error envelope into an Error with code, status and message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        error: {
          code: 'SLOT_TAKEN',
          message: 'Requested slot is already booked',
          details: [{ slot: '2026-10-05T04:30:00.000Z' }],
        },
      }),
    });

    await expect(client('/bookings', { method: 'POST' })).rejects.toMatchObject({
      message: 'Requested slot is already booked',
      status: 409,
      code: 'SLOT_TAKEN',
      details: [{ slot: '2026-10-05T04:30:00.000Z' }],
    });
  });

  it('handles a 204 response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
      headers: new Headers(),
    });

    const result = await client('/auth/logout', { method: 'POST' });
    expect(result).toBeNull();
  });

  it('parses JSON response and sends JSON payload with credentials included', async () => {
    let capturedUrl = '';
    let capturedOptions = {};

    global.fetch = vi.fn().mockImplementation((url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: { id: 1, name: 'Orion' } }),
      });
    });

    const res = await client('/resources', {
      method: 'POST',
      body: { name: 'Orion' },
    });

    expect(capturedUrl).toBe('/api/resources');
    expect(capturedOptions.credentials).toBe('include');
    expect(capturedOptions.headers['Content-Type']).toBe('application/json');
    expect(capturedOptions.headers['Accept']).toBe('application/json');
    expect(capturedOptions.body).toBe(JSON.stringify({ name: 'Orion' }));
    expect(res).toEqual({ data: { id: 1, name: 'Orion' } });
  });

  it('calls unauthorizedHandler on 401 except for the initial /auth/me check', async () => {
    const unauthorizedSpy = vi.fn();
    setUnauthorizedHandler(unauthorizedSpy);

    // 1. Initial /auth/me call returns 401 -> should NOT trigger unauthorizedHandler
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        error: { code: 'UNAUTHENTICATED', message: 'Not logged in' },
      }),
    });

    await expect(client('/auth/me')).rejects.toThrow('Not logged in');
    expect(unauthorizedSpy).not.toHaveBeenCalled();

    // 2. Subsequent call to a protected endpoint returns 401 -> SHOULD trigger unauthorizedHandler
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        error: { code: 'UNAUTHENTICATED', message: 'Session expired' },
      }),
    });

    await expect(client('/bookings')).rejects.toThrow('Session expired');
    expect(unauthorizedSpy).toHaveBeenCalledTimes(1);
    expect(unauthorizedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 401,
        code: 'UNAUTHENTICATED',
        message: 'Session expired',
      })
    );
  });
});
