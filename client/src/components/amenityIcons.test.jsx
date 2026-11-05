import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AmenityIcon, { getAmenityIconKey } from './amenityIcons.jsx';
import { AMENITIES } from '../utils/amenities.js';

describe('AmenityIcon Component', () => {
  it('maps every name from utils/amenities.js to a specific (non-fallback) icon', () => {
    expect(AMENITIES.length).toBeGreaterThan(0);

    const usedKeys = new Set();

    AMENITIES.forEach((amenity) => {
      const key = getAmenityIconKey(amenity);
      expect(key).not.toBe('fallback');
      expect(typeof key).toBe('string');
      usedKeys.add(key);

      const { container } = render(<AmenityIcon name={amenity} />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('data-amenity-key', key);
      expect(svg).not.toHaveAttribute('data-amenity-key', 'fallback');
    });

    // Verify all AMENITIES mapped to valid non-fallback icons
    expect(usedKeys.size).toBeGreaterThanOrEqual(10);
  });

  it('is case-insensitive and trims surrounding whitespace', () => {
    const testCases = [
      { input: '  wifi  ', expectedKey: 'wifi' },
      { input: 'WIFI', expectedKey: 'wifi' },
      { input: '  Video Conferencing  ', expectedKey: 'video' },
      { input: 'VIDEO CONFERENCING', expectedKey: 'video' },
      { input: '  standing desk  ', expectedKey: 'standing-desk' },
      { input: 'STANDING DESK', expectedKey: 'standing-desk' },
      { input: '  coffee machine\n', expectedKey: 'coffee' },
      { input: 'POWER STRIP  ', expectedKey: 'plug' },
      { input: '  DUAL MONITOR  ', expectedKey: 'dual-monitor' },
    ];

    testCases.forEach(({ input, expectedKey }) => {
      expect(getAmenityIconKey(input)).toBe(expectedKey);

      const { container } = render(<AmenityIcon name={input} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('data-amenity-key', expectedKey);
    });
  });

  it('falls back to generic check-style icon for unknown or invalid names', () => {
    const unknownCases = [
      'unknown-amenity-xyz',
      'Foobar',
      '',
      '   ',
      null,
      undefined,
      123,
    ];

    unknownCases.forEach((val) => {
      expect(getAmenityIconKey(val)).toBe('fallback');

      const { container } = render(<AmenityIcon name={val} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('data-amenity-key', 'fallback');
    });
  });

  it('renders SVG with aria-hidden="true" and focusable="false"', () => {
    const { container } = render(<AmenityIcon name="WiFi" />);
    const svg = container.querySelector('svg');

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
  });

  it('renders with custom className or default 14-16px dimension classes', () => {
    const { container: defaultContainer } = render(<AmenityIcon name="WiFi" />);
    const defaultSvg = defaultContainer.querySelector('svg');
    expect(defaultSvg).toHaveClass('w-4', 'h-4');

    const { container: customContainer } = render(
      <AmenityIcon name="WiFi" className="w-3.5 h-3.5 text-muted shrink-0" />
    );
    const customSvg = customContainer.querySelector('svg');
    expect(customSvg).toHaveClass('w-3.5', 'h-3.5', 'text-muted', 'shrink-0');
  });
});

