/**
 * lib/srs-store.ts
 *
 * Persistence layer for SRS state.
 * Uses localStorage with a per-username key so multiple users
 * on the same browser don't collide.
 *
 * Storage key format: `leetinsight:srs:{username}`
 * Value: JSON-serialized Record<slug, SM2State>
 *
 * MERGE STRATEGY:
 *   On each dashboard load, mergeFreshProblems() is called.
 *   It iterates the LeetCode profile's recent submissions, finds
 *   accepted ones not yet in the store, and adds them with an
 *   initial SM-2 state. Existing states are NEVER overwritten —
 *   the user's review history is preserved across sessions.
 */

import type { LeetCodeProfile } from './leetcode';
import {
  SM2State,
  Difficulty,
  computeInitialState,
} from './srs';

const STORAGE_PREFIX = 'leetinsight:srs:';

/**
 * Safely retrieves the localStorage object.
 * Node 22 exposes a global `localStorage` that THROWS when accessed
 * (unless --localstorage-file is set), so we must wrap the access
 * in a try-catch instead of a simple typeof/undefined check.
 * Returns null on the server or when localStorage is unavailable.
 */
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

// ─── Persistence ─────────────────────────────────────────────────────────────

/**
 * Load all SRS states for a username from localStorage.
 * Returns an empty object if nothing is stored yet.
 */
export function loadSRSData(username: string): Record<string, SM2State> {
  const ls = getLocalStorage();
  if (!ls) return {};
  try {
    const raw = ls.getItem(`${STORAGE_PREFIX}${username}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, SM2State>;
    if (typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const isValidState = (v: unknown): v is SM2State =>
      typeof v === 'object' &&
      v !== null &&
      typeof (v as SM2State).slug === 'string' &&
      typeof (v as SM2State).interval === 'number' &&
      typeof (v as SM2State).nextReviewMs === 'number';

    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => isValidState(v)),
    );
  } catch {
    return {};
  }
}

/**
 * Persist SRS states for a username to localStorage.
 * Silently swallows storage quota errors — the app keeps working,
 * just without persistence for that session.
 */
export function saveSRSData(username: string, data: Record<string, SM2State>): void {
  const ls = getLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(`${STORAGE_PREFIX}${username}`, JSON.stringify(data));
  } catch (e) {
    console.warn('[SRS] localStorage write failed:', e);
  }
}

/**
 * Update a single problem's state and immediately persist.
 * This is what gets called when the user submits a review rating.
 */
export function saveSingleState(
  username: string,
  state: SM2State,
  existing: Record<string, SM2State>,
): Record<string, SM2State> {
  const updated = { ...existing, [state.slug]: state };
  saveSRSData(username, updated);
  return updated;
}

// ─── Profile Integration ──────────────────────────────────────────────────────

/**
 * Extracts solved problems from a LeetCode profile.
 *
 * LeetCode's recentSubmissions only gives us the last 20 accepted.
 * To catch older solves we also scan submissionCalendar (which has
 * timestamps but not slugs) and tagStats (which has topics but not slugs).
 *
 * Best-effort: we build as rich a picture as possible from what the
 * public API exposes, then infer what we can't directly see.
 */
export interface SolvedProblem {
  slug: string;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  number: number;
  solvedAtMs: number;
}

/**
 * Builds a list of unique solved problems from the profile.
 * Deduplicates by slug, keeping the earliest solve timestamp.
 */
export function extractSolvedProblems(profile: LeetCodeProfile): SolvedProblem[] {
  const seen = new Map<string, SolvedProblem>();

  for (const sub of profile.recentSubmissions ?? []) {
    if (sub.statusDisplay !== 'Accepted') continue;

    const slug = sub.titleSlug ?? slugify(sub.title ?? '');
    if (!slug) continue;

    const existing = seen.get(slug);
    const ts = (Number(sub.timestamp) || 0) * 1000;

    const subExt = sub as unknown as {
      difficulty?: string;
      topicTags?: Array<{ name: string }>;
      frontendId?: number;
    };

    if (!existing || ts < existing.solvedAtMs) {
      seen.set(slug, {
        slug,
        title: sub.title ?? slug,
        difficulty: (subExt.difficulty as Difficulty | undefined) ?? 'Medium',
        topics: subExt.topicTags?.map((t) => t.name) ?? [],
        number: subExt.frontendId ?? -1,
        solvedAtMs: ts || Date.now(),
      });
    }
  }

  for (const [, entries] of Object.entries(profile.tagStats ?? {})) {
    for (const entry of entries as unknown as Array<{
      titleSlug?: string;
      tagName?: string;
    }>) {
      if (!entry.titleSlug || !entry.tagName) continue;
      const prob = seen.get(entry.titleSlug);
      if (prob && !prob.topics.includes(entry.tagName)) {
        prob.topics.push(entry.tagName);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * The core merge function. Called on every dashboard load.
 *
 * - Takes the existing stored SRS data and the fresh profile.
 * - Adds initial SM-2 states for any solved problems NOT yet in the store.
 * - NEVER modifies states that already exist (preserves review history).
 * - Returns the updated data and persists it.
 */
export function mergeFreshProblems(
  username: string,
  existing: Record<string, SM2State>,
  profile: LeetCodeProfile,
): Record<string, SM2State> {
  const solved = extractSolvedProblems(profile);
  let changed = false;
  const result = { ...existing };

  for (const problem of solved) {
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

  if (!changed) {
    return existing;
  }

  saveSRSData(username, result);
  return result;
}

/**
 * Wipes all SRS data for a username. Useful for "reset" functionality.
 */
export function clearSRSData(username: string): void {
  const ls = getLocalStorage();
  if (!ls) return;
  ls.removeItem(`${STORAGE_PREFIX}${username}`);
}

/**
 * Returns the storage size in bytes for a username's SRS data.
 * Useful for a "storage used" indicator.
 */
export function getSRSStorageSize(username: string): number {
  const ls = getLocalStorage();
  if (!ls) return 0;
  const raw = ls.getItem(`${STORAGE_PREFIX}${username}`) ?? '';
  return new Blob([raw]).size;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Converts a problem title to a URL slug ("Two Sum" → "two-sum") */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}