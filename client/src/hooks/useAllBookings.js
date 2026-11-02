import { useState, useEffect, useCallback } from 'react';
import { listAllBookings } from '../api/bookings.js';

/**
 * Custom hook to fetch and manage all bookings (admin view).
 * Follows the same pattern as useMyBookings.
 *
 * @param {object} [params={}]
 * @param {string} [params.resourceId]
 * @param {string} [params.userId]
 * @param {string} [params.status]
 * @param {string} [params.from]
 * @param {string} [params.to]
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {boolean} [params.enabled=true]
 * @returns {{
 *   items: Array,
 *   meta: object|null,
 *   loading: boolean,
 *   error: Error|null,
 *   slow: boolean,
 *   reload: () => void
 * }}
 */
export function useAllBookings({
  resourceId,
  userId,
  status,
  from,
  to,
  page,
  limit,
  enabled = true,
} = {}) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const [slow, setSlow] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const reload = useCallback(() => {
    setReloadTrigger((count) => count + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setItems([]);
      setMeta(null);
      setError(null);
      setSlow(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSlow(false);

    const slowTimer = setTimeout(() => {
      setSlow(true);
    }, 3000);

    listAllBookings(
      { resourceId, userId, status, from, to, page, limit },
      { signal: controller.signal }
    )
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
  }, [resourceId, userId, status, from, to, page, limit, enabled, reloadTrigger]);

  return {
    items,
    meta,
    loading,
    error,
    slow,
    reload,
  };
}

export default useAllBookings;
