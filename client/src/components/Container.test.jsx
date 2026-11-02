import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Container from './Container.jsx';

describe('Container component', () => {
  it('renders children and applies shared mx-auto max-w-7xl px-4 sm:px-6 classes', () => {
    render(<Container data-testid="container">Content</Container>);
    const el = screen.getByTestId('container');
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('mx-auto', 'max-w-7xl', 'px-4', 'sm:px-6');
    expect(el).toHaveTextContent('Content');
  });

  it('merges custom className prop and renders custom element tag with as prop', () => {
    render(
      <Container as="section" className="py-8 custom-class" data-testid="container">
        Section Content
      </Container>
    );
    const el = screen.getByTestId('container');
    expect(el.tagName).toBe('SECTION');
    expect(el).toHaveClass('mx-auto', 'max-w-7xl', 'px-4', 'sm:px-6', 'py-8', 'custom-class');
  });
});
