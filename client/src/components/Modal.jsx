import { useId, useEffect, useRef } from 'react';

/**
 * Generic accessible modal dialog.
 *
 * @param {object} props
 * @param {boolean} props.open Whether modal is open
 * @param {() => void} props.onClose Callback invoked on close request (Escape, backdrop click, close button)
 * @param {React.ReactNode} [props.title] Modal title text or node
 * @param {string} [props.titleId] Custom ID for title element
 * @param {string} [props.ariaLabelledBy] Override ID for aria-labelledby
 * @param {string} [props.ariaDescribedBy] Optional ID for aria-describedby
 * @param {boolean} [props.busy=false] Whether in-flight action prevents closing
 * @param {React.RefObject} [props.initialFocusRef] Specific element to focus initially
 * @param {string} [props.className] Additional CSS classes for dialog container
 * @param {string} [props.backdropTestId='modal-backdrop'] Test ID for the backdrop overlay
 * @param {boolean} [props.showCloseButton=true] Whether to show the top-right close button
 * @param {React.ReactNode} props.children Modal contents
 */
export default function Modal({
  open,
  onClose,
  title,
  titleId: customTitleId,
  ariaLabelledBy,
  ariaDescribedBy,
  busy = false,
  initialFocusRef,
  className = 'max-w-lg',
  backdropTestId = 'modal-backdrop',
  showCloseButton = true,
  children,
}) {
  const generatedId = useId();
  const titleId = customTitleId || `${generatedId}-title`;
  const labelledBy = ariaLabelledBy || (title ? titleId : undefined);

  const dialogRef = useRef(null);
  const prevFocusedRef = useRef(null);

  // Synchronous focus management inside useEffect (no requestAnimationFrame or setTimeout)
  useEffect(() => {
    if (open) {
      prevFocusedRef.current = document.activeElement;

      if (initialFocusRef?.current && typeof initialFocusRef.current.focus === 'function') {
        initialFocusRef.current.focus();
      } else if (dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    } else if (prevFocusedRef.current && typeof prevFocusedRef.current.focus === 'function') {
      prevFocusedRef.current.focus();
      prevFocusedRef.current = null;
    }

    return () => {
      if (prevFocusedRef.current && typeof prevFocusedRef.current.focus === 'function') {
        prevFocusedRef.current.focus();
        prevFocusedRef.current = null;
      }
    };
  }, [open, initialFocusRef]);

  // Keyboard trap: Escape to close unless busy, Tab and Shift+Tab wrapped
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (!busy) {
          event.preventDefault();
          onClose?.();
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
  }, [open, busy, onClose]);

  if (!open) {
    return null;
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget && !busy) {
      onClose?.();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-bg/80 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
      data-testid={backdropTestId}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={ariaDescribedBy}
        className={`relative w-full rounded-lg border border-line bg-panel p-6 shadow-xl ${className}`}
      >
        {title && (
          <div
            className={
              showCloseButton
                ? 'mb-4 flex items-center justify-between border-b border-line pb-3'
                : ''
            }
          >
            <h2 id={titleId} className="text-lg font-semibold text-ink">
              {title}
            </h2>
            {showCloseButton && (
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                aria-label="Close modal"
                className="rounded p-1 text-muted transition-colors hover:bg-panel-2 hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand-text disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
