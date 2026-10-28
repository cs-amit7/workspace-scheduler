import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import * as authApi from '../api/auth.js';

function TestConsumer() {
  const { user, loading, loginDemo, logout, refresh } = useAuth();

  if (loading) {
    return <div data-testid="status">loading</div>;
  }

  return (
    <div>
      <div data-testid="status">ready</div>
      <div data-testid="user">{user ? user.name : 'anonymous'}</div>
      <button onClick={() => loginDemo({ role: 'user' })}>Demo Login</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => refresh()}>Refresh</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the user from a mocked /auth/me on mount', async () => {
    vi.spyOn(authApi, 'getMe').mockResolvedValueOnce({
      data: { _id: 'u1', name: 'Alice Smith', email: 'alice@example.com', role: 'user' },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('status')).toHaveTextContent('loading');

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
      expect(screen.getByTestId('user')).toHaveTextContent('Alice Smith');
    });
  });

  it('treats a 401 as logged out and not an error', async () => {
    const error401 = new Error('Unauthenticated');
    error401.status = 401;
    error401.code = 'UNAUTHENTICATED';

    vi.spyOn(authApi, 'getMe').mockRejectedValueOnce(error401);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
      expect(screen.getByTestId('user')).toHaveTextContent('anonymous');
    });
  });

  it('loginDemo updates the user in context', async () => {
    vi.spyOn(authApi, 'getMe').mockResolvedValueOnce({
      data: null,
    });
    vi.spyOn(authApi, 'demoLogin').mockResolvedValueOnce({
      data: {
        user: { _id: 'u2', name: 'Demo Person', role: 'user' },
        token: 'fake-jwt',
      },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('anonymous');
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Demo Login/i }));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Demo Person');
    });
  });

  it('logout clears the user in context', async () => {
    vi.spyOn(authApi, 'getMe').mockResolvedValueOnce({
      data: { _id: 'u1', name: 'Alice Smith', role: 'user' },
    });
    vi.spyOn(authApi, 'logout').mockResolvedValueOnce(null);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Alice Smith');
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Logout/i }));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('anonymous');
    });
  });

  it('refresh fetches current user or sets null on 401', async () => {
    vi.spyOn(authApi, 'getMe')
      .mockResolvedValueOnce({
        data: { _id: 'u1', name: 'Alice Smith', role: 'user' },
      })
      .mockResolvedValueOnce({
        data: { _id: 'u1', name: 'Alice Updated', role: 'user' },
      });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Alice Smith');
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Refresh/i }));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Alice Updated');
    });
  });

  it('throws an error if useAuth is consumed outside of AuthProvider', () => {
    // Prevent noisy console.error during error boundary test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider'
    );

    consoleError.mockRestore();
  });
});
