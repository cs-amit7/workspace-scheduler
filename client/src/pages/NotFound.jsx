import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col justify-center items-center px-4 py-12 text-center">
      <div className="font-mono text-5xl font-extrabold text-brand-text mb-4">
        404
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
        Page Not Found
      </h1>
      <p className="text-muted max-w-md mb-6 text-sm sm:text-base">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
