import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as bookingsApi from '../api/bookings.js';
import { useAllBookings } from './useAllBookings.js';

describe('useAllBookings hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches bookings and updates items, meta, and loading state', async () => {
    const mockBookings = [{ _id: 'b1', status: 'confirmed' }];
    const mockMeta = { page: 1, limit: 15, total: 1 };

    vi.spyOn(bookingsApi, 'listAllBookings').mockResolvedValue({
      data: mockBookings,
      meta: mockMeta,
    });

    const { result } = renderHook(() =>
      useAllBookings({ status: 'confirmed', page: 1, limit: 15 })
    );

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

  it('does not call API when enabled is false', () => {
    const spy = vi.spyOn(bookingsApi, 'listAllBookings');

    const { result } = renderHook(() =>
      useAllBookings({ status: 'confirmed', enabled: false })
    );

    expect(spy).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.items).toEqual([]);
  });

  it('handles API errors', async () => {
    const testError = new Error('Failed to fetch all bookings');
    vi.spyOn(bookingsApi, 'listAllBookings').mockRejectedValue(testError);

    const { result } = renderHook(() => useAllBookings({ status: 'cancelled' }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(testError);
    expect(result.current.items).toEqual([]);
  });

  it('sets slow to true if request takes longer than 3 seconds', async () => {
    vi.useFakeTimers();

    let resolvePromise;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.spyOn(bookingsApi, 'listAllBookings').mockImplementation(() => pendingPromise);

    const { result } = renderHook(() => useAllBookings({ page: 1 }));

    expect(result.current.slow).toBe(false);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.slow).toBe(true);

    await act(async () => {
      resolvePromise({ data: [{ _id: 'b1' }], meta: null });
      await pendingPromise;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.slow).toBe(false);
  });

  it('aborts the previous request on unmount or param change', () => {
    let capturedSignal;
    vi.spyOn(bookingsApi, 'listAllBookings').mockImplementation((_params, options) => {
      capturedSignal = options?.signal;
      return new Promise(() => {});
    });

    const { unmount } = renderHook(() => useAllBookings({ page: 1 }));

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal.aborted).toBe(false);

    unmount();
    expect(capturedSignal.aborted).toBe(true);
  });

  it('re-fetches when reload is called', async () => {
    const spy = vi.spyOn(bookingsApi, 'listAllBookings').mockResolvedValue({
      data: [{ _id: 'b1' }],
      meta: null,
    });

    const { result } = renderHook(() => useAllBookings({ page: 1 }));

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
