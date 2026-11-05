import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App, { AppRoutes, AppLayout } from './App.jsx';
import * as authApi from './api/auth.js';
import client from './api/client.js';
import { AuthProvider } from './context/AuthContext.jsx';

describe('App Routing', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders 404 NotFound page for unknown route', async () => {
    vi.spyOn(authApi, 'getMe').mockResolvedValueOnce({ data: null });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/unknown-path-xyz']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>
    );

    expect(await screen.findByText('Page Not Found')).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('redirects unauthenticated visitor from / to /login', async () => {
    const error401 = new Error('Unauthenticated');
    error401.status = 401;
    vi.spyOn(authApi, 'getMe').mockRejectedValueOnce(error401);

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1 })
      ).toHaveTextContent(/Your next half hour starts at/i);
      expect(
        screen.getByRole('link', { name: /Sign in with Google/i })
      ).toBeInTheDocument();
    });
  });

  it('renders dashboard when user is logged in', async () => {
    vi.spyOn(authApi, 'getMe').mockResolvedValueOnce({
      data: { _id: 'u1', name: 'Alice Smith', email: 'alice@example.com', role: 'user' },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Workspaces' })).toBeInTheDocument();
      expect(screen.getByText('◆ WORKSPACE')).toBeInTheDocument();
    });
  });

  it('renders skip link as the very first focusable element in AppLayout and targets #main-content', () => {
    vi.spyOn(authApi, 'getMe').mockResolvedValueOnce({
      data: { _id: 'u1', name: 'Alice Smith', email: 'alice@example.com', role: 'user' },
    });

    const { container } = render(
      <AuthProvider>
        <MemoryRouter>
          <AppLayout />
        </MemoryRouter>
      </AuthProvider>
    );

    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');

    const main = container.querySelector('#main-content');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('tabIndex', '-1');

    // The skip link must be the very first focusable element in the DOM tree
    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    expect(focusableElements.length).toBeGreaterThan(0);
    expect(focusableElements[0]).toBe(skipLink);
  });

  it('redirects to /login with session-expired status when a 401 triggers unauthorized handler', async () => {
    vi.spyOn(authApi, 'getMe').mockResolvedValueOnce({
      data: { _id: 'u1', name: 'Alice Smith', email: 'alice@example.com', role: 'user' },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Workspaces' })).toBeInTheDocument();
    });

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        error: { code: 'UNAUTHENTICATED', message: 'Session expired' },
      }),
    });

    try {
      await client('/bookings');
    } catch {
      // expected error from client
    }

    await waitFor(() => {
      const notice = screen.getByText('Your session expired. Please sign in again.');
      expect(notice).toBeInTheDocument();
      expect(notice).toHaveAttribute('role', 'status');
    });
  });

  it('renders Backdrop with hero variant on /login route', async () => {
    vi.spyOn(authApi, 'getMe').mockResolvedValueOnce({ data: null });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      const glow = screen.getByTestId('backdrop-glow');
      expect(glow).toHaveClass('backdrop-glow-hero');
    });
    const tiles = screen.getAllByTestId('backdrop-tile');
    expect(tiles).toHaveLength(10);
  });

  it('renders Backdrop with app variant on non-login routes', async () => {
    vi.spyOn(authApi, 'getMe').mockResolvedValueOnce({
      data: { _id: 'u1', name: 'Alice Smith', email: 'alice@example.com', role: 'user' },
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      const glow = screen.getByTestId('backdrop-glow');
      expect(glow).toHaveClass('backdrop-glow-app');
    });
    const tiles = screen.getAllByTestId('backdrop-tile');
    expect(tiles).toHaveLength(6);
  });
});
