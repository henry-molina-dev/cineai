import type { Session, Mood } from '../types/session';
import { PERSONA_PROMPT } from './constants';

const buildIdentity = (session: Session): string => {
  const { name, role, company } = session;
  const dontInventName = "don't address them by name or invent one — speak to them naturally without it";

  if (name && role) return `The person you're talking with is ${name}, ${role} at ${company}.`;
  if (name)         return `The person you're talking with is ${name} at ${company}. Their specific role isn't known yet.`;
  if (role)         return `The person you're talking with is a ${role} at ${company}. Their name isn't known yet, so ${dontInventName}.`;
  return `The person you're talking with works at ${company}. Their name and role aren't known yet, so ${dontInventName}.`;
};

export const buildSystemPrompt = (session: Session, mood: Mood | null): string => {
  const identity = buildIdentity(session);

  const lines = [
    PERSONA_PROMPT,
    identity,
  ];

  if (mood) {
    lines.push(`Their current mood: "${mood.label}" (they said: "${mood.raw}").`);
  }

  if (session.openCount > 1) {
    lines.push(`This is a return visit — they've been here ${session.openCount} times.`);
  }

  if (session.watchlist.length > 0) {
    const titles = session.watchlist.map(e => `${e.title} (${e.year})`).join(', ');
    lines.push(`Their watchlist: ${titles}. Use these as taste signals — they reveal what this person gravitates toward. Avoid re-recommending them unless there is a compelling reason.`);
  }

  const remaining = session.maxRequests - session.requestCount;
  lines.push(`They have ${remaining} conversation exchanges remaining.`);

  return lines.join('\n\n');
};
