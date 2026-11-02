import { useEffect, useRef } from 'react';

/**
 * Sets document.title to the specified title and restores the previous title on unmount.
 *
 * @param {string} title
 */
export default function useDocumentTitle(title) {
  const prevTitleRef = useRef(document.title);

  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);

  useEffect(() => {
    const prevTitle = prevTitleRef.current;
    return () => {
      document.title = prevTitle;
    };
  }, []);
}
