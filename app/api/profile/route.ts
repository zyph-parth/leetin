import { NextRequest, NextResponse } from 'next/server';
import { fetchLeetCodeProfile } from '@/lib/leetcode';

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username');
  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }

  try {
    const profile = await fetchLeetCodeProfile(username.trim());
    return NextResponse.json(profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch profile';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
