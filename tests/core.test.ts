import assert from 'node:assert/strict';

import { computeAnalytics, type Analytics } from '../lib/analytics';
import type { LeetCodeProfile } from '../lib/leetcode';
import { normalizeSubmissionCalendar } from '../lib/leetcode';
import { isLeetCodeProfile } from '../lib/profile-schema';
import { checkRateLimit, type RateLimitEntry } from '../lib/rate-limit';
import { computeInitialState, getDueProblems, updateSM2, type SM2State } from '../lib/srs';
import { getLeetCodeUsernameError, normalizeLeetCodeUsername } from '../lib/username';
import {
  generateMockInterview,
  toggleProblemCompletion,
  type MockInterview,
} from '../lib/mock-interview';

const MS_PER_DAY = 86_400_000;

function makeState(
  slug: string,
  overrides: Partial<SM2State> = {},
): SM2State {
  const base = computeInitialState(slug, slug, 'Medium', ['Array'], 1, 0);
  return {
    ...base,
    ...overrides,
    slug,
    title: overrides.title ?? slug,
  };
}

function makeAnalytics(): Analytics {
  return {
    weakTopics: [{ name: 'Array', level: 'Fundamental' }],
    recommendedProblems: [
      {
        title: 'Easy Drill',
        slug: 'easy-drill',
        difficulty: 'Easy',
        primaryTopic: 'Array',
        subpatterns: ['hash map'],
        companies: ['Google'],
        reason: 'Easy warm-up.',
        matchScore: 10,
      },
      {
        title: 'Medium Drill',
        slug: 'medium-drill',
        difficulty: 'Medium',
        primaryTopic: 'Array',
        subpatterns: ['two pointers'],
        companies: ['Google'],
        reason: 'Medium core.',
        matchScore: 20,
      },
      {
        title: 'Hard Drill',
        slug: 'hard-drill',
        difficulty: 'Hard',
        primaryTopic: 'Graph',
        subpatterns: ['dfs'],
        companies: ['Google'],
        reason: 'Hard stretch.',
        matchScore: 30,
      },
    ],
  } as Analytics;
}

function makeProfile(overrides: Partial<LeetCodeProfile> = {}): LeetCodeProfile {
  return {
    username: 'parth',
    realName: 'Parth',
    avatar: '',
    ranking: 0,
    totalSolved: 0,
    easySolved: 0,
    mediumSolved: 0,
    hardSolved: 0,
    totalQuestions: 0,
    easyTotal: 0,
    mediumTotal: 0,
    hardTotal: 0,
    acceptanceRate: 0,
    submissionCalendar: {},
    totalActiveDays: 0,
    maxStreak: 0,
    currentStreak: 0,
    recentSubmissions: [],
    tagStats: { advanced: [], intermediate: [], fundamental: [] },
    contestRating: 0,
    contestAttended: 0,
    contestGlobalRanking: 0,
    topPercentage: 0,
    badges: [],
    languageStats: [],
    ...overrides,
  };
}

function makeRecentSubmissions(accepted: number, rejected: number): LeetCodeProfile['recentSubmissions'] {
  return [
    ...Array.from({ length: accepted }, (_, index) => ({
      title: `Accepted ${index}`,
      titleSlug: `accepted-${index}`,
      timestamp: '1000',
      statusDisplay: 'Accepted',
      lang: 'typescript',
    })),
    ...Array.from({ length: rejected }, (_, index) => ({
      title: `Wrong ${index}`,
      titleSlug: `wrong-${index}`,
      timestamp: '1000',
      statusDisplay: 'Wrong Answer',
      lang: 'typescript',
    })),
  ];
}

function makeDailyCalendar(nowMs: number, days: number, countPerDay: number): Record<string, number> {
  const now = new Date(nowMs);
  return Object.fromEntries(
    Array.from({ length: days }, (_, index) => {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - index);
      return [String(Math.floor(day.getTime() / 1000)), countPerDay];
    }),
  );
}

const INTERVIEW_TAGS = [
  'Array',
  'String',
  'Tree',
  'Dynamic Programming',
  'Graph',
  'Binary Search',
  'Hash Table',
  'Linked List',
  'Queue',
  'Sorting',
  'Backtracking',
  'Recursion',
];

function makeTagStats(count: number): LeetCodeProfile['tagStats'] {
  return {
    advanced: INTERVIEW_TAGS.map((tagName) => ({
      tagName,
      tagSlug: tagName.toLowerCase().replace(/\s+/g, '-'),
      problemsSolved: count,
    })),
    intermediate: [],
    fundamental: [],
  };
}

function run(name: string, fn: () => void): void {
  fn();
  console.log(`PASS ${name}`);
}

run('bootstrap success keeps the seeded interval instead of shrinking it', () => {
  const initial = computeInitialState('two-sum', 'Two Sum', 'Easy', ['Array'], 1, 0);
  const updated = updateSM2(initial, 4, { nowMs: 10 * MS_PER_DAY, random: () => 0 });

  assert.equal(updated.interval, initial.interval);
  assert.equal(updated.n, 2);
  assert.equal(updated.lastRating, 4);
  assert.equal(updated.totalReviews, 1);
  assert.equal(updated.nextReviewMs, 10 * MS_PER_DAY + initial.interval * MS_PER_DAY);
});

run('due queue returns all due items by default', () => {
  const states = Object.fromEntries(
    Array.from({ length: 12 }, (_, index) => {
      const slug = `problem-${index}`;
      return [
        slug,
        makeState(slug, {
          difficulty: 'Medium',
          interval: 3,
          lastReviewMs: 0,
          nextReviewMs: -MS_PER_DAY,
        }),
      ];
    }),
  );

  assert.equal(getDueProblems(states, 0).length, 12);
});

run('mock interview completion stores incremental problem time', () => {
  const session: MockInterview = {
    id: 'session-1',
    username: 'parth',
    generatedAt: 0,
    targetCompany: 'Google',
    durationMs: 60_000,
    startedAt: null,
    accumulatedMs: 30_000,
    status: 'paused',
    problems: [
      {
        slug: 'p1',
        title: 'P1',
        difficulty: 'Easy',
        topic: 'Array',
        reason: 'Warm-up',
        leetcodeUrl: 'https://leetcode.com/problems/p1/',
        completed: true,
        timeSpentMs: 10_000,
      },
      {
        slug: 'p2',
        title: 'P2',
        difficulty: 'Medium',
        topic: 'Array',
        reason: 'Core',
        leetcodeUrl: 'https://leetcode.com/problems/p2/',
        completed: false,
        timeSpentMs: null,
      },
    ],
  };

  const updated = toggleProblemCompletion(session, 1, 30_000);

  assert.equal(updated.problems[1]?.completed, true);
  assert.equal(updated.problems[1]?.timeSpentMs, 20_000);
});

run('mock interview easy pick scans beyond the old top-10 due cap', () => {
  const dueStates = Object.fromEntries([
    ...Array.from({ length: 10 }, (_, index) => {
      const slug = `medium-${index}`;
      return [
        slug,
        makeState(slug, {
          difficulty: 'Medium',
          interval: 3,
          lastReviewMs: 0,
          nextReviewMs: -MS_PER_DAY,
        }),
      ];
    }),
    [
      'easy-target',
      makeState('easy-target', {
        difficulty: 'Easy',
        interval: 7,
        lastReviewMs: 0,
        nextReviewMs: -MS_PER_DAY,
        title: 'Easy Target',
      }),
    ],
  ]);

  const interview = generateMockInterview(
    makeAnalytics(),
    dueStates,
    'parth',
    'Google',
    60,
  );

  assert.equal(interview.problems[0]?.slug, 'easy-target');
});

run('username validation trims and rejects unsafe values', () => {
  assert.equal(normalizeLeetCodeUsername('  parth_123-  '), 'parth_123-');
  assert.equal(getLeetCodeUsernameError('  parth_123-  '), null);
  assert.match(getLeetCodeUsernameError('bad name') ?? '', /valid LeetCode username/);
  assert.match(getLeetCodeUsernameError('x'.repeat(31)) ?? '', /30 characters/);
});

run('rate limiter blocks after max requests and resets after window', () => {
  const store = new Map<string, RateLimitEntry>();
  const options = { windowMs: 1_000, maxRequests: 2 };

  assert.equal(checkRateLimit(store, 'ip', options, 0).limited, false);
  assert.equal(checkRateLimit(store, 'ip', options, 10).limited, false);
  const blocked = checkRateLimit(store, 'ip', options, 20);

  assert.equal(blocked.limited, true);
  assert.equal(blocked.retryAfterSec, 1);
  assert.equal(checkRateLimit(store, 'ip', options, 1_001).limited, false);
});

run('rate limiter prunes expired and excess entries', () => {
  const store = new Map<string, RateLimitEntry>([
    ['expired', { count: 1, resetAt: 10 }],
    ['old-live', { count: 1, resetAt: 100 }],
    ['new-live', { count: 1, resetAt: 200 }],
  ]);

  checkRateLimit(store, 'fresh', { windowMs: 1_000, maxRequests: 3, maxEntries: 2 }, 50);

  assert.equal(store.has('expired'), false);
  assert.equal(store.size, 2);
});

run('submission calendar normalization drops invalid entries and aggregates timestamps', () => {
  const normalized = normalizeSubmissionCalendar({
    '1700000000': 2,
    '1700000000.9': 3,
    nope: 9,
    '1700001000': -1,
  });

  assert.deepEqual(normalized, { '1700000000': 5 });
});

run('profile runtime guard accepts shaped profiles and rejects partial payloads', () => {
  assert.equal(isLeetCodeProfile(makeProfile()), true);
  assert.equal(isLeetCodeProfile({ username: 'parth' }), false);
});

run('due queue sorts due-today cards by retention urgency', () => {
  const nowMs = 30 * MS_PER_DAY;
  const fresh = makeState('fresh', {
    interval: 7,
    lastReviewMs: nowMs,
    nextReviewMs: nowMs,
  });
  const fading = makeState('fading', {
    interval: 1,
    lastReviewMs: 0,
    nextReviewMs: nowMs,
  });

  const due = getDueProblems({ fresh, fading }, nowMs);

  assert.equal(due[0]?.slug, 'fading');
});

run('analytics uses accepted velocity for volume estimates', () => {
  const nowMs = Date.UTC(2026, 0, 15);
  const analytics = computeAnalytics(
    makeProfile({
      totalSolved: 365,
      easySolved: 100,
      mediumSolved: 220,
      hardSolved: 45,
      acceptanceRate: 50,
      submissionCalendar: makeDailyCalendar(nowMs, 90, 1),
      recentSubmissions: makeRecentSubmissions(5, 5),
    }),
    { nowMs },
  );

  assert.equal(analytics.weeklySubmissionsAvg, 7);
  assert.equal(analytics.weeklyAcceptedSubmissionsEstimate, 3.5);
  assert.equal(analytics.estimatedWeeksToVolumeTarget, 10);
});

run('analytics keeps difficulty percentages balanced and company topics family-aware', () => {
  const analytics = computeAnalytics(
    makeProfile({
      totalSolved: 24,
      easySolved: 8,
      mediumSolved: 8,
      hardSolved: 8,
      tagStats: {
        advanced: [
          { tagName: 'Graph', tagSlug: 'graph', problemsSolved: 8 },
          { tagName: 'Depth-First Search', tagSlug: 'depth-first-search', problemsSolved: 8 },
          { tagName: 'Breadth-First Search', tagSlug: 'breadth-first-search', problemsSolved: 8 },
        ],
        intermediate: [],
        fundamental: [
          { tagName: 'Array', tagSlug: 'array', problemsSolved: 8 },
        ],
      },
    }),
  );

  const parts = analytics.difficultyRatio.match(/\d+/g)?.map(Number) ?? [];
  const google = analytics.companyReadiness.find((company) => company.company === 'Google');

  assert.equal(parts.reduce((sum, part) => sum + part, 0), 100);
  assert.equal(analytics.topicDiversity, 7);
  assert.equal(google?.readinessScore, 24);
  assert.deepEqual(google?.topTopics.sort(), ['Array', 'Graph']);
  assert.equal(google?.missingTopics[0], 'Dynamic Programming');
  assert.ok(google?.prepSignals.some((signal) => signal.label === 'Scalable design'));
});

run('company readiness is weighted by researched company emphasis', () => {
  const analytics = computeAnalytics(
    makeProfile({
      totalSolved: 27,
      easySolved: 9,
      mediumSolved: 15,
      hardSolved: 3,
      tagStats: {
        advanced: [],
        intermediate: [
          { tagName: 'Hash Table', tagSlug: 'hash-table', problemsSolved: 9 },
        ],
        fundamental: [
          { tagName: 'Array', tagSlug: 'array', problemsSolved: 9 },
          { tagName: 'String', tagSlug: 'string', problemsSolved: 9 },
        ],
      },
    }),
  );

  const meta = analytics.companyReadiness.find((company) => company.company === 'Meta');
  const google = analytics.companyReadiness.find((company) => company.company === 'Google');

  assert.equal(analytics.bestCompanyMatch, 'Meta');
  assert.ok((meta?.readinessScore ?? 0) > (google?.readinessScore ?? 0));
  assert.ok(meta?.topTopics.includes('Hash Table'));
});

run('company readiness includes finance and consulting targets', () => {
  const analytics = computeAnalytics(
    makeProfile({
      totalSolved: 36,
      easySolved: 12,
      mediumSolved: 20,
      hardSolved: 4,
      tagStats: {
        advanced: [
          { tagName: 'Binary Search', tagSlug: 'binary-search', problemsSolved: 8 },
        ],
        intermediate: [
          { tagName: 'Hash Table', tagSlug: 'hash-table', problemsSolved: 8 },
        ],
        fundamental: [
          { tagName: 'Array', tagSlug: 'array', problemsSolved: 10 },
          { tagName: 'String', tagSlug: 'string', problemsSolved: 10 },
        ],
      },
    }),
    { targetCompany: 'JPMorgan Chase' },
  );

  const jpmorgan = analytics.companyReadiness.find((company) => company.company === 'JPMorgan Chase');
  const deloitte = analytics.companyReadiness.find((company) => company.company === 'Deloitte');
  const goldman = analytics.companyReadiness.find((company) => company.company === 'Goldman Sachs');

  assert.equal(analytics.selectedCompany, 'JPMorgan Chase');
  assert.ok(jpmorgan);
  assert.ok(deloitte);
  assert.ok(goldman);
  assert.ok(jpmorgan?.prepSignals.some((signal) => signal.label === 'Finance domain'));
  assert.ok(analytics.recommendedProblems.some((problem) => problem.companies.includes('JPMorgan Chase')));
});

run('readiness is capped when hard-depth signal is weak despite high volume', () => {
  const nowMs = Date.UTC(2026, 0, 15);
  const analytics = computeAnalytics(
    makeProfile({
      totalSolved: 500,
      easySolved: 430,
      mediumSolved: 65,
      hardSolved: 5,
      acceptanceRate: 80,
      contestAttended: 5,
      submissionCalendar: makeDailyCalendar(nowMs, 90, 2),
      recentSubmissions: makeRecentSubmissions(25, 0),
      tagStats: makeTagStats(12),
    }),
    { nowMs },
  );

  assert.ok(analytics.interviewReadiness <= 62);
  assert.notEqual(analytics.verdictLabel, 'Interview Ready');
  assert.ok(analytics.gaps.some((gap) => /hard problem/i.test(gap.label)));
});

run('readiness is capped when tracked memory retention is weak', () => {
  const nowMs = 120 * MS_PER_DAY;
  const staleHard = makeState('stale-hard', {
    difficulty: 'Hard',
    topics: ['Dynamic Programming'],
    interval: 1,
    lastReviewMs: 0,
    nextReviewMs: MS_PER_DAY,
  });
  const analytics = computeAnalytics(
    makeProfile({
      totalSolved: 520,
      easySolved: 120,
      mediumSolved: 310,
      hardSolved: 90,
      acceptanceRate: 85,
      contestAttended: 5,
      submissionCalendar: makeDailyCalendar(nowMs, 90, 2),
      recentSubmissions: makeRecentSubmissions(25, 0),
      tagStats: makeTagStats(12),
    }),
    {
      nowMs,
      srsStates: { [staleHard.slug]: staleHard },
    },
  );

  assert.ok(analytics.interviewReadiness <= 72);
  assert.ok(analytics.gaps.some((gap) => /memory/i.test(gap.label)));
});

run('readiness confidence reflects thin versus rich evidence', () => {
  const nowMs = Date.UTC(2026, 0, 15);
  const thin = computeAnalytics(makeProfile({ totalSolved: 20, easySolved: 10, mediumSolved: 10 }), { nowMs });
  const rich = computeAnalytics(
    makeProfile({
      totalSolved: 520,
      easySolved: 120,
      mediumSolved: 310,
      hardSolved: 90,
      acceptanceRate: 85,
      contestAttended: 5,
      submissionCalendar: makeDailyCalendar(nowMs, 90, 2),
      recentSubmissions: makeRecentSubmissions(25, 0),
      tagStats: makeTagStats(12),
    }),
    {
      nowMs,
      srsStates: Object.fromEntries(
        Array.from({ length: 20 }, (_, index) => {
          const slug = `fresh-${index}`;
          return [slug, makeState(slug, { lastReviewMs: nowMs, nextReviewMs: nowMs + MS_PER_DAY })];
        }),
      ),
    },
  );

  assert.equal(thin.readinessConfidence, 'low');
  assert.equal(rich.readinessConfidence, 'high');
});
