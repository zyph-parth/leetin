/**
 * lib/mock-interview.ts
 *
 * Problem selection logic for the Virtual Mock Interview feature.
 * Pure functions — no side effects, fully testable.
 *
 * Selection strategy:
 *   Easy   — lowest-retention due/overdue Easy from SRS; fallback to weak-topic Easy
 *            from recommendedProblems. NOT random — targets memory gaps.
 *   Medium — from recommendedProblems filtered to weakTopics[0] + targetCompany,
 *            highest matchScore wins.
 *   Hard   — from recommendedProblems filtered Hard, sorted by matchScore descending;
 *            intentionally NOT from strength areas (strength doesn't need drilling).
 */

import type { Analytics, RecommendedProblem } from './analytics';
import type { SM2State } from './srs';
import { getDueProblems, getRetentionPercent } from './srs';

// ─── Public types ─────────────────────────────────────────────────

export type InterviewDuration = 45 | 60 | 90;

export interface MockProblem {
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
  reason: string;
  leetcodeUrl: string;
  completed: boolean;
  /** ms elapsed on this specific problem when the user marks it done */
  timeSpentMs: number | null;
}

export type InterviewStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface MockInterview {
  id: string;
  generatedAt: number;
  targetCompany: string;
  durationMs: number;
  /** Unix ms — set when status transitions idle→running */
  startedAt: number | null;
  /** Accumulated ms before the current pause started */
  accumulatedMs: number;
  problems: MockProblem[];
  status: InterviewStatus;
}

// ─── localStorage persistence ─────────────────────────────────────

const SESSION_KEY = 'leetinsight:mock:session';

export function loadSession(): MockInterview | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MockInterview;
    // Basic shape guard
    if (!parsed.id || !Array.isArray(parsed.problems)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: MockInterview): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Quota exceeded — silently continue
  }
}

export function clearSession(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SESSION_KEY);
  } catch { /* noop */ }
}

// ─── Elapsed time helpers ─────────────────────────────────────────

/**
 * Returns total elapsed ms for a session, accounting for pauses.
 * Uses wall-clock diff from startedAt rather than intervals to avoid drift.
 */
export function getElapsedMs(session: MockInterview, nowMs = Date.now()): number {
  if (!session.startedAt) return session.accumulatedMs;
  if (session.status === 'paused' || session.status === 'finished') {
    return session.accumulatedMs;
  }
  return session.accumulatedMs + (nowMs - session.startedAt);
}

export function getRemainingMs(session: MockInterview, nowMs = Date.now()): number {
  return Math.max(0, session.durationMs - getElapsedMs(session, nowMs));
}

export function formatTime(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Problem selection ────────────────────────────────────────────

function toLeetCodeUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}

function pickEasy(
  analytics: Analytics,
  srsStates: Record<string, SM2State>,
): MockProblem {
  // Priority 1: due/overdue Easy problems with lowest retention (most forgotten)
  const dueEasy = getDueProblems(srsStates, Date.now())
    .filter(s => s.difficulty === 'Easy')
    .sort((a, b) => getRetentionPercent(a) - getRetentionPercent(b));

  if (dueEasy.length > 0) {
    const s = dueEasy[0];
    return {
      slug: s.slug,
      title: s.title,
      difficulty: 'Easy',
      topic: s.topics[0] ?? 'General',
      reason: `Retention at ${getRetentionPercent(s)}% — good warm-up to rebuild this one.`,
      leetcodeUrl: toLeetCodeUrl(s.slug),
      completed: false,
      timeSpentMs: null,
    };
  }

  // Priority 2: Easy from recommendedProblems matching a weak topic
  const weakTopicNames = new Set(analytics.weakTopics.map(t => t.name.toLowerCase()));
  const weakEasy = analytics.recommendedProblems.find(
    p => p.difficulty === 'Easy' &&
    (weakTopicNames.has(p.primaryTopic.toLowerCase()) || weakTopicNames.size === 0)
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

  // Priority 3: any Easy from recommendedProblems
  const anyEasy = analytics.recommendedProblems.find(p => p.difficulty === 'Easy');
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

  // Fallback: well-known beginner problem
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
  const mediums = analytics.recommendedProblems.filter(p => p.difficulty === 'Medium');

  // Best: matches weak topic + target company
  const companyWeak = mediums.find(
    p => p.companies.includes(targetCompany) &&
    p.primaryTopic.toLowerCase().includes(primaryWeak.toLowerCase())
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

  // Second: just matches target company
  const companyOnly = mediums.find(p => p.companies.includes(targetCompany));
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

  // Third: highest matchScore Medium from weak topic
  const weakMatch = mediums
    .filter(p => p.primaryTopic.toLowerCase().includes(primaryWeak.toLowerCase()))
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

  // Fallback: top matchScore Medium
  const best = mediums.sort((a, b) => b.matchScore - a.matchScore)[0];
  if (best) {
    return {
      slug: best.slug,
      title: best.title,
      difficulty: 'Medium',
      topic: best.primaryTopic,
      reason: best.reason || `Highest-priority Medium in your queue.`,
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
    .filter(p => p.difficulty === 'Hard' && p.slug !== easySlug && p.slug !== mediumSlug)
    .sort((a, b) => b.matchScore - a.matchScore);

  if (hards.length > 0) {
    const h = hards[0];
    return {
      slug: h.slug,
      title: h.title,
      difficulty: 'Hard',
      topic: h.primaryTopic,
      reason: `Push your limits — ${h.primaryTopic} is a gap worth closing under time pressure.`,
      leetcodeUrl: toLeetCodeUrl(h.slug),
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

// ─── Main generator ───────────────────────────────────────────────

export function generateMockInterview(
  analytics: Analytics,
  srsStates: Record<string, SM2State>,
  targetCompany: string,
  durationMin: InterviewDuration,
): MockInterview {
  const easy   = pickEasy(analytics, srsStates);
  const medium = pickMedium(analytics, targetCompany);
  const hard   = pickHard(analytics, easy.slug, medium.slug);

  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()),
    generatedAt: Date.now(),
    targetCompany,
    durationMs: durationMin * 60 * 1000,
    startedAt: null,
    accumulatedMs: 0,
    problems: [easy, medium, hard],
    status: 'idle',
  };
}