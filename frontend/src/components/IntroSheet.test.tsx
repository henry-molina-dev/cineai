import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import IntroSheet from './IntroSheet';

describe('IntroSheet', () => {
  it('renders the tips', () => {
    render(<IntroSheet onDismiss={vi.fn()} />);
    expect(screen.getByText(/Talk naturally/)).toBeInTheDocument();
    expect(screen.getByText(/Surprise Me/)).toBeInTheDocument();
  });

  it('calls onDismiss when "Got it" is clicked', () => {
    const onDismiss = vi.fn();
    render(<IntroSheet onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText('Got it'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('calls onDismiss when the backdrop is clicked', () => {
    const onDismiss = vi.fn();
    const { container } = render(<IntroSheet onDismiss={onDismiss} />);
    fireEvent.click(container.firstChild as Element);
    expect(onDismiss).toHaveBeenCalled();
  });
});
