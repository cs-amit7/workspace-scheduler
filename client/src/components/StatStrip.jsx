import { useState, useEffect } from 'react';
import { listResources } from '../api/resources.js';
import { listMyBookings } from '../api/bookings.js';
import Skeleton from './Skeleton.jsx';

/**
 * StatStrip component displaying 4 resource/booking metrics.
 * Fetches in parallel:
 * - "Open now": GET /resources?availableFrom=<now>&availableTo=<now+30m>&limit=1 -> meta.total
 * - "My upcoming": GET /bookings/me?when=upcoming&limit=1 -> meta.total
 * - "Rooms": GET /resources?type=room&limit=1 -> meta.total
 * - "Desks": GET /resources?type=desk&limit=1 -> meta.total
 *
 * Shows skeleton counters while loading and an en dash (–) if a request fails.
 */
export default function StatStrip() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    openNow: null,
    myUpcoming: null,
    rooms: null,
    desks: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    const now = new Date();
    const nowPlus30 = new Date(now.getTime() + 30 * 60 * 1000);
    const availableFrom = now.toISOString();
    const availableTo = nowPlus30.toISOString();

    Promise.allSettled([
      listResources({ availableFrom, availableTo, limit: 1 }, { signal: controller.signal }),
      listMyBookings({ when: 'upcoming', limit: 1 }, { signal: controller.signal }),
      listResources({ type: 'room', limit: 1 }, { signal: controller.signal }),
      listResources({ type: 'desk', limit: 1 }, { signal: controller.signal }),
    ]).then(([openRes, upcomingRes, roomsRes, desksRes]) => {
      if (controller.signal.aborted) {
        return;
      }

      setStats({
        openNow:
          openRes.status === 'fulfilled' && openRes.value?.meta?.total !== undefined
            ? openRes.value.meta.total
            : '–',
        myUpcoming:
          upcomingRes.status === 'fulfilled' && upcomingRes.value?.meta?.total !== undefined
            ? upcomingRes.value.meta.total
            : '–',
        rooms:
          roomsRes.status === 'fulfilled' && roomsRes.value?.meta?.total !== undefined
            ? roomsRes.value.meta.total
            : '–',
        desks:
          desksRes.status === 'fulfilled' && desksRes.value?.meta?.total !== undefined
            ? desksRes.value.meta.total
            : '–',
      });
      setLoading(false);
    });

    return () => {
      controller.abort();
    };
  }, []);

  const items = [
    { id: 'open-now', label: 'Open now', value: stats.openNow },
    { id: 'my-upcoming', label: 'My upcoming', value: stats.myUpcoming },
    { id: 'rooms', label: 'Rooms', value: stats.rooms },
    { id: 'desks', label: 'Desks', value: stats.desks },
  ];

  return (
    <div
      data-testid="stat-strip"
      className="grid grid-cols-2 divide-y divide-line rounded-lg border border-line bg-panel sm:grid-cols-4 sm:divide-y-0 sm:divide-x"
    >
      {items.map((item) => (
        <div key={item.id} className="flex flex-col items-center justify-center p-4 text-center">
          {loading ? (
            <div data-testid={`stat-skeleton-${item.id}`} className="flex flex-col items-center gap-2">
              <Skeleton className="h-8 w-14" />
              <Skeleton className="h-4 w-20" />
            </div>
          ) : (
            <>
              <span
                data-testid={`stat-value-${item.id}`}
                className="font-mono text-2xl font-bold text-ink"
              >
                {item.value}
              </span>
              <span className="mt-1 text-xs uppercase tracking-wider text-muted">
                {item.label}
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
