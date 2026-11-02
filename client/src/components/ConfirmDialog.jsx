import { useId, useEffect, useRef } from 'react';
import Modal from './Modal.jsx';

/**
 * Accessible confirmation modal dialog built on top of Modal.
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

  const cancelButtonRef = useRef(null);
  const prevBusyRef = useRef(busy);

  // When busy goes from true to false while open (e.g. after a failed attempt), refocus cancel button
  useEffect(() => {
    if (open && prevBusyRef.current === true && !busy) {
      cancelButtonRef.current?.focus();
    }
    prevBusyRef.current = busy;
  }, [open, busy]);

  const errorMessage =
    error && typeof error === 'object' && 'message' in error
      ? error.message
      : error;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      titleId={titleId}
      ariaDescribedBy={message ? messageId : undefined}
      busy={busy}
      initialFocusRef={cancelButtonRef}
      backdropTestId="dialog-backdrop"
      showCloseButton={false}
      className="max-w-md"
    >
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
    </Modal>
  );
}
