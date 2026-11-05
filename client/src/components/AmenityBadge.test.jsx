import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AmenityBadge from './AmenityBadge.jsx';

describe('AmenityBadge Component', () => {
  it('renders an icon and the text when passed via name prop', () => {
    const { container } = render(<AmenityBadge name="WiFi" />);

    expect(screen.getByText('WiFi')).toBeInTheDocument();

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('data-amenity-key', 'wifi');
  });

  it('renders an icon and the text when passed via children', () => {
    const { container } = render(<AmenityBadge>Whiteboard</AmenityBadge>);

    expect(screen.getByText('Whiteboard')).toBeInTheDocument();

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('data-amenity-key', 'whiteboard');
  });

  it('renders fallback icon when amenity name is unrecognized', () => {
    const { container } = render(<AmenityBadge name="Custom Unknown Amenity" />);

    expect(screen.getByText('Custom Unknown Amenity')).toBeInTheDocument();

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('data-amenity-key', 'fallback');
  });

  it('renders null when text is missing', () => {
    const { container } = render(<AmenityBadge />);
    expect(container.firstChild).toBeNull();
  });
});

