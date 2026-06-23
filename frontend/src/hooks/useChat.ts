import { useState } from 'react';
import type { ApiClient } from '../api/client';
import type { ChatMessage, Mood } from '../types';

const RETRY_MESSAGE = "Something went wrong on my end — mind trying that again?";

export function useChat(apiClient: ApiClient, token: string, initialMessages: ChatMessage[] = []) {
  const [messages,         setMessages]         = useState<ChatMessage[]>(initialMessages);
  const [isLoading,        setIsLoading]        = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  // Counts only calls made this render of the app — unlike messages.length,
  // which also includes rehydrated history already reflected in
  // session.requestCount, so mixing the two would double-count.
  const [newResponseCount, setNewResponseCount] = useState(0);

  const send = async (message: string, mood: Mood | null) => {
    setIsLoading(true);
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    try {
      const response = await apiClient.sendChat(token, message, mood);
      setMessages(prev => [...prev, { role: 'assistant', response }]);
      setNewResponseCount(n => n + 1);
      return response;
    } catch {
      setError(RETRY_MESSAGE);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  const surprise = async (mood: Mood | null) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.sendSurprise(token, mood);
      setMessages(prev => [...prev, { role: 'assistant', response }]);
      setNewResponseCount(n => n + 1);
      return response;
    } catch {
      setError(RETRY_MESSAGE);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  const openReturn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.sendOpener(token);
      setMessages(prev => [...prev, { role: 'assistant', response }]);
      setNewResponseCount(n => n + 1);
      return response;
    } catch {
      setError(RETRY_MESSAGE);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, isLoading, error, send, surprise, openReturn, newResponseCount };
}
