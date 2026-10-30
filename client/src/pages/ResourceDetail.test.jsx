import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ResourceDetail from './ResourceDetail.jsx';
import * as resourcesApi from '../api/resources.js';

describe('ResourceDetail Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = (initialEntry = '/resources/res-123') => {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/resources/:id" element={<ResourceDetail />} />
          <Route path="/" element={<div>Dashboard Home</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders loading skeletons while fetching resource', () => {
    vi.spyOn(resourcesApi, 'getResource').mockReturnValue(new Promise(() => {}));
    vi.spyOn(resourcesApi, 'getAvailability').mockReturnValue(new Promise(() => {}));

    renderComponent();

    expect(screen.getByTestId('resource-detail-loading')).toBeInTheDocument();
  });

  it('renders EmptyState "Resource not found" on 404 with a link back to dashboard', async () => {
    const error404 = new Error('Resource not found');
    error404.status = 404;

    vi.spyOn(resourcesApi, 'getResource').mockRejectedValueOnce(error404);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Resource not found')).toBeInTheDocument();
    });

    const dashboardLink = screen.getByRole('link', { name: /back to dashboard/i });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute('href', '/');
  });

  it('renders ErrorState with Retry on general fetch failure', async () => {
    const error500 = new Error('Database connection failed');
    error500.status = 500;

    const getResourceSpy = vi
      .spyOn(resourcesApi, 'getResource')
      .mockRejectedValueOnce(error500)
      .mockResolvedValueOnce({
        data: {
          _id: 'res-123',
          name: 'Orion Room',
          type: 'room',
          capacity: 8,
          location: 'Floor 2',
          amenities: ['WiFi'],
        },
      });

    vi.spyOn(resourcesApi, 'getAvailability').mockResolvedValue({
      data: { resourceId: 'res-123', booked: [] },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Failed to load resource')).toBeInTheDocument();
    });

    expect(screen.getByText(/database connection failed/i)).toBeInTheDocument();

    const user = userEvent.setup();
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    await user.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Orion Room' })).toBeInTheDocument();
    });

    expect(getResourceSpy).toHaveBeenCalledTimes(2);
  });

  it('renders resource details, date picker, slot grid, and selection summary', async () => {
    const mockResource = {
      _id: 'res-123',
      name: 'Orion Room',
      type: 'room',
      capacity: 8,
      location: 'Floor 2',
      amenities: ['WiFi', 'Projector'],
      description: 'Glass-walled conference room',
    };

    vi.spyOn(resourcesApi, 'getResource').mockResolvedValueOnce({ data: mockResource });
    vi.spyOn(resourcesApi, 'getAvailability').mockResolvedValueOnce({
      data: { resourceId: 'res-123', booked: [] },
    });

    const user = userEvent.setup();
    renderComponent('/resources/res-123?date=2028-10-05');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Orion Room' })).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/capacity 8/i)).toBeInTheDocument();
    expect(screen.getByText('Floor 2')).toBeInTheDocument();
    expect(screen.getByText('WiFi')).toBeInTheDocument();
    expect(screen.getByText('Projector')).toBeInTheDocument();
    expect(screen.getByText('Glass-walled conference room')).toBeInTheDocument();

    // Check DatePicker
    const dateInput = screen.getByLabelText(/^date$/i);
    expect(dateInput).toHaveValue('2028-10-05');

    // Check SlotGrid
    const grid = screen.getByRole('grid', { name: /available slots/i });
    expect(grid).toBeInTheDocument();

    // Select a cell on the grid
    const cells = screen.getAllByRole('gridcell');
    // Click 10:00 (index 6: 07:00, 07:30, 08:00, 08:30, 09:00, 09:30, 10:00)
    const slot1000 = cells.find((c) => c.textContent?.includes('10:00'));
    expect(slot1000).toBeDefined();
    await user.click(slot1000);

    const summary = screen.getByTestId('selection-summary');
    expect(summary).toBeInTheDocument();
    expect(summary).toHaveTextContent(/10:00-10:30 \(30m\)/);
  });
});
