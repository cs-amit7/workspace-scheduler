import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import BookingCard from './BookingCard.jsx';

describe('BookingCard component', () => {
  const baseResource = {
    _id: 'res-101',
    name: 'Orion Conference Room',
    type: 'room',
    location: 'Floor 2, West Wing',
  };

  const sampleBooking = {
    _id: 'b-1',
    status: 'confirmed',
    start: '2026-10-10T10:00:00.000Z',
    end: '2026-10-10T11:30:00.000Z',
    resource: baseResource,
  };

  it('renders an upcoming booking with link, location, status badge, and cancel button', async () => {
    const onCancel = vi.fn();
    const now = new Date('2026-10-10T09:00:00.000Z');
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <BookingCard booking={sampleBooking} now={now} onCancel={onCancel} />
      </MemoryRouter>
    );

    const card = screen.getByTestId('booking-card');
    expect(card).toBeInTheDocument();
    expect(card.className).toContain('border-l-type-room');

    // Resource link
    const link = screen.getByRole('link', { name: 'Orion Conference Room' });
    expect(link).toHaveAttribute('href', '/resources/res-101');
    expect(screen.getByText('Floor 2, West Wing')).toBeInTheDocument();

    // Status badge
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('Upcoming');

    // Cancel button with specific aria-label and text
    const cancelBtn = screen.getByRole('button', { name: /cancel booking for orion conference room/i });
    expect(cancelBtn).toHaveTextContent('Cancel booking');

    await user.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledWith(sampleBooking);
  });

  it('renders an active booking with active status badge', () => {
    const now = new Date('2026-10-10T10:30:00.000Z');

    render(
      <MemoryRouter>
        <BookingCard booking={sampleBooking} now={now} onCancel={vi.fn()} />
      </MemoryRouter>
    );

    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('Active');

    // Still cancellable because end > now
    expect(screen.getByRole('button', { name: /cancel booking/i })).toBeInTheDocument();
  });

  it('renders a completed booking without cancel button', () => {
    const now = new Date('2026-10-10T12:00:00.000Z');

    render(
      <MemoryRouter>
        <BookingCard booking={sampleBooking} now={now} onCancel={vi.fn()} />
      </MemoryRouter>
    );

    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('Completed');

    // Not cancellable once ended
    expect(screen.queryByRole('button', { name: /cancel booking/i })).not.toBeInTheDocument();
  });

  it('renders a cancelled booking with line-through time and no cancel button', () => {
    const cancelledBooking = {
      ...sampleBooking,
      status: 'cancelled',
    };
    const now = new Date('2026-10-10T09:00:00.000Z');

    render(
      <MemoryRouter>
        <BookingCard booking={cancelledBooking} now={now} onCancel={vi.fn()} />
      </MemoryRouter>
    );

    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('Cancelled');

    // Strikethrough style on time range
    const card = screen.getByTestId('booking-card');
    const struckTime = card.querySelector('.line-through');
    expect(struckTime).toBeInTheDocument();

    // Cancel button should not appear
    expect(screen.queryByRole('button', { name: /cancel booking/i })).not.toBeInTheDocument();
  });

  it('renders "Unknown resource" and no link when resource is missing', () => {
    const missingResourceBooking = {
      _id: 'b-2',
      status: 'confirmed',
      start: '2026-10-10T10:00:00.000Z',
      end: '2026-10-10T11:30:00.000Z',
      resource: null,
    };
    const now = new Date('2026-10-10T09:00:00.000Z');

    render(
      <MemoryRouter>
        <BookingCard booking={missingResourceBooking} now={now} onCancel={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText('Unknown resource')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();

    // Cancel button aria-label reflects Unknown resource
    const cancelBtn = screen.getByRole('button', { name: /cancel booking for unknown resource/i });
    expect(cancelBtn).toBeInTheDocument();
  });

  it('renders type-desk colour bar for desk bookings', () => {
    const deskBooking = {
      ...sampleBooking,
      resource: {
        ...baseResource,
        type: 'desk',
      },
    };
    const now = new Date('2026-10-10T09:00:00.000Z');

    render(
      <MemoryRouter>
        <BookingCard booking={deskBooking} now={now} onCancel={vi.fn()} />
      </MemoryRouter>
    );

    const card = screen.getByTestId('booking-card');
    expect(card.className).toContain('border-l-type-desk');
  });

  it('renders null when booking is missing', () => {
    const { container } = render(
      <MemoryRouter>
        <BookingCard booking={null} now={new Date()} />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });
});
