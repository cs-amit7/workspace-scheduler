import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Navbar from './Navbar.jsx';
import * as AuthContextModule from '../context/AuthContext.jsx';

describe('Navbar', () => {
  it('renders wordmark, Dashboard, and My Bookings links', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { name: 'Bob', role: 'user' },
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByText('◆ WORKSPACE')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /My Bookings/i })).toBeInTheDocument();
  });

  it('shows the Admin link only for admins', () => {
    // Non-admin user
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { name: 'Regular User', role: 'user' },
      logout: vi.fn(),
    });

    const { rerender } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: /Admin/i })).not.toBeInTheDocument();

    // Admin user
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { name: 'Super Admin', role: 'admin' },
      logout: vi.fn(),
    });

    rerender(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /Admin/i })).toBeInTheDocument();
  });

  it('displays user name and avatar if present', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        name: 'Jane Doe',
        avatar: 'https://example.com/avatar.jpg',
        role: 'user',
      },
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    const avatarImg = screen.getByRole('img', { name: /Jane Doe/i });
    expect(avatarImg).toBeInTheDocument();
    expect(avatarImg).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('calls logout when the Logout button is clicked', async () => {
    const logoutMock = vi.fn();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { name: 'Jane Doe', role: 'user' },
      logout: logoutMock,
    });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    const logoutButton = screen.getByRole('button', { name: /Logout/i });
    expect(logoutButton).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(logoutButton);

    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});
