import type { LeetCodeProfile, Submission, TagStat } from './leetcode';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return isObject(value) && Object.values(value).every(isNumber);
}

function isTagStat(value: unknown): value is TagStat {
  return isObject(value)
    && isString(value.tagName)
    && isString(value.tagSlug)
    && isNumber(value.problemsSolved);
}

function isSubmission(value: unknown): value is Submission {
  return isObject(value)
    && isString(value.title)
    && isString(value.titleSlug)
    && isString(value.timestamp)
    && isString(value.statusDisplay)
    && isString(value.lang);
}

export function isLeetCodeProfile(value: unknown): value is LeetCodeProfile {
  if (!isObject(value)) return false;

  const tagStats = value.tagStats;
  if (!isObject(tagStats)) return false;

  return isString(value.username)
    && isString(value.realName)
    && isString(value.avatar)
    && isNumber(value.ranking)
    && isNumber(value.totalSolved)
    && isNumber(value.easySolved)
    && isNumber(value.mediumSolved)
    && isNumber(value.hardSolved)
    && isNumber(value.totalQuestions)
    && isNumber(value.easyTotal)
    && isNumber(value.mediumTotal)
    && isNumber(value.hardTotal)
    && isNumber(value.acceptanceRate)
    && isNumberRecord(value.submissionCalendar)
    && isNumber(value.totalActiveDays)
    && isNumber(value.maxStreak)
    && isNumber(value.currentStreak)
    && Array.isArray(value.recentSubmissions)
    && value.recentSubmissions.every(isSubmission)
    && Array.isArray(tagStats.advanced)
    && tagStats.advanced.every(isTagStat)
    && Array.isArray(tagStats.intermediate)
    && tagStats.intermediate.every(isTagStat)
    && Array.isArray(tagStats.fundamental)
    && tagStats.fundamental.every(isTagStat)
    && isNumber(value.contestRating)
    && isNumber(value.contestAttended)
    && isNumber(value.contestGlobalRanking)
    && isNumber(value.topPercentage)
    && Array.isArray(value.badges)
    && Array.isArray(value.languageStats);
}
