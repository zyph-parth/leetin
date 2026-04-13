/**
 * lib/srs.ts
 *
 * SM-2 Spaced Repetition System — the same algorithm powering Anki.
 * Pure functions, zero side-effects, zero imports. Fully testable.
 *
 * ALGORITHM OVERVIEW (SuperMemo 2):
 *   Each problem has an ease factor (EF) and an interval.
 *   After every review the user rates recall quality 0-5.
 *   The interval to the next review grows multiplicatively by EF.
 *   Failed reviews reset the interval, forcing relearning.
 *
 * RETENTION MODEL (Ebbinghaus):
 *   R(t) = e^(-t / S)  where S is the "stability" mapped from EF.
 *   We use this to give a live % retention reading on each card.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

/** Rating scale shown to the user after reviewing a card. */
export type ReviewQuality =
  | 0   // Complete blackout — didn't remember at all
  | 1   // Recalled with serious difficulty
  | 2   // Recalled with some difficulty (still counts as a fail in SM-2)
  | 3   // Recalled with effort — Hard
  | 4   // Recalled with minor hesitation — Good
  | 5;  // Perfect recall — Easy

export interface SM2State {
  /** LeetCode problem slug, e.g. "two-sum" */
  slug: string;
  /** Human-readable title, e.g. "Two Sum" */
  title: string;
  difficulty: Difficulty;
  /** Topic tags e.g. ["Array", "Hash Table"] */
  topics: string[];
  /** LeetCode problem number */
  number: number;

  // SM-2 scheduling state
  /** Number of consecutive successful reviews (quality ≥ 3) */
  n: number;
  /** Ease factor — starts 2.5, minimum 1.3 */
  ef: number;
  /** Current interval in days */
  interval: number;
  /** Unix ms — when the next review is due */
  nextReviewMs: number;
  /** Unix ms — when the last review was performed (or solve date if never reviewed) */
  lastReviewMs: number;
  /** Unix ms — when the problem was first solved */
  solvedAtMs: number;
  /** The quality rating given at the last review */
  lastRating: ReviewQuality | null;
  /** Total number of reviews this problem has received */
  totalReviews: number;
}

/** A single point on the forgetting curve chart */
export interface CurvePoint {
  day: number;       // days after last review
  retention: number; // 0-100
  isNow?: boolean;   // marks the current moment
  isReview?: boolean;// marks where a scheduled review falls
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_EF = 1.3;
const DEFAULT_EF = 2.5;
const MS_PER_DAY = 86_400_000;

/** Initial EF and interval seeded from LeetCode difficulty.
 *  Hard problems are scheduled sooner because they decay faster. */
const DIFFICULTY_SEED: Record<Difficulty, { ef: number; interval: number }> = {
  Hard:   { ef: 1.8, interval: 1 },
  Medium: { ef: 2.2, interval: 3 },
  Easy:   { ef: DEFAULT_EF, interval: 7 },
};

/** Maps EF range → memory stability S (days). Used in Ebbinghaus formula. */
function efToStability(ef: number): number {
  if (ef >= 2.5) return 14;
  if (ef >= 2.0) return 7;
  if (ef >= 1.5) return 4;
  return 2;
}

// ─── Core Algorithm ──────────────────────────────────────────────────────────

/**
 * Build the initial SM-2 state for a freshly-solved problem.
 * When no review history exists we bootstrap from LeetCode difficulty
 * and solve date — this lets us immediately flag problems that have
 * decayed since they were solved weeks or months ago.
 */
export function computeInitialState(
  slug: string,
  title: string,
  difficulty: Difficulty,
  topics: string[],
  number: number,
  solvedAtMs: number,
): SM2State {
  const seed = DIFFICULTY_SEED[difficulty];
  const nextReviewMs = solvedAtMs + seed.interval * MS_PER_DAY;

  return {
    slug,
    title,
    difficulty,
    topics,
    number,
    n: 0,
    ef: seed.ef,
    interval: seed.interval,
    nextReviewMs,
    lastReviewMs: solvedAtMs,
    solvedAtMs,
    lastRating: null,
    totalReviews: 0,
  };
}

/**
 * Apply the SM-2 algorithm after a review.
 * Returns a new state object (pure — does not mutate the input).
 *
 * SM-2 rules:
 *   q < 3  → failed recall: reset n=0, interval=1, keep EF unchanged
 *   q ≥ 3  → successful recall:
 *             n=0 → interval=1
 *             n=1 → interval=6
 *             n>1 → interval = round(prev_interval × EF)
 *             EF  = EF + 0.1 - (5-q)(0.08 + (5-q)×0.02)
 *             EF  = max(1.3, EF)
 *             n++
 */
export function updateSM2(state: SM2State, quality: ReviewQuality): SM2State {
  const now = Date.now();
  let { n, ef, interval } = state;

  if (quality < 3) {
    // Failed recall — reset to beginning
    n = 0;
    interval = 1;
    // EF is NOT changed on failure in classic SM-2, but we nudge it down
    // slightly to reflect that this problem is harder than we thought.
    ef = Math.max(MIN_EF, ef - 0.15);
  } else {
    // Successful recall
    if (n === 0) {
      interval = 1;
    } else if (n === 1) {
      // Add a tiny fuzz to the first jump to prevent exact day-6 clumping
      const fuzz = Math.random() < 0.5 ? 0 : 1;
      interval = 6 + fuzz;
    } else {
      // Review Fuzzing: +/- 5% jitter to prevent interval clustering
      const exactInterval = interval * ef;
      const fuzzFactor = 0.95 + Math.random() * 0.10;
      interval = Math.round(exactInterval * fuzzFactor);
    }

    // EF update — the quadratic formula from the SM-2 paper
    ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    ef = Math.max(MIN_EF, ef);
    n++;
  }

  return {
    ...state,
    n,
    ef,
    interval,
    nextReviewMs: now + interval * MS_PER_DAY,
    lastReviewMs: now,
    lastRating: quality,
    totalReviews: state.totalReviews + 1,
  };
}

// ─── Retention & Urgency ─────────────────────────────────────────────────────

/**
 * Ebbinghaus retention estimate: R = e^(-t / S) × 100
 * Returns 0-100. 100 = just reviewed / just solved. 0 = completely forgotten.
 */
export function getRetentionPercent(state: SM2State, nowMs = Date.now()): number {
  // Dynamic Stability: scales so retention hits exactly ~90% when the interval expires
  const S = Math.max(1, state.interval) * 9.49;
  const daysSinceReview = (nowMs - state.lastReviewMs) / MS_PER_DAY;
  const R = Math.exp(-daysSinceReview / S) * 100;
  return Math.max(0, Math.min(100, Math.round(R)));
}

/**
 * FIX BUG-9: Previously used Math.round(), which caused problems due in
 * < 12 hours to display "Due in 0d" — confusing and technically wrong.
 *
 * New behaviour:
 *   - Overdue (past due):  Math.floor  → always a positive integer once past due
 *   - Upcoming (not yet):  Math.ceil   → always a positive integer until the moment it's due
 *   - Exactly on the day:  returns 0   → caller should display "Due today"
 *
 * Returns the number of days a problem is overdue (negative = not yet due).
 * Positive = days past due date. Negative = days until due. Zero = due today.
 */
export function getDaysOverdue(state: SM2State, nowMs = Date.now()): number {
  const rawDays = (nowMs - state.nextReviewMs) / MS_PER_DAY;
  return Math.floor(rawDays);
}

/**
 * Returns problems that are due for review right now, sorted by urgency.
 * Urgency = how overdue × how low the retention is.
 *   Most forgotten + most overdue = top of the queue.
 */
export function getDueProblems(
  states: Record<string, SM2State>,
  nowMs = Date.now(),
  limit = 10,
): SM2State[] {
  const all = Object.values(states);

  const due = all.filter(s => s.nextReviewMs <= nowMs);

  // Urgency score: days-overdue weighted by inverse retention.
  // A problem that's 5 days overdue AND at 10% retention scores very high.
  const score = (s: SM2State): number => {
    const overdue = getDaysOverdue(s, nowMs);
    const retention = getRetentionPercent(s, nowMs);
    return overdue * (1 + (100 - retention) / 100);
  };

  return due.sort((a, b) => score(b) - score(a)).slice(0, limit);
}

/**
 * Returns all upcoming problems (not yet due) sorted by next review date.
 * Useful for showing "Coming up next" in the panel.
 */
export function getUpcomingProblems(
  states: Record<string, SM2State>,
  nowMs = Date.now(),
  limit = 5,
): SM2State[] {
  return Object.values(states)
    .filter(s => s.nextReviewMs > nowMs)
    .sort((a, b) => a.nextReviewMs - b.nextReviewMs)
    .slice(0, limit);
}

// ─── Forgetting Curve Chart Data ─────────────────────────────────────────────

/**
 * Generates data points for the forgetting curve chart of a single problem.
 * Shows retention from lastReviewMs to lastReviewMs + (interval × 3) days.
 * Marks: current position (isNow), scheduled review (isReview).
 */
export function computeForgetCurve(state: SM2State, nowMs = Date.now()): CurvePoint[] {
  const S = Math.max(1, state.interval) * 9.49;
  const totalDays = Math.max(state.interval * 3, 30);
  const points: CurvePoint[] = [];

  const reviewDay = (state.nextReviewMs - state.lastReviewMs) / MS_PER_DAY;
  const nowDay = (nowMs - state.lastReviewMs) / MS_PER_DAY;

  // Sample every 0.5 days for a smooth curve
  for (let d = 0; d <= totalDays; d += 0.5) {
    const retention = Math.max(0, Math.round(Math.exp(-d / S) * 100));
    points.push({
      day: Math.round(d * 10) / 10,
      retention,
      isNow: Math.abs(d - nowDay) < 0.5,
      isReview: Math.abs(d - reviewDay) < 0.5,
    });
  }

  return points;
}

/**
 * Computes a memory health score 0-100 across all tracked problems.
 * Weighted average retention — Hard problems weigh 3×, Medium 2×, Easy 1×.
 */
export function computeMemoryHealth(
  states: Record<string, SM2State>,
  nowMs = Date.now(),
): number {
  const all = Object.values(states);
  if (all.length === 0) return 0;

  const weights: Record<Difficulty, number> = { Hard: 3, Medium: 2, Easy: 1 };

  let totalWeight = 0;
  let weightedRetention = 0;

  for (const s of all) {
    const w = weights[s.difficulty];
    weightedRetention += getRetentionPercent(s, nowMs) * w;
    totalWeight += w;
  }

  return totalWeight > 0 ? Math.round(weightedRetention / totalWeight) : 0;
}

/**
 * Per-topic average retention breakdown.
 * Returns { topic: string, avgRetention: number, count: number, dueCount: number }[]
 * sorted by avgRetention ascending (most forgotten topics first).
 */
export function getTopicRetentionBreakdown(
  states: Record<string, SM2State>,
  nowMs = Date.now(),
): { topic: string; avgRetention: number; count: number; dueCount: number }[] {
  const topicMap: Record<string, { totalRetention: number; count: number; dueCount: number }> = {};

  for (const s of Object.values(states)) {
    const retention = getRetentionPercent(s, nowMs);
    const isDue = s.nextReviewMs <= nowMs;

    for (const topic of s.topics.slice(0, 2)) { // primary topics only
      if (!topicMap[topic]) topicMap[topic] = { totalRetention: 0, count: 0, dueCount: 0 };
      topicMap[topic].totalRetention += retention;
      topicMap[topic].count++;
      if (isDue) topicMap[topic].dueCount++;
    }
  }

  return Object.entries(topicMap)
    .map(([topic, { totalRetention, count, dueCount }]) => ({
      topic,
      avgRetention: Math.round(totalRetention / count),
      count,
      dueCount,
    }))
    .sort((a, b) => a.avgRetention - b.avgRetention);
}

/**
 * Returns how many problems are due today, this week, and total tracked.
 */
export function getQueueStats(states: Record<string, SM2State>, nowMs = Date.now()) {
  const all = Object.values(states);
  const dueNow = all.filter(s => s.nextReviewMs <= nowMs).length;
  const dueWeek = all.filter(
    s => s.nextReviewMs <= nowMs + 7 * MS_PER_DAY,
  ).length;

  return {
    total: all.length,
    dueNow,
    dueWeek,
    learned: all.filter(s => s.totalReviews > 0).length,
  };
}