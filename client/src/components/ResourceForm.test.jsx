import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResourceForm from './ResourceForm.jsx';
import * as resourcesApi from '../api/resources.js';
import { AMENITIES } from '../utils/amenities.js';

vi.mock('../api/resources.js', () => ({
  createResource: vi.fn(),
  updateResource: vi.fn(),
}));

describe('ResourceForm component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all controls with visible labels in create mode', () => {
    render(<ResourceForm open={true} onClose={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'New Resource' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Capacity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Location/i)).toBeInTheDocument();
    expect(screen.getByText('Amenities')).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create resource' })).toBeInTheDocument();
  });

  it('validates required fields on submit and focuses the first invalid field', async () => {
    const user = userEvent.setup();
    render(<ResourceForm open={true} onClose={vi.fn()} />);

    const submitBtn = screen.getByRole('button', { name: 'Create resource' });
    await user.click(submitBtn);

    const nameInput = screen.getByLabelText(/Name/i);
    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    expect(document.activeElement).toBe(nameInput);

    const errorMsg = screen.getByText('Name is required');
    expect(errorMsg).toBeInTheDocument();
    expect(nameInput).toHaveAttribute('aria-describedby', errorMsg.id);
  });

  it('forces capacity to 1 when desk is selected', async () => {
    const user = userEvent.setup();
    render(<ResourceForm open={true} onClose={vi.fn()} />);

    const typeSelect = screen.getByLabelText(/Type/i);
    const capacityInput = screen.getByLabelText(/Capacity/i);

    // Initial state: room with capacity 1
    await user.clear(capacityInput);
    await user.type(capacityInput, '8');
    expect(capacityInput).toHaveValue(8);

    // Switching to desk forces capacity to 1 and disables input
    await user.selectOptions(typeSelect, 'desk');
    expect(capacityInput).toHaveValue(1);
    expect(capacityInput).toBeDisabled();
    expect(screen.getByText(/Desks have a fixed capacity of 1/i)).toBeInTheDocument();
  });

  it('submits create payload with trimmed fields and correct types', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    const createdData = {
      _id: 'res-new',
      name: 'Orion Room',
      type: 'room',
      capacity: 10,
      location: 'Floor 3',
      amenities: ['WiFi', 'Whiteboard'],
      description: 'Glass-walled conference room',
    };
    resourcesApi.createResource.mockResolvedValueOnce({ data: createdData });

    render(<ResourceForm open={true} onClose={onClose} onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/Name/i), '  Orion Room  ');
    await user.selectOptions(screen.getByLabelText(/Type/i), 'room');
    await user.clear(screen.getByLabelText(/Capacity/i));
    await user.type(screen.getByLabelText(/Capacity/i), '10');
    await user.type(screen.getByLabelText(/Location/i), '  Floor 3  ');

    // Toggle amenities
    const wifiCheckbox = screen.getByRole('checkbox', { name: 'WiFi' });
    const whiteboardCheckbox = screen.getByRole('checkbox', { name: 'Whiteboard' });
    await user.click(wifiCheckbox);
    await user.click(whiteboardCheckbox);

    await user.type(screen.getByLabelText(/Description/i), '  Glass-walled conference room  ');

    await user.click(screen.getByRole('button', { name: 'Create resource' }));

    await waitFor(() => {
      expect(resourcesApi.createResource).toHaveBeenCalledTimes(1);
    });

    expect(resourcesApi.createResource).toHaveBeenCalledWith({
      name: 'Orion Room',
      type: 'room',
      capacity: 10,
      location: 'Floor 3',
      amenities: ['WiFi', 'Whiteboard'],
      description: 'Glass-walled conference room',
    });

    expect(onSuccess).toHaveBeenCalledWith(createdData);
    expect(onClose).toHaveBeenCalled();
  });

  it('submits edit payload with prefilled data', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    const existingResource = {
      _id: 'res-existing',
      name: 'Desk 4B',
      type: 'desk',
      capacity: 1,
      location: 'Floor 1',
      amenities: ['WiFi', 'Monitor'],
      description: 'Corner desk',
    };

    resourcesApi.updateResource.mockResolvedValueOnce({
      data: { ...existingResource, location: 'Floor 2' },
    });

    render(
      <ResourceForm
        open={true}
        resource={existingResource}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    expect(screen.getByRole('heading', { name: 'Edit Resource' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/i)).toHaveValue('Desk 4B');
    expect(screen.getByLabelText(/Type/i)).toHaveValue('desk');
    expect(screen.getByLabelText(/Capacity/i)).toHaveValue(1);
    expect(screen.getByLabelText(/Location/i)).toHaveValue('Floor 1');
    expect(screen.getByRole('checkbox', { name: 'WiFi' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Monitor' })).toBeChecked();

    const locationInput = screen.getByLabelText(/Location/i);
    await user.clear(locationInput);
    await user.type(locationInput, 'Floor 2');

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(resourcesApi.updateResource).toHaveBeenCalledTimes(1);
    });

    expect(resourcesApi.updateResource).toHaveBeenCalledWith('res-existing', {
      name: 'Desk 4B',
      type: 'desk',
      capacity: 1,
      location: 'Floor 2',
      amenities: ['WiFi', 'Monitor'],
      description: 'Corner desk',
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('displays 400 VALIDATION_ERROR alert banner and maps details to field errors', async () => {
    const user = userEvent.setup();

    const validationError = new Error('Invalid resource data');
    validationError.code = 'VALIDATION_ERROR';
    validationError.status = 400;
    validationError.details = [
      { path: ['name'], message: 'Name is already in use' },
      { path: ['location'], message: 'Location must be valid' },
    ];

    resourcesApi.createResource.mockRejectedValueOnce(validationError);

    render(<ResourceForm open={true} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText(/Name/i), 'Duplicate Room');
    await user.type(screen.getByLabelText(/Location/i), 'Floor 1');

    await user.click(screen.getByRole('button', { name: 'Create resource' }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Invalid resource data');
    });

    expect(screen.getByText('Name is already in use')).toBeInTheDocument();
    expect(screen.getByText('Location must be valid')).toBeInTheDocument();
  });

  it('guards against double submit and shows Saving... while busy', async () => {
    const user = userEvent.setup();

    let resolvePromise;
    const slowPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    resourcesApi.createResource.mockReturnValue(slowPromise);

    render(<ResourceForm open={true} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText(/Name/i), 'Test Room');
    await user.type(screen.getByLabelText(/Location/i), 'Floor 1');

    const submitBtn = screen.getByRole('button', { name: 'Create resource' });
    await user.click(submitBtn);

    // Button transitions to Saving... and is disabled
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.getByLabelText(/Name/i)).toBeDisabled();

    // Second click should not call API again
    await user.click(submitBtn);
    expect(resourcesApi.createResource).toHaveBeenCalledTimes(1);

    // Resolve in-flight request
    await act(async () => {
      resolvePromise({ data: { _id: 'res-1' } });
    });
  });

  it('preserves accessible names for all amenity checkboxes with decorative icons', () => {
    render(<ResourceForm open={true} onClose={vi.fn()} />);

    AMENITIES.forEach((amenity) => {
      const checkbox = screen.getByRole('checkbox', { name: amenity });
      expect(checkbox).toBeInTheDocument();
      expect(screen.getByLabelText(amenity)).toBe(checkbox);
    });
  });
});
