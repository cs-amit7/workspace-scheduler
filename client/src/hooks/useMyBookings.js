import { useState, useEffect, useCallback } from 'react';
import { listMyBookings } from '../api/bookings.js';

/**
 * Custom hook to fetch and manage the authenticated user's bookings.
 *
 * @param {object} [params={}]
 * @param {'upcoming'|'past'|'all'} [params.when]
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @returns {{
 *   items: Array,
 *   meta: object|null,
 *   loading: boolean,
 *   error: Error|null,
 *   slow: boolean,
 *   reload: () => void
 * }}
 */
export function useMyBookings({ when, page, limit } = {}) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [slow, setSlow] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

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

    listMyBookings({ when, page, limit }, { signal: controller.signal })
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
  }, [when, page, limit, reloadTrigger]);

  return {
    items,
    meta,
    loading,
    error,
    slow,
    reload,
  };
}

export default useMyBookings;
