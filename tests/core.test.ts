import assert from 'node:assert/strict';

import type { Analytics } from '../lib/analytics';
import { computeInitialState, getDueProblems, updateSM2, type SM2State } from '../lib/srs';
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
