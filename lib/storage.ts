import type { RankingsPayload } from './types';

const CACHE_KEY = 'mlb-hit-tracker:hit-consistency:v2';
const TTL_SECONDS = 60 * 60 * 18;

type RedisResult<T> = { result?: T };

function hasRedis() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redisFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!hasRedis()) return null;
  const base = process.env.UPSTASH_REDIS_REST_URL as string;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN as string;
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export async function getCachedRankings(): Promise<RankingsPayload | null> {
  const data = await redisFetch<RedisResult<string>>(`/get/${encodeURIComponent(CACHE_KEY)}`);
  if (!data?.result) return null;
  try {
    const parsed = JSON.parse(data.result) as RankingsPayload;
    return { ...parsed, cache: 'redis' };
  } catch {
    return null;
  }
}

export async function saveRankings(payload: RankingsPayload): Promise<void> {
  if (!hasRedis()) return;
  const body = JSON.stringify([['SET', CACHE_KEY, JSON.stringify(payload), 'EX', TTL_SECONDS]]);
  await redisFetch('/pipeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
