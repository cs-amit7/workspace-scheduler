import { useState, useEffect, useCallback } from 'react';
import { getResource } from '../api/resources.js';

/**
 * Custom hook to fetch a single resource by ID.
 * Follows the useResources pattern: cancel on change/unmount,
 * ignore stale responses, and provide {data, loading, error, reload}.
 *
 * @param {string} id Resource ID
 * @returns {{
 *   data: object|null,
 *   loading: boolean,
 *   error: Error|null,
 *   reload: () => void
 * }}
 */
export function useResource(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const reload = useCallback(() => {
    setReloadTrigger((count) => count + 1);
  }, []);

  useEffect(() => {
    if (!id) {
      setData(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getResource(id, { signal: controller.signal })
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
  }, [id, reloadTrigger]);

  return {
    data,
    loading,
    error,
    reload,
  };
}

export default useResource;
