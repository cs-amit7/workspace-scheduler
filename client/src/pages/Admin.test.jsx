import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import Admin from './Admin.jsx';
import * as resourcesApi from '../api/resources.js';
import * as useResourcesModule from '../hooks/useResources.js';

vi.mock('../api/resources.js', () => ({
  createResource: vi.fn(),
  updateResource: vi.fn(),
  disableResource: vi.fn(),
}));

vi.mock('../hooks/useResources.js', () => ({
  default: vi.fn(),
  useResources: vi.fn(),
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

describe('Admin Page', () => {
  let reloadMock;

  beforeEach(() => {
    vi.restoreAllMocks();
    reloadMock = vi.fn();
    useResourcesModule.default.mockReturnValue({
      items: mockResources,
      meta: { page: 1, limit: 12, total: 2 },
      loading: false,
      error: null,
      reload: reloadMock,
    });
  });

  it('renders title, toolbar controls, table rows, and status badges', () => {
    renderAdmin();

    expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New resource/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by name/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();

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

  it('updates the URL when filters change', async () => {
    const user = userEvent.setup();
    renderAdmin('/admin');

    // Type filter
    const typeSelect = screen.getByRole('combobox');
    await user.selectOptions(typeSelect, 'room');

    const locationDisplay = screen.getByTestId('location-display');
    expect(locationDisplay).toHaveTextContent('type=room');

    // Show disabled filter
    const showDisabledCheckbox = screen.getByRole('checkbox', { name: /Show disabled/i });
    await user.click(showDisabledCheckbox);
    expect(locationDisplay).toHaveTextContent('showDisabled=false');

    // Search filter (debounced)
    const searchInput = screen.getByPlaceholderText(/Search by name/i);
    await user.type(searchInput, 'Orion');

    await waitFor(() => {
      expect(locationDisplay).toHaveTextContent('q=Orion');
    }, { timeout: 1000 });
  });

  it('handles create resource flow and shows admin notice', async () => {
    const user = userEvent.setup();
    resourcesApi.createResource.mockResolvedValueOnce({
      data: { _id: 'res-new', name: 'Nova Room' },
    });

    renderAdmin();

    // Click "New resource" button
    await user.click(screen.getByRole('button', { name: /New resource/i }));

    // Form modal opens
    expect(screen.getByRole('heading', { name: 'New Resource' })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Name/i), 'Nova Room');
    await user.type(screen.getByLabelText(/Location/i), 'Floor 3');

    await user.click(screen.getByRole('button', { name: 'Create resource' }));

    await waitFor(() => {
      expect(resourcesApi.createResource).toHaveBeenCalledTimes(1);
    });

    // Check dismissible status notice
    const notice = await screen.findByTestId('admin-notice');
    expect(notice).toHaveAttribute('role', 'status');
    expect(notice).toHaveTextContent(/Nova Room.*created successfully/i);
    expect(reloadMock).toHaveBeenCalled();

    // Dismiss notice
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

    // Modal opens with prefilled data
    expect(screen.getByRole('heading', { name: 'Edit Resource' })).toBeInTheDocument();
    const nameInput = screen.getByLabelText(/Name/i);
    expect(nameInput).toHaveValue('Orion Room');

    await user.clear(nameInput);
    await user.type(nameInput, 'Orion Room Renamed');

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(resourcesApi.updateResource).toHaveBeenCalledWith('res-1', expect.objectContaining({
        name: 'Orion Room Renamed',
      }));
    });

    const notice = await screen.findByTestId('admin-notice');
    expect(notice).toHaveTextContent(/Orion Room Renamed.*updated successfully/i);
    expect(reloadMock).toHaveBeenCalled();
  });

  it('handles disable flow with ConfirmDialog', async () => {
    const user = userEvent.setup();
    resourcesApi.disableResource.mockResolvedValueOnce({
      data: { _id: 'res-1', isActive: false },
    });

    renderAdmin();

    // Click Disable on the active resource
    const disableBtn = screen.getByRole('button', { name: 'Disable' });
    await user.click(disableBtn);

    // ConfirmDialog opens
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Disable this resource?' })).toBeInTheDocument();
    expect(screen.getByText(/Existing bookings stay, but nobody will be able to book it/i)).toBeInTheDocument();

    // Confirm disable
    const dialog = screen.getByRole('dialog');
    const confirmBtn = within(dialog).getByRole('button', { name: 'Disable' });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(resourcesApi.disableResource).toHaveBeenCalledWith('res-1');
    });

    const notice = await screen.findByTestId('admin-notice');
    expect(notice).toHaveTextContent(/disabled successfully/i);
    expect(reloadMock).toHaveBeenCalled();
  });

  it('shows error in dialog when disable fails', async () => {
    const user = userEvent.setup();
    resourcesApi.disableResource.mockRejectedValueOnce(new Error('Network error disabling resource'));

    renderAdmin();

    await user.click(screen.getByRole('button', { name: 'Disable' }));

    // Confirm in dialog
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

    // Click Enable on the inactive resource
    const enableBtn = screen.getByRole('button', { name: 'Enable' });
    await user.click(enableBtn);

    // No confirmation dialog shown for enable
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(resourcesApi.updateResource).toHaveBeenCalledWith('res-2', { isActive: true });
    });

    const notice = await screen.findByTestId('admin-notice');
    expect(notice).toHaveTextContent(/Desk A-12.*enabled successfully/i);
    expect(reloadMock).toHaveBeenCalled();
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

  it('renders EmptyState when items list is empty', () => {
    useResourcesModule.default.mockReturnValue({
      items: [],
      meta: { page: 1, limit: 12, total: 0 },
      loading: false,
      error: null,
      reload: reloadMock,
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
      error: new Error('Failed to fetch resources'),
      reload: reloadMock,
    });

    renderAdmin();

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Failed to load resources')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: 'Try again' });
    await user.click(retryBtn);

    expect(reloadMock).toHaveBeenCalled();
  });

  it('renders loading skeleton while loading', () => {
    useResourcesModule.default.mockReturnValue({
      items: [],
      meta: null,
      loading: true,
      error: null,
      reload: reloadMock,
    });

    renderAdmin();

    expect(screen.getByTestId('admin-loading')).toBeInTheDocument();
  });
});
