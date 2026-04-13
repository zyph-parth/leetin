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

export interface Submission {
  title: string;
  titleSlug: string;
  timestamp: string;
  statusDisplay: string;
  lang: string;
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

interface MatchedUserStatsResponse {
  matchedUser?: {
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
  };
  allQuestionsCount?: DifficultyCount[];
}

interface CalendarResponse {
  matchedUser?: {
    userCalendar?: {
      submissionCalendar?: string;
      streak?: number;
      totalActiveDays?: number;
    };
  };
}

interface RecentSubmissionsResponse {
  recentSubmissionList?: Submission[];
}

interface ContestResponse {
  userContestRanking?: {
    rating?: number;
    attendedContestsCount?: number;
    globalRanking?: number;
    topPercentage?: number;
  };
}

interface BadgeResponse {
  matchedUser?: {
    badges?: Badge[];
  };
}

interface LanguageResponse {
  matchedUser?: {
    languageProblemCount?: LanguageStat[];
  };
}

interface TagResponse {
  matchedUser?: {
    tagProblemCounts?: {
      advanced?: TagStat[];
      intermediate?: TagStat[];
      fundamental?: TagStat[];
    };
  };
}

const LEETCODE_API = 'https://leetcode.com/graphql';

async function gql(query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch(LEETCODE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com' },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 300 } // Cache the response for 5 minutes (300 seconds)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || 'GraphQL error');
  return json.data;
}

export async function fetchLeetCodeProfile(username: string): Promise<LeetCodeProfile> {
  // Combine all 7 separate requests into one single GraphQL query
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
        title titleSlug timestamp statusDisplay lang
      }
      userContestRanking(username: $u) {
        rating attendedContestsCount globalRanking topPercentage
      }
    }
  `;

  // Make 1 single network request instead of 7
  const data = await gql(query, { u: username, l: 50 });

  const user = data?.matchedUser;
  if (!user) throw new Error(`User "${username}" not found on LeetCode`);

  const acNums = user.submitStats?.acSubmissionNum || [];
  const totalNums = user.submitStats?.totalSubmissionNum || [];
  const allQ = data?.allQuestionsCount || [];

  const getSolved = (d: string) => acNums.find((x: any) => x.difficulty === d)?.count || 0;
  const getTotalSubs = (d: string) => totalNums.find((x: any) => x.difficulty === d)?.submissions || 0;
  const getTotal = (d: string) => allQ.find((x: any) => x.difficulty === d)?.count || 0;

  const totalSolved = getSolved('All');
  const totalSubmissions = getTotalSubs('All');
  const acceptanceRate = totalSubmissions > 0
    ? Math.round((totalSolved / totalSubmissions) * 100)
    : 0;

  const rawCal = user.userCalendar?.submissionCalendar || '{}';
  let submissionCalendar: Record<string, number> = {};
  try { submissionCalendar = JSON.parse(rawCal); } catch {}

  const currentStreak = user.userCalendar?.streak || 0;
  const totalActiveDays = user.userCalendar?.totalActiveDays || 0;

  const sortedDays = Object.entries(submissionCalendar)
    .sort(([a], [b]) => parseInt(a) - parseInt(b));
  let maxStreak = 0, streak = 0;
  let prevTs = 0;
  for (const [ts, count] of sortedDays) {
    const dayTs = parseInt(ts);
    if (!prevTs) {
      streak = (count as number) > 0 ? 1 : 0;
    } else {
      const dayDiff = Math.round((dayTs - prevTs) / 86400);
      if (dayDiff === 1 && (count as number) > 0) {
        streak++;
      } else if (dayDiff !== 0) {
        streak = (count as number) > 0 ? 1 : 0;
      }
    }
    maxStreak = Math.max(maxStreak, streak);
    prevTs = dayTs;
  }

  const recentSubmissions: Submission[] = data?.recentSubmissionList || [];
  const contest = data?.userContestRanking;
  const badges: Badge[] = user.badges || [];
  const languageStats: LanguageStat[] = (user.languageProblemCount || [])
    .sort((a: LanguageStat, b: LanguageStat) => b.problemsSolved - a.problemsSolved);

  const tagCounts = user.tagProblemCounts;
  const tagStats = {
    advanced: (tagCounts?.advanced || []).sort((a: TagStat, b: TagStat) => b.problemsSolved - a.problemsSolved),
    intermediate: (tagCounts?.intermediate || []).sort((a: TagStat, b: TagStat) => b.problemsSolved - a.problemsSolved),
    fundamental: (tagCounts?.fundamental || []).sort((a: TagStat, b: TagStat) => b.problemsSolved - a.problemsSolved),
  };

  return {
    username: user.username,
    realName: user.profile?.realName || user.username,
    avatar: user.profile?.userAvatar || '',
    ranking: user.profile?.ranking || 0,
    totalSolved,
    easySolved: getSolved('Easy'),
    mediumSolved: getSolved('Medium'),
    hardSolved: getSolved('Hard'),
    totalQuestions: getTotal('All'),
    easyTotal: getTotal('Easy'),
    mediumTotal: getTotal('Medium'),
    hardTotal: getTotal('Hard'),
    acceptanceRate,
    submissionCalendar,
    totalActiveDays,
    maxStreak,
    currentStreak,
    recentSubmissions,
    tagStats,
    contestRating: Math.round(contest?.rating || 0),
    contestAttended: contest?.attendedContestsCount || 0,
    contestGlobalRanking: contest?.globalRanking || 0,
    topPercentage: contest?.topPercentage || 0,
    badges,
    languageStats,
  };
}
