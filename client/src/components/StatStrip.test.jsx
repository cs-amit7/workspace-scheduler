import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StatStrip from './StatStrip.jsx';
import * as resourcesApi from '../api/resources.js';
import * as bookingsApi from '../api/bookings.js';

describe('StatStrip', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows skeleton counters while loading and displays all four numbers when fetched', async () => {
    let resolveOpen;
    let resolveUpcoming;
    let resolveRooms;
    let resolveDesks;

    vi.spyOn(resourcesApi, 'listResources').mockImplementation((params) => {
      if (params.availableFrom) {
        return new Promise((resolve) => {
          resolveOpen = resolve;
        });
      }
      if (params.type === 'room') {
        return new Promise((resolve) => {
          resolveRooms = resolve;
        });
      }
      if (params.type === 'desk') {
        return new Promise((resolve) => {
          resolveDesks = resolve;
        });
      }
      return Promise.resolve({ data: [], meta: { total: 0 } });
    });

    vi.spyOn(bookingsApi, 'listMyBookings').mockImplementation(() => {
      return new Promise((resolve) => {
        resolveUpcoming = resolve;
      });
    });

    render(<StatStrip />);

    // Check loading skeletons
    expect(screen.getByTestId('stat-skeleton-open-now')).toBeInTheDocument();
    expect(screen.getByTestId('stat-skeleton-my-upcoming')).toBeInTheDocument();
    expect(screen.getByTestId('stat-skeleton-rooms')).toBeInTheDocument();
    expect(screen.getByTestId('stat-skeleton-desks')).toBeInTheDocument();

    // Resolve all 4 promises
    act(() => {
      resolveOpen({ data: [], meta: { total: 18 } });
      resolveUpcoming({ data: [], meta: { total: 3 } });
      resolveRooms({ data: [], meta: { total: 12 } });
      resolveDesks({ data: [], meta: { total: 20 } });
    });

    await waitFor(() => {
      expect(screen.queryByTestId('stat-skeleton-open-now')).not.toBeInTheDocument();
      expect(screen.getByTestId('stat-value-open-now')).toHaveTextContent('18');
      expect(screen.getByTestId('stat-value-my-upcoming')).toHaveTextContent('3');
      expect(screen.getByTestId('stat-value-rooms')).toHaveTextContent('12');
      expect(screen.getByTestId('stat-value-desks')).toHaveTextContent('20');
    });

    // Check labels and mono font
    expect(screen.getByText('Open now')).toBeInTheDocument();
    expect(screen.getByText('My upcoming')).toBeInTheDocument();
    expect(screen.getByText('Rooms')).toBeInTheDocument();
    expect(screen.getByText('Desks')).toBeInTheDocument();

    const openNowVal = screen.getByTestId('stat-value-open-now');
    expect(openNowVal.className).toContain('font-mono');
  });

  it('shows an en dash when one request fails and numbers for successful ones', async () => {
    vi.spyOn(resourcesApi, 'listResources').mockImplementation((params) => {
      if (params.availableFrom) {
        return Promise.reject(new Error('Failed to fetch open resources'));
      }
      if (params.type === 'room') {
        return Promise.resolve({ data: [], meta: { total: 12 } });
      }
      if (params.type === 'desk') {
        return Promise.resolve({ data: [], meta: { total: 20 } });
      }
      return Promise.resolve({ data: [], meta: { total: 0 } });
    });

    vi.spyOn(bookingsApi, 'listMyBookings').mockResolvedValue({
      data: [],
      meta: { total: 5 },
    });

    render(<StatStrip />);

    await waitFor(() => {
      expect(screen.queryByTestId('stat-skeleton-open-now')).not.toBeInTheDocument();
      // Open now failed, should show en dash (–)
      expect(screen.getByTestId('stat-value-open-now')).toHaveTextContent('–');
      // Others succeeded
      expect(screen.getByTestId('stat-value-my-upcoming')).toHaveTextContent('5');
      expect(screen.getByTestId('stat-value-rooms')).toHaveTextContent('12');
      expect(screen.getByTestId('stat-value-desks')).toHaveTextContent('20');
    });
  });
});
