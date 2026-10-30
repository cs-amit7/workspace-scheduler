import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SlotGrid from './SlotGrid.jsx';

describe('SlotGrid', () => {
  const mockCells = [
    { label: '07:00', startIso: '2028-10-05T01:30:00.000Z', endIso: '2028-10-05T02:00:00.000Z' },
    { label: '07:30', startIso: '2028-10-05T02:00:00.000Z', endIso: '2028-10-05T02:30:00.000Z' },
    { label: '08:00', startIso: '2028-10-05T02:30:00.000Z', endIso: '2028-10-05T03:00:00.000Z' },
    { label: '08:30', startIso: '2028-10-05T03:00:00.000Z', endIso: '2028-10-05T03:30:00.000Z' },
    { label: '09:00', startIso: '2028-10-05T03:30:00.000Z', endIso: '2028-10-05T04:00:00.000Z' },
    { label: '09:30', startIso: '2028-10-05T04:00:00.000Z', endIso: '2028-10-05T04:30:00.000Z' },
    { label: '10:00', startIso: '2028-10-05T04:30:00.000Z', endIso: '2028-10-05T05:00:00.000Z' },
    { label: '10:30', startIso: '2028-10-05T05:00:00.000Z', endIso: '2028-10-05T05:30:00.000Z' },
  ];

  it('renders role="grid" and marks booked cells aria-disabled with "Booked" text', () => {
    const bookedIndexes = [1, 2];
    render(
      <SlotGrid
        cells={mockCells}
        bookedIndexes={bookedIndexes}
      />
    );

    const grid = screen.getByRole('grid', { name: /available slots/i });
    expect(grid).toBeInTheDocument();

    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(8);

    // Cell 0 is free
    expect(cells[0]).not.toHaveAttribute('aria-disabled', 'true');
    expect(cells[0]).not.toHaveTextContent('Booked');

    // Cell 1 is booked
    expect(cells[1]).toHaveAttribute('aria-disabled', 'true');
    expect(cells[1]).toHaveTextContent('Booked');

    // Cell 2 is booked
    expect(cells[2]).toHaveAttribute('aria-disabled', 'true');
    expect(cells[2]).toHaveTextContent('Booked');
  });

  it('supports arrow key navigation (left/right by cell, up/down by row)', () => {
    render(
      <SlotGrid
        cells={mockCells}
        columns={4}
      />
    );

    const cells = screen.getAllByRole('gridcell');

    // Focus first cell
    cells[0].focus();
    expect(document.activeElement).toBe(cells[0]);

    // ArrowRight moves to cell 1
    fireEvent.keyDown(cells[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cells[1]);

    // ArrowDown moves down 1 row (+4 cells) to cell 5
    fireEvent.keyDown(cells[1], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(cells[5]);

    // ArrowLeft moves to cell 4
    fireEvent.keyDown(cells[5], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(cells[4]);

    // ArrowUp moves up 1 row (-4 cells) to cell 0
    fireEvent.keyDown(cells[4], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(cells[0]);
  });

  it('selects cells with Space or Enter key', () => {
    const handleSelect = vi.fn();
    render(
      <SlotGrid
        cells={mockCells}
        onSelect={handleSelect}
      />
    );

    const cells = screen.getAllByRole('gridcell');

    // Press Space on cell 0
    fireEvent.keyDown(cells[0], { key: ' ' });
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ startIndex: 0, endIndex: 0 })
    );

    // Press Enter on cell 3
    fireEvent.keyDown(cells[3], { key: 'Enter' });
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ startIndex: 3, endIndex: 3 })
    );
  });

  it('shows inline reason when nextSelection returns one', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    const bookedIndexes = [2];

    render(
      <SlotGrid
        cells={mockCells}
        bookedIndexes={bookedIndexes}
        onSelect={handleSelect}
      />
    );

    const cells = screen.getAllByRole('gridcell');

    // Clicking booked cell triggers inline reason
    await user.click(cells[2]);

    const reasonAlert = await screen.findByTestId('slot-grid-reason');
    expect(reasonAlert).toBeInTheDocument();
    expect(reasonAlert).toHaveTextContent(/cannot include booked slots/i);
  });
});
