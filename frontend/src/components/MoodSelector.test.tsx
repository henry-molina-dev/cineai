import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MoodSelector from './MoodSelector';

describe('MoodSelector', () => {
  it('renders all mood options', () => {
    render(<MoodSelector onSelect={vi.fn()} />);
    expect(screen.getByText('Relaxed')).toBeInTheDocument();
    expect(screen.getByText('Stressed')).toBeInTheDocument();
    expect(screen.getByText('Nostalgic')).toBeInTheDocument();
    expect(screen.getByText('Curious')).toBeInTheDocument();
    expect(screen.getByText('Adventurous')).toBeInTheDocument();
    expect(screen.getByText('Playful')).toBeInTheDocument();
  });

  it('calls onSelect with a Mood when a card is clicked', () => {
    const onSelect = vi.fn();
    render(<MoodSelector onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Nostalgic'));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Nostalgic', raw: 'Nostalgic' }),
    );
  });

  it('calls onSelect with custom text when free-text is submitted', () => {
    const onSelect = vi.fn();
    render(<MoodSelector onSelect={onSelect} />);

    const input = screen.getByPlaceholderText(/feeling/i);
    fireEvent.change(input, { target: { value: 'anxious about life' } });
    fireEvent.submit(input.closest('form')!);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'anxious about life', raw: 'anxious about life' }),
    );
  });

  it('strips a leading "I am feeling" from the label but keeps it in raw', () => {
    const onSelect = vi.fn();
    render(<MoodSelector onSelect={onSelect} />);

    const input = screen.getByPlaceholderText(/feeling/i);
    fireEvent.change(input, { target: { value: 'I am feeling enthusiastic' } });
    fireEvent.submit(input.closest('form')!);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'enthusiastic', raw: 'I am feeling enthusiastic' }),
    );
  });

  it('strips a leading "I\'m" from the label but keeps it in raw', () => {
    const onSelect = vi.fn();
    render(<MoodSelector onSelect={onSelect} />);

    const input = screen.getByPlaceholderText(/feeling/i);
    fireEvent.change(input, { target: { value: "I'm exhausted from work" } });
    fireEvent.submit(input.closest('form')!);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'exhausted from work', raw: "I'm exhausted from work" }),
    );
  });
});
