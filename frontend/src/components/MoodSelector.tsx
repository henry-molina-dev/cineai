import { useState } from 'react';
import type { Mood } from '../types';

const MOODS = ['Relaxed', 'Stressed', 'Nostalgic', 'Curious', 'Adventurous', 'Playful'];

// Strips a leading "I'm feeling" / "I am" so the label reads as a fragment,
// not a full sentence, when echoed back in the chat greeting.
const stripFeelingPrefix = (text: string): string => {
  const stripped = text.replace(/^i'?m\s+(feeling\s+)?/i, '').replace(/^i\s+am\s+(feeling\s+)?/i, '').replace(/^feeling\s+/i, '');
  return stripped.trim() || text;
};

type Props = { onSelect: (mood: Mood) => void };

export default function MoodSelector({ onSelect }: Props) {
  const [custom, setCustom] = useState('');

  const pick = (label: string, raw: string = label) =>
    onSelect({ label, raw, capturedAt: new Date().toISOString() });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = custom.trim();
    if (trimmed) pick(stripFeelingPrefix(trimmed), trimmed);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--space-3)',
      }}>
        {MOODS.map(mood => (
          <button
            key={mood}
            onClick={() => pick(mood)}
            style={{
              padding: 'var(--space-4) var(--space-3)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--color-ink)',
              transition: 'background var(--ease), border-color var(--ease)',
            }}
          >
            {mood}
          </button>
        ))}
      </div>

      <form onSubmit={submit} style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          placeholder="Or tell me how you're feeling…"
          style={{
            flex: 1,
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--color-ink)',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!custom.trim()}
          style={{
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-accent)',
            color: '#fff',
            borderRadius: 'var(--radius)',
            fontSize: 14,
            opacity: custom.trim() ? 1 : 0.4,
          }}
        >
          →
        </button>
      </form>
    </div>
  );
}
