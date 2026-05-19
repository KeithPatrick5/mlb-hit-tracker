# MLB Hit Consistency Tracker

Vercel-ready Next.js dashboard for ranking the top 3 MLB hitters on each team by hit consistency over their last 10 games played.

## What it ranks

Primary stat:

- Games with at least one hit in the player's last 10 games played with at least one at-bat

Tiebreakers:

1. Total hits in those 10 games
2. Last-10 batting average
3. Player name

Example:

- 7/10 means the player recorded at least one hit in 7 of his last 10 games
- 3 no-hit games means 3 of those 10 games had zero hits
- The H/0 pattern shows each game in the last 10, newest first

## Routes

- `/` dashboard
- `/api/rankings` JSON rankings
- `/api/refresh` manual refresh endpoint
- `/api/export` CSV download
- `/team/[teamId]` team detail page

## Deploy

Push to GitHub and import the repo into Vercel as a Next.js project.

## Optional cache

Add these Vercel environment variables for Upstash Redis caching:

```bash
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

Without Redis, the app still works live, but refreshes are slower because it has to fetch MLB data directly.
