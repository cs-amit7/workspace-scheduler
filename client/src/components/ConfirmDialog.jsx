import { useId, useEffect, useRef } from 'react';

/**
 * Accessible confirmation modal dialog.
 *
 * @param {object} props
 * @param {boolean} props.open Whether dialog is visible
 * @param {string} props.title Dialog title
 * @param {React.ReactNode} [props.message] Dialog description or prompt
 * @param {string} [props.confirmLabel='Confirm'] Text for primary confirm button
 * @param {string} [props.cancelLabel='Cancel'] Text for secondary cancel button
 * @param {string} [props.busyLabel='Working...'] Text shown while in progress
 * @param {boolean} [props.busy=false] Loading / in-flight state
 * @param {string|Error|React.ReactNode} [props.error] Error message to display
 * @param {() => void} props.onConfirm Callback when confirm is clicked
 * @param {() => void} props.onCancel Callback when cancel is clicked or dialog closed
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busyLabel = 'Working...',
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}) {
  const id = useId();
  const titleId = `${id}-title`;
  const messageId = `${id}-desc`;

  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const prevFocusedRef = useRef(null);
  const prevBusyRef = useRef(busy);

  // Store active element on open and restore on close
  useEffect(() => {
    if (open) {
      prevFocusedRef.current = document.activeElement;
      // Focus the cancel (safe) button initially
      requestAnimationFrame(() => {
        cancelButtonRef.current?.focus();
      });
    } else if (prevFocusedRef.current && typeof prevFocusedRef.current.focus === 'function') {
      prevFocusedRef.current.focus();
      prevFocusedRef.current = null;
    }
  }, [open]);

  // When busy goes from true to false while open (e.g. after a failed attempt), refocus cancel button
  useEffect(() => {
    if (open && prevBusyRef.current === true && !busy) {
      requestAnimationFrame(() => {
        cancelButtonRef.current?.focus();
      });
    }
    prevBusyRef.current = busy;
  }, [open, busy]);

  // Keyboard navigation: Escape to cancel, Tab trap inside modal
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (!busy) {
          event.preventDefault();
          onCancel?.();
        }
        return;
      }

      if (event.key === 'Tab') {
        if (!dialogRef.current) {
          return;
        }

        const focusable = dialogRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement || !dialogRef.current.contains(document.activeElement)) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !dialogRef.current.contains(document.activeElement)) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, busy, onCancel]);

  if (!open) {
    return null;
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget && !busy) {
      onCancel?.();
    }
  }

  const errorMessage =
    error && typeof error === 'object' && 'message' in error
      ? error.message
      : error;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
      data-testid="dialog-backdrop"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="relative w-full max-w-md rounded-lg border border-line bg-panel p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-ink">
          {title}
        </h2>

        {message && (
          <div id={messageId} className="mt-2 text-sm text-muted">
            {message}
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            data-testid="dialog-error"
            className="mt-4 rounded border border-danger/30 bg-danger/10 p-3 text-xs text-danger"
          >
            {errorMessage}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded border border-line bg-panel-2 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-line/40 focus:outline-none focus:ring-2 focus:ring-brand-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded bg-brand px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
