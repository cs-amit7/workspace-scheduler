import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Skeleton from './Skeleton.jsx';
import EmptyState from './EmptyState.jsx';
import ErrorState from './ErrorState.jsx';

describe('State & Helper Components', () => {
  describe('Skeleton', () => {
    it('renders with testid and custom class', () => {
      render(<Skeleton className="h-10 w-20" />);
      const el = screen.getByTestId('skeleton');
      expect(el).toBeInTheDocument();
      expect(el).toHaveClass('h-10', 'w-20', 'animate-pulse');
    });
  });

  describe('EmptyState', () => {
    it('renders title and message with action button', async () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          title="No bookings"
          message="You have no active bookings."
          actionText="Browse rooms"
          onAction={onAction}
        />
      );

      expect(screen.getByText('No bookings')).toBeInTheDocument();
      expect(screen.getByText('You have no active bookings.')).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: 'Browse rooms' });
      await userEvent.click(btn);
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('ErrorState', () => {
    it('renders title, message, and retry button', async () => {
      const onRetry = vi.fn();
      render(
        <ErrorState
          title="Failed to load"
          message="Network disconnected."
          retryText="Retry loading"
          onRetry={onRetry}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
      expect(screen.getByText('Network disconnected.')).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: 'Retry loading' });
      await userEvent.click(btn);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });
});
