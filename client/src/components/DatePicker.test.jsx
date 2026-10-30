import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DatePicker from './DatePicker.jsx';

describe('DatePicker', () => {
  it('renders a labelled date input with previous and next day buttons', () => {
    const today = new Date();
    const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const handleChange = vi.fn();

    render(<DatePicker value={ymd} onChange={handleChange} label="Booking date" />);

    const input = screen.getByLabelText(/booking date/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(ymd);

    const prevBtn = screen.getByRole('button', { name: /previous day/i });
    const nextBtn = screen.getByRole('button', { name: /next day/i });

    expect(prevBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();

    // On today, prev button should be disabled because min is today
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();
  });

  it('triggers onChange when next day button is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    // Use a date in the middle of the window
    const today = new Date();
    const middleDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5);
    const middleYmd = `${middleDate.getFullYear()}-${String(middleDate.getMonth() + 1).padStart(2, '0')}-${String(middleDate.getDate()).padStart(2, '0')}`;

    const expectedNext = new Date(middleDate.getFullYear(), middleDate.getMonth(), middleDate.getDate() + 1);
    const expectedNextYmd = `${expectedNext.getFullYear()}-${String(expectedNext.getMonth() + 1).padStart(2, '0')}-${String(expectedNext.getDate()).padStart(2, '0')}`;

    render(<DatePicker value={middleYmd} onChange={handleChange} />);

    const nextBtn = screen.getByRole('button', { name: /next day/i });
    await user.click(nextBtn);

    expect(handleChange).toHaveBeenCalledWith(expectedNextYmd);
  });

  it('disables next button at max date (today + 30 days)', () => {
    const today = new Date();
    const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
    const maxYmd = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, '0')}-${String(maxDate.getDate()).padStart(2, '0')}`;
    const handleChange = vi.fn();

    render(<DatePicker value={maxYmd} onChange={handleChange} />);

    const nextBtn = screen.getByRole('button', { name: /next day/i });
    const prevBtn = screen.getByRole('button', { name: /previous day/i });

    expect(nextBtn).toBeDisabled();
    expect(prevBtn).not.toBeDisabled();
  });
});
