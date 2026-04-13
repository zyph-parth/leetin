import { LeetCodeProfile } from './leetcode';
import { getTopicRetentionBreakdown, SM2State } from './srs';

export type PersonalityType =
  | 'The Sniper'
  | 'The Sprinter'
  | 'The Grinder'
  | 'The Explorer'
  | 'The Architect';
export type BurnoutLevel = 'low' | 'medium' | 'high';
export type ProgressionHealth = 'healthy' | 'stagnant' | 'regressing';
export type VerdictLabel = 'Interview Ready' | 'Almost There' | 'On Track' | 'Keep Building';

export interface Gap {
  label: string;
  detail: string;
  priority: 'critical' | 'high' | 'medium';
}

export interface CompanyReadiness {
  company: string;
  logo: string;
  readinessScore: number;
  topTopics: string[];
  missingTopics: string[];
  recommendation: string;
}

export interface NextProblemSuggestion {
  reason: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: string[];
  explanation: string;
}

export interface RecommendedProblem {
  title: string;
  slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  primaryTopic: string;
  subpatterns: string[];
  companies: string[];
  reason: string;
  matchScore: number;
}

export interface TopicDeepDive {
  topic: string;
  level: string;
  solvedCount: number;
  readinessScore: number;
  retentionScore: number | null;
  dueCount: number;
  weakSubpatterns: string[];
  strongSignals: string[];
  recommendedProblems: RecommendedProblem[];
  summary: string;
}

export interface Analytics {
  solverPersonality: PersonalityType;
  personalityEmoji: string;
  personalityDesc: string;
  personalityTraits: string[];
  consistencyScore: number;
  consistencyBreakdown: { label: string; score: number; max: number }[];
  interviewReadiness: number;
  readinessBreakdown: { label: string; score: number; max: number; note: string }[];
  burnoutRisk: BurnoutLevel;
  burnoutNote: string;
  plateauDetected: boolean;
  plateauNote: string;
  peakDay: string;
  weeklyAvg: number;
  dailyAvgOnActiveDays: number;
  progressionHealth: ProgressionHealth;
  progressionNote: string;
  estimatedWeeksToReady: number;
  recentAcceptanceRate: number;
  hardAttemptRate: number;
  strengthTopics: { name: string; count: number; level: string }[];
  weakTopics: { name: string; level: string }[];
  topicDiversity: number;
  difficultyRatio: string;
  solveVelocityTrend: 'increasing' | 'stable' | 'decreasing';
  companyReadiness: CompanyReadiness[];
  nextProblemSuggestion: NextProblemSuggestion;
  weeklyData: { week: string; count: number }[];
  verdictLabel: VerdictLabel;
  verdictStory: string;
  gaps: Gap[];
  bestCompanyMatch: string;
  bestCompanyScore: number;
  availableCompanies: string[];
  selectedCompany: string;
  recommendedProblems: RecommendedProblem[];
  deepDiveTopics: TopicDeepDive[];
}

interface AnalyticsOptions {
  srsStates?: Record<string, SM2State>;
  targetCompany?: string;
}

interface TopicCatalogEntry {
  title: string;
  slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
  subpatterns: string[];
  companies: string[];
}

const COMPANY_TOPICS: Record<string, { topics: string[]; logo: string }> = {
  Google: {
    logo: 'G',
    topics: ['Dynamic Programming', 'Graph', 'Tree', 'Binary Search', 'Depth-First Search', 'Breadth-First Search', 'String', 'Array'],
  },
  Meta: {
    logo: 'M',
    topics: ['Array', 'String', 'Tree', 'Dynamic Programming', 'Hash Table', 'Linked List', 'Graph', 'Recursion'],
  },
  Amazon: {
    logo: 'A',
    topics: ['Array', 'Tree', 'Dynamic Programming', 'String', 'Graph', 'Queue', 'Hash Table', 'Sorting'],
  },
  Microsoft: {
    logo: 'MS',
    topics: ['Tree', 'Linked List', 'Dynamic Programming', 'Array', 'String', 'Graph', 'Backtracking'],
  },
};

const TOPIC_SUBPATTERNS: Record<string, string[]> = {
  'Dynamic Programming': ['1D state transitions', 'knapsack style choices', 'grid DP', 'subsequence DP', 'interval DP'],
  Graph: ['BFS shortest paths', 'DFS traversal', 'topological ordering', 'union-find connectivity', 'weighted path reasoning'],
  Tree: ['tree DFS', 'lowest common ancestor', 'tree DP', 'BST invariants', 'path aggregation'],
  Array: ['two pointers', 'prefix sums', 'greedy scans', 'sorting with invariants', 'hashing for complements'],
  String: ['sliding window', 'frequency maps', 'palindrome expansion', 'state machine parsing', 'prefix-function style matching'],
  'Binary Search': ['answer search', 'boundary search', 'rotated arrays', 'search on monotonic functions'],
  'Hash Table': ['complement lookup', 'frequency counting', 'grouping', 'prefix hash tricks'],
  'Linked List': ['pointer rewiring', 'fast slow pointers', 'cycle detection', 'k-group manipulation'],
  Queue: ['monotonic queue', 'level-order batching', 'window scheduling'],
  Backtracking: ['decision trees', 'pruning', 'state restoration', 'subset generation'],
  Sorting: ['custom comparator logic', 'bucket ordering', 'interval merging'],
  Recursion: ['divide and conquer', 'post-order state returns', 'recursive decomposition'],
  'Depth-First Search': ['recursive traversal', 'backtracking state', 'component traversal'],
  'Breadth-First Search': ['multi-source BFS', 'level expansion', 'queue state modelling'],
};

const PROBLEM_CATALOG: TopicCatalogEntry[] = [
  {
    title: 'Climbing Stairs',
    slug: 'climbing-stairs',
    difficulty: 'Easy',
    topic: 'Dynamic Programming',
    subpatterns: ['1D state transitions'],
    companies: ['Google', 'Amazon', 'Microsoft'],
  },
  {
    title: 'House Robber',
    slug: 'house-robber',
    difficulty: 'Medium',
    topic: 'Dynamic Programming',
    subpatterns: ['1D state transitions', 'knapsack style choices'],
    companies: ['Meta', 'Amazon', 'Microsoft'],
  },
  {
    title: 'Coin Change',
    slug: 'coin-change',
    difficulty: 'Medium',
    topic: 'Dynamic Programming',
    subpatterns: ['knapsack style choices'],
    companies: ['Google', 'Meta', 'Amazon'],
  },
  {
    title: 'Longest Increasing Subsequence',
    slug: 'longest-increasing-subsequence',
    difficulty: 'Medium',
    topic: 'Dynamic Programming',
    subpatterns: ['subsequence DP', 'binary search'],
    companies: ['Google', 'Meta', 'Microsoft'],
  },
  {
    title: 'Edit Distance',
    slug: 'edit-distance',
    difficulty: 'Hard',
    topic: 'Dynamic Programming',
    subpatterns: ['grid DP', 'subsequence DP'],
    companies: ['Google', 'Meta'],
  },
  {
    title: 'Number of Islands',
    slug: 'number-of-islands',
    difficulty: 'Medium',
    topic: 'Graph',
    subpatterns: ['DFS traversal', 'component traversal'],
    companies: ['Amazon', 'Meta', 'Microsoft'],
  },
  {
    title: 'Course Schedule',
    slug: 'course-schedule',
    difficulty: 'Medium',
    topic: 'Graph',
    subpatterns: ['topological ordering'],
    companies: ['Google', 'Meta', 'Amazon'],
  },
  {
    title: 'Clone Graph',
    slug: 'clone-graph',
    difficulty: 'Medium',
    topic: 'Graph',
    subpatterns: ['BFS shortest paths', 'DFS traversal'],
    companies: ['Meta', 'Amazon'],
  },
  {
    title: 'Network Delay Time',
    slug: 'network-delay-time',
    difficulty: 'Medium',
    topic: 'Graph',
    subpatterns: ['weighted path reasoning'],
    companies: ['Google', 'Microsoft'],
  },
  {
    title: 'Redundant Connection',
    slug: 'redundant-connection',
    difficulty: 'Medium',
    topic: 'Graph',
    subpatterns: ['union-find connectivity'],
    companies: ['Amazon', 'Google'],
  },
  {
    title: 'Binary Tree Level Order Traversal',
    slug: 'binary-tree-level-order-traversal',
    difficulty: 'Medium',
    topic: 'Tree',
    subpatterns: ['level-order batching'],
    companies: ['Amazon', 'Meta', 'Microsoft'],
  },
  {
    title: 'Validate Binary Search Tree',
    slug: 'validate-binary-search-tree',
    difficulty: 'Medium',
    topic: 'Tree',
    subpatterns: ['BST invariants'],
    companies: ['Google', 'Meta'],
  },
  {
    title: 'Lowest Common Ancestor of a Binary Tree',
    slug: 'lowest-common-ancestor-of-a-binary-tree',
    difficulty: 'Medium',
    topic: 'Tree',
    subpatterns: ['lowest common ancestor', 'tree DFS'],
    companies: ['Meta', 'Amazon', 'Microsoft'],
  },
  {
    title: 'Binary Tree Maximum Path Sum',
    slug: 'binary-tree-maximum-path-sum',
    difficulty: 'Hard',
    topic: 'Tree',
    subpatterns: ['tree DP', 'path aggregation'],
    companies: ['Google', 'Meta'],
  },
  {
    title: 'Two Sum',
    slug: 'two-sum',
    difficulty: 'Easy',
    topic: 'Array',
    subpatterns: ['hashing for complements'],
    companies: ['Amazon', 'Meta', 'Microsoft'],
  },
  {
    title: 'Product of Array Except Self',
    slug: 'product-of-array-except-self',
    difficulty: 'Medium',
    topic: 'Array',
    subpatterns: ['prefix sums'],
    companies: ['Meta', 'Amazon'],
  },
  {
    title: 'Trapping Rain Water',
    slug: 'trapping-rain-water',
    difficulty: 'Hard',
    topic: 'Array',
    subpatterns: ['two pointers'],
    companies: ['Google', 'Meta', 'Amazon'],
  },
  {
    title: 'Sliding Window Maximum',
    slug: 'sliding-window-maximum',
    difficulty: 'Hard',
    topic: 'Queue',
    subpatterns: ['monotonic queue', 'window scheduling'],
    companies: ['Google', 'Amazon'],
  },
  {
    title: 'Longest Substring Without Repeating Characters',
    slug: 'longest-substring-without-repeating-characters',
    difficulty: 'Medium',
    topic: 'String',
    subpatterns: ['sliding window', 'frequency maps'],
    companies: ['Amazon', 'Meta', 'Google'],
  },
  {
    title: 'Group Anagrams',
    slug: 'group-anagrams',
    difficulty: 'Medium',
    topic: 'Hash Table',
    subpatterns: ['grouping', 'frequency counting'],
    companies: ['Meta', 'Amazon'],
  },
  {
    title: 'Minimum Window Substring',
    slug: 'minimum-window-substring',
    difficulty: 'Hard',
    topic: 'String',
    subpatterns: ['sliding window', 'frequency maps'],
    companies: ['Meta', 'Google'],
  },
  {
    title: 'Search in Rotated Sorted Array',
    slug: 'search-in-rotated-sorted-array',
    difficulty: 'Medium',
    topic: 'Binary Search',
    subpatterns: ['rotated arrays', 'boundary search'],
    companies: ['Amazon', 'Microsoft'],
  },
  {
    title: 'Koko Eating Bananas',
    slug: 'koko-eating-bananas',
    difficulty: 'Medium',
    topic: 'Binary Search',
    subpatterns: ['answer search'],
    companies: ['Google', 'Amazon'],
  },
  {
    title: 'Merge k Sorted Lists',
    slug: 'merge-k-sorted-lists',
    difficulty: 'Hard',
    topic: 'Linked List',
    subpatterns: ['pointer rewiring', 'divide and conquer'],
    companies: ['Google', 'Meta', 'Amazon'],
  },
  {
    title: 'Reverse Nodes in k-Group',
    slug: 'reverse-nodes-in-k-group',
    difficulty: 'Hard',
    topic: 'Linked List',
    subpatterns: ['k-group manipulation', 'pointer rewiring'],
    companies: ['Meta', 'Microsoft'],
  },
  {
    title: 'Subsets',
    slug: 'subsets',
    difficulty: 'Medium',
    topic: 'Backtracking',
    subpatterns: ['decision trees', 'subset generation'],
    companies: ['Amazon', 'Meta'],
  },
  {
    title: 'Word Search',
    slug: 'word-search',
    difficulty: 'Medium',
    topic: 'Backtracking',
    subpatterns: ['state restoration', 'pruning'],
    companies: ['Amazon', 'Microsoft'],
  },
];

function getTopicFamily(topic: string): string {
  if (topic === 'Depth-First Search' || topic === 'Breadth-First Search') return 'Graph';
  return topic;
}

export function computeAnalytics(profile: LeetCodeProfile, options: AnalyticsOptions = {}): Analytics {
  const { srsStates = {}, targetCompany } = options;
  const cal = profile.submissionCalendar ?? {};

  const getNDays = (n: number): number[] => {
    const result: number[] = new Array(n).fill(0);
    const history = new Map<string, number>();
    
    // Bucket Leetcode's timestamps by local YYYY-MM-DD
    // This entirely avoids timezone/UTC mismatching issues
    Object.entries(cal).forEach(([ts, count]) => {
      const d = new Date(parseInt(ts, 10) * 1000);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      history.set(key, (history.get(key) ?? 0) + count);
    });

    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86_400_000);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      result[n - 1 - i] = history.get(key) ?? 0;
    }
    return result;
  };

  const last90 = getNDays(90);
  const last30 = last90.slice(-30);
  const prev30 = last90.slice(0, 30);
  const last7 = last90.slice(-7);
  const prev7 = last90.slice(-14, -7);

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const activeDays90 = last90.filter((d) => d > 0).length;
  const totalSubs90 = sum(last90);
  const weeklyAvg = Math.round(totalSubs90 / 13);
  const dailyAvgOnActiveDays = activeDays90 > 0 ? Math.round(totalSubs90 / activeDays90) : 0;

  let maxStreak90 = 0;
  let curStreak = 0;
  for (const day of last90) {
    curStreak = day > 0 ? curStreak + 1 : 0;
    maxStreak90 = Math.max(maxStreak90, curStreak);
  }

  const activityScore = Math.round((activeDays90 / 90) * 40);
  const streakScore = Math.min(30, Math.round((maxStreak90 / 30) * 30));
  const intensityScore = Math.min(20, Math.round((Math.min(dailyAvgOnActiveDays, 5) / 5) * 20));
  const recencyScore = sum(last7) > 0 ? 10 : 0;
  const consistencyScore = activityScore + streakScore + intensityScore + recencyScore;

  const consistencyBreakdown = [
    { label: 'Activity (active days)', score: activityScore, max: 40 },
    { label: 'Streak quality', score: streakScore, max: 30 },
    { label: 'Daily intensity', score: intensityScore, max: 20 },
    { label: 'Recent activity', score: recencyScore, max: 10 },
  ];

  const allTopics = [
    ...(profile.tagStats?.advanced ?? []).map((t) => ({ ...t, level: 'Advanced' })),
    ...(profile.tagStats?.intermediate ?? []).map((t) => ({ ...t, level: 'Intermediate' })),
    ...(profile.tagStats?.fundamental ?? []).map((t) => ({ ...t, level: 'Fundamental' })),
  ];

  const topicDiversity = Math.min(100, Math.round((allTopics.filter((t) => t.problemsSolved > 0).length / 30) * 100));

  const strengthTopics = allTopics
    .filter((t) => t.problemsSolved >= 5)
    .sort((a, b) => b.problemsSolved - a.problemsSolved)
    .slice(0, 8)
    .map((t) => ({ name: t.tagName, count: t.problemsSolved, level: t.level }));

  const weakTopics = allTopics
    .filter((t) => t.problemsSolved > 0 && t.problemsSolved < 5)
    .sort((a, b) => a.problemsSolved - b.problemsSolved)
    .slice(0, 6)
    .map((t) => ({ name: t.tagName, level: t.level }));

  const solvedScore = Math.min(35, Math.round((profile.totalSolved / 400) * 35));
  const hardScore = Math.min(20, Math.round((profile.hardSolved / 60) * 20));
  const topicScore = Math.min(20, Math.round((topicDiversity / 100) * 20));
  const consistBonus = Math.min(15, Math.round((consistencyScore / 100) * 15));
  const contestScore = Math.min(10, Math.round((profile.contestAttended / 5) * 10));
  const interviewReadiness = solvedScore + hardScore + topicScore + consistBonus + contestScore;

  const readinessBreakdown = [
    { label: 'Problems solved', score: solvedScore, max: 35, note: `${profile.totalSolved}/400 target` },
    { label: 'Hard problems', score: hardScore, max: 20, note: `${profile.hardSolved}/60 target` },
    { label: 'Topic coverage', score: topicScore, max: 20, note: `${topicDiversity}% diversity` },
    { label: 'Consistency', score: consistBonus, max: 15, note: `${consistencyScore}/100 score` },
    { label: 'Contest experience', score: contestScore, max: 10, note: `${profile.contestAttended} contests` },
  ];

  const last7sum = sum(last7);
  const prev7sum = sum(prev7);
  let burnoutRisk: BurnoutLevel = 'low';
  let burnoutNote = '';
  if (last7sum > 25 && prev7sum > 20) {
    burnoutRisk = 'high';
    burnoutNote = `${last7sum} submissions this week after ${prev7sum} last week. That's intense - schedule recovery days.`;
  } else if (last7sum > 14) {
    burnoutRisk = 'medium';
    burnoutNote = `${last7sum} submissions this week. Good momentum - pace yourself for the long run.`;
  } else {
    burnoutRisk = 'low';
    burnoutNote = last7sum === 0
      ? 'No submissions this week. Even 1 problem a day compounds massively over time.'
      : `${last7sum} submissions this week. Healthy pace - keep showing up.`;
  }

  const plateauDetected = sum(last30) > 5 && Math.abs(sum(last30) - sum(prev30)) < sum(prev30) * 0.15;
  const plateauNote = plateauDetected
    ? 'Your solve rate has been nearly identical for 60 days. Try a harder difficulty or new topic to break through.'
    : '';

  const dayTotals = new Array(7).fill(0);
  Object.entries(cal).forEach(([ts, count]) => {
    const d = new Date(parseInt(ts, 10) * 1000);
    dayTotals[d.getUTCDay()] += count;
  });
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const peakDay = dayNames[dayTotals.indexOf(Math.max(...dayTotals))];

  const l30 = sum(last30);
  const p30 = sum(prev30);
  const solveVelocityTrend: Analytics['solveVelocityTrend'] =
    l30 > p30 * 1.15 ? 'increasing' : l30 < p30 * 0.85 ? 'decreasing' : 'stable';

  const totalSolvedByDifficulty = profile.easySolved + profile.mediumSolved + profile.hardSolved;
  const easyPct = totalSolvedByDifficulty > 0 ? Math.round((profile.easySolved / totalSolvedByDifficulty) * 100) : 0;
  const medPct = totalSolvedByDifficulty > 0 ? Math.round((profile.mediumSolved / totalSolvedByDifficulty) * 100) : 0;
  const hardPct = totalSolvedByDifficulty > 0 ? Math.round((profile.hardSolved / totalSolvedByDifficulty) * 100) : 0;
  const difficultyRatio = `${easyPct}% Easy | ${medPct}% Medium | ${hardPct}% Hard`;

  let progressionHealth: ProgressionHealth = 'stagnant';
  let progressionNote = '';
  if (hardPct >= 15 && solveVelocityTrend !== 'decreasing') {
    progressionHealth = 'healthy';
    progressionNote = `You're solving ${hardPct}% hard problems - solid difficulty progression.`;
  } else if (hardPct < 5) {
    progressionHealth = 'regressing';
    progressionNote = `Only ${hardPct}% hard problems. Push into medium and hard territory.`;
  } else {
    progressionNote = `Moderate hard rate (${hardPct}%). Gradually increase hard attempts.`;
  }

  const remaining = Math.max(0, 400 - profile.totalSolved);
  const estimatedWeeksToReady = weeklyAvg > 0 ? Math.ceil(remaining / weeklyAvg) : 99;

  const recentAccepted = profile.recentSubmissions.filter((s) => s.statusDisplay === 'Accepted').length;
  const recentAcceptanceRate = profile.recentSubmissions.length > 0
    ? Math.round((recentAccepted / profile.recentSubmissions.length) * 100)
    : 0;

  let solverPersonality: PersonalityType;
  let personalityEmoji: string;
  let personalityDesc: string;
  let personalityTraits: string[];

  if (hardPct >= 20) {
    solverPersonality = 'The Architect';
    personalityEmoji = 'ARCH';
    personalityDesc = 'You thrive on hard problems and think in systems.';
    personalityTraits = ['Hard-problem focused', 'Deep thinker', 'Quality over quantity'];
  } else if (profile.currentStreak >= 30 || activeDays90 >= 60) {
    solverPersonality = 'The Grinder';
    personalityEmoji = 'HOT';
    personalityDesc = 'Daily discipline is your superpower.';
    personalityTraits = ['High consistency', 'Shows up daily', 'Marathon mindset'];
  } else if (easyPct >= 55) {
    solverPersonality = 'The Sprinter';
    personalityEmoji = 'FAST';
    personalityDesc = 'High volume and fast completions drive your momentum.';
    personalityTraits = ['Volume-first', 'Fast executor', 'Broad coverage'];
  } else if (allTopics.filter((t) => t.problemsSolved > 3).length >= 12) {
    solverPersonality = 'The Explorer';
    personalityEmoji = 'MAP';
    personalityDesc = 'You map the problem landscape across many domains.';
    personalityTraits = ['Topic diversity', 'Curious learner', 'Cross-domain'];
  } else {
    solverPersonality = 'The Sniper';
    personalityEmoji = 'AIM';
    personalityDesc = 'You prefer depth, precision, and targeted progress.';
    personalityTraits = ['Depth-first', 'Topic specialist', 'Selective and precise'];
  }

  const solvedTopicNames = new Set(allTopics.filter((t) => t.problemsSolved >= 3).map((t) => t.tagName));
  const availableCompanies = Object.keys(COMPANY_TOPICS);

  const companyReadiness: CompanyReadiness[] = Object.entries(COMPANY_TOPICS).map(([company, { topics, logo }]) => {
    const covered = topics.filter((topic) => solvedTopicNames.has(topic));
    const missing = topics.filter((topic) => !solvedTopicNames.has(topic));
    const score = Math.round((covered.length / topics.length) * 100);

    return {
      company,
      logo,
      readinessScore: score,
      topTopics: covered.slice(0, 3),
      missingTopics: missing.slice(0, 3),
      recommendation:
        score >= 75
          ? 'Ready to apply - focus on mock interviews.'
          : score >= 50
            ? `Close. Strengthen ${missing.slice(0, 2).join(' and ')}.`
            : `Start with ${missing.slice(0, 2).join(' and ')} - they are still major gaps.`,
    };
  });

  const sortedCompanies = [...companyReadiness].sort((a, b) => b.readinessScore - a.readinessScore);
  const bestCompanyMatch = sortedCompanies[0]?.company || 'Google';
  const bestCompanyScore = sortedCompanies[0]?.readinessScore || 0;
  const selectedCompany = availableCompanies.includes(targetCompany ?? '') ? (targetCompany as string) : bestCompanyMatch;

  const retentionBreakdown = getTopicRetentionBreakdown(srsStates, Date.now());
  const retentionMap = new Map(retentionBreakdown.map((entry) => [getTopicFamily(entry.topic), entry]));
  const recentAcceptedSlugs = new Set(
    profile.recentSubmissions
      .filter((submission) => submission.statusDisplay === 'Accepted')
      .map((submission) => submission.titleSlug),
  );

  const topicRecords = allTopics
    .map((topic) => ({
      ...topic,
      family: getTopicFamily(topic.tagName),
      retention: retentionMap.get(getTopicFamily(topic.tagName)),
    }))
    .filter((topic) => topic.problemsSolved > 0)
    .sort((a, b) => b.problemsSolved - a.problemsSolved);

  const topAdvanced = (profile.tagStats?.advanced ?? [])[0];
  const weakestAdvanced = [...(profile.tagStats?.advanced ?? [])].sort((a, b) => a.problemsSolved - b.problemsSolved)[0];

  let nextProblemSuggestion: NextProblemSuggestion;
  if (hardPct < 10 && profile.mediumSolved > 50) {
    nextProblemSuggestion = {
      reason: 'You have built a solid medium foundation',
      difficulty: 'Hard',
      topics: [topAdvanced?.tagName || 'Dynamic Programming'],
      explanation: `You've solved ${profile.mediumSolved} medium problems but only ${profile.hardSolved} hard ones. It is time to level up.`,
    };
  } else if (weakestAdvanced && weakestAdvanced.problemsSolved < 10) {
    nextProblemSuggestion = {
      reason: 'Weak spot detected in your advanced topics',
      difficulty: 'Medium',
      topics: [weakestAdvanced.tagName],
      explanation: `Only ${weakestAdvanced.problemsSolved} ${weakestAdvanced.tagName} problems solved. Closing that gap will lift your profile quickly.`,
    };
  } else {
    nextProblemSuggestion = {
      reason: 'Deepen your strongest topic',
      difficulty: 'Hard',
      topics: [topAdvanced?.tagName || 'Dynamic Programming'],
      explanation: `You're strongest in ${topAdvanced?.tagName || 'Dynamic Programming'}. Hard variants will convert strength into real interview leverage.`,
    };
  }

  let verdictLabel: VerdictLabel;
  let verdictStory: string;
  if (interviewReadiness >= 80) {
    verdictLabel = 'Interview Ready';
    verdictStory = `With ${profile.totalSolved} solved and ${strengthTopics[0]?.name || 'strong topic coverage'} as a major asset, you are ready to apply. Shift focus toward mocks and communication.`;
  } else if (interviewReadiness >= 60) {
    verdictLabel = 'Almost There';
    const topGapLabel = profile.hardSolved < 60
      ? `${60 - profile.hardSolved} more hard problems`
      : consistencyScore < 50
        ? 'daily consistency'
        : 'topic coverage';
    verdictStory = `You have a solid base with ${profile.totalSolved} solved. Close the gap on ${topGapLabel} and you will cross the readiness threshold.`;
  } else if (interviewReadiness >= 40) {
    verdictLabel = 'On Track';
    verdictStory = `At ${profile.totalSolved} solved, you are building the right base. Prioritize hard problems and a steady habit to accelerate the next jump.`;
  } else {
    verdictLabel = 'Keep Building';
    verdictStory = `You're still early in the ramp. Focus on more medium problems, stronger topic coverage, and a stable practice rhythm before targeting major interview loops.`;
  }

  const gaps: Gap[] = [];
  if (consistencyScore < 50) {
    gaps.push({
      label: 'Build a daily streak',
      detail: `90-day consistency is ${consistencyScore}/100 - this is still leaving interview-readiness points on the table.`,
      priority: 'critical',
    });
  }
  if (profile.hardSolved < 60) {
    const needed = 60 - profile.hardSolved;
    gaps.push({
      label: `${needed} more hard problem${needed === 1 ? '' : 's'}`,
      detail: `At ${profile.hardSolved}/60 - hard problems still need the most attention for big-tech loops.`,
      priority: needed > 30 ? 'critical' : 'high',
    });
  }
  const bestCompany = sortedCompanies[0];
  if (bestCompany && bestCompany.missingTopics.length > 0) {
    gaps.push({
      label: `Cover ${bestCompany.missingTopics[0]}`,
      detail: `This is still missing from ${bestCompany.company}'s common interview mix and is capping your company readiness.`,
      priority: 'high',
    });
  }
  if (profile.totalSolved < 400) {
    const needed = 400 - profile.totalSolved;
    gaps.push({
      label: `${needed} more problems to 400 target`,
      detail: 'The overall problem volume is still below a strong interview-prep benchmark.',
      priority: needed > 150 ? 'critical' : 'medium',
    });
  }
  if (topicDiversity < 70) {
    gaps.push({
      label: 'Expand topic coverage',
      detail: `At ${topicDiversity}% of core areas - breadth is still lagging behind depth.`,
      priority: 'medium',
    });
  }

  const topicStatsMap = new Map(topicRecords.map((topic) => [topic.family, topic]));
  const targetCompanyTopics = new Set(COMPANY_TOPICS[selectedCompany]?.topics ?? []);

  const buildRecommendations = (focusTopic?: string): RecommendedProblem[] => {
    return PROBLEM_CATALOG
      .filter((problem) => !recentAcceptedSlugs.has(problem.slug))
      .map((problem) => {
        const topicStat = topicStatsMap.get(problem.topic);
        const retention = retentionMap.get(problem.topic);
        const weakTopic = weakTopics.some((topic) => getTopicFamily(topic.name) === problem.topic);
        const lowPractice = (topicStat?.problemsSolved ?? 0) < 5;
        const lowRetention = retention ? retention.avgRetention < 65 : false;
        const companyFit = problem.companies.includes(selectedCompany);
        const focusMatch = focusTopic ? problem.topic === focusTopic : true;
        const hardPenalty = problem.difficulty === 'Hard' && hardPct < 8 ? -8 : 0;
        const mediumBoost = problem.difficulty === 'Medium' && hardPct < 8 ? 6 : 0;
        const topicGapBoost = lowPractice ? 24 : 8;
        const retentionBoost = lowRetention ? 18 : 0;
        const weakBoost = weakTopic ? 16 : 0;
        const companyBoost = companyFit ? 14 : 0;
        const targetTopicBoost = targetCompanyTopics.has(problem.topic) ? 10 : 0;
        const focusBoost = focusMatch ? 12 : -30;

        const matchScore = topicGapBoost + retentionBoost + weakBoost + companyBoost + targetTopicBoost + mediumBoost + hardPenalty + focusBoost;
        const reasons = [
          lowPractice ? `you still have light coverage in ${problem.topic}` : `it reinforces ${problem.topic}`,
          lowRetention ? `${problem.topic} retention is fading` : null,
          companyFit ? `it matches ${selectedCompany}'s interview mix` : null,
        ].filter(Boolean) as string[];

        return {
          title: problem.title,
          slug: problem.slug,
          difficulty: problem.difficulty,
          primaryTopic: problem.topic,
          subpatterns: problem.subpatterns,
          companies: problem.companies,
          reason: reasons.join(' and '),
          matchScore,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, focusTopic ? 3 : 6);
  };

  const recommendedProblems = buildRecommendations();

  const deepDiveCandidates = Array.from(
    new Map(
      topicRecords
        .filter((topic) => TOPIC_SUBPATTERNS[topic.family])
        .map((topic) => [topic.family, topic]),
    ).values(),
  )
    .sort((a, b) => {
      const aReadiness = Math.min(100, (a.problemsSolved / 15) * 100);
      const bReadiness = Math.min(100, (b.problemsSolved / 15) * 100);
      return aReadiness - bReadiness;
    })
    .slice(0, 6);

  const deepDiveTopics: TopicDeepDive[] = deepDiveCandidates.map((topic) => {
    const subpatterns = TOPIC_SUBPATTERNS[topic.family] ?? [];
    const retention = retentionMap.get(topic.family);
    const readinessScore = Math.max(
      18,
      Math.min(
        96,
        Math.round(
          (topic.problemsSolved / 15) * 55
          + (retention ? retention.avgRetention * 0.35 : 18)
          + (targetCompanyTopics.has(topic.family) ? 10 : 0),
        ),
      ),
    );
    const weakSubpatterns = subpatterns.slice(0, topic.problemsSolved < 3 ? 3 : topic.problemsSolved < 8 ? 2 : 1);
    const strongSignals = [
      `${topic.problemsSolved} solved in ${topic.family}`,
      retention ? `${retention.avgRetention}% retention` : 'no spaced-review data yet',
      targetCompanyTopics.has(topic.family) ? `${selectedCompany} values this topic` : 'good general interview leverage',
    ];

    return {
      topic: topic.family,
      level: topic.level,
      solvedCount: topic.problemsSolved,
      readinessScore,
      retentionScore: retention?.avgRetention ?? null,
      dueCount: retention?.dueCount ?? 0,
      weakSubpatterns,
      strongSignals,
      recommendedProblems: buildRecommendations(topic.family),
      summary: retention?.avgRetention && retention.avgRetention < 60
        ? `${topic.family} is slipping in memory. Review plus fresh drills will pay off immediately.`
        : `${topic.family} can still become a stronger interview differentiator with deeper pattern coverage.`,
    };
  });

  const weeklyData: { week: string; count: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const startIdx = 6 + i * 7;
    const weekSubs = last90.slice(startIdx, startIdx + 7);
    const daysFromNow = (11 - i) * 7;
    const endDate = new Date(Date.now() - daysFromNow * 86_400_000);
    weeklyData.push({
      week: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: sum(weekSubs),
    });
  }

  return {
    solverPersonality,
    personalityEmoji,
    personalityDesc,
    personalityTraits,
    consistencyScore,
    consistencyBreakdown,
    interviewReadiness,
    readinessBreakdown,
    burnoutRisk,
    burnoutNote,
    plateauDetected,
    plateauNote,
    peakDay,
    weeklyAvg,
    dailyAvgOnActiveDays,
    progressionHealth,
    progressionNote,
    estimatedWeeksToReady,
    recentAcceptanceRate,
    hardAttemptRate: hardPct,
    strengthTopics,
    weakTopics,
    topicDiversity,
    difficultyRatio,
    solveVelocityTrend,
    companyReadiness,
    nextProblemSuggestion,
    weeklyData,
    verdictLabel,
    verdictStory,
    gaps: gaps.slice(0, 4),
    bestCompanyMatch,
    bestCompanyScore,
    availableCompanies,
    selectedCompany,
    recommendedProblems,
    deepDiveTopics,
  };
}
