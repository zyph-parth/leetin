import { NextRequest, NextResponse } from 'next/server';
import { fetchLeetCodeProfile, LeetCodeApiError } from '@/lib/leetcode';
import { checkRateLimit, type RateLimitEntry } from '@/lib/rate-limit';
import { getLeetCodeUsernameError, normalizeLeetCodeUsername } from '@/lib/username';

export const runtime = 'nodejs';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_MAX_KEYS = 5_000;

const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientKey(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || req.headers.get('x-real-ip') || 'local';
}

export async function GET(req: NextRequest) {
  const username = normalizeLeetCodeUsername(req.nextUrl.searchParams.get('username') ?? '');
  const usernameError = getLeetCodeUsernameError(username);

  if (usernameError) {
    return NextResponse.json(
      { error: usernameError },
      { status: 400 },
    );
  }

  const rateLimit = checkRateLimit(
    rateLimitStore,
    getClientKey(req),
    {
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
      maxEntries: RATE_LIMIT_MAX_KEYS,
    },
  );

  if (rateLimit.limited) {
    return NextResponse.json(
      { error: 'Too many profile lookups. Please wait a moment and try again.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSec) },
      },
    );
  }

  try {
    const profile = await fetchLeetCodeProfile(username);
    return NextResponse.json(profile);
  } catch (err) {
    if (err instanceof LeetCodeApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    const message = err instanceof Error ? err.message : 'Failed to fetch profile';
    const status = /not found/i.test(message) ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
