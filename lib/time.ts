export const DATA_TIME_ZONE = 'America/Los_Angeles';

export function getCurrentSeason(): number {
  const now = new Date();
  return now.getUTCMonth() < 2 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
}

export function formatSanFranciscoTime(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DATA_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(value);
}
