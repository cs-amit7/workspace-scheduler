import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Dashboard from './Dashboard.jsx';
import * as resourcesApi from '../api/resources.js';
import * as bookingsApi from '../api/bookings.js';
import { localToUtcIso } from '../utils/time.js';

function LocationTracker() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(bookingsApi, 'listMyBookings').mockResolvedValue({
      data: [],
      meta: { total: 0 },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows skeletons while loading then renders resource cards', async () => {
    let resolvePromise;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.spyOn(resourcesApi, 'listResources').mockReturnValue(promise);

    render(
      <MemoryRouter initialEntries={['/']}>
        <Dashboard />
      </MemoryRouter>
    );

    // Shows 12 skeleton cards initially
    const skeletons = screen.getAllByTestId('resource-skeleton-card');
    expect(skeletons).toHaveLength(12);

    // Resolve with mock resources
    act(() => {
      resolvePromise({
        data: [
          {
            _id: 'r1',
            name: 'Orion Meeting Room',
            type: 'room',
            capacity: 8,
            location: 'Floor 2',
            amenities: ['WiFi', 'Projector'],
          },
          {
            _id: 'r2',
            name: 'Desk B-01',
            type: 'desk',
            capacity: 1,
            location: 'Floor 1',
            amenities: ['Monitor'],
          },
        ],
        meta: { page: 1, limit: 12, total: 2 },
      });
    });

    await waitFor(() => {
      expect(screen.queryByTestId('resource-skeleton-card')).not.toBeInTheDocument();
      expect(screen.getByText('Orion Meeting Room')).toBeInTheDocument();
      expect(screen.getByText('Desk B-01')).toBeInTheDocument();
      expect(screen.getByLabelText('Capacity 8')).toBeInTheDocument();
      expect(screen.getByLabelText('Capacity 1')).toBeInTheDocument();
    });
  });

  it('shows empty state when no resources match filters and wires Clear filters', async () => {
    const user = userEvent.setup();
    vi.spyOn(resourcesApi, 'listResources').mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 12, total: 0 },
    });

    render(
      <MemoryRouter initialEntries={['/?type=room&page=2']}>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Dashboard />
                <LocationTracker />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No resources match your filters.')).toBeInTheDocument();
    });

    expect(screen.getByTestId('location-search')).toHaveTextContent('type=room');

    // Click "Clear filters" button in EmptyState
    const clearButtons = screen.getAllByRole('button', { name: 'Clear filters' });
    // EmptyState button is one of them
    await user.click(clearButtons[clearButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('');
    });
  });

  it('shows error state with working Retry button when API fails', async () => {
    const user = userEvent.setup();
    let failMain = true;

    vi.spyOn(resourcesApi, 'listResources').mockImplementation((params) => {
      if (params?.limit === 1) {
        return Promise.resolve({ data: [], meta: { total: 0 } });
      }
      if (failMain) {
        return Promise.reject(new Error('Network error loading resources'));
      }
      return Promise.resolve({
        data: [
          {
            _id: 'r-retry',
            name: 'Recovered Resource Room',
            type: 'room',
            capacity: 4,
            location: 'Floor 1',
            amenities: ['WiFi'],
          },
        ],
        meta: { page: 1, limit: 12, total: 1 },
      });
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Dashboard />
      </MemoryRouter>
    );

    // Error state appears
    await waitFor(() => {
      expect(screen.getByText('Network error loading resources')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();

    failMain = false;
    await user.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Recovered Resource Room')).toBeInTheDocument();
      expect(screen.queryByText('Network error loading resources')).not.toBeInTheDocument();
    });
  });

  it('converts availability date, from, to to UTC ISO and passes to API call when valid', async () => {
    const listSpy = vi.spyOn(resourcesApi, 'listResources').mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 12, total: 0 },
    });

    const expectedFromIso = localToUtcIso('2026-10-05', '09:00');
    const expectedToIso = localToUtcIso('2026-10-05', '11:00');

    render(
      <MemoryRouter initialEntries={['/?date=2026-10-05&from=09:00&to=11:00']}>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          availableFrom: expectedFromIso,
          availableTo: expectedToIso,
        }),
        expect.any(Object)
      );
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not send availability when only some of date/from/to are filled and shows inline error', async () => {
    const listSpy = vi.spyOn(resourcesApi, 'listResources').mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 12, total: 0 },
    });

    render(
      <MemoryRouter initialEntries={['/?date=2026-10-05&from=09:00']}>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Must not pass availableFrom or availableTo to the main resources query
      expect(listSpy).toHaveBeenCalledWith(
        expect.not.objectContaining({
          availableFrom: expect.anything(),
        }),
        expect.any(Object)
      );
    });

    // Inline error is shown
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Date, start time, and end time are all required.');
  });

  it('shows cold start notice after 3 seconds of loading', async () => {
    vi.useFakeTimers();

    let resolvePromise;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.spyOn(resourcesApi, 'listResources').mockReturnValue(promise);

    render(
      <MemoryRouter initialEntries={['/']}>
        <Dashboard />
      </MemoryRouter>
    );

    // Before 3 seconds, notice is not present
    act(() => {
      vi.advanceTimersByTime(2900);
    });
    expect(
      screen.queryByText('Waking up the server, this can take up to a minute...')
    ).not.toBeInTheDocument();

    // At 3+ seconds, notice appears with role="status"
    act(() => {
      vi.advanceTimersByTime(200);
    });

    const statusNotice = screen.getByRole('status');
    expect(statusNotice).toBeInTheDocument();
    expect(statusNotice).toHaveTextContent(
      'Waking up the server, this can take up to a minute...'
    );

    // Once resolved, the notice disappears
    await act(async () => {
      resolvePromise({
        data: [
          {
            _id: 'r-slow',
            name: 'Slowly Loaded Room',
            type: 'room',
            capacity: 6,
            location: 'Floor 2',
            amenities: [],
          },
        ],
        meta: { page: 1, limit: 12, total: 1 },
      });
    });

    expect(
      screen.queryByText('Waking up the server, this can take up to a minute...')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Slowly Loaded Room')).toBeInTheDocument();
  });
});
