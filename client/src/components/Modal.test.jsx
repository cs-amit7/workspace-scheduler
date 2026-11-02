import { useState, useRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Modal from './Modal.jsx';

describe('Modal component', () => {
  it('renders a labelled modal dialog with aria-modal and aria-labelledby', () => {
    render(
      <Modal open={true} title="Create Resource" onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    const titleId = dialog.getAttribute('aria-labelledby');
    expect(titleId).toBeTruthy();
    expect(document.getElementById(titleId)).toHaveTextContent('Create Resource');
  });

  it('does not render when open is false', () => {
    const { container } = render(
      <Modal open={false} title="Hidden" onClose={vi.fn()}>
        <p>Content</p>
      </Modal>
    );
    expect(container.firstChild).toBeNull();
  });

  it('focuses first focusable element synchronously on open without timers', () => {
    render(
      <Modal open={true} title="Test Modal" onClose={vi.fn()}>
        <input data-testid="first-input" type="text" />
        <button type="button">Submit</button>
      </Modal>
    );

    // Initial focus must be synchronous - active immediately upon render without awaiting or timers
    const closeBtn = screen.getByRole('button', { name: 'Close modal' });
    expect(document.activeElement).toBe(closeBtn);
  });

  it('focuses initialFocusRef synchronously when provided', () => {
    function HostWithRef() {
      const inputRef = useRef(null);
      return (
        <Modal open={true} title="With Ref" initialFocusRef={inputRef} onClose={vi.fn()}>
          <input data-testid="target-input" ref={inputRef} type="text" />
          <button type="button">Save</button>
        </Modal>
      );
    }

    render(<HostWithRef />);

    const targetInput = screen.getByTestId('target-input');
    expect(document.activeElement).toBe(targetInput);
  });

  it('traps focus inside the dialog with Tab and Shift+Tab', async () => {
    const user = userEvent.setup();
    render(
      <Modal open={true} onClose={vi.fn()}>
        <input data-testid="input-1" placeholder="First" />
        <input data-testid="input-2" placeholder="Second" />
        <button type="button">Third</button>
      </Modal>
    );

    const input1 = screen.getByPlaceholderText('First');
    const input2 = screen.getByPlaceholderText('Second');
    const button3 = screen.getByRole('button', { name: 'Third' });

    // Focus starts on first element
    expect(document.activeElement).toBe(input1);

    // Tab forward
    await user.tab();
    expect(document.activeElement).toBe(input2);

    await user.tab();
    expect(document.activeElement).toBe(button3);

    // Wrap around to first
    await user.tab();
    expect(document.activeElement).toBe(input1);

    // Shift+Tab wrap backward to last
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(button3);
  });

  it('calls onClose on Escape key and on backdrop click unless busy', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <Modal open={true} title="Close test" busy={false} onClose={onClose}>
        <button type="button">Action</button>
      </Modal>
    );

    // Escape triggers onClose
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    // Backdrop click triggers onClose
    const backdrop = screen.getByTestId('modal-backdrop');
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);

    // Clicking inside dialog content does NOT trigger onClose
    const dialog = screen.getByRole('dialog');
    await user.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(2);

    // When busy is true, neither Escape nor backdrop click trigger onClose
    rerender(
      <Modal open={true} title="Close test" busy={true} onClose={onClose}>
        <button type="button">Action</button>
      </Modal>
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);

    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('restores focus to previously active element on close', async () => {
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" data-testid="open-btn" onClick={() => setOpen(true)}>
            Open
          </button>
          <Modal open={open} title="Restore Focus" onClose={() => setOpen(false)}>
            <button type="button" onClick={() => setOpen(false)}>
              Close inside
            </button>
          </Modal>
        </div>
      );
    }

    const user = userEvent.setup();
    render(<Host />);

    const openBtn = screen.getByTestId('open-btn');
    openBtn.focus();
    expect(document.activeElement).toBe(openBtn);

    await user.click(openBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Close inside' });
    await user.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(openBtn);
  });
});
