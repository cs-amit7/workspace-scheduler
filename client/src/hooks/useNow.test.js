import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNow } from './useNow.js';

describe('useNow hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns an initial Date instance and ticks on the configured interval', () => {
    const initialTime = new Date('2026-10-10T10:00:00.000Z');
    vi.setSystemTime(initialTime);

    const { result } = renderHook(() => useNow(30000));
    expect(result.current.getTime()).toBe(initialTime.getTime());

    // Advance by 15 seconds: should not update yet
    vi.advanceTimersByTime(15000);
    expect(result.current.getTime()).toBe(initialTime.getTime());

    // Advance by another 15 seconds (total 30s): should update
    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(result.current.getTime()).toBe(initialTime.getTime() + 30000);

    // Advance by 60s: should update again
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(result.current.getTime()).toBe(initialTime.getTime() + 90000);
  });

  it('cleans up interval timer on unmount', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = renderHook(() => useNow(10000));

    expect(clearIntervalSpy).not.toHaveBeenCalled();

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
