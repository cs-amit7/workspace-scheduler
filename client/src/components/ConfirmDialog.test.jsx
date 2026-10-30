import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog.jsx';

describe('ConfirmDialog component', () => {
  it('renders a labelled modal dialog with aria-labelledby and aria-describedby', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Cancel this booking?"
        message="This action cannot be undone."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    const titleId = dialog.getAttribute('aria-labelledby');
    const descId = dialog.getAttribute('aria-describedby');

    expect(titleId).toBeTruthy();
    expect(descId).toBeTruthy();

    expect(document.getElementById(titleId)).toHaveTextContent('Cancel this booking?');
    expect(document.getElementById(descId)).toHaveTextContent('This action cannot be undone.');
  });

  it('does not render when open is false', () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        title="Test"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('puts initial focus on the cancel (safe) button on open', async () => {
    render(
      <ConfirmDialog
        open={true}
        title="Cancel booking?"
        cancelLabel="Keep booking"
        confirmLabel="Yes, cancel"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: 'Keep booking' });
      expect(document.activeElement).toBe(cancelButton);
    });
  });

  it('refocuses the cancel button after a failed attempt when busy transitions from true to false', async () => {
    function TestWrapper() {
      const [busy, setBusy] = useState(true);
      return (
        <div>
          <button type="button" onClick={() => setBusy(false)}>
            Fail
          </button>
          <ConfirmDialog
            open={true}
            busy={busy}
            title="Cancel booking"
            cancelLabel="Nevermind"
            confirmLabel="Confirm"
            onConfirm={vi.fn()}
            onCancel={vi.fn()}
          />
        </div>
      );
    }

    const user = userEvent.setup();
    render(<TestWrapper />);

    // Click fail to transition busy: true -> false
    const failBtn = screen.getByText('Fail');
    await user.click(failBtn);

    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: 'Nevermind' });
      expect(document.activeElement).toBe(cancelButton);
    });
  });

  it('traps focus inside the dialog with Tab and Shift+Tab', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        open={true}
        title="Test dialog"
        cancelLabel="Cancel Action"
        confirmLabel="Confirm Action"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel Action' });
    const confirmButton = screen.getByRole('button', { name: 'Confirm Action' });

    cancelButton.focus();
    expect(document.activeElement).toBe(cancelButton);

    // Tab moves to confirm button
    await user.tab();
    expect(document.activeElement).toBe(confirmButton);

    // Tab wraps around to cancel button
    await user.tab();
    expect(document.activeElement).toBe(cancelButton);

    // Shift+Tab wraps back to confirm button
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(confirmButton);
  });

  it('calls onCancel on Escape key and on backdrop click unless busy', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <ConfirmDialog
        open={true}
        title="Escape test"
        busy={false}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    // Escape triggers onCancel
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);

    // Backdrop click triggers onCancel
    const backdrop = screen.getByTestId('dialog-backdrop');
    await user.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(2);

    // Clicking dialog content does NOT trigger onCancel
    const dialog = screen.getByRole('dialog');
    await user.click(dialog);
    expect(onCancel).toHaveBeenCalledTimes(2);

    // When busy, neither Escape nor backdrop click trigger onCancel
    rerender(
      <ConfirmDialog
        open={true}
        title="Escape test"
        busy={true}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(2);

    await user.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('disables both buttons and shows busyLabel when busy', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Deleting..."
        busy={true}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        busyLabel="Deleting now..."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    const confirmButton = screen.getByRole('button', { name: 'Deleting now...' });

    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();
  });

  it('renders error in a role="alert" with data-testid="dialog-error"', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Error test"
        error="Unable to cancel booking right now"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('data-testid', 'dialog-error');
    expect(alert).toHaveTextContent('Unable to cancel booking right now');
  });

  it('restores focus to the previously focused element on close', async () => {
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" data-testid="trigger" onClick={() => setOpen(true)}>
            Open Dialog
          </button>
          <ConfirmDialog
            open={open}
            title="Focus test"
            onConfirm={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </div>
      );
    }

    const user = userEvent.setup();
    render(<Host />);

    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Close via cancel
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });
});
