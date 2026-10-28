import { useState, useEffect, useCallback, useMemo } from 'react';
import { listResources, buildResourceQuery } from '../api/resources.js';

/**
 * Custom hook to fetch and manage resources list state.
 *
 * @param {object} [params={}] Query parameters for GET /resources
 * @returns {{
 *   items: Array,
 *   meta: object|null,
 *   loading: boolean,
 *   error: Error|null,
 *   slow: boolean,
 *   reload: () => void
 * }}
 */
export function useResources(params = {}) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [slow, setSlow] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Serialize params to avoid re-triggering effect if caller passes a new object reference with identical values
  const serializedParams = useMemo(() => buildResourceQuery(params), [params]);

  const reload = useCallback(() => {
    setReloadTrigger((count) => count + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSlow(false);

    const slowTimer = setTimeout(() => {
      setSlow(true);
    }, 3000);

    listResources(params, { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) {
          return;
        }
        clearTimeout(slowTimer);
        setItems(res?.data || []);
        setMeta(res?.meta || null);
        setError(null);
        setLoading(false);
        setSlow(false);
      })
      .catch((err) => {
        if (controller.signal.aborted || err?.name === 'AbortError') {
          return;
        }
        clearTimeout(slowTimer);
        setError(err);
        setLoading(false);
        setSlow(false);
      });

    return () => {
      clearTimeout(slowTimer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializedParams, reloadTrigger]);

  return {
    items,
    meta,
    loading,
    error,
    slow,
    reload,
  };
}

export default useResources;
