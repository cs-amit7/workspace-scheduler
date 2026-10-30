import { useState, useEffect } from 'react';

/**
 * Custom hook that returns a Date that refreshes periodically.
 *
 * @param {number} [interval=30000] Refresh interval in milliseconds (default: 30000)
 * @returns {Date} Current reference Date
 */
export function useNow(interval = 30000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, interval);

    return () => {
      clearInterval(timer);
    };
  }, [interval]);

  return now;
}

export default useNow;
