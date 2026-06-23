import { createContext, useContext, useEffect, useState } from 'react';
import type { ApiClient } from '../api/client';
import { ApiError } from '../api/client';
import type { SessionData, Mood, WatchlistEntry } from '../types';

type SessionContextValue = {
  apiClient:        ApiClient;
  token:            string;
  session:          SessionData | null;
  mood:             Mood | null;
  isLoading:        boolean;
  error:            string | null;
  setMood:          (mood: Mood) => void;
  toggleWatchlist:  (entry: WatchlistEntry) => Promise<void>;
};

export const SessionContext = createContext<SessionContextValue | null>(null);

type ProviderProps = {
  children:  React.ReactNode;
  apiClient: ApiClient;
  token:     string;
};

export function SessionProvider({ children, apiClient, token }: ProviderProps) {
  const [session,   setSession]   = useState<SessionData | null>(null);
  const [mood,      setMood]      = useState<Mood | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    apiClient.getSession(token)
      .then(s => setSession(s))
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? e.message : 'Failed to load session.');
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const toggleWatchlist = async (entry: WatchlistEntry) => {
    const result = await apiClient.toggleWatchlist(token, entry);
    setSession(prev => prev ? { ...prev, watchlist: result.watchlist } : null);
  };

  return (
    <SessionContext.Provider value={{ apiClient, token, session, mood, isLoading, error, setMood, toggleWatchlist }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
