import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text rounded-md px-2.5 py-1 ${
      isActive ? 'text-brand-text' : 'text-muted'
    }`;

  return (
    <nav
      aria-label="Main Navigation"
      className="bg-panel border-b border-line px-4 sm:px-6 py-3"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="font-mono font-bold text-ink hover:text-brand-text transition-colors flex items-center gap-1.5 text-base tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text rounded px-1"
          >
            ◆ WORKSPACE
          </Link>
          <div className="flex items-center gap-2">
            <NavLink to="/" end className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/my-bookings" className={navLinkClass}>
              My Bookings
            </NavLink>
            {user?.role === 'admin' && (
              <NavLink to="/admin" className={navLinkClass}>
                Admin
              </NavLink>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-2.5">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || 'User avatar'}
                  className="h-8 w-8 rounded-full border border-line object-cover"
                />
              ) : null}
              {user.name && (
                <span className="text-sm font-medium text-ink hidden sm:inline">
                  {user.name}
                </span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={logout}
            className="text-sm font-medium text-muted hover:text-danger rounded-lg border border-line bg-panel-2 px-3 py-1.5 transition-colors hover:border-danger/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
