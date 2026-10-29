import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as clientModule from './client.js';
import { listMyBookings } from './bookings.js';

describe('bookings API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls client with correct query string for listMyBookings', async () => {
    const clientSpy = vi.spyOn(clientModule, 'default').mockResolvedValue({
      data: [{ _id: 'b1' }],
      meta: { page: 1, limit: 1, total: 3 },
    });

    const res = await listMyBookings({ when: 'upcoming', limit: 1 });
    expect(clientSpy).toHaveBeenCalledWith('/bookings/me?when=upcoming&limit=1', {
      signal: undefined,
    });
    expect(res.meta.total).toBe(3);
  });

  it('omits empty or null params from the query string', async () => {
    const clientSpy = vi.spyOn(clientModule, 'default').mockResolvedValue({
      data: [],
      meta: { total: 0 },
    });

    await listMyBookings({ when: 'upcoming', page: null, limit: undefined, search: '' });
    expect(clientSpy).toHaveBeenCalledWith('/bookings/me?when=upcoming', {
      signal: undefined,
    });
  });

  it('forwards AbortSignal', async () => {
    const controller = new AbortController();
    const clientSpy = vi.spyOn(clientModule, 'default').mockResolvedValue({ data: [] });

    await listMyBookings({}, { signal: controller.signal });
    expect(clientSpy).toHaveBeenCalledWith('/bookings/me', {
      signal: controller.signal,
    });
  });
});
