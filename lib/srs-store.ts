/**
 * lib/srs-store.ts
 *
 * Persistence layer for SRS state.
 * Uses localStorage with a per-username key so multiple users
 * on the same browser don't collide.
 */

import type { LeetCodeProfile } from './leetcode';
import type { SM2State, Difficulty, ReviewQuality } from './srs';
import { computeInitialState } from './srs';

export const SRS_STORAGE_PREFIX = 'leetinsight:srs:';

const DEFAULT_EF = 2.5;
const MIN_EF = 1.3;
const MS_PER_DAY = 86_400_000;

function getLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const ls = window.localStorage;
    if (typeof ls?.getItem !== 'function') return null;
    return ls;
  } catch {
    return null;
  }
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === 'Easy' || value === 'Medium' || value === 'Hard';
}

function isReviewQuality(value: unknown): value is ReviewQuality {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 5;
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toNonNegativeInteger(value: unknown, fallback: number): number {
  const numeric = toFiniteNumber(value);
  if (numeric === null) return fallback;
  return Math.max(0, Math.round(numeric));
}

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ');
}

function sanitizeTopics(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter((topic): topic is string => typeof topic === 'string')
        .map((topic) => topic.trim())
        .filter(Boolean),
    ),
  ).slice(0, 8);
}

export function getSRSStorageKey(username: string): string {
  return `${SRS_STORAGE_PREFIX}${username}`;
}

export function sanitizeSM2State(value: unknown, slugHint?: string): SM2State | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  const slug = typeof raw.slug === 'string' && raw.slug.trim()
    ? raw.slug.trim()
    : typeof slugHint === 'string' && slugHint.trim()
      ? slugHint.trim()
      : null;

  const interval = Math.max(1, toNonNegativeInteger(raw.interval, 1));
  const nextReviewMs = toFiniteNumber(raw.nextReviewMs);
  if (!slug || nextReviewMs === null) return null;

  const lastReviewMs = toFiniteNumber(raw.lastReviewMs) ?? (nextReviewMs - interval * MS_PER_DAY);
  const solvedAtMs = toFiniteNumber(raw.solvedAtMs) ?? lastReviewMs;
  const lastRating = raw.lastRating == null
    ? null
    : isReviewQuality(raw.lastRating)
      ? raw.lastRating
      : null;

  return {
    slug,
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : slugToTitle(slug),
    difficulty: isDifficulty(raw.difficulty) ? raw.difficulty : 'Medium',
    topics: sanitizeTopics(raw.topics),
    number: toFiniteNumber(raw.number) ?? -1,
    n: toNonNegativeInteger(raw.n, 0),
    ef: Math.max(MIN_EF, toFiniteNumber(raw.ef) ?? DEFAULT_EF),
    interval,
    nextReviewMs,
    lastReviewMs,
    solvedAtMs,
    lastRating,
    totalReviews: toNonNegativeInteger(raw.totalReviews, lastRating === null ? 0 : 1),
  };
}

export function sanitizeSRSRecord(record: unknown): Record<string, SM2State> {
  if (typeof record !== 'object' || record === null || Array.isArray(record)) return {};

  return Object.fromEntries(
    Object.entries(record as Record<string, unknown>).flatMap(([slug, value]) => {
      const sanitized = sanitizeSM2State(value, slug);
      return sanitized ? [[sanitized.slug, sanitized]] : [];
    }),
  );
}

export function loadSRSData(username: string): Record<string, SM2State> {
  const ls = getLocalStorage();
  if (!ls) return {};

  try {
    const raw = ls.getItem(getSRSStorageKey(username));
    if (!raw) return {};
    return sanitizeSRSRecord(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveSRSData(username: string, data: Record<string, SM2State>): void {
  const ls = getLocalStorage();
  if (!ls) return;

  try {
    ls.setItem(getSRSStorageKey(username), JSON.stringify(data));
  } catch (e) {
    console.warn('[SRS] localStorage write failed:', e);
  }
}

export function saveSingleState(
  username: string,
  state: SM2State,
  existing: Record<string, SM2State>,
): Record<string, SM2State> {
  const updated = { ...existing, [state.slug]: state };
  saveSRSData(username, updated);
  return updated;
}

export interface SolvedProblem {
  slug: string;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  number: number;
  solvedAtMs: number;
}

export function extractSolvedProblems(profile: LeetCodeProfile): SolvedProblem[] {
  const seen = new Map<string, SolvedProblem>();

  for (const submission of profile.recentSubmissions ?? []) {
    if (submission.statusDisplay !== 'Accepted') continue;

    const slug = submission.titleSlug?.trim();
    if (!slug) continue;

    const solvedAtMs = Math.max(0, (Number(submission.timestamp) || 0) * 1000) || Date.now();
    const current = seen.get(slug);

    if (!current || solvedAtMs < current.solvedAtMs) {
      seen.set(slug, {
        slug,
        title: submission.title || slugToTitle(slug),
        difficulty: submission.difficulty ?? 'Medium',
        topics: sanitizeTopics(submission.topicTags?.map((topic) => topic.name) ?? []),
        number: submission.frontendId ?? -1,
        solvedAtMs,
      });
    }
  }

  return Array.from(seen.values());
}

export function mergeFreshProblems(
  username: string,
  existing: Record<string, SM2State>,
  profile: LeetCodeProfile,
): Record<string, SM2State> {
  const solvedProblems = extractSolvedProblems(profile);
  let changed = false;
  const result = { ...existing };

  for (const problem of solvedProblems) {
    if (result[problem.slug]) continue;

    result[problem.slug] = computeInitialState(
      problem.slug,
      problem.title,
      problem.difficulty,
      problem.topics,
      problem.number,
      problem.solvedAtMs,
    );
    changed = true;
  }

  if (!changed) return existing;

  saveSRSData(username, result);
  return result;
}

export function clearSRSData(username: string): void {
  const ls = getLocalStorage();
  if (!ls) return;
  ls.removeItem(getSRSStorageKey(username));
}

export function getSRSStorageSize(username: string): number {
  const ls = getLocalStorage();
  if (!ls) return 0;
  const raw = ls.getItem(getSRSStorageKey(username)) ?? '';
  return new Blob([raw]).size;
}
