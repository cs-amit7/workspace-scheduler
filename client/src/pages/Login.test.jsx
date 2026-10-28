import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Login from './Login.jsx';
import * as AuthContextModule from '../context/AuthContext.jsx';
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

    expect(
      screen.getByText('Find your spot. Book rooms and desks in seconds.')
    ).toBeInTheDocument();

    const googleBtn = screen.getByRole('link', { name: /Sign in with Google/i });
    expect(googleBtn).toBeInTheDocument();
    expect(googleBtn).toHaveAttribute('href', GOOGLE_LOGIN_URL);

    const demoBtn = screen.getByRole('button', { name: /Try demo/i });
    expect(demoBtn).toBeInTheDocument();
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
});
