import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Pagination from './Pagination.jsx';

describe('Pagination', () => {
  it('disables Previous on page 1 and calls onChange when a page is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<Pagination page={1} totalPages={3} onChange={handleChange} />);

    // Previous is disabled on page 1
    const prevButton = screen.getByRole('button', { name: /Previous page/i });
    expect(prevButton).toBeDisabled();

    // Active page has aria-current="page"
    const page1Button = screen.getByRole('button', { name: 'Page 1' });
    expect(page1Button).toHaveAttribute('aria-current', 'page');

    // Click Next
    const nextButton = screen.getByRole('button', { name: /Next page/i });
    expect(nextButton).not.toBeDisabled();
    await user.click(nextButton);
    expect(handleChange).toHaveBeenCalledWith(2);

    // Click Page 3
    const page3Button = screen.getByRole('button', { name: 'Page 3' });
    await user.click(page3Button);
    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it('enables Previous on subsequent pages and disables Next on last page', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<Pagination page={3} totalPages={3} onChange={handleChange} />);

    const prevButton = screen.getByRole('button', { name: /Previous page/i });
    expect(prevButton).not.toBeDisabled();
    await user.click(prevButton);
    expect(handleChange).toHaveBeenCalledWith(2);

    const nextButton = screen.getByRole('button', { name: /Next page/i });
    expect(nextButton).toBeDisabled();
  });
});
