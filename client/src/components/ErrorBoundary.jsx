import { Component } from 'react';

/**
 * Error boundary component catching uncaught render errors in child tree.
 * Displays "Something went wrong" fallback panel with a Reload button.
 * Logs error with console.error only.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-md rounded-lg border border-line bg-panel p-6 shadow-lg">
            <h2 className="text-xl font-bold text-ink">Something went wrong</h2>
            <p className="mt-2 text-sm text-muted">
              An unexpected error occurred while rendering this page.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-6 inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-text"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
