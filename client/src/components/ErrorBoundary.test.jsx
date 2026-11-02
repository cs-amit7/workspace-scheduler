import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ErrorBoundary from './ErrorBoundary.jsx';

function ProblemChild({ shouldThrow = false }) {
  if (shouldThrow) {
    throw new Error('Test crash occurred');
  }
  return <div>Normal Content</div>;
}

describe('ErrorBoundary component', () => {
  let originalConsoleError;

  beforeEach(() => {
    originalConsoleError = console.error;
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal Content')).toBeInTheDocument();
  });

  it('renders fallback panel "Something went wrong" and logs to console.error when child throws', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
  });

  it('calls window.location.reload when the Reload button is clicked', async () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: reloadMock },
    });

    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadBtn = screen.getByRole('button', { name: 'Reload' });
    await user.click(reloadBtn);

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
