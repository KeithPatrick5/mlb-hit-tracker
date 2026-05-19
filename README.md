# MLB Hit Tracker

A Vercel-ready Next.js dashboard that ranks the top 3 hitters on every MLB team by hits over each player's last 10 games played.

## What it shows

- Top 3 hitters per MLB team
- League-wide top 25 leaderboard
- Team detail pages
- Manual refresh button
- CSV export
- Last updated time shown in San Francisco time
- Optional Redis cache using Upstash REST env vars

## Local setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy to Vercel

```bash
git add .
git commit -m "Add MLB hit tracker dashboard"
git push origin main
```

Then import the repo into Vercel or connect it to an existing Vercel project.

## Daily refresh timing

`vercel.json` runs the refresh endpoint every day at `15:00 UTC`, which is `8:00 AM San Francisco time` during Pacific Daylight Time.

Vercel cron schedules are UTC-only, so adjust the schedule later if you want exact local behavior across daylight saving changes.

## Optional persistent cache

The app works without storage by fetching fresh data when requested. For better performance and stable cached results, create an Upstash Redis database and add these Vercel environment variables:

```bash
UPSTASH_REDIS_REST_URL=your_upstash_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_rest_token
```

Optional cron protection:

```bash
CRON_SECRET=some_long_random_string
```

Then call:

```text
/api/refresh?secret=some_long_random_string
```

The built-in Vercel cron uses `/api/refresh?cron=1` and is allowed automatically.

## Notes

This uses public MLB Stats API endpoints. For a paid commercial product, verify data licensing before selling access.
