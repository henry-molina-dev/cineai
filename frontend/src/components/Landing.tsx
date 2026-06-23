import { useSession } from '../context/SessionContext';
import { useTheme } from '../hooks/useTheme';
import { getTimeOfDayPhrase } from '../utils/timeOfDay';
import MoodSelector from './MoodSelector';
import ThemeToggle from './ThemeToggle';

export default function Landing() {
  const { session, setMood } = useSession();
  const { resolved } = useTheme();

  if (!session) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100dvh',
      padding: 'var(--space-8)',
      gap: 'var(--space-8)',
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: 'var(--space-4)', right: 'var(--space-4)' }}>
        <ThemeToggle />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-6)', animation: 'fadeIn 0.5s ease-out' }}>
        <img
          src={`${session.logoUrl}?token=${import.meta.env.VITE_LOGO_DEV_API_KEY}&format=png&theme=${resolved}`}
          alt={session.company}
          style={{ width: 48, height: 48, objectFit: 'contain' }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 48,
          fontWeight: 400,
          color: 'var(--color-ink)',
          textAlign: 'center',
          lineHeight: 1.1,
        }}>
          {session.name ?? session.company}
        </h1>

        <p style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 20,
          color: 'var(--color-ink-muted)',
        }}>
          I&apos;ve been expecting you.
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 480 }}>
        <p style={{
          textAlign: 'center',
          color: 'var(--color-ink-muted)',
          marginBottom: 'var(--space-6)',
          fontSize: 15,
        }}>
          How are you feeling {getTimeOfDayPhrase()}?
        </p>
        <MoodSelector onSelect={setMood} />
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}
