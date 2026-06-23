import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BudgetBadge from './BudgetBadge';

describe('BudgetBadge', () => {
  it('shows remaining count', () => {
    render(<BudgetBadge used={3} max={20} />);
    expect(screen.getByText(/17 of 20/)).toBeInTheDocument();
  });

  it('shows amber warning when 3 or fewer remain', () => {
    const { container } = render(<BudgetBadge used={18} max={20} />);
    expect(screen.getByText(/2 of 20/)).toBeInTheDocument();
    expect(container.firstChild).toHaveStyle({ color: 'var(--color-accent)' });
  });
});
