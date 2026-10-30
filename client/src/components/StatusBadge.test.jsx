import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatusBadge from './StatusBadge.jsx';

describe('StatusBadge component', () => {
  it('renders nothing for missing or unknown status', () => {
    const { container: c1 } = render(<StatusBadge />);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(<StatusBadge status="unknown" />);
    expect(c2.firstChild).toBeNull();
  });

  it('renders Upcoming badge with info color', () => {
    render(<StatusBadge status="upcoming" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('Upcoming');
    expect(badge.className).toContain('text-info');
  });

  it('renders Active badge with ok color and a pulsing dot', () => {
    render(<StatusBadge status="active" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('Active');
    expect(badge.className).toContain('text-ok');
    const pingDot = badge.querySelector('.animate-ping');
    expect(pingDot).toBeInTheDocument();
  });

  it('renders Completed badge with muted color', () => {
    render(<StatusBadge status="completed" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('Completed');
    expect(badge.className).toContain('text-muted');
  });

  it('renders Cancelled badge with muted color', () => {
    render(<StatusBadge status="cancelled" />);
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent('Cancelled');
    expect(badge.className).toContain('text-muted');
  });
});
