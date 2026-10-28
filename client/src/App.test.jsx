import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App, { AppRoutes } from './App.jsx';
import * as authApi from './api/auth.js';
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
        screen.getByText('Find your spot. Book rooms and desks in seconds.')
      ).toBeInTheDocument();
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
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
      expect(screen.getByText('◆ WORKSPACE')).toBeInTheDocument();
    });
  });
});
