import { NextResponse } from 'next/server';
import { buildRankings, rankingsToCsv } from '@/lib/mlb';
import { getCachedRankings, saveRankings } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const payload = (await getCachedRankings()) || (await buildRankings());
    await saveRankings(payload);
    const csv = rankingsToCsv(payload);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="mlb-top-hitters-last10.csv"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to export rankings.' },
      { status: 500 },
    );
  }
}
