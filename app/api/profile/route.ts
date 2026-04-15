import { NextRequest, NextResponse } from 'next/server';
import { fetchLeetCodeProfile, LeetCodeApiError } from '@/lib/leetcode';

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')?.trim();
  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
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
