import Dashboard from '@/components/Dashboard';
import { buildRankings } from '@/lib/mlb';
import { getCachedRankings, saveRankings } from '@/lib/storage';
import type { RankingsPayload } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function getInitialRankings(): Promise<RankingsPayload | null> {
  try {
    const cached = await getCachedRankings();
    if (cached) return cached;

    const payload = await buildRankings();
    await saveRankings(payload);
    return payload;
  } catch (error) {
    console.error('Home page rankings failed:', error);
    return null;
  }
}

export default async function Home() {
  const initialData = await getInitialRankings();
  return <Dashboard initialData={initialData} />;
}
