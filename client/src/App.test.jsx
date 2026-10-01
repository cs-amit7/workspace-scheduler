import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App.jsx';

describe('App', () => {
  it('renders application heading', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /Smart Workspace Scheduler/i })
    ).toBeInTheDocument();
  });
});
