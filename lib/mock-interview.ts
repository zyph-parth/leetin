/**
 * lib/mock-interview.ts
 *
 * Problem selection logic for the Virtual Mock Interview feature.
 * Pure functions for selection plus light localStorage persistence.
 */

import type { Analytics } from './analytics';
import type { SM2State } from './srs';
import { getDueProblems, getRetentionPercent } from './srs';

export type InterviewDuration = 45 | 60 | 90;

export interface MockProblem {
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
  reason: string;
  leetcodeUrl: string;
  completed: boolean;
  timeSpentMs: number | null;
}

export type InterviewStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface MockInterview {
  id: string;
  username: string;
  generatedAt: number;
  targetCompany: string;
  durationMs: number;
  startedAt: number | null;
  accumulatedMs: number;
  problems: MockProblem[];
  status: InterviewStatus;
}

const SESSION_PREFIX = 'leetinsight:mock:session:';

function getSessionKey(username: string): string {
  return `${SESSION_PREFIX}${username}`;
}

function isStatus(value: unknown): value is InterviewStatus {
  return value === 'idle' || value === 'running' || value === 'paused' || value === 'finished';
}

function sanitizeProblem(value: unknown): MockProblem | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  const difficulty = raw.difficulty;
  if (
    typeof raw.slug !== 'string' ||
    typeof raw.title !== 'string' ||
    typeof raw.topic !== 'string' ||
    typeof raw.reason !== 'string' ||
    typeof raw.leetcodeUrl !== 'string' ||
    typeof raw.completed !== 'boolean' ||
    (difficulty !== 'Easy' && difficulty !== 'Medium' && difficulty !== 'Hard')
  ) {
    return null;
  }

  return {
    slug: raw.slug,
    title: raw.title,
    difficulty,
    topic: raw.topic,
    reason: raw.reason,
    leetcodeUrl: raw.leetcodeUrl,
    completed: raw.completed,
    timeSpentMs: typeof raw.timeSpentMs === 'number' && Number.isFinite(raw.timeSpentMs)
      ? Math.max(0, raw.timeSpentMs)
      : null,
  };
}

function sanitizeSession(value: unknown, username: string): MockInterview | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  if (
    typeof raw.id !== 'string' ||
    typeof raw.targetCompany !== 'string' ||
    typeof raw.generatedAt !== 'number' ||
    !Number.isFinite(raw.generatedAt) ||
    typeof raw.durationMs !== 'number' ||
    !Number.isFinite(raw.durationMs) ||
    typeof raw.accumulatedMs !== 'number' ||
    !Number.isFinite(raw.accumulatedMs) ||
    !Array.isArray(raw.problems) ||
    !isStatus(raw.status)
  ) {
    return null;
  }

  const problems = raw.problems
    .map((problem) => sanitizeProblem(problem))
    .filter((problem): problem is MockProblem => problem !== null);

  if (problems.length === 0) return null;

  const sessionUsername = typeof raw.username === 'string' && raw.username.trim()
    ? raw.username
    : username;

  if (sessionUsername !== username) return null;

  const startedAt = typeof raw.startedAt === 'number' && Number.isFinite(raw.startedAt)
    ? raw.startedAt
    : null;

  return {
    id: raw.id,
    username: sessionUsername,
    generatedAt: raw.generatedAt,
    targetCompany: raw.targetCompany,
    durationMs: Math.max(1, raw.durationMs),
    startedAt,
    accumulatedMs: Math.max(0, raw.accumulatedMs),
    problems,
    status: raw.status,
  };
}

export function loadSession(username: string): MockInterview | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(getSessionKey(username));
    if (!raw) return null;
    return sanitizeSession(JSON.parse(raw), username);
  } catch {
    return null;
  }
}

export function saveSession(session: MockInterview): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getSessionKey(session.username), JSON.stringify(session));
  } catch {
    // Quota exceeded. Session remains in memory.
  }
}

export function clearSession(username: string): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(getSessionKey(username));
  } catch {
    // noop
  }
}

export function getElapsedMs(session: MockInterview, nowMs = Date.now()): number {
  if (!session.startedAt) return Math.max(0, session.accumulatedMs);
  if (session.status === 'paused' || session.status === 'finished') {
    return Math.max(0, session.accumulatedMs);
  }
  return Math.max(0, session.accumulatedMs + (nowMs - session.startedAt));
}

export function getRemainingMs(session: MockInterview, nowMs = Date.now()): number {
  return Math.max(0, session.durationMs - getElapsedMs(session, nowMs));
}

export function toggleProblemCompletion(
  session: MockInterview,
  index: number,
  nowMs = Date.now(),
): MockInterview {
  const elapsedMs = getElapsedMs(session, nowMs);
  const allocatedMs = session.problems.reduce((sum, problem, problemIndex) => {
    if (problemIndex === index || !problem.completed || problem.timeSpentMs === null) return sum;
    return sum + problem.timeSpentMs;
  }, 0);

  return {
    ...session,
    problems: session.problems.map((problem, problemIndex) => {
      if (problemIndex !== index) return problem;

      return problem.completed
        ? { ...problem, completed: false, timeSpentMs: null }
        : {
            ...problem,
            completed: true,
            timeSpentMs: Math.max(0, elapsedMs - allocatedMs),
          };
    }),
  };
}

export function formatTime(ms: number): string {
  const safeMs = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  const totalSec = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function toLeetCodeUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}

function pickEasy(
  analytics: Analytics,
  srsStates: Record<string, SM2State>,
): MockProblem {
  const dueEasy = getDueProblems(srsStates, Date.now(), Number.POSITIVE_INFINITY)
    .filter((state) => state.difficulty === 'Easy')
    .sort((a, b) => getRetentionPercent(a) - getRetentionPercent(b));

  if (dueEasy.length > 0) {
    const state = dueEasy[0];
    return {
      slug: state.slug,
      title: state.title,
      difficulty: 'Easy',
      topic: state.topics[0] ?? 'General',
      reason: `Retention at ${getRetentionPercent(state)}% — good warm-up to rebuild this one.`,
      leetcodeUrl: toLeetCodeUrl(state.slug),
      completed: false,
      timeSpentMs: null,
    };
  }

  const weakTopicNames = new Set(analytics.weakTopics.map((topic) => topic.name.toLowerCase()));
  const weakEasy = analytics.recommendedProblems.find(
    (problem) => problem.difficulty === 'Easy'
      && (weakTopicNames.has(problem.primaryTopic.toLowerCase()) || weakTopicNames.size === 0),
  );

  if (weakEasy) {
    return {
      slug: weakEasy.slug,
      title: weakEasy.title,
      difficulty: 'Easy',
      topic: weakEasy.primaryTopic,
      reason: `Warm-up in ${weakEasy.primaryTopic} — an area that needs more practice.`,
      leetcodeUrl: toLeetCodeUrl(weakEasy.slug),
      completed: false,
      timeSpentMs: null,
    };
  }

  const anyEasy = analytics.recommendedProblems.find((problem) => problem.difficulty === 'Easy');
  if (anyEasy) {
    return {
      slug: anyEasy.slug,
      title: anyEasy.title,
      difficulty: 'Easy',
      topic: anyEasy.primaryTopic,
      reason: `Warm-up problem in ${anyEasy.primaryTopic}.`,
      leetcodeUrl: toLeetCodeUrl(anyEasy.slug),
      completed: false,
      timeSpentMs: null,
    };
  }

  return {
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    topic: 'Array',
    reason: 'Classic warm-up problem.',
    leetcodeUrl: toLeetCodeUrl('two-sum'),
    completed: false,
    timeSpentMs: null,
  };
}

function pickMedium(
  analytics: Analytics,
  targetCompany: string,
): MockProblem {
  const primaryWeak = analytics.weakTopics[0]?.name ?? '';
  const mediums = analytics.recommendedProblems.filter((problem) => problem.difficulty === 'Medium');

  const companyWeak = mediums.find(
    (problem) => problem.companies.includes(targetCompany)
      && problem.primaryTopic.toLowerCase().includes(primaryWeak.toLowerCase()),
  );
  if (companyWeak) {
    return {
      slug: companyWeak.slug,
      title: companyWeak.title,
      difficulty: 'Medium',
      topic: companyWeak.primaryTopic,
      reason: `Your weakest area (${primaryWeak}) meets ${targetCompany}'s common interview patterns.`,
      leetcodeUrl: toLeetCodeUrl(companyWeak.slug),
      completed: false,
      timeSpentMs: null,
    };
  }

  const companyOnly = mediums.find((problem) => problem.companies.includes(targetCompany));
  if (companyOnly) {
    return {
      slug: companyOnly.slug,
      title: companyOnly.title,
      difficulty: 'Medium',
      topic: companyOnly.primaryTopic,
      reason: `Frequently appears in ${targetCompany} interviews.`,
      leetcodeUrl: toLeetCodeUrl(companyOnly.slug),
      completed: false,
      timeSpentMs: null,
    };
  }

  const weakMatch = mediums
    .filter((problem) => problem.primaryTopic.toLowerCase().includes(primaryWeak.toLowerCase()))
    .sort((a, b) => b.matchScore - a.matchScore)[0];
  if (weakMatch) {
    return {
      slug: weakMatch.slug,
      title: weakMatch.title,
      difficulty: 'Medium',
      topic: weakMatch.primaryTopic,
      reason: `Targets ${primaryWeak} — your current focus area.`,
      leetcodeUrl: toLeetCodeUrl(weakMatch.slug),
      completed: false,
      timeSpentMs: null,
    };
  }

  const best = [...mediums].sort((a, b) => b.matchScore - a.matchScore)[0];
  if (best) {
    return {
      slug: best.slug,
      title: best.title,
      difficulty: 'Medium',
      topic: best.primaryTopic,
      reason: best.reason || 'Highest-priority Medium in your queue.',
      leetcodeUrl: toLeetCodeUrl(best.slug),
      completed: false,
      timeSpentMs: null,
    };
  }

  return {
    slug: 'longest-substring-without-repeating-characters',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    topic: 'Sliding Window',
    reason: 'Core Medium pattern — sliding window.',
    leetcodeUrl: toLeetCodeUrl('longest-substring-without-repeating-characters'),
    completed: false,
    timeSpentMs: null,
  };
}

function pickHard(
  analytics: Analytics,
  easySlug: string,
  mediumSlug: string,
): MockProblem {
  const hards = analytics.recommendedProblems
    .filter((problem) => problem.difficulty === 'Hard' && problem.slug !== easySlug && problem.slug !== mediumSlug)
    .sort((a, b) => b.matchScore - a.matchScore);

  if (hards.length > 0) {
    const problem = hards[0];
    return {
      slug: problem.slug,
      title: problem.title,
      difficulty: 'Hard',
      topic: problem.primaryTopic,
      reason: `Push your limits — ${problem.primaryTopic} is a gap worth closing under time pressure.`,
      leetcodeUrl: toLeetCodeUrl(problem.slug),
      completed: false,
      timeSpentMs: null,
    };
  }

  return {
    slug: 'median-of-two-sorted-arrays',
    title: 'Median of Two Sorted Arrays',
    difficulty: 'Hard',
    topic: 'Binary Search',
    reason: 'Classic Hard — binary search under pressure.',
    leetcodeUrl: toLeetCodeUrl('median-of-two-sorted-arrays'),
    completed: false,
    timeSpentMs: null,
  };
}

export function generateMockInterview(
  analytics: Analytics,
  srsStates: Record<string, SM2State>,
  username: string,
  targetCompany: string,
  durationMin: InterviewDuration,
): MockInterview {
  const easy = pickEasy(analytics, srsStates);
  const medium = pickMedium(analytics, targetCompany);
  const hard = pickHard(analytics, easy.slug, medium.slug);

  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()),
    username,
    generatedAt: Date.now(),
    targetCompany,
    durationMs: durationMin * 60 * 1000,
    startedAt: null,
    accumulatedMs: 0,
    problems: [easy, medium, hard],
    status: 'idle',
  };
}
