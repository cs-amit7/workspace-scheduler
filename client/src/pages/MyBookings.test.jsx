import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MyBookings from './MyBookings.jsx';
import useMyBookings from '../hooks/useMyBookings.js';
import useNow from '../hooks/useNow.js';
import { cancelBooking } from '../api/bookings.js';

vi.mock('../hooks/useMyBookings.js', () => {
  const fn = vi.fn();
  return {
    default: fn,
    useMyBookings: fn,
  };
});

vi.mock('../hooks/useNow.js', () => {
  const fn = vi.fn();
  return {
    default: fn,
    useNow: fn,
  };
});

vi.mock('../api/bookings.js', () => ({
  cancelBooking: vi.fn(),
  listMyBookings: vi.fn(),
  createBooking: vi.fn(),
}));

function LocationTracker() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

describe('MyBookings Page', () => {
  const fixedNow = new Date('2026-10-10T09:00:00.000Z');
  let mockReload;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockReload = vi.fn();
    window.scrollTo = vi.fn();

    vi.mocked(useNow).mockReturnValue(fixedNow);
    vi.mocked(useMyBookings).mockReturnValue({
      items: [],
      meta: { page: 1, limit: 10, total: 0 },
      loading: false,
      error: null,
      slow: false,
      reload: mockReload,
    });
    vi.mocked(cancelBooking).mockReset();
  });


  it('renders default Upcoming tab, timezone subtitle, and queries upcoming bookings', () => {
    render(
      <MemoryRouter initialEntries={['/my-bookings']}>
        <LocationTracker />
        <MyBookings />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'My Bookings' })).toBeInTheDocument();
    expect(screen.getByText(/Times shown in your local time/i)).toBeInTheDocument();

    const upcomingTab = screen.getByRole('tab', { name: 'Upcoming' });
    const pastTab = screen.getByRole('tab', { name: 'Past' });

    expect(upcomingTab).toHaveAttribute('aria-selected', 'true');
    expect(pastTab).toHaveAttribute('aria-selected', 'false');

    expect(screen.getByTestId('location-search')).toHaveTextContent('');
    expect(useMyBookings).toHaveBeenCalledWith({
      when: 'upcoming',
      page: 1,
      limit: 10,
    });
  });

  it('switching to Past updates the URL, hook arguments, and supports arrow key navigation', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/my-bookings']}>
        <LocationTracker />
        <MyBookings />
      </MemoryRouter>
    );

    const pastTab = screen.getByRole('tab', { name: 'Past' });
    await user.click(pastTab);

    expect(screen.getByTestId('location-search')).toHaveTextContent('?when=past');
    expect(useMyBookings).toHaveBeenLastCalledWith({
      when: 'past',
      page: 1,
      limit: 10,
    });

    // Test Arrow navigation: ArrowLeft from Past moves focus to Upcoming and updates tab
    pastTab.focus();
    await user.keyboard('{ArrowLeft}');

    const upcomingTab = screen.getByRole('tab', { name: 'Upcoming' });
    expect(document.activeElement).toBe(upcomingTab);
    expect(screen.getByTestId('location-search')).toHaveTextContent('');
  });

  it('renders a cancelled booking in Past tab with badge and no cancel button', () => {
    const pastCancelledBooking = {
      _id: 'b-past-1',
      status: 'cancelled',
      start: '2026-10-09T10:00:00.000Z',
      end: '2026-10-09T11:00:00.000Z',
      resource: {
        _id: 'r-1',
        name: 'Desk Zone A',
        type: 'desk',
        location: '1st Floor',
      },
    };

    vi.mocked(useMyBookings).mockReturnValue({
      items: [pastCancelledBooking],
      meta: { page: 1, limit: 10, total: 1 },
      loading: false,
      error: null,
      slow: false,
      reload: mockReload,
    });

    render(
      <MemoryRouter initialEntries={['/my-bookings?when=past']}>
        <MyBookings />
      </MemoryRouter>
    );

    expect(screen.getByText('Desk Zone A')).toBeInTheDocument();
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('Cancelled');
    expect(screen.queryByRole('button', { name: /cancel booking/i })).not.toBeInTheDocument();
  });

  it('handles loading state with 4 skeleton rows, cold-start notice, and error state with Retry', async () => {
    const user = userEvent.setup();

    // 1. Loading + Slow
    vi.mocked(useMyBookings).mockReturnValue({
      items: [],
      meta: null,
      loading: true,
      error: null,
      slow: true,
      reload: mockReload,
    });

    const { rerender } = render(
      <MemoryRouter initialEntries={['/my-bookings']}>
        <MyBookings />
      </MemoryRouter>
    );

    expect(screen.getByTestId('bookings-loading')).toBeInTheDocument();
    expect(screen.getByText(/Waking up the server/i)).toBeInTheDocument();

    // 2. Error state with Retry
    vi.mocked(useMyBookings).mockReturnValue({
      items: [],
      meta: null,
      loading: false,
      error: new Error('Failed to load bookings from server'),
      slow: false,
      reload: mockReload,
    });

    rerender(
      <MemoryRouter initialEntries={['/my-bookings']}>
        <MyBookings />
      </MemoryRouter>
    );

    expect(screen.getByText('Failed to load bookings')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: 'Retry' });
    await user.click(retryBtn);
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('renders distinct empty states for Upcoming and Past tabs', async () => {
    const user = userEvent.setup();

    // 1. Upcoming empty state
    vi.mocked(useMyBookings).mockReturnValue({
      items: [],
      meta: { page: 1, limit: 10, total: 0 },
      loading: false,
      error: null,
      slow: false,
      reload: mockReload,
    });

    render(
      <MemoryRouter initialEntries={['/my-bookings']}>
        <MyBookings />
      </MemoryRouter>
    );

    expect(screen.getByText('No upcoming bookings')).toBeInTheDocument();
    const browseLink = screen.getByRole('link', { name: 'Browse workspaces' });
    expect(browseLink).toHaveAttribute('href', '/');

    // Switch to Past tab
    const pastTab = screen.getByRole('tab', { name: 'Past' });
    await user.click(pastTab);

    // 2. Past empty state
    expect(screen.getByText('No past bookings')).toBeInTheDocument();
  });

  it('renders Pagination only when there is more than one page and scrolls to top on page change', async () => {
    const user = userEvent.setup();
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    // 1 page of results -> No pagination
    vi.mocked(useMyBookings).mockReturnValue({
      items: [{ _id: 'b-1', status: 'confirmed', start: '2026-10-10T10:00:00.000Z', end: '2026-10-10T11:00:00.000Z' }],
      meta: { page: 1, limit: 10, total: 8 },
      loading: false,
      error: null,
      slow: false,
      reload: mockReload,
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={['/my-bookings']}>
        <LocationTracker />
        <MyBookings />
      </MemoryRouter>
    );

    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument();
    unmount();

    // 3 pages of results -> Pagination rendered
    vi.mocked(useMyBookings).mockReturnValue({
      items: [{ _id: 'b-1', status: 'confirmed', start: '2026-10-10T10:00:00.000Z', end: '2026-10-10T11:00:00.000Z' }],
      meta: { page: 1, limit: 10, total: 25 },
      loading: false,
      error: null,
      slow: false,
      reload: mockReload,
    });

    render(
      <MemoryRouter initialEntries={['/my-bookings']}>
        <LocationTracker />
        <MyBookings />
      </MemoryRouter>
    );

    const pagination = screen.getByRole('navigation', { name: /pagination/i });
    expect(pagination).toBeInTheDocument();

    const page2Button = screen.getByRole('button', { name: 'Page 2' });
    await user.click(page2Button);

    expect(screen.getByTestId('location-search')).toHaveTextContent('?page=2');
    expect(scrollSpy).toHaveBeenCalledWith(0, 0);
  });

  it('cancel success: calls API, displays notice, closes dialog, and calls reload', async () => {
    const user = userEvent.setup();
    const booking = {
      _id: 'b-101',
      status: 'confirmed',
      start: '2026-10-10T14:00:00.000Z',
      end: '2026-10-10T15:00:00.000Z',
      resource: {
        _id: 'r-1',
        name: 'Conference Room Alpha',
        type: 'room',
      },
    };

    vi.mocked(useMyBookings).mockReturnValue({
      items: [booking],
      meta: { page: 1, limit: 10, total: 1 },
      loading: false,
      error: null,
      slow: false,
      reload: mockReload,
    });
    vi.mocked(cancelBooking).mockResolvedValueOnce({ data: { status: 'cancelled' } });

    render(
      <MemoryRouter initialEntries={['/my-bookings']}>
        <MyBookings />
      </MemoryRouter>
    );

    // Click card cancel button
    const openCancelBtn = screen.getByRole('button', { name: /cancel booking/i });
    await user.click(openCancelBtn);

    // Dialog opens
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Cancel this booking?')).toBeInTheDocument();
    expect(within(dialog).getByText('Conference Room Alpha')).toBeInTheDocument();
    expect(within(dialog).getByText(/Cancelling this booking frees the time/i)).toBeInTheDocument();


    // Confirm cancel
    const confirmCancelBtn = screen.getByRole('button', { name: 'Cancel booking' });
    await user.click(confirmCancelBtn);

    await waitFor(() => {
      expect(cancelBooking).toHaveBeenCalledWith('b-101');
    });

    // Dialog closes
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Success notice is shown
    const notice = screen.getByTestId('cancel-notice');
    expect(notice).toHaveTextContent('Booking cancelled. That time is free for others again.');
    expect(mockReload).toHaveBeenCalledTimes(1);

    // Dismiss notice
    const dismissBtn = screen.getByRole('button', { name: 'Dismiss notice' });
    await user.click(dismissBtn);
    expect(screen.queryByTestId('cancel-notice')).not.toBeInTheDocument();
  });

  it('keeping the booking closes the dialog without calling API or reload', async () => {
    const user = userEvent.setup();
    const booking = {
      _id: 'b-102',
      status: 'confirmed',
      start: '2026-10-10T14:00:00.000Z',
      end: '2026-10-10T15:00:00.000Z',
      resource: { _id: 'r-1', name: 'Room Beta' },
    };

    vi.mocked(useMyBookings).mockReturnValue({
      items: [booking],
      meta: { page: 1, limit: 10, total: 1 },
      loading: false,
      error: null,
      slow: false,
      reload: mockReload,
    });

    render(
      <MemoryRouter initialEntries={['/my-bookings']}>
        <MyBookings />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /cancel booking/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const keepBtn = screen.getByRole('button', { name: 'Keep booking' });
    await user.click(keepBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(cancelBooking).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('cancel failure keeps dialog open with error message and calls reload on 409', async () => {
    const user = userEvent.setup();
    const booking = {
      _id: 'b-103',
      status: 'confirmed',
      start: '2026-10-10T14:00:00.000Z',
      end: '2026-10-10T15:00:00.000Z',
      resource: { _id: 'r-1', name: 'Room Gamma' },
    };

    vi.mocked(useMyBookings).mockReturnValue({
      items: [booking],
      meta: { page: 1, limit: 10, total: 1 },
      loading: false,
      error: null,
      slow: false,
      reload: mockReload,
    });

    const error409 = new Error('Booking has already ended or been cancelled.');
    error409.status = 409;
    vi.mocked(cancelBooking).mockRejectedValueOnce(error409);

    render(
      <MemoryRouter initialEntries={['/my-bookings']}>
        <MyBookings />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /cancel booking/i }));
    const confirmBtn = screen.getByRole('button', { name: 'Cancel booking' });
    await user.click(confirmBtn);

    // Dialog stays open
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Error message rendered in dialog-error alert
    const errorAlert = screen.getByTestId('dialog-error');
    expect(errorAlert).toHaveTextContent('Booking has already ended or been cancelled.');

    // reload was called due to 409 stale data
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('cancelling the last item on page 2 returns to page 1 without calling reload', async () => {
    const user = userEvent.setup();
    const booking = {
      _id: 'b-104',
      status: 'confirmed',
      start: '2026-10-10T14:00:00.000Z',
      end: '2026-10-10T15:00:00.000Z',
      resource: { _id: 'r-1', name: 'Room Delta' },
    };

    // Exactly 1 item on page 2
    vi.mocked(useMyBookings).mockReturnValue({
      items: [booking],
      meta: { page: 2, limit: 10, total: 11 },
      loading: false,
      error: null,
      slow: false,
      reload: mockReload,
    });
    vi.mocked(cancelBooking).mockResolvedValueOnce({ data: { status: 'cancelled' } });

    render(
      <MemoryRouter initialEntries={['/my-bookings?page=2']}>
        <LocationTracker />
        <MyBookings />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /cancel booking/i }));
    await user.click(screen.getByRole('button', { name: 'Cancel booking' }));

    await waitFor(() => {
      expect(cancelBooking).toHaveBeenCalledWith('b-104');
    });

    // Page changed back to 1 (page param deleted from URL)
    expect(screen.getByTestId('location-search')).toHaveTextContent('');

    // reload() was NOT called because the page change triggers the refetch
    expect(mockReload).not.toHaveBeenCalled();
  });
});
