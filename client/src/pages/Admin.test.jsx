import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import Admin from './Admin.jsx';
import * as resourcesApi from '../api/resources.js';
import * as bookingsApi from '../api/bookings.js';
import * as useResourcesModule from '../hooks/useResources.js';
import * as useAllBookingsModule from '../hooks/useAllBookings.js';

vi.mock('../api/resources.js', () => ({
  listResources: vi.fn(),
  createResource: vi.fn(),
  updateResource: vi.fn(),
  disableResource: vi.fn(),
}));

vi.mock('../api/bookings.js', () => ({
  cancelBooking: vi.fn(),
  listAllBookings: vi.fn(),
}));

vi.mock('../hooks/useResources.js', () => ({
  default: vi.fn(),
  useResources: vi.fn(),
}));

vi.mock('../hooks/useAllBookings.js', () => ({
  default: vi.fn(),
  useAllBookings: vi.fn(),
}));

vi.mock('../hooks/useNow.js', () => ({
  default: () => new Date('2026-10-05T10:00:00.000Z'),
  useNow: () => new Date('2026-10-05T10:00:00.000Z'),
}));

// Helper component to observe current URL in MemoryRouter
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.search}</div>;
}

function renderAdmin(initialEntry = '/admin') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/admin"
          element={
            <>
              <Admin />
              <LocationDisplay />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

const mockResources = [
  {
    _id: 'res-1',
    name: 'Orion Room',
    type: 'room',
    capacity: 8,
    location: 'Floor 2',
    amenities: ['WiFi', 'Projector'],
    isActive: true,
  },
  {
    _id: 'res-2',
    name: 'Desk A-12',
    type: 'desk',
    capacity: 1,
    location: 'Floor 1',
    amenities: ['Monitor'],
    isActive: false,
  },
];

const mockBookings = [
  {
    _id: 'b1',
    resource: { _id: 'res-1', name: 'Orion Room', location: 'Floor 2' },
    user: { _id: 'u1', name: 'Alice Smith', email: 'alice@example.com' },
    start: '2026-10-05T14:00:00.000Z',
    end: '2026-10-05T15:30:00.000Z',
    status: 'confirmed',
  },
  {
    _id: 'b2',
    resource: { _id: 'res-2', name: 'Desk A-12', location: 'Floor 1' },
    user: { _id: 'u2', name: 'Bob Jones', email: 'bob@example.com' },
    start: '2026-10-04T09:00:00.000Z',
    end: '2026-10-04T10:00:00.000Z',
    status: 'cancelled',
  },
];

describe('Admin Page', () => {
  let reloadResourcesMock;
  let reloadBookingsMock;

  beforeEach(() => {
    vi.restoreAllMocks();
    reloadResourcesMock = vi.fn();
    reloadBookingsMock = vi.fn();

    resourcesApi.listResources.mockResolvedValue({
      data: mockResources,
      meta: { page: 1, limit: 50, total: 2 },
    });

    useResourcesModule.default.mockReturnValue({
      items: mockResources,
      meta: { page: 1, limit: 12, total: 2 },
      loading: false,
      error: null,
      reload: reloadResourcesMock,
    });

    useAllBookingsModule.default.mockReturnValue({
      items: mockBookings,
      meta: { page: 1, limit: 15, total: 2 },
      loading: false,
      error: null,
      reload: reloadBookingsMock,
    });
  });

  // ---------------------------------------------------------------
  // Phase 11a: Resources Tab Tests
  // ---------------------------------------------------------------
  it('renders title, toolbar controls, table rows, and status badges', () => {
    renderAdmin();

    expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New resource/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by name/i)).toBeInTheDocument();

    const showDisabledCheckbox = screen.getByRole('checkbox', { name: /Show disabled/i });
    expect(showDisabledCheckbox).toBeInTheDocument();
    expect(showDisabledCheckbox).toBeChecked();

    // Table rows
    expect(screen.getByText('Orion Room')).toBeInTheDocument();
    expect(screen.getByText('Desk A-12')).toBeInTheDocument();

    // Status badges carry text
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();

    // Amenities
    expect(screen.getByText('WiFi')).toBeInTheDocument();
    expect(screen.getByText('Projector')).toBeInTheDocument();
    expect(screen.getByText('Monitor')).toBeInTheDocument();
  });

  it('updates the URL when resources filters change', async () => {
    const user = userEvent.setup();
    renderAdmin('/admin');

    const typeSelect = screen.getByLabelText(/Filter by type/i);
    await user.selectOptions(typeSelect, 'room');

    const locationDisplay = screen.getByTestId('location-display');
    expect(locationDisplay).toHaveTextContent('type=room');

    const showDisabledCheckbox = screen.getByRole('checkbox', { name: /Show disabled/i });
    await user.click(showDisabledCheckbox);
    expect(locationDisplay).toHaveTextContent('showDisabled=false');

    const searchInput = screen.getByPlaceholderText(/Search by name/i);
    await user.type(searchInput, 'Orion');

    await waitFor(
      () => {
        expect(locationDisplay).toHaveTextContent('q=Orion');
      },
      { timeout: 1000 }
    );
  });

  it('handles create resource flow and shows admin notice', async () => {
    const user = userEvent.setup();
    resourcesApi.createResource.mockResolvedValueOnce({
      data: { _id: 'res-new', name: 'Nova Room' },
    });

    renderAdmin();

    await user.click(screen.getByRole('button', { name: /New resource/i }));
    expect(screen.getByRole('heading', { name: 'New Resource' })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Name/i), 'Nova Room');
    await user.type(screen.getByLabelText(/Location/i), 'Floor 3');

    await user.click(screen.getByRole('button', { name: 'Create resource' }));

    await waitFor(() => {
      expect(resourcesApi.createResource).toHaveBeenCalledTimes(1);
    });

    const notice = await screen.findByTestId('admin-notice');
    expect(notice).toHaveAttribute('role', 'status');
    expect(notice).toHaveTextContent(/Nova Room.*created successfully/i);
    expect(reloadResourcesMock).toHaveBeenCalled();

    const dismissBtn = screen.getByRole('button', { name: /Dismiss notice/i });
    await user.click(dismissBtn);
    expect(screen.queryByTestId('admin-notice')).not.toBeInTheDocument();
  });

  it('handles edit resource flow and shows admin notice', async () => {
    const user = userEvent.setup();
    resourcesApi.updateResource.mockResolvedValueOnce({
      data: { _id: 'res-1', name: 'Orion Room Renamed' },
    });

    renderAdmin();

    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[0]);

    expect(screen.getByRole('heading', { name: 'Edit Resource' })).toBeInTheDocument();
    const nameInput = screen.getByLabelText(/Name/i);
    expect(nameInput).toHaveValue('Orion Room');

    await user.clear(nameInput);
    await user.type(nameInput, 'Orion Room Renamed');

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(resourcesApi.updateResource).toHaveBeenCalledWith(
        'res-1',
        expect.objectContaining({
          name: 'Orion Room Renamed',
        })
      );
    });

    const notice = await screen.findByTestId('admin-notice');
    expect(notice).toHaveTextContent(/Orion Room Renamed.*updated successfully/i);
    expect(reloadResourcesMock).toHaveBeenCalled();
  });

  it('handles disable flow with ConfirmDialog', async () => {
    const user = userEvent.setup();
    resourcesApi.disableResource.mockResolvedValueOnce({
      data: { _id: 'res-1', isActive: false },
    });

    renderAdmin();

    const disableBtn = screen.getByRole('button', { name: 'Disable' });
    await user.click(disableBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Disable this resource?' })).toBeInTheDocument();
    expect(
      screen.getByText(/Existing bookings stay, but nobody will be able to book it/i)
    ).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    const confirmBtn = within(dialog).getByRole('button', { name: 'Disable' });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(resourcesApi.disableResource).toHaveBeenCalledWith('res-1');
    });

    const notice = await screen.findByTestId('admin-notice');
    expect(notice).toHaveTextContent(/disabled successfully/i);
    expect(reloadResourcesMock).toHaveBeenCalled();
  });

  it('shows error in dialog when disable fails', async () => {
    const user = userEvent.setup();
    resourcesApi.disableResource.mockRejectedValueOnce(
      new Error('Network error disabling resource')
    );

    renderAdmin();

    await user.click(screen.getByRole('button', { name: 'Disable' }));

    const dialog = screen.getByRole('dialog');
    const confirmBtn = within(dialog).getByRole('button', { name: 'Disable' });
    await user.click(confirmBtn);

    await waitFor(() => {
      const dialogError = screen.getByTestId('dialog-error');
      expect(dialogError).toHaveTextContent('Network error disabling resource');
    });
  });

  it('handles enable flow directly without confirmation dialog', async () => {
    const user = userEvent.setup();
    resourcesApi.updateResource.mockResolvedValueOnce({
      data: { _id: 'res-2', isActive: true },
    });

    renderAdmin();

    const enableBtn = screen.getByRole('button', { name: 'Enable' });
    await user.click(enableBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(resourcesApi.updateResource).toHaveBeenCalledWith('res-2', { isActive: true });
    });

    const notice = await screen.findByTestId('admin-notice');
    expect(notice).toHaveTextContent(/Desk A-12.*enabled successfully/i);
    expect(reloadResourcesMock).toHaveBeenCalled();
  });

  it('shows alert banner when enable fails', async () => {
    const user = userEvent.setup();
    resourcesApi.updateResource.mockRejectedValueOnce(new Error('Server error enabling resource'));

    renderAdmin();

    const enableBtn = screen.getByRole('button', { name: 'Enable' });
    await user.click(enableBtn);

    await waitFor(() => {
      const alert = screen.getByTestId('admin-alert');
      expect(alert).toHaveAttribute('role', 'alert');
      expect(alert).toHaveTextContent('Server error enabling resource');
    });
  });

  it('renders EmptyState when items list is empty in resources tab', () => {
    useResourcesModule.default.mockReturnValue({
      items: [],
      meta: { page: 1, limit: 12, total: 0 },
      loading: false,
      error: null,
      reload: reloadResourcesMock,
    });

    renderAdmin();

    expect(screen.getByText('No resources found')).toBeInTheDocument();
    expect(screen.getByText('No resources match the selected filters.')).toBeInTheDocument();
  });

  it('renders ErrorState with retry when useResources errors', async () => {
    const user = userEvent.setup();
    useResourcesModule.default.mockReturnValue({
      items: [],
      meta: null,
      loading: false,
      error: new Error('Failed to load resources'),
      reload: reloadResourcesMock,
    });

    renderAdmin();

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Failed to load resources' })).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: 'Try again' });
    await user.click(retryBtn);

    expect(reloadResourcesMock).toHaveBeenCalled();
  });

  it('renders loading skeleton while loading resources', () => {
    useResourcesModule.default.mockReturnValue({
      items: [],
      meta: null,
      loading: true,
      error: null,
      reload: reloadResourcesMock,
    });

    renderAdmin();

    expect(screen.getByTestId('admin-loading')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------
  // Phase 11b: Tablist & Bookings Tab Tests
  // ---------------------------------------------------------------
  it('switches tabs and updates URL state; keyboard arrow keys switch tabs and move focus', async () => {
    const user = userEvent.setup();
    renderAdmin('/admin');

    const resourcesTab = screen.getByRole('tab', { name: 'Resources' });
    const bookingsTab = screen.getByRole('tab', { name: 'Bookings' });

    expect(resourcesTab).toHaveAttribute('aria-selected', 'true');
    expect(bookingsTab).toHaveAttribute('aria-selected', 'false');

    // Click Bookings tab
    await user.click(bookingsTab);
    expect(screen.getByTestId('location-display')).toHaveTextContent('tab=bookings');
    expect(bookingsTab).toHaveAttribute('aria-selected', 'true');
    expect(resourcesTab).toHaveAttribute('aria-selected', 'false');

    // Test Arrow navigation: ArrowLeft returns to Resources and moves focus
    bookingsTab.focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByTestId('location-display')).not.toHaveTextContent('tab=bookings');
    expect(document.activeElement).toBe(resourcesTab);

    // ArrowRight switches to Bookings and moves focus
    await user.keyboard('{ArrowRight}');
    expect(screen.getByTestId('location-display')).toHaveTextContent('tab=bookings');
    expect(document.activeElement).toBe(bookingsTab);
  });

  it('renders bookings table with user and resource info and computed statuses', () => {
    renderAdmin('/admin?tab=bookings');

    const tabpanel = screen.getByRole('tabpanel');
    expect(tabpanel).toHaveAttribute('id', 'panel-bookings');

    // Headers
    expect(screen.getByRole('columnheader', { name: 'Resource' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'User' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Date' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Time' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();

    // Row 1: Alice Smith, Orion Room
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Orion Room')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();

    // Row 2: Bob Jones, Desk A-12
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    expect(screen.getByText('Desk A-12')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();

    // Row 1 is cancellable, so Cancel button appears
    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
    expect(cancelButtons.length).toBe(1);
  });

  it('writes bookings filters to the URL and passes converted params to the hook', async () => {
    const user = userEvent.setup();
    renderAdmin('/admin?tab=bookings');

    // Status filter
    const statusSelect = screen.getByLabelText(/Status/i);
    await user.selectOptions(statusSelect, 'confirmed');

    const locationDisplay = screen.getByTestId('location-display');
    expect(locationDisplay).toHaveTextContent('status=confirmed');

    // Resource filter
    const resourceSelect = screen.getByLabelText(/Resource/i);
    await user.selectOptions(resourceSelect, 'res-1');
    expect(locationDisplay).toHaveTextContent('resourceId=res-1');

    // From and To dates
    const fromInput = screen.getByLabelText(/From/i);
    const toInput = screen.getByLabelText(/To/i);

    await user.type(fromInput, '2026-10-01');
    await user.type(toInput, '2026-10-05');

    expect(locationDisplay).toHaveTextContent('from=2026-10-01');
    expect(locationDisplay).toHaveTextContent('to=2026-10-05');

    // Verify useAllBookings received converted UTC from/to
    expect(useAllBookingsModule.default).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'confirmed',
        resourceId: 'res-1',
        from: expect.any(String),
        to: expect.any(String),
        enabled: true,
      })
    );
  });

  it('shows an inline error and does not call the API when date range is invalid', async () => {
    const user = userEvent.setup();
    renderAdmin('/admin?tab=bookings');

    const fromInput = screen.getByLabelText(/From/i);
    const toInput = screen.getByLabelText(/To/i);

    // from is AFTER to
    await user.type(fromInput, '2026-10-10');
    await user.type(toInput, '2026-10-05');

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/From date must be on or before To date/i);

    // Verify useAllBookings received enabled: false
    expect(useAllBookingsModule.default).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('handles admin cancel booking flow with confirmation and shows notice', async () => {
    const user = userEvent.setup();
    bookingsApi.cancelBooking.mockResolvedValueOnce({
      data: { _id: 'b1', status: 'cancelled' },
    });

    renderAdmin('/admin?tab=bookings');

    // Click Cancel on the cancellable booking
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelBtn);

    // Confirm dialog opens
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cancel this booking?' })).toBeInTheDocument();
    expect(
      screen.getByText(/Cancelling this booking frees the time for others again/i)
    ).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    const confirmCancelBtn = within(dialog).getByRole('button', { name: 'Cancel booking' });
    await user.click(confirmCancelBtn);

    await waitFor(() => {
      expect(bookingsApi.cancelBooking).toHaveBeenCalledWith('b1');
    });

    const notice = await screen.findByTestId('admin-notice');
    expect(notice).toHaveTextContent(/Booking cancelled. That time is free for others again./i);
    expect(reloadBookingsMock).toHaveBeenCalled();
  });

  it('handles cancel booking failure and displays error in dialog', async () => {
    const user = userEvent.setup();
    bookingsApi.cancelBooking.mockRejectedValueOnce(new Error('Cannot cancel ended booking'));

    renderAdmin('/admin?tab=bookings');

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelBtn);

    const dialog = screen.getByRole('dialog');
    const confirmCancelBtn = within(dialog).getByRole('button', { name: 'Cancel booking' });
    await user.click(confirmCancelBtn);

    await waitFor(() => {
      const dialogError = screen.getByTestId('dialog-error');
      expect(dialogError).toHaveTextContent('Cannot cancel ended booking');
    });
  });

  it('navigates to previous page if the cancelled booking was the last item on the page', async () => {
    const user = userEvent.setup();
    useAllBookingsModule.default.mockReturnValue({
      items: [mockBookings[0]], // Single item
      meta: { page: 2, limit: 15, total: 16 },
      loading: false,
      error: null,
      reload: reloadBookingsMock,
    });
    bookingsApi.cancelBooking.mockResolvedValueOnce({ data: { _id: 'b1' } });

    renderAdmin('/admin?tab=bookings&page=2');

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelBtn);

    const dialog = screen.getByRole('dialog');
    const confirmCancelBtn = within(dialog).getByRole('button', { name: 'Cancel booking' });
    await user.click(confirmCancelBtn);

    await waitFor(() => {
      expect(bookingsApi.cancelBooking).toHaveBeenCalledWith('b1');
    });

    // Page should navigate back to page 1 (i.e. page param removed)
    expect(screen.getByTestId('location-display')).not.toHaveTextContent('page=2');
  });

  it('renders EmptyState and ErrorState for Bookings tab', async () => {
    const user = userEvent.setup();

    // 1. Empty state
    useAllBookingsModule.default.mockReturnValue({
      items: [],
      meta: { page: 1, limit: 15, total: 0 },
      loading: false,
      error: null,
      reload: reloadBookingsMock,
    });

    const { rerender } = renderAdmin('/admin?tab=bookings');
    expect(screen.getByText('No bookings found')).toBeInTheDocument();

    // 2. Error state
    useAllBookingsModule.default.mockReturnValue({
      items: [],
      meta: null,
      loading: false,
      error: new Error('Failed to load bookings'),
      reload: reloadBookingsMock,
    });

    rerender(
      <MemoryRouter initialEntries={['/admin?tab=bookings']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <>
                <Admin />
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Failed to load bookings' })).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: 'Try again' });
    await user.click(retryBtn);
    expect(reloadBookingsMock).toHaveBeenCalled();
  });
});
