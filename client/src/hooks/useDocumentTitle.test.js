import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import useDocumentTitle from './useDocumentTitle.js';

describe('useDocumentTitle', () => {
  beforeEach(() => {
    document.title = 'Initial Title';
  });

  it('sets document.title to the provided string', () => {
    renderHook(() => useDocumentTitle('Dashboard | Workspace'));
    expect(document.title).toBe('Dashboard | Workspace');
  });

  it('updates document.title when title prop changes', () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: 'First | Workspace' },
    });
    expect(document.title).toBe('First | Workspace');

    rerender({ title: 'Second | Workspace' });
    expect(document.title).toBe('Second | Workspace');
  });

  it('restores the previous title on unmount', () => {
    document.title = 'Original Title';
    const { unmount } = renderHook(() => useDocumentTitle('My Bookings | Workspace'));
    expect(document.title).toBe('My Bookings | Workspace');

    unmount();
    expect(document.title).toBe('Original Title');
  });
});
