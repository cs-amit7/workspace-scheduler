import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Backdrop from './Backdrop.jsx';
import {
  Wifi,
  Monitor,
  Projector,
  Whiteboard,
  Clock,
  CalendarCheck,
  Plug,
  Desk,
  TimeChip,
} from './backdropIcons.jsx';

describe('Backdrop Component', () => {
  it('renders container with aria-hidden="true" and pointer-events-none', () => {
    render(<Backdrop />);
    const container = screen.getByTestId('backdrop-container');

    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute('aria-hidden', 'true');
    expect(container).toHaveClass('pointer-events-none');
    expect(container).toHaveClass('fixed', 'inset-0', '-z-10', 'overflow-hidden');
  });

  it('renders 10 tiles and 7 streaks in the hero variant', () => {
    render(<Backdrop variant="hero" />);

    const tiles = screen.getAllByTestId('backdrop-tile');
    const streaks = screen.getAllByTestId('backdrop-streak');

    expect(tiles).toHaveLength(10);
    expect(streaks).toHaveLength(7);

    const glow = screen.getByTestId('backdrop-glow');
    expect(glow).toHaveClass('backdrop-glow-hero');
  });

  it('renders 6 tiles and 4 streaks in the app variant', () => {
    render(<Backdrop variant="app" />);

    const tiles = screen.getAllByTestId('backdrop-tile');
    const streaks = screen.getAllByTestId('backdrop-streak');

    expect(tiles).toHaveLength(6);
    expect(streaks).toHaveLength(4);

    const glow = screen.getByTestId('backdrop-glow');
    expect(glow).toHaveClass('backdrop-glow-app');
  });

  it('has no focusable elements, links, buttons, or tabIndex anywhere inside', () => {
    const { container: heroContainer } = render(<Backdrop variant="hero" />);
    const heroFocusables = heroContainer.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]'
    );
    expect(heroFocusables.length).toBe(0);

    const { container: appContainer } = render(<Backdrop variant="app" />);
    const appFocusables = appContainer.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]'
    );
    expect(appFocusables.length).toBe(0);
  });
});

describe('backdropIcons', () => {
  const icons = [
    { name: 'Wifi', Component: Wifi },
    { name: 'Monitor', Component: Monitor },
    { name: 'Projector', Component: Projector },
    { name: 'Whiteboard', Component: Whiteboard },
    { name: 'Clock', Component: Clock },
    { name: 'CalendarCheck', Component: CalendarCheck },
    { name: 'Plug', Component: Plug },
    { name: 'Desk', Component: Desk },
  ];

  icons.forEach(({ name, Component }) => {
    it(`${name} renders an svg element with stroke="currentColor"`, () => {
      const { container } = render(<Component data-testid={`icon-${name}`} />);
      const svg = container.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('stroke', 'currentColor');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('TimeChip renders mono formatted time label', () => {
    const { rerender } = render(<TimeChip time="10:30" />);
    expect(screen.getByText('10:30')).toBeInTheDocument();
    expect(screen.getByText('10:30')).toHaveClass('font-mono');

    rerender(<TimeChip>14:00</TimeChip>);
    expect(screen.getByText('14:00')).toBeInTheDocument();
    expect(screen.getByText('14:00')).toHaveClass('font-mono');
  });
});

