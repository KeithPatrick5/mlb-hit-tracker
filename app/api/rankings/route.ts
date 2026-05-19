import { NextResponse } from 'next/server';
import { buildRankings } from '@/lib/mlb';
import { getCachedRankings, saveRankings } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const cached = await getCachedRankings();
    if (cached) return NextResponse.json(cached);

    const payload = await buildRankings();
    await saveRankings(payload);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load rankings.' },
      { status: 500 },
    );
  }
}
