import { NextRequest, NextResponse } from 'next/server';
import { buildRankings } from '@/lib/mlb';
import { saveRankings } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const provided = request.nextUrl.searchParams.get('secret');
  const cron = request.nextUrl.searchParams.get('cron');
  return provided === secret || cron === '1';
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized refresh request.' }, { status: 401 });
  }

  try {
    const payload = await buildRankings();
    await saveRankings(payload);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to refresh rankings.' },
      { status: 500 },
    );
  }
}
