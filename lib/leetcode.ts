import { getLeetCodeUsernameError, normalizeLeetCodeUsername } from './username';

export interface LeetCodeProfile {
  username: string;
  realName: string;
  avatar: string;
  ranking: number;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalQuestions: number;
  easyTotal: number;
  mediumTotal: number;
  hardTotal: number;
  acceptanceRate: number;
  submissionCalendar: Record<string, number>;
  totalActiveDays: number;
  maxStreak: number;
  currentStreak: number;
  recentSubmissions: Submission[];
  tagStats: { advanced: TagStat[]; intermediate: TagStat[]; fundamental: TagStat[] };
  contestRating: number;
  contestAttended: number;
  contestGlobalRanking: number;
  topPercentage: number;
  badges: Badge[];
  languageStats: LanguageStat[];
}

export type SubmissionDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface TopicTag {
  name: string;
  slug: string;
}

export interface Submission {
  title: string;
  titleSlug: string;
  timestamp: string;
  statusDisplay: string;
  lang: string;
  difficulty?: SubmissionDifficulty;
  topicTags?: TopicTag[];
  frontendId?: number;
}

export interface TagStat {
  tagName: string;
  tagSlug: string;
  problemsSolved: number;
}

export interface Badge {
  id: string;
  displayName: string;
  icon: string;
  creationDate: string;
}

export interface LanguageStat {
  languageName: string;
  problemsSolved: number;
}

interface DifficultyCount {
  difficulty: string;
  count: number;
  submissions?: number;
}

interface ContestRanking {
  rating?: number;
  attendedContestsCount?: number;
  globalRanking?: number;
  topPercentage?: number;
}

interface MatchedUserData {
  username: string;
  profile?: {
    realName?: string;
    userAvatar?: string;
    ranking?: number;
  };
  submitStats?: {
    acSubmissionNum?: DifficultyCount[];
    totalSubmissionNum?: DifficultyCount[];
  };
  userCalendar?: {
    submissionCalendar?: string;
    streak?: number;
    totalActiveDays?: number;
  };
  badges?: Badge[];
  languageProblemCount?: LanguageStat[];
  tagProblemCounts?: {
    advanced?: TagStat[];
    intermediate?: TagStat[];
    fundamental?: TagStat[];
  };
}

interface ProfileQueryData {
  matchedUser?: MatchedUserData | null;
  allQuestionsCount?: DifficultyCount[];
  recentSubmissionList?: Submission[];
  userContestRanking?: ContestRanking | null;
}

interface QuestionDetail {
  questionFrontendId?: string;
  difficulty?: SubmissionDifficulty;
  topicTags?: TopicTag[];
}

export class LeetCodeApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'LeetCodeApiError';
  }
}

const LEETCODE_API = 'https://leetcode.com/graphql';
const MS_PER_DAY = 86_400_000;
const RECENT_SUBMISSION_LIMIT = 250;
const QUESTION_DETAIL_BATCH_SIZE = 40;
const TITLE_SLUG_PATTERN = /^[A-Za-z0-9-]{1,160}$/;

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const requestInit: RequestInit & { next?: { revalidate: number } } = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 300 },
  };

  const res = await fetch(LEETCODE_API, requestInit);

  if (!res.ok) {
    if (res.status === 429) {
      throw new LeetCodeApiError('LeetCode is rate-limiting requests right now. Please try again shortly.', 429);
    }

    throw new LeetCodeApiError(`LeetCode request failed (${res.status}).`, 502);
  }

  const json = (await res.json()) as { data?: T; errors?: Array<{ message?: string }> };

  if (json.errors?.length) {
    const message = json.errors[0]?.message || 'GraphQL error';
    const status = /not found|does not exist/i.test(message) ? 404 : 502;
    throw new LeetCodeApiError(message, status);
  }

  if (!json.data) {
    throw new LeetCodeApiError('LeetCode returned an empty response.', 502);
  }

  return json.data;
}

function getDifficultyMetric(
  counts: DifficultyCount[],
  difficulty: string,
  key: 'count' | 'submissions',
): number {
  const entry = counts.find((count) => count.difficulty === difficulty);
  const value = entry?.[key];
  return toNonNegativeInteger(value);
}

function toFiniteNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toNonNegativeInteger(value: unknown): number {
  const numeric = toFiniteNumber(value);
  return numeric === null ? 0 : Math.max(0, Math.round(numeric));
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toLocalDayStart(tsSeconds: number): number | null {
  if (!Number.isFinite(tsSeconds) || tsSeconds <= 0) return null;
  const d = new Date(tsSeconds * 1000);
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Number.isFinite(dayStart) ? dayStart : null;
}

export function normalizeSubmissionCalendar(value: unknown): Record<string, number> {
  let parsed = value;

  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      return {};
    }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};

  const normalized = new Map<number, number>();
  for (const [timestamp, countValue] of Object.entries(parsed as Record<string, unknown>)) {
    const tsSeconds = toFiniteNumber(timestamp);
    const count = toNonNegativeInteger(countValue);
    if (tsSeconds === null || tsSeconds <= 0 || count <= 0) continue;

    const normalizedTimestamp = Math.floor(tsSeconds);
    normalized.set(normalizedTimestamp, (normalized.get(normalizedTimestamp) ?? 0) + count);
  }

  return Object.fromEntries(
    Array.from(normalized.entries())
      .sort(([a], [b]) => a - b)
      .map(([timestamp, count]) => [String(timestamp), count]),
  );
}

function computeMaxStreak(submissionCalendar: Record<string, number>): number {
  const activeDays = Array.from(
    Object.entries(submissionCalendar).reduce<Map<number, number>>((days, [ts, count]) => {
      if (!Number.isFinite(count) || count <= 0) return days;
      const localDayStart = toLocalDayStart(Number(ts));
      if (localDayStart === null) return days;
      days.set(localDayStart, (days.get(localDayStart) ?? 0) + count);
      return days;
    }, new Map()),
  )
    .map(([dayStart]) => dayStart)
    .sort((a, b) => a - b);

  let maxStreak = 0;
  let streak = 0;
  let previousDayStart: number | null = null;

  for (const dayStart of activeDays) {
    if (previousDayStart === null) {
      streak = 1;
    } else {
      const dayDiff = Math.round((dayStart - previousDayStart) / MS_PER_DAY);
      streak = dayDiff === 1 ? streak + 1 : 1;
    }

    maxStreak = Math.max(maxStreak, streak);
    previousDayStart = dayStart;
  }

  return maxStreak;
}

export function isAcceptedSubmissionStatus(status: unknown): boolean {
  return typeof status === 'string' && status.trim().toLowerCase() === 'accepted';
}

function isValidTitleSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && TITLE_SLUG_PATTERN.test(slug.trim());
}

function normalizeRecentSubmission(value: unknown): Submission | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  if (typeof raw.titleSlug !== 'string' || !raw.titleSlug.trim()) return null;

  return {
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : raw.titleSlug.trim(),
    titleSlug: raw.titleSlug.trim(),
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp.trim() : String(toNonNegativeInteger(raw.timestamp)),
    statusDisplay: typeof raw.statusDisplay === 'string' ? raw.statusDisplay.trim() : '',
    lang: typeof raw.lang === 'string' ? raw.lang.trim() : '',
  };
}

function normalizeRecentSubmissions(submissions: unknown): Submission[] {
  if (!Array.isArray(submissions)) return [];
  return submissions
    .map((submission) => normalizeRecentSubmission(submission))
    .filter((submission): submission is Submission => submission !== null)
    .slice(0, RECENT_SUBMISSION_LIMIT);
}

function normalizeTagStats(stats: unknown): TagStat[] {
  if (!Array.isArray(stats)) return [];

  const bySlug = new Map<string, TagStat>();
  for (const value of stats) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue;
    const raw = value as Record<string, unknown>;
    const tagName = typeof raw.tagName === 'string' ? raw.tagName.trim() : '';
    const tagSlug = typeof raw.tagSlug === 'string' ? raw.tagSlug.trim() : tagName.toLowerCase().replace(/\s+/g, '-');
    const problemsSolved = toNonNegativeInteger(raw.problemsSolved);
    if (!tagName || !tagSlug || problemsSolved <= 0) continue;

    const existing = bySlug.get(tagSlug);
    bySlug.set(tagSlug, {
      tagName,
      tagSlug,
      problemsSolved: Math.max(existing?.problemsSolved ?? 0, problemsSolved),
    });
  }

  return Array.from(bySlug.values()).sort((a, b) => b.problemsSolved - a.problemsSolved);
}

function normalizeLanguageStats(stats: unknown): LanguageStat[] {
  if (!Array.isArray(stats)) return [];

  return stats
    .flatMap((value): LanguageStat[] => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return [];
      const raw = value as Record<string, unknown>;
      const languageName = typeof raw.languageName === 'string' ? raw.languageName.trim() : '';
      const problemsSolved = toNonNegativeInteger(raw.problemsSolved);
      return languageName && problemsSolved > 0 ? [{ languageName, problemsSolved }] : [];
    })
    .sort((a, b) => b.problemsSolved - a.problemsSolved);
}

async function fetchRecentProblemDetails(submissions: Submission[]): Promise<Record<string, QuestionDetail>> {
  const acceptedSlugs = Array.from(
    new Set(
      submissions
        .filter((submission) => isAcceptedSubmissionStatus(submission.statusDisplay) && isValidTitleSlug(submission.titleSlug))
        .map((submission) => submission.titleSlug.trim()),
    ),
  );

  if (acceptedSlugs.length === 0) return {};

  const detailsBySlug: Record<string, QuestionDetail> = {};

  for (let start = 0; start < acceptedSlugs.length; start += QUESTION_DETAIL_BATCH_SIZE) {
    const slugBatch = acceptedSlugs.slice(start, start + QUESTION_DETAIL_BATCH_SIZE);
    const detailFields = slugBatch
      .map(
        (slug, index) => `
          q${index}: question(titleSlug: ${JSON.stringify(slug)}) {
            questionFrontendId
            difficulty
            topicTags { name slug }
          }
        `,
      )
      .join('\n');

    const detailQuery = `query {\n${detailFields}\n}`;
    const detailData = await gql<Record<string, QuestionDetail | null>>(detailQuery);

    for (const [index, slug] of slugBatch.entries()) {
      const detail = detailData[`q${index}`];
      if (detail) detailsBySlug[slug] = detail;
    }
  }

  return detailsBySlug;
}

function attachSubmissionDetails(
  submissions: Submission[],
  detailsBySlug: Record<string, QuestionDetail>,
): Submission[] {
  return submissions.map((submission) => {
    const detail = detailsBySlug[submission.titleSlug];
    const frontendId = detail?.questionFrontendId ? Number(detail.questionFrontendId) : NaN;

    return {
      ...submission,
      difficulty: detail?.difficulty,
      topicTags: detail?.topicTags ?? [],
      frontendId: Number.isFinite(frontendId) ? frontendId : undefined,
    };
  });
}

export async function fetchLeetCodeProfile(username: string): Promise<LeetCodeProfile> {
  const normalizedUsername = normalizeLeetCodeUsername(username);
  const usernameError = getLeetCodeUsernameError(normalizedUsername);
  if (usernameError) {
    throw new LeetCodeApiError(usernameError, 400);
  }

  const query = `
    query($u: String!, $l: Int!) {
      matchedUser(username: $u) {
        username
        profile { realName userAvatar ranking }
        submitStats {
          acSubmissionNum { difficulty count submissions }
          totalSubmissionNum { difficulty count submissions }
        }
        userCalendar { submissionCalendar streak totalActiveDays }
        badges { id displayName icon creationDate }
        languageProblemCount { languageName problemsSolved }
        tagProblemCounts {
          advanced { tagName tagSlug problemsSolved }
          intermediate { tagName tagSlug problemsSolved }
          fundamental { tagName tagSlug problemsSolved }
        }
      }
      allQuestionsCount { difficulty count }
      recentSubmissionList(username: $u, limit: $l) {
        title
        titleSlug
        timestamp
        statusDisplay
        lang
      }
      userContestRanking(username: $u) {
        rating
        attendedContestsCount
        globalRanking
        topPercentage
      }
    }
  `;

  const data = await gql<ProfileQueryData>(query, { u: normalizedUsername, l: RECENT_SUBMISSION_LIMIT });

  const user = data.matchedUser;
  if (!user) {
    throw new LeetCodeApiError(`User "${normalizedUsername}" not found on LeetCode.`, 404);
  }

  const recentSubmissionsRaw = normalizeRecentSubmissions(data.recentSubmissionList ?? []);
  let submissionDetails: Record<string, QuestionDetail> = {};
  try {
    submissionDetails = await fetchRecentProblemDetails(recentSubmissionsRaw);
  } catch {
    submissionDetails = {};
  }
  const recentSubmissions = attachSubmissionDetails(recentSubmissionsRaw, submissionDetails);

  const acNums = user.submitStats?.acSubmissionNum ?? [];
  const totalNums = user.submitStats?.totalSubmissionNum ?? [];
  const allQuestions = data.allQuestionsCount ?? [];

  const totalSolved = getDifficultyMetric(acNums, 'All', 'count');
  const easySolved = getDifficultyMetric(acNums, 'Easy', 'count');
  const mediumSolved = getDifficultyMetric(acNums, 'Medium', 'count');
  const hardSolved = getDifficultyMetric(acNums, 'Hard', 'count');
  const acceptedSubmissions = getDifficultyMetric(acNums, 'All', 'submissions');
  const totalSubmissions = getDifficultyMetric(totalNums, 'All', 'submissions');
  const acceptanceRate = totalSubmissions > 0
    ? clampPercent((Math.min(acceptedSubmissions, totalSubmissions) / totalSubmissions) * 100)
    : 0;

  const submissionCalendar = normalizeSubmissionCalendar(user.userCalendar?.submissionCalendar ?? {});
  const computedActiveDays = Object.values(submissionCalendar).filter((count) => count > 0).length;
  const maxStreak = computeMaxStreak(submissionCalendar);
  const apiCurrentStreak = toNonNegativeInteger(user.userCalendar?.streak);
  const currentStreak = maxStreak > 0 ? Math.min(apiCurrentStreak, maxStreak) : apiCurrentStreak;

  const contest = data.userContestRanking;
  const tagCounts = user.tagProblemCounts;

  return {
    username: user.username || normalizedUsername,
    realName: user.profile?.realName?.trim() || user.username || normalizedUsername,
    avatar: user.profile?.userAvatar || '',
    ranking: toNonNegativeInteger(user.profile?.ranking),
    totalSolved: Math.max(totalSolved, easySolved + mediumSolved + hardSolved),
    easySolved,
    mediumSolved,
    hardSolved,
    totalQuestions: getDifficultyMetric(allQuestions, 'All', 'count'),
    easyTotal: getDifficultyMetric(allQuestions, 'Easy', 'count'),
    mediumTotal: getDifficultyMetric(allQuestions, 'Medium', 'count'),
    hardTotal: getDifficultyMetric(allQuestions, 'Hard', 'count'),
    acceptanceRate,
    submissionCalendar,
    totalActiveDays: Math.max(toNonNegativeInteger(user.userCalendar?.totalActiveDays), computedActiveDays),
    maxStreak,
    currentStreak,
    recentSubmissions,
    tagStats: {
      advanced: normalizeTagStats(tagCounts?.advanced),
      intermediate: normalizeTagStats(tagCounts?.intermediate),
      fundamental: normalizeTagStats(tagCounts?.fundamental),
    },
    contestRating: toNonNegativeInteger(contest?.rating),
    contestAttended: toNonNegativeInteger(contest?.attendedContestsCount),
    contestGlobalRanking: toNonNegativeInteger(contest?.globalRanking),
    topPercentage: clampPercent(toFiniteNumber(contest?.topPercentage) ?? 0),
    badges: user.badges ?? [],
    languageStats: normalizeLanguageStats(user.languageProblemCount),
  };
}
