import { SessionProvider, useSession } from './context/SessionContext';
import { makeApiClient } from './api/client';
import { makeMockApiClient } from './api/mock-client';
import Landing from './components/Landing';
import Chat from './components/Chat';
import LoadingDots from './components/LoadingDots';

const apiClient = import.meta.env.VITE_MOCK === 'true'
  ? makeMockApiClient()
  : makeApiClient(import.meta.env.VITE_API_URL ?? 'http://localhost:3000');

function AppContent() {
  const { session, mood, isLoading, error } = useSession();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
        <LoadingDots color="var(--color-ink-faint)" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <p style={{ color: 'var(--color-ink-muted)' }}>
          {error ?? 'Something went wrong.'}
        </p>
      </div>
    );
  }

  const showLanding = session.isFirstVisit && !mood;

  return showLanding ? <Landing /> : <Chat />;
}

export default function App() {
  const token = new URLSearchParams(window.location.search).get('token');

  if (!token) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
        <p style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
          No magic link found.
        </p>
      </div>
    );
  }

  return (
    <SessionProvider apiClient={apiClient} token={token}>
      <AppContent />
    </SessionProvider>
  );
}
