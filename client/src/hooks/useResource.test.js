import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useResource } from './useResource.js';
import { useAvailability } from './useAvailability.js';
import * as resourcesApi from '../api/resources.js';

describe('useResource and useAvailability hooks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('useResource', () => {
    it('loads resource data and manages loading/error states', async () => {
      const mockResource = { _id: 'res-1', name: 'Orion Room' };
      vi.spyOn(resourcesApi, 'getResource').mockResolvedValueOnce({ data: mockResource });

      const { result } = renderHook(() => useResource('res-1'));
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockResource);
      expect(result.current.error).toBeNull();
    });

    it('handles errors and allows reload', async () => {
      const error = new Error('Resource not found');
      error.status = 404;
      vi.spyOn(resourcesApi, 'getResource')
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: { _id: 'res-1', name: 'Orion Room' } });

      const { result } = renderHook(() => useResource('res-1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.data).toBeNull();

      // Trigger reload
      act(() => {
        result.current.reload();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual({ _id: 'res-1', name: 'Orion Room' });
      expect(result.current.error).toBeNull();
    });

    it('cancels pending request on unmount', () => {
      let capturedSignal;
      vi.spyOn(resourcesApi, 'getResource').mockImplementation((id, options) => {
        capturedSignal = options.signal;
        return new Promise(() => {}); // never resolves
      });

      const { unmount } = renderHook(() => useResource('res-1'));
      expect(capturedSignal?.aborted).toBe(false);

      unmount();
      expect(capturedSignal?.aborted).toBe(true);
    });
  });

  describe('useAvailability', () => {
    it('loads availability data for valid id and window', async () => {
      const mockAvail = {
        resourceId: 'res-1',
        booked: [{ start: '2026-10-05T04:30:00.000Z', end: '2026-10-05T06:00:00.000Z' }],
      };
      vi.spyOn(resourcesApi, 'getAvailability').mockResolvedValueOnce({ data: mockAvail });

      const window = { from: '2026-10-05T00:00:00.000Z', to: '2026-10-06T00:00:00.000Z' };
      const { result } = renderHook(() => useAvailability('res-1', window));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockAvail);
      expect(result.current.error).toBeNull();
    });

    it('cancels pending availability request on unmount', () => {
      let capturedSignal;
      vi.spyOn(resourcesApi, 'getAvailability').mockImplementation((id, win, options) => {
        capturedSignal = options.signal;
        return new Promise(() => {});
      });

      const window = { from: '2026-10-05T00:00:00.000Z', to: '2026-10-06T00:00:00.000Z' };
      const { unmount } = renderHook(() => useAvailability('res-1', window));
      expect(capturedSignal?.aborted).toBe(false);

      unmount();
      expect(capturedSignal?.aborted).toBe(true);
    });
  });
});
