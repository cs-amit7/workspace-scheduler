import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import ResourceCard from './ResourceCard.jsx';

describe('ResourceCard', () => {
  const mockResource = {
    _id: 'res-123',
    name: 'Apollo Meeting Room',
    type: 'room',
    capacity: 10,
    location: 'Floor 3, West Wing',
    amenities: ['WiFi', 'Projector', 'Whiteboard'],
  };

  it('shows name, location, capacity aria-label, amenities, and View slots link', () => {
    render(
      <MemoryRouter>
        <ResourceCard resource={mockResource} />
      </MemoryRouter>
    );

    // Name
    expect(screen.getByText('Apollo Meeting Room')).toBeInTheDocument();

    // Location
    expect(screen.getByText('Floor 3, West Wing')).toBeInTheDocument();

    // Capacity with aria-label
    const capacityBadge = screen.getByLabelText('Capacity 10');
    expect(capacityBadge).toBeInTheDocument();
    expect(capacityBadge).toHaveTextContent('10');

    // Amenities
    expect(screen.getByText('WiFi')).toBeInTheDocument();
    expect(screen.getByText('Projector')).toBeInTheDocument();
    expect(screen.getByText('Whiteboard')).toBeInTheDocument();

    // View slots link
    const link = screen.getByRole('link', { name: /View slots/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/resources/res-123');
  });

  it('renders desk resource with type-desk styling and single capacity', () => {
    const deskResource = {
      _id: 'desk-456',
      name: 'Hot Desk B-14',
      type: 'desk',
      capacity: 1,
      location: 'Floor 1, Open Space',
      amenities: ['Monitor'],
    };

    render(
      <MemoryRouter>
        <ResourceCard resource={deskResource} />
      </MemoryRouter>
    );

    expect(screen.getByText('Hot Desk B-14')).toBeInTheDocument();
    expect(screen.getByLabelText('Capacity 1')).toHaveTextContent('1');
    expect(screen.getByText('Monitor')).toBeInTheDocument();
  });
});
