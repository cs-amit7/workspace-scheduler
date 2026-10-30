import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as bookingsApi from '../api/bookings.js';
import { useMyBookings } from './useMyBookings.js';

describe('useMyBookings hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches bookings and updates items, meta, and loading state', async () => {
    const mockBookings = [{ _id: 'b1', status: 'confirmed' }];
    const mockMeta = { page: 1, limit: 10, total: 1 };

    vi.spyOn(bookingsApi, 'listMyBookings').mockResolvedValue({
      data: mockBookings,
      meta: mockMeta,
    });

    const { result } = renderHook(() => useMyBookings({ when: 'upcoming', page: 1, limit: 10 }));

    expect(result.current.loading).toBe(true);
    expect(result.current.items).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toEqual(mockBookings);
    expect(result.current.meta).toEqual(mockMeta);
    expect(result.current.error).toBeNull();
    expect(result.current.slow).toBe(false);
  });

  it('handles API errors', async () => {
    const testError = new Error('Failed to fetch bookings');
    vi.spyOn(bookingsApi, 'listMyBookings').mockRejectedValue(testError);

    const { result } = renderHook(() => useMyBookings({ when: 'past' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(testError);
    expect(result.current.items).toEqual([]);
  });

  it('sets slow to true if request takes longer than 3 seconds', async () => {
    vi.useFakeTimers();

    // A promise that doesn't resolve immediately
    let resolvePromise;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.spyOn(bookingsApi, 'listMyBookings').mockImplementation(() => pendingPromise);

    const { result } = renderHook(() => useMyBookings({ when: 'upcoming' }));

    expect(result.current.slow).toBe(false);

    // Fast-forward 3000ms
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.slow).toBe(true);

    // Resolve request
    await act(async () => {
      resolvePromise({ data: [{ _id: 'b1' }], meta: null });
      await pendingPromise;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.slow).toBe(false);
  });

  it('aborts the previous request on unmount or param change', () => {
    let capturedSignal;
    vi.spyOn(bookingsApi, 'listMyBookings').mockImplementation((_params, options) => {
      capturedSignal = options?.signal;
      return new Promise(() => {});
    });

    const { unmount } = renderHook(() => useMyBookings({ when: 'upcoming' }));

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal.aborted).toBe(false);

    unmount();
    expect(capturedSignal.aborted).toBe(true);
  });

  it('re-fetches when reload is called', async () => {
    const spy = vi.spyOn(bookingsApi, 'listMyBookings').mockResolvedValue({
      data: [{ _id: 'b1' }],
      meta: null,
    });

    const { result } = renderHook(() => useMyBookings({ when: 'upcoming' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(spy).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });
});
