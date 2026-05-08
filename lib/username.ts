export const LEETCODE_USERNAME_MAX_LENGTH = 30;
export const LEETCODE_USERNAME_PATTERN = /^[A-Za-z0-9_-]{1,30}$/;

export function normalizeLeetCodeUsername(value: string): string {
  return value.trim();
}

export function isValidLeetCodeUsername(value: string): boolean {
  return LEETCODE_USERNAME_PATTERN.test(normalizeLeetCodeUsername(value));
}

export function getLeetCodeUsernameError(value: string): string | null {
  const username = normalizeLeetCodeUsername(value);

  if (!username) return 'Username required';

  if (username.length > LEETCODE_USERNAME_MAX_LENGTH) {
    return `LeetCode usernames must be ${LEETCODE_USERNAME_MAX_LENGTH} characters or fewer.`;
  }

  if (!LEETCODE_USERNAME_PATTERN.test(username)) {
    return 'Use a valid LeetCode username with letters, numbers, underscores, or hyphens.';
  }

  return null;
}
