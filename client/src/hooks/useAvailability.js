import { useState, useEffect, useCallback } from 'react';
import { getAvailability } from '../api/resources.js';

/**
 * Custom hook to fetch resource availability for a given UTC ISO window [from, to).
 * Follows the useResources pattern: cancel on change/unmount,
 * ignore stale responses, and provide {data, loading, error, reload}.
 *
 * @param {string} id Resource ID
 * @param {object} [window={}]
 * @param {string} [window.from]
 * @param {string} [window.to]
 * @returns {{
 *   data: object|null,
 *   loading: boolean,
 *   error: Error|null,
 *   reload: () => void
 * }}
 */
export function useAvailability(id, window = {}) {
  const from = window?.from;
  const to = window?.to;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(id && from && to));
  const [error, setError] = useState(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const reload = useCallback(() => {
    setReloadTrigger((count) => count + 1);
  }, []);

  useEffect(() => {
    if (!id || !from || !to) {
      setData(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getAvailability(id, { from, to }, { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) {
          return;
        }
        setData(res?.data || null);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted || err?.name === 'AbortError') {
          return;
        }
        setError(err);
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [id, from, to, reloadTrigger]);

  return {
    data,
    loading,
    error,
    reload,
  };
}

export default useAvailability;
