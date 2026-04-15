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
  return typeof value === 'number' ? value : 0;
}

function toLocalDayStart(tsSeconds: number): number {
  const d = new Date(tsSeconds * 1000);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function computeMaxStreak(submissionCalendar: Record<string, number>): number {
  const activeDays = Array.from(
    Object.entries(submissionCalendar).reduce<Map<number, number>>((days, [ts, count]) => {
      if (count <= 0) return days;
      const localDayStart = toLocalDayStart(Number(ts));
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

async function fetchRecentProblemDetails(submissions: Submission[]): Promise<Record<string, QuestionDetail>> {
  const acceptedSlugs = Array.from(
    new Set(
      submissions
        .filter((submission) => submission.statusDisplay === 'Accepted' && submission.titleSlug)
        .map((submission) => submission.titleSlug),
    ),
  );

  if (acceptedSlugs.length === 0) return {};

  const detailsBySlug: Record<string, QuestionDetail> = {};

  for (let start = 0; start < acceptedSlugs.length; start += QUESTION_DETAIL_BATCH_SIZE) {
    const slugBatch = acceptedSlugs.slice(start, start + QUESTION_DETAIL_BATCH_SIZE);
    const detailFields = slugBatch
      .map(
        (slug, index) => `
          q${index}: question(titleSlug: "${slug}") {
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

  const data = await gql<ProfileQueryData>(query, { u: username, l: RECENT_SUBMISSION_LIMIT });

  const user = data.matchedUser;
  if (!user) {
    throw new LeetCodeApiError(`User "${username}" not found on LeetCode.`, 404);
  }

  const recentSubmissionsRaw = data.recentSubmissionList ?? [];
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
  const totalSubmissions = getDifficultyMetric(totalNums, 'All', 'submissions');
  const acceptanceRate = totalSubmissions > 0
    ? Math.round((totalSolved / totalSubmissions) * 100)
    : 0;

  const rawCalendar = user.userCalendar?.submissionCalendar ?? '{}';
  let submissionCalendar: Record<string, number> = {};
  try {
    submissionCalendar = JSON.parse(rawCalendar) as Record<string, number>;
  } catch {
    submissionCalendar = {};
  }

  const contest = data.userContestRanking;
  const tagCounts = user.tagProblemCounts;

  return {
    username: user.username,
    realName: user.profile?.realName || user.username,
    avatar: user.profile?.userAvatar || '',
    ranking: user.profile?.ranking || 0,
    totalSolved,
    easySolved: getDifficultyMetric(acNums, 'Easy', 'count'),
    mediumSolved: getDifficultyMetric(acNums, 'Medium', 'count'),
    hardSolved: getDifficultyMetric(acNums, 'Hard', 'count'),
    totalQuestions: getDifficultyMetric(allQuestions, 'All', 'count'),
    easyTotal: getDifficultyMetric(allQuestions, 'Easy', 'count'),
    mediumTotal: getDifficultyMetric(allQuestions, 'Medium', 'count'),
    hardTotal: getDifficultyMetric(allQuestions, 'Hard', 'count'),
    acceptanceRate,
    submissionCalendar,
    totalActiveDays: user.userCalendar?.totalActiveDays || 0,
    maxStreak: computeMaxStreak(submissionCalendar),
    currentStreak: user.userCalendar?.streak || 0,
    recentSubmissions,
    tagStats: {
      advanced: (tagCounts?.advanced ?? []).sort((a, b) => b.problemsSolved - a.problemsSolved),
      intermediate: (tagCounts?.intermediate ?? []).sort((a, b) => b.problemsSolved - a.problemsSolved),
      fundamental: (tagCounts?.fundamental ?? []).sort((a, b) => b.problemsSolved - a.problemsSolved),
    },
    contestRating: Math.round(contest?.rating || 0),
    contestAttended: contest?.attendedContestsCount || 0,
    contestGlobalRanking: contest?.globalRanking || 0,
    topPercentage: contest?.topPercentage || 0,
    badges: user.badges ?? [],
    languageStats: (user.languageProblemCount ?? []).sort((a, b) => b.problemsSolved - a.problemsSolved),
  };
}
