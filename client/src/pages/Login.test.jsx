import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Login from './Login.jsx';
import * as AuthContextModule from '../context/AuthContext.jsx';
import * as UseNowModule from '../hooks/useNow.js';
import { GOOGLE_LOGIN_URL } from '../api/auth.js';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

describe('Login Page', () => {
  it('renders hero with tagline and shows both buttons', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      loginDemo: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const headline = screen.getByRole('heading', { level: 1 });
    expect(headline).toHaveTextContent(/Your next half hour starts at/i);
    expect(headline).toHaveClass('font-mono');

    const subline = screen.getByText(
      'Pick a slot below and watch it light up. Sign in to lock it in.'
    );
    expect(subline).toBeInTheDocument();
    expect(subline).toHaveClass('font-sans');

    const wordmark = screen.getByText(/WORKSPACE/i);
    expect(wordmark.closest('div')).toHaveClass('font-mono', 'text-3xl', 'font-bold');

    expect(document.querySelector('.bg-brand-gradient')).not.toBeInTheDocument();
    expect(screen.getByText('Sign in to continue').closest('.glass')).toBeInTheDocument();

    const googleBtn = screen.getByRole('link', { name: /Sign in with Google/i });
    expect(googleBtn).toBeInTheDocument();
    expect(googleBtn).toHaveAttribute('href', GOOGLE_LOGIN_URL);

    const demoBtn = screen.getByRole('button', { name: /Try demo/i });
    expect(demoBtn).toBeInTheDocument();
  });

  it('renders the Login headline showing the computed time with a mocked useNow', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      loginDemo: vi.fn(),
    });
    const mockDate = new Date(2026, 9, 5, 14, 10, 0);
    vi.spyOn(UseNowModule, 'default').mockReturnValue(mockDate);
    vi.spyOn(UseNowModule, 'useNow').mockReturnValue(mockDate);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const headline = screen.getByRole('heading', { level: 1 });
    expect(headline).toHaveTextContent('Your next half hour starts at 14:30.');
    expect(headline).toHaveClass('font-mono');

    const timeHighlight = within(headline).getByText('14:30');
    expect(timeHighlight).toHaveClass('text-brand-text');
  });

  it('calls loginDemo and navigates to the saved path when "Try demo" is clicked', async () => {
    const loginDemoMock = vi.fn().mockResolvedValue({ user: { role: 'user' } });
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      loginDemo: loginDemoMock,
    });

    render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/login', state: { from: '/my-bookings' } },
        ]}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/my-bookings" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    );

    const demoBtn = screen.getByRole('button', { name: /Try demo/i });
    const user = userEvent.setup();
    await user.click(demoBtn);

    expect(loginDemoMock).toHaveBeenCalledWith({ role: 'user' });

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/my-bookings');
    });
  });

  it('redirects to / if user is already logged in', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { name: 'Logged User', role: 'user' },
      loginDemo: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('renders session-expired notice with role="status" when expired state is provided', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      loginDemo: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { expired: true } }]}>
        <Login />
      </MemoryRouter>
    );

    const statusNotice = screen.getByText('Your session expired. Please sign in again.');
    expect(statusNotice).toBeInTheDocument();
    expect(statusNotice).toHaveAttribute('role', 'status');
  });

  it('renders session-expired notice with role="status" when ?expired=true is in search params', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      loginDemo: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/login?expired=true']}>
        <Login />
      </MemoryRouter>
    );

    const statusNotice = screen.getByText('Your session expired. Please sign in again.');
    expect(statusNotice).toBeInTheDocument();
    expect(statusNotice).toHaveAttribute('role', 'status');
  });
});
