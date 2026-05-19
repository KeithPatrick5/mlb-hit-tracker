'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RankingsPayload, TeamRanking } from '@/lib/types';

type LoadState = 'loading' | 'ready' | 'refreshing' | 'error';

function PlayerRow({ player, rank }: { player: TeamRanking['players'][number]; rank: number }) {
  return (
    <li className="player">
      <span className="rank">{rank}</span>
      <span>
        <span className="name">{player.name}</span>
        <span className="statline">
          {player.position} · hit in {player.gamesWithHit}/{player.games} · {player.average} AVG · last {player.lastGameLine}
        </span>
      </span>
      <span className="hits">{player.hits} H</span>
    </li>
  );
}

function TeamCard({ team }: { team: TeamRanking }) {
  return (
    <article className="card team-card">
      <div className="team-head">
        <div>
          <h2>{team.teamName}</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>{team.abbreviation}</p>
        </div>
        <a className="btn" href={`/team/${team.teamId}`}>Open</a>
      </div>
      <ol className="rank-list">
        {team.players.map((player, index) => (
          <PlayerRow key={player.playerId} player={player} rank={index + 1} />
        ))}
      </ol>
    </article>
  );
}

function LeaderTable({ data }: { data: RankingsPayload }) {
  return (
    <div className="card table-wrap">
      <h2>League-wide top 25</h2>
      <p className="muted">Best recent hit volume across all active MLB hitters.</p>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Team</th>
            <th>Hits</th>
            <th>Hit Games</th>
            <th>AVG</th>
            <th>Last Game</th>
          </tr>
        </thead>
        <tbody>
          {data.leaders.map((player, index) => (
            <tr key={player.playerId}>
              <td>{index + 1}</td>
              <td><strong>{player.name}</strong></td>
              <td>{player.abbreviation}</td>
              <td>{player.hits}</td>
              <td>{player.gamesWithHit}/{player.games}</td>
              <td>{player.average}</td>
              <td>{player.lastGameLine}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<RankingsPayload | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  async function load(endpoint = '/api/rankings', nextState: LoadState = 'loading') {
    setState(nextState);
    setError(null);
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Request failed.');
      setData(payload);
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setState('error');
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredTeams = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return data.teams;
    return data.teams.filter((team) => {
      return (
        team.teamName.toLowerCase().includes(needle) ||
        team.abbreviation.toLowerCase().includes(needle) ||
        team.players.some((player) => player.name.toLowerCase().includes(needle))
      );
    });
  }, [data, query]);

  return (
    <main className="page">
      <section className="header">
        <div>
          <p className="eyebrow">Daily MLB hitter form</p>
          <h1>Top 3 hit leaders by team.</h1>
          <p className="lede">
            Rankings are based on hits over each player&apos;s last 10 games played with at least one at-bat. Built for quick daily checks, not miracle locks.
          </p>
        </div>
        <div className="toolbar">
          <button className="btn primary" disabled={state === 'refreshing'} onClick={() => load('/api/refresh', 'refreshing')}>
            {state === 'refreshing' ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <a className="btn" href="/api/export">Export CSV</a>
        </div>
      </section>

      {error && <div className="card error">{error}</div>}

      {data && (
        <>
          <div className="status">
            <span className="pill">Updated: {data.generatedAtSanFrancisco}</span>
            <span className="pill">Time zone: San Francisco</span>
            <span className="pill">Season: {data.season}</span>
            <span className="pill">Source: {data.source}</span>
            <span className="pill">Cache: {data.cache}</span>
          </div>

          <section className="two-col section">
            <LeaderTable data={data} />
            <div className="card">
              <h2>Combo builder starter rules</h2>
              <p className="muted">Use this as a shortlist, then check lineups, opponent pitcher, injuries, and odds before doing anything dumb.</p>
              <ol className="rank-list">
                <li className="player"><span className="rank">1</span><span><span className="name">Start with 10+ hits</span><span className="statline">Recent volume filter</span></span><span className="hits">10+</span></li>
                <li className="player"><span className="rank">2</span><span><span className="name">Hit in 7 of 10</span><span className="statline">Consistency filter</span></span><span className="hits">7/10</span></li>
                <li className="player"><span className="rank">3</span><span><span className="name">Confirm starting lineup</span><span className="statline">Do not skip this</span></span><span className="hits">Live</span></li>
              </ol>
            </div>
          </section>

          <section className="section">
            <div className="controls">
              <input className="search" placeholder="Search team or player..." value={query} onChange={(event) => setQuery(event.target.value)} />
              <span className="muted">Showing {filteredTeams.length} teams</span>
            </div>
            <div className="grid">
              {filteredTeams.map((team) => <TeamCard key={team.teamId} team={team} />)}
            </div>
          </section>

          <p className="footer-note">{data.note} MLB data can lag during live games. For props or combos, verify current starting lineups separately before using the list.</p>
        </>
      )}

      {!data && state === 'loading' && <div className="card">Loading MLB rankings...</div>}
    </main>
  );
}
