import type { LeetCodeProfile, TagStat } from './leetcode';
import { isAcceptedSubmissionStatus } from './leetcode';
import { computeMemoryHealth, getTopicRetentionBreakdown, SM2State } from './srs';
import {
  COMPANY_TOPICS,
  getTopicFamily,
  PROBLEM_CATALOG,
  TOPIC_SUBPATTERNS,
  type CompanyPrepSignal,
  type CompanyTopicSignal,
} from './analytics-data';

export type PersonalityType =
  | 'The Sniper'
  | 'The Sprinter'
  | 'The Grinder'
  | 'The Explorer'
  | 'The Architect';
export type BurnoutLevel = 'low' | 'medium' | 'high';
export type ProgressionHealth = 'healthy' | 'stagnant' | 'regressing';
export type VerdictLabel = 'Interview Ready' | 'Almost There' | 'On Track' | 'Keep Building';
export type ReadinessConfidence = 'low' | 'medium' | 'high';

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
  prepSignals: CompanyPrepSignal[];
  researchBasis: string;
  scoreBasis: string;
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
  readinessConfidence: ReadinessConfidence;
  readinessConfidenceNote: string;
  readinessBreakdown: { label: string; score: number; max: number; note: string }[];
  burnoutRisk: BurnoutLevel;
  burnoutNote: string;
  plateauDetected: boolean;
  plateauNote: string;
  peakDay: string;
  weeklySubmissionsAvg: number;
  weeklyAcceptedSubmissionsEstimate: number;
  dailySubmissionsAvgOnActiveDays: number;
  progressionHealth: ProgressionHealth;
  progressionNote: string;
  estimatedWeeksToVolumeTarget: number;
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
  nowMs?: number;
  srsStates?: Record<string, SM2State>;
  targetCompany?: string;
}

interface TopicRetentionEntry {
  topic: string;
  avgRetention: number;
  count: number;
  dueCount: number;
}

type TopicLevel = 'Advanced' | 'Intermediate' | 'Fundamental';

interface TopicWithLevel extends TagStat {
  level: TopicLevel;
}

interface TopicFamilyRecord {
  tagName: string;
  tagSlug: string;
  family: string;
  problemsSolved: number;
  level: TopicLevel;
  retention?: TopicRetentionEntry;
}

interface WeightedTopicDefinition {
  topic: string;
  weight: number;
  depthTarget: number;
}

const CORE_TOPIC_TARGET = 30;
const INTERVIEW_VOLUME_TARGET = 400;
const MEDIUM_SOLVED_TARGET = 180;
const HARD_SOLVED_TARGET = 60;
const HARD_SHARE_TARGET = 15;
const COMPANY_TOPIC_DEPTH_TARGET = 8;
const INTERVIEW_TOPIC_DEPTH_TARGET = 10;
const TOPIC_DEEP_DIVE_TARGET = 15;

function buildWeightedTopicDefinitions(
  topics: CompanyTopicSignal[],
  defaultDepthTarget: number,
): WeightedTopicDefinition[] {
  const byFamily = new Map<string, WeightedTopicDefinition>();

  for (const topic of topics) {
    const family = getTopicFamily(topic.topic);
    const weight = Math.max(0, topic.weight);
    if (!family || weight <= 0) continue;

    const depthTarget = Math.max(1, Math.round(topic.depthTarget ?? defaultDepthTarget));
    const existing = byFamily.get(family);

    if (existing) {
      existing.weight += weight;
      existing.depthTarget = Math.max(existing.depthTarget, depthTarget);
    } else {
      byFamily.set(family, { topic: family, weight, depthTarget });
    }
  }

  return Array.from(byFamily.values()).sort((a, b) => b.weight - a.weight);
}

function mergeWeightedTopicDefinitions(
  groups: WeightedTopicDefinition[][],
): WeightedTopicDefinition[] {
  const byFamily = new Map<string, WeightedTopicDefinition>();

  for (const group of groups) {
    for (const topic of group) {
      const existing = byFamily.get(topic.topic);

      if (existing) {
        existing.weight += topic.weight;
        existing.depthTarget = Math.max(existing.depthTarget, topic.depthTarget);
      } else {
        byFamily.set(topic.topic, { ...topic });
      }
    }
  }

  return Array.from(byFamily.values()).sort((a, b) => b.weight - a.weight);
}

function toFiniteNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toNonNegativeInteger(value: unknown): number {
  const numeric = toFiniteNumber(value);
  return numeric === null ? 0 : Math.max(0, Math.round(numeric));
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function clampScore(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

function ratio(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return clamp(numerator / denominator, 0, 1);
}

function weightedTopicCoverage(
  topicDefinitions: WeightedTopicDefinition[],
  topicStatsMap: Map<string, TopicFamilyRecord>,
): number {
  const totalWeight = topicDefinitions.reduce((acc, topic) => acc + topic.weight, 0);
  if (totalWeight <= 0) return 0;

  return topicDefinitions.reduce((acc, topic) => {
    const solved = topicStatsMap.get(topic.topic)?.problemsSolved ?? 0;
    return acc + ratio(solved, topic.depthTarget) * topic.weight;
  }, 0) / totalWeight;
}

function scoreFromTarget(value: number, target: number, maxScore: number): number {
  return Math.min(maxScore, Math.round(ratio(value, target) * maxScore));
}

function roundTo(value: number, digits = 1): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percentParts(values: number[]): number[] {
  const safeValues = values.map((value) => Math.max(0, Number.isFinite(value) ? value : 0));
  const total = safeValues.reduce((acc, value) => acc + value, 0);
  if (total <= 0) return safeValues.map(() => 0);

  const exact = safeValues.map((value) => (value / total) * 100);
  const floored = exact.map(Math.floor);
  const remainder = 100 - floored.reduce((acc, value) => acc + value, 0);
  const bonusIndexes = new Set(
    exact
      .map((candidate, candidateIndex) => ({ candidateIndex, fraction: candidate - Math.floor(candidate) }))
      .sort((a, b) => b.fraction - a.fraction)
      .slice(0, remainder)
      .map((entry) => entry.candidateIndex),
  );

  return floored.map((value, index) => value + (bonusIndexes.has(index) ? 1 : 0));
}

function buildLocalDayHistory(calendar: Record<string, number>): Map<number, number> {
  return Object.entries(calendar).reduce<Map<number, number>>((history, [ts, count]) => {
    const timestamp = toFiniteNumber(ts);
    const safeCount = toNonNegativeInteger(count);
    if (timestamp === null || timestamp <= 0 || safeCount <= 0) return history;

    const date = new Date(timestamp * 1000);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    if (!Number.isFinite(dayStart)) return history;

    history.set(dayStart, (history.get(dayStart) ?? 0) + safeCount);
    return history;
  }, new Map());
}

function buildRetentionFamilyMap(
  retentionBreakdown: TopicRetentionEntry[],
): Map<string, TopicRetentionEntry> {
  const aggregated = new Map<string, { weightedRetention: number; count: number; dueCount: number }>();

  for (const entry of retentionBreakdown) {
    const family = getTopicFamily(entry.topic);
    const current = aggregated.get(family) ?? { weightedRetention: 0, count: 0, dueCount: 0 };

    current.weightedRetention += entry.avgRetention * entry.count;
    current.count += entry.count;
    current.dueCount += entry.dueCount;
    aggregated.set(family, current);
  }

  return new Map(
    Array.from(aggregated.entries()).map(([family, value]) => [
      family,
      {
        topic: family,
        avgRetention: Math.round(value.weightedRetention / value.count),
        count: value.count,
        dueCount: value.dueCount,
      },
    ]),
  );
}

function normalizeTopicStats(profile: LeetCodeProfile): TopicWithLevel[] {
  const sources: Array<{ level: TopicLevel; stats: TagStat[] }> = [
    { level: 'Advanced', stats: profile.tagStats?.advanced ?? [] },
    { level: 'Intermediate', stats: profile.tagStats?.intermediate ?? [] },
    { level: 'Fundamental', stats: profile.tagStats?.fundamental ?? [] },
  ];

  return sources.flatMap(({ level, stats }) => stats.flatMap((topic): TopicWithLevel[] => {
    const tagName = typeof topic.tagName === 'string' ? topic.tagName.trim() : '';
    const tagSlug = typeof topic.tagSlug === 'string'
      ? topic.tagSlug.trim()
      : tagName.toLowerCase().replace(/\s+/g, '-');
    const problemsSolved = toNonNegativeInteger(topic.problemsSolved);
    if (!tagName || problemsSolved <= 0) return [];

    return [{ tagName, tagSlug, problemsSolved, level }];
  }));
}

function buildTopicFamilyRecords(
  topics: TopicWithLevel[],
  retentionMap: Map<string, TopicRetentionEntry>,
): TopicFamilyRecord[] {
  const levelWeight: Record<TopicLevel, number> = {
    Advanced: 3,
    Intermediate: 2,
    Fundamental: 1,
  };

  const byFamily = new Map<string, TopicFamilyRecord>();
  for (const topic of topics) {
    const family = getTopicFamily(topic.tagName);
    const existing = byFamily.get(family);

    if (
      !existing ||
      topic.problemsSolved > existing.problemsSolved ||
      (topic.problemsSolved === existing.problemsSolved && levelWeight[topic.level] > levelWeight[existing.level])
    ) {
      byFamily.set(family, {
        tagName: topic.tagName,
        tagSlug: topic.tagSlug,
        family,
        problemsSolved: topic.problemsSolved,
        level: topic.level,
        retention: retentionMap.get(family),
      });
    }
  }

  return Array.from(byFamily.values()).sort((a, b) => b.problemsSolved - a.problemsSolved);
}

export function computeAnalytics(profile: LeetCodeProfile, options: AnalyticsOptions = {}): Analytics {
  const { nowMs = Date.now(), srsStates = {}, targetCompany } = options;
  const cal = profile.submissionCalendar ?? {};
  const localDayHistory = buildLocalDayHistory(cal);
  const retentionBreakdown = getTopicRetentionBreakdown(srsStates, nowMs);
  const retentionMap = buildRetentionFamilyMap(retentionBreakdown);

  const easySolved = toNonNegativeInteger(profile.easySolved);
  const mediumSolved = toNonNegativeInteger(profile.mediumSolved);
  const hardSolved = toNonNegativeInteger(profile.hardSolved);
  const solvedByDifficulty = easySolved + mediumSolved + hardSolved;
  const totalSolved = Math.max(toNonNegativeInteger(profile.totalSolved), solvedByDifficulty);
  const contestAttended = toNonNegativeInteger(profile.contestAttended);
  const currentStreak = toNonNegativeInteger(profile.currentStreak);
  const recentSubmissions = Array.isArray(profile.recentSubmissions) ? profile.recentSubmissions : [];
  const allTopics = normalizeTopicStats(profile);
  const topicRecords = buildTopicFamilyRecords(allTopics, retentionMap);
  const topicStatsMap = new Map(topicRecords.map((topic) => [topic.family, topic]));

  const getNDays = (n: number): number[] => {
    const result: number[] = new Array(n).fill(0);
    const now = new Date(nowMs);
    for (let i = n - 1; i >= 0; i--) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      result[n - 1 - i] = localDayHistory.get(day.getTime()) ?? 0;
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
  const totalSubmissions90 = sum(last90);
  const weeklySubmissionsAvg = roundTo(totalSubmissions90 / (90 / 7));
  const dailySubmissionsAvgOnActiveDays = activeDays90 > 0 ? roundTo(totalSubmissions90 / activeDays90) : 0;

  let maxStreak90 = 0;
  let curStreak = 0;
  for (const day of last90) {
    curStreak = day > 0 ? curStreak + 1 : 0;
    maxStreak90 = Math.max(maxStreak90, curStreak);
  }

  const activityScore = scoreFromTarget(activeDays90, 90, 40);
  const streakScore = scoreFromTarget(maxStreak90, 30, 30);
  const intensityScore = scoreFromTarget(Math.min(dailySubmissionsAvgOnActiveDays, 5), 5, 20);
  const recencyScore = sum(last7) > 0 ? 10 : 0;
  const consistencyScore = clampScore(activityScore + streakScore + intensityScore + recencyScore);

  const consistencyBreakdown = [
    { label: 'Activity (active days)', score: activityScore, max: 40 },
    { label: 'Streak quality', score: streakScore, max: 30 },
    { label: 'Daily intensity', score: intensityScore, max: 20 },
    { label: 'Recent activity', score: recencyScore, max: 10 },
  ];

  const topicDiversity = scoreFromTarget(topicRecords.length, CORE_TOPIC_TARGET, 100);

  const strengthTopics = topicRecords
    .filter((t) => t.problemsSolved >= 5)
    .sort((a, b) => b.problemsSolved - a.problemsSolved)
    .slice(0, 8)
    .map((t) => ({ name: t.family, count: t.problemsSolved, level: t.level }));

  const weakTopics = topicRecords
    .filter((t) => t.problemsSolved > 0 && t.problemsSolved < 5)
    .sort((a, b) => a.problemsSolved - b.problemsSolved)
    .slice(0, 6)
    .map((t) => ({ name: t.family, level: t.level }));

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

  const l30 = sum(last30);
  const p30 = sum(prev30);
  const plateauDetected = p30 > 0 && l30 > 5 && Math.abs(l30 - p30) < p30 * 0.15;
  const plateauNote = plateauDetected
    ? 'Your solve rate has been nearly identical for 60 days. Try a harder difficulty or new topic to break through.'
    : '';

  const dayTotals = new Array(7).fill(0);
  localDayHistory.forEach((count, dayStart) => {
    dayTotals[new Date(dayStart).getDay()] += count;
  });
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const peakDay = Math.max(...dayTotals) > 0
    ? dayNames[dayTotals.indexOf(Math.max(...dayTotals))]
    : 'No activity yet';

  const solveVelocityTrend: Analytics['solveVelocityTrend'] =
    l30 > p30 * 1.15 ? 'increasing' : l30 < p30 * 0.85 ? 'decreasing' : 'stable';

  const [easyPct, medPct, hardPct] = percentParts([easySolved, mediumSolved, hardSolved]);
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

  const recentAccepted = recentSubmissions.filter((s) => isAcceptedSubmissionStatus(s.statusDisplay)).length;
  const recentAcceptanceRate = recentSubmissions.length > 0
    ? clampScore((recentAccepted / recentSubmissions.length) * 100)
    : 0;
  const reliableRecentAcceptance = recentSubmissions.length >= 20;
  const qualityAcceptanceRate = reliableRecentAcceptance
    ? recentAcceptanceRate
    : toNonNegativeInteger(profile.acceptanceRate);
  const acceptanceMultiplier = recentSubmissions.length > 0
    ? recentAcceptanceRate / 100
    : ratio(toNonNegativeInteger(profile.acceptanceRate), 100);
  const weeklyAcceptedSubmissionsEstimate = roundTo(weeklySubmissionsAvg * acceptanceMultiplier);
  const remaining = Math.max(0, INTERVIEW_VOLUME_TARGET - totalSolved);
  const estimatedWeeksToVolumeTarget = weeklyAcceptedSubmissionsEstimate > 0
    ? Math.ceil(remaining / weeklyAcceptedSubmissionsEstimate)
    : 99;


  let solverPersonality: PersonalityType;
  let personalityEmoji: string;
  let personalityDesc: string;
  let personalityTraits: string[];

  if (hardPct >= 20) {
    solverPersonality = 'The Architect';
    personalityEmoji = 'ARCH';
    personalityDesc = 'You thrive on hard problems and think in systems.';
    personalityTraits = ['Hard-problem focused', 'Deep thinker', 'Quality over quantity'];
  } else if (currentStreak >= 30 || activeDays90 >= 60) {
    solverPersonality = 'The Grinder';
    personalityEmoji = 'HOT';
    personalityDesc = 'Daily discipline is your superpower.';
    personalityTraits = ['High consistency', 'Shows up daily', 'Marathon mindset'];
  } else if (easyPct >= 55) {
    solverPersonality = 'The Sprinter';
    personalityEmoji = 'FAST';
    personalityDesc = 'High volume and fast completions drive your momentum.';
    personalityTraits = ['Volume-first', 'Fast executor', 'Broad coverage'];
  } else if (topicRecords.filter((t) => t.problemsSolved > 3).length >= 12) {
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

  const availableCompanies = Object.keys(COMPANY_TOPICS);
  const companyWeightedTopics = Object.fromEntries(
    Object.entries(COMPANY_TOPICS).map(([company, { topics }]) => [
      company,
      buildWeightedTopicDefinitions(topics, COMPANY_TOPIC_DEPTH_TARGET),
    ]),
  ) as Record<string, WeightedTopicDefinition[]>;
  const companyTopicFamilies = Object.fromEntries(
    Object.entries(companyWeightedTopics).map(([company, topics]) => [
      company,
      topics.map((topic) => topic.topic),
    ]),
  ) as Record<string, string[]>;

  const companyReadiness: CompanyReadiness[] = Object.entries(COMPANY_TOPICS).map(([
    company,
    { logo, prepSignals, researchBasis },
  ]) => {
    const weightedTopics = companyWeightedTopics[company] ?? [];
    const scoredTopics = weightedTopics.map((topic) => {
      const solved = topicStatsMap.get(topic.topic)?.problemsSolved ?? 0;
      const coverage = ratio(solved, topic.depthTarget);
      return {
        topic: topic.topic,
        solved,
        coverage,
        weight: topic.weight,
        gapImpact: (1 - coverage) * topic.weight,
      };
    });
    const readinessScore = clampScore(weightedTopicCoverage(weightedTopics, topicStatsMap) * 100);
    const covered = scoredTopics
      .filter((topic) => topic.coverage >= 0.7)
      .sort((a, b) => (b.coverage * b.weight) - (a.coverage * a.weight))
      .map((topic) => topic.topic);
    const missing = scoredTopics
      .filter((topic) => topic.coverage < 0.7)
      .sort((a, b) => b.gapImpact - a.gapImpact)
      .map((topic) => topic.topic);
    const missingLabel = missing.slice(0, 2).join(' and ') || 'mock interview pacing';
    const prepFocus = prepSignals[0]?.label.toLowerCase() ?? 'mock interview communication';

    return {
      company,
      logo,
      readinessScore,
      topTopics: covered.slice(0, 3),
      missingTopics: missing.slice(0, 3),
      prepSignals,
      researchBasis,
      scoreBasis: 'Weighted coding-topic depth from this LeetCode profile; off-platform design and behavioral prep are listed but not auto-scored.',
      recommendation:
        readinessScore >= 75
          ? `Coding fit is strong. Pair it with ${prepFocus} before the loop.`
          : readinessScore >= 50
            ? `Close on coding. Strengthen ${missingLabel}, then rehearse ${prepFocus}.`
            : `Start with ${missingLabel}; these carry the most weighted gap for this company.`,
    };
  });

  const sortedCompanies = [...companyReadiness].sort((a, b) => b.readinessScore - a.readinessScore);
  const bestCompanyMatch = sortedCompanies[0]?.company || 'Google';
  const bestCompanyScore = sortedCompanies[0]?.readinessScore || 0;
  const selectedCompany = availableCompanies.includes(targetCompany ?? '') ? (targetCompany as string) : bestCompanyMatch;

  const interviewTopicDefinitions = mergeWeightedTopicDefinitions(Object.values(companyWeightedTopics));
  const topicDepthPct = clampScore(
    weightedTopicCoverage(
      interviewTopicDefinitions.map((topic) => ({
        ...topic,
        depthTarget: Math.max(topic.depthTarget, INTERVIEW_TOPIC_DEPTH_TARGET),
      })),
      topicStatsMap,
    ) * 100,
  );
  const volumeScore = Math.min(
    24,
    scoreFromTarget(totalSolved, INTERVIEW_VOLUME_TARGET, 18)
    + scoreFromTarget(mediumSolved, MEDIUM_SOLVED_TARGET, 6),
  );
  const hardDepthScore = Math.min(
    22,
    scoreFromTarget(hardSolved, HARD_SOLVED_TARGET, 14)
    + scoreFromTarget(hardPct, HARD_SHARE_TARGET, 8),
  );
  const topicReadinessScore = Math.min(
    18,
    Math.round(((topicDiversity * 0.35) + (topicDepthPct * 0.65)) * 0.18),
  );
  const practiceQualityScore = Math.min(
    14,
    scoreFromTarget(consistencyScore, 100, 8)
    + scoreFromTarget(qualityAcceptanceRate, 70, 4)
    + scoreFromTarget(contestAttended, 3, 2),
  );
  const companyFitScore = scoreFromTarget(bestCompanyScore, 80, 12);
  const srsStateCount = Object.keys(srsStates).length;
  const memoryHealthScore = srsStateCount > 0 ? computeMemoryHealth(srsStates, nowMs) : null;
  const memoryReadinessScore = memoryHealthScore === null
    ? 5
    : scoreFromTarget(memoryHealthScore, 80, 10);
  const rawInterviewReadiness = clampScore(
    volumeScore
    + hardDepthScore
    + topicReadinessScore
    + practiceQualityScore
    + companyFitScore
    + memoryReadinessScore,
  );
  const readinessCaps: number[] = [];

  if (totalSolved < 75) readinessCaps.push(45);
  else if (totalSolved < 150) readinessCaps.push(58);
  else if (totalSolved < 250) readinessCaps.push(72);

  if (hardSolved < 10) readinessCaps.push(62);
  else if (hardSolved < 25) readinessCaps.push(76);

  if (hardPct < 5 && totalSolved >= 80) readinessCaps.push(68);
  else if (hardPct < 10 && totalSolved >= 120) readinessCaps.push(82);

  if (topicDepthPct < 35) readinessCaps.push(70);
  else if (topicDepthPct < 55) readinessCaps.push(82);

  if (bestCompanyScore < 40) readinessCaps.push(68);
  else if (bestCompanyScore < 60) readinessCaps.push(80);

  if (consistencyScore < 30) readinessCaps.push(72);
  else if (consistencyScore < 50) readinessCaps.push(84);

  if (last7sum === 0 && totalSolved > 0) readinessCaps.push(86);

  if (reliableRecentAcceptance && recentAcceptanceRate < 45) readinessCaps.push(70);
  else if (reliableRecentAcceptance && recentAcceptanceRate < 60) readinessCaps.push(82);

  if (memoryHealthScore !== null && memoryHealthScore < 45) readinessCaps.push(72);
  else if (memoryHealthScore !== null && memoryHealthScore < 60) readinessCaps.push(84);

  const interviewReadiness = Math.min(rawInterviewReadiness, ...readinessCaps, 100);
  const readinessBreakdown = [
    {
      label: 'Problem volume',
      score: volumeScore,
      max: 24,
      note: `${totalSolved}/${INTERVIEW_VOLUME_TARGET} total, ${mediumSolved}/${MEDIUM_SOLVED_TARGET} medium`,
    },
    {
      label: 'Hard depth',
      score: hardDepthScore,
      max: 22,
      note: `${hardSolved}/${HARD_SOLVED_TARGET} hard, ${hardPct}% hard share`,
    },
    {
      label: 'Topic depth',
      score: topicReadinessScore,
      max: 18,
      note: `${topicDiversity}% breadth, ${topicDepthPct}% core depth`,
    },
    {
      label: 'Practice quality',
      score: practiceQualityScore,
      max: 14,
      note: `${consistencyScore}/100 consistency, ${qualityAcceptanceRate}% acceptance`,
    },
    {
      label: 'Company fit',
      score: companyFitScore,
      max: 12,
      note: `${bestCompanyMatch} ${bestCompanyScore}% topic fit`,
    },
    {
      label: 'Memory retention',
      score: memoryReadinessScore,
      max: 10,
      note: memoryHealthScore === null
        ? 'No spaced-review signal yet'
        : `${memoryHealthScore}% retained across ${srsStateCount} tracked problems`,
    },
  ];
  const confidenceScore = Math.round(
    (totalSolved > 0 ? 18 : 0)
    + (totalSubmissions90 > 0 ? 16 : 0)
    + (reliableRecentAcceptance ? 18 : recentSubmissions.length > 0 ? 9 : 0)
    + (topicRecords.length >= 8 ? 18 : topicRecords.length >= 3 ? 9 : 0)
    + (topicDepthPct >= 35 ? 12 : topicDepthPct > 0 ? 6 : 0)
    + (srsStateCount >= 20 ? 18 : srsStateCount >= 5 ? 10 : srsStateCount > 0 ? 5 : 0),
  );
  const readinessConfidence: ReadinessConfidence =
    confidenceScore >= 75 ? 'high' : confidenceScore >= 45 ? 'medium' : 'low';
  const readinessConfidenceNote =
    readinessConfidence === 'high'
      ? 'Enough profile, recent activity, topic, and memory signals are available.'
      : readinessConfidence === 'medium'
        ? 'Useful estimate, but one or more data signals are still thin.'
        : 'Early estimate only. Add recent activity and SRS reviews to improve confidence.';

  const recentAcceptedSlugs = new Set(
    recentSubmissions
      .filter((submission) => isAcceptedSubmissionStatus(submission.statusDisplay))
      .map((submission) => submission.titleSlug)
      .filter((slug) => typeof slug === 'string' && slug.trim().length > 0),
  );
  const solvedProblemSlugs = new Set([...Object.keys(srsStates), ...recentAcceptedSlugs]);

  const advancedTopics = allTopics
    .filter((topic) => topic.level === 'Advanced')
    .sort((a, b) => b.problemsSolved - a.problemsSolved);
  const topAdvanced = advancedTopics[0];
  const weakestAdvanced = [...advancedTopics].sort((a, b) => a.problemsSolved - b.problemsSolved)[0];

  let nextProblemSuggestion: NextProblemSuggestion;
  if (hardPct < 10 && mediumSolved > 50) {
    nextProblemSuggestion = {
      reason: 'You have built a solid medium foundation',
      difficulty: 'Hard',
      topics: [topAdvanced?.tagName || 'Dynamic Programming'],
      explanation: `You've solved ${mediumSolved} medium problems but only ${hardSolved} hard ones. It is time to level up.`,
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
    verdictStory = `With ${totalSolved} solved and ${strengthTopics[0]?.name || 'strong topic coverage'} as a major asset, you are ready to apply. Shift focus toward mocks and communication.`;
  } else if (interviewReadiness >= 60) {
    verdictLabel = 'Almost There';
    const topGapLabel = hardSolved < HARD_SOLVED_TARGET
      ? `${HARD_SOLVED_TARGET - hardSolved} more hard problems`
      : consistencyScore < 50
        ? 'daily consistency'
        : 'topic coverage';
    verdictStory = `You have a solid base with ${totalSolved} solved. Close the gap on ${topGapLabel} and you will cross the readiness threshold.`;
  } else if (interviewReadiness >= 40) {
    verdictLabel = 'On Track';
    verdictStory = `At ${totalSolved} solved, you are building the right base. Prioritize hard problems and a steady habit to accelerate the next jump.`;
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
  if (last7sum === 0 && totalSolved > 0) {
    gaps.push({
      label: 'Restore recent activity',
      detail: 'No submissions appeared in the last 7 days, so the readiness score is capped until momentum returns.',
      priority: consistencyScore < 50 ? 'critical' : 'high',
    });
  }
  if (reliableRecentAcceptance && recentAcceptanceRate < 60) {
    gaps.push({
      label: 'Raise recent acceptance',
      detail: `Recent acceptance is ${recentAcceptanceRate}%. Aim for cleaner first-pass solutions before increasing volume.`,
      priority: recentAcceptanceRate < 45 ? 'critical' : 'high',
    });
  }
  if (hardSolved < HARD_SOLVED_TARGET) {
    const needed = HARD_SOLVED_TARGET - hardSolved;
    gaps.push({
      label: `${needed} more hard problem${needed === 1 ? '' : 's'}`,
      detail: `At ${hardSolved}/${HARD_SOLVED_TARGET} - hard problems still need the most attention for big-tech loops.`,
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
  if (topicDepthPct < 60) {
    gaps.push({
      label: 'Deepen core patterns',
      detail: `Core interview topic depth is ${topicDepthPct}%. Breadth alone is not enough for a high readiness score.`,
      priority: topicDepthPct < 35 ? 'critical' : 'high',
    });
  }
  if (memoryHealthScore !== null && memoryHealthScore < 60) {
    gaps.push({
      label: 'Review fading memory',
      detail: `Tracked memory retention is ${memoryHealthScore}%. Review due cards before treating solved problems as interview-ready.`,
      priority: memoryHealthScore < 45 ? 'critical' : 'high',
    });
  } else if (memoryHealthScore === null) {
    gaps.push({
      label: 'Build a memory signal',
      detail: 'No spaced-review history exists yet, so the readiness score only gives partial credit for memory retention.',
      priority: 'medium',
    });
  }
  if (totalSolved < INTERVIEW_VOLUME_TARGET) {
    const needed = INTERVIEW_VOLUME_TARGET - totalSolved;
    gaps.push({
      label: `${needed} more problems to ${INTERVIEW_VOLUME_TARGET} target`,
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
  const priorityRank: Record<Gap['priority'], number> = { critical: 0, high: 1, medium: 2 };

  const targetCompanyTopics = new Set(companyTopicFamilies[selectedCompany] ?? []);

  const buildRecommendations = (focusTopic?: string): RecommendedProblem[] => {
    return PROBLEM_CATALOG
      .filter((problem) => !solvedProblemSlugs.has(problem.slug))
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

        const matchScore = clampScore(topicGapBoost + retentionBoost + weakBoost + companyBoost + targetTopicBoost + mediumBoost + hardPenalty + focusBoost);
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
      const aReadiness = ratio(a.problemsSolved, TOPIC_DEEP_DIVE_TARGET) * 100;
      const bReadiness = ratio(b.problemsSolved, TOPIC_DEEP_DIVE_TARGET) * 100;
      return aReadiness - bReadiness;
    })
    .slice(0, 6);

  const deepDiveTopics: TopicDeepDive[] = deepDiveCandidates.map((topic) => {
    const subpatterns = TOPIC_SUBPATTERNS[topic.family] ?? [];
    const retention = retentionMap.get(topic.family);
    const practiceComponent = ratio(topic.problemsSolved, TOPIC_DEEP_DIVE_TARGET) * 55;
    const retentionComponent = retention ? clamp(retention.avgRetention, 0, 100) * 0.35 : 17.5;
    const companyComponent = targetCompanyTopics.has(topic.family) ? 10 : 0;
    const readinessScore = clampScore(
      practiceComponent
      + retentionComponent
      + companyComponent,
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
      summary: retention && retention.avgRetention < 60
        ? `${topic.family} is slipping in memory. Review plus fresh drills will pay off immediately.`
        : `${topic.family} can still become a stronger interview differentiator with deeper pattern coverage.`,
    };
  });

  const weeklyData: { week: string; count: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const startIdx = 6 + i * 7;
    const weekSubs = last90.slice(startIdx, startIdx + 7);
    const daysFromNow = (11 - i) * 7;
    const endDate = new Date(nowMs - daysFromNow * 86_400_000);
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
    readinessConfidence,
    readinessConfidenceNote,
    readinessBreakdown,
    burnoutRisk,
    burnoutNote,
    plateauDetected,
    plateauNote,
    peakDay,
    weeklySubmissionsAvg,
    weeklyAcceptedSubmissionsEstimate,
    dailySubmissionsAvgOnActiveDays,
    progressionHealth,
    progressionNote,
    estimatedWeeksToVolumeTarget,
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
    gaps: gaps.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]).slice(0, 5),
    bestCompanyMatch,
    bestCompanyScore,
    availableCompanies,
    selectedCompany,
    recommendedProblems,
    deepDiveTopics,
  };
}
