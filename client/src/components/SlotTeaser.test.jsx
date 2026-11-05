import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import SlotTeaser from './SlotTeaser.jsx';

describe('SlotTeaser component', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders 8 buttons starting at the next boundary with HH:mm mono labels', () => {
    const fixedNow = new Date(2026, 9, 5, 10, 14, 0); // 10:14 local -> next boundary 10:30
    render(<SlotTeaser now={fixedNow} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(8);

    const expectedLabels = [
      '10:30',
      '11:00',
      '11:30',
      '12:00',
      '12:30',
      '13:00',
      '13:30',
      '14:00',
    ];

    buttons.forEach((btn, idx) => {
      expect(btn).toHaveTextContent(expectedLabels[idx]);
      expect(btn).toHaveClass('font-mono');
      expect(btn).toHaveAttribute('aria-pressed', 'false');
    });

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Tap a slot to try it.');
  });

  it('shows opacity pulse on the first cell until the user clicks, then stops', async () => {
    const fixedNow = new Date(2026, 9, 5, 10, 14, 0);
    render(<SlotTeaser now={fixedNow} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveClass('animate-soft-pulse');

    const user = userEvent.setup();
    await user.click(buttons[1]); // Click second slot

    expect(buttons[0]).not.toHaveClass('animate-soft-pulse');
  });

  it('handles the selection flow (select, extend, restart, clear) and updates the status text', async () => {
    const fixedNow = new Date(2026, 9, 5, 10, 14, 0);
    render(<SlotTeaser now={fixedNow} />);

    const user = userEvent.setup();
    const buttons = screen.getAllByRole('button');
    const status = screen.getByRole('status');

    // 1. First click selects a single slot (e.g. index 1: 11:00)
    await user.click(buttons[1]);
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
    expect(buttons[1]).toHaveClass('bg-brand');
    expect(status).toHaveTextContent('11:00-11:30 (30m) Sign in to book it.');

    // 2. Later click extends range (index 3: 12:00)
    await user.click(buttons[3]);
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[2]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[3]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
    expect(buttons[4]).toHaveAttribute('aria-pressed', 'false');
    expect(status).toHaveTextContent('11:00-12:30 (1h 30m) Sign in to book it.');

    // 3. Earlier click restarts selection (index 0: 10:30)
    await user.click(buttons[0]);
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');
    expect(buttons[2]).toHaveAttribute('aria-pressed', 'false');
    expect(buttons[3]).toHaveAttribute('aria-pressed', 'false');
    expect(status).toHaveTextContent('10:30-11:00 (30m) Sign in to book it.');

    // 4. Clicking the only selected cell again clears it
    await user.click(buttons[0]);
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
    expect(status).toHaveTextContent('Tap a slot to try it.');
  });

  it('clears selection when the boundary changes (fake timers)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 10, 25, 0)); // 10:25 local -> boundary is 10:30

    render(<SlotTeaser />);

    let buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('10:30');

    // Select slot 10:30
    fireEvent.click(buttons[0]);
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('10:30-11:00 (30m) Sign in to book it.');

    // Advance fake timers by 6 minutes (10:25 -> 10:31), crossing the 10:30 boundary
    act(() => {
      vi.advanceTimersByTime(6 * 60 * 1000);
    });

    // Boundary should now be 11:00
    buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('11:00');

    // Selection should be cleared
    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute('aria-pressed', 'false');
    });
    expect(screen.getByRole('status')).toHaveTextContent('Tap a slot to try it.');
  });

  it('makes no network/API calls during rendering or interaction', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const fixedNow = new Date(2026, 9, 5, 10, 14, 0);

    render(<SlotTeaser now={fixedNow} />);

    const user = userEvent.setup();
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    await user.click(buttons[2]);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
