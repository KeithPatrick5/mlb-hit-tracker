'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PlayerRanking, RankingsPayload, TeamRanking } from '@/lib/types';

type LoadState = 'loading' | 'ready' | 'refreshing' | 'error';

function PatternDots({ player }: { player: PlayerRanking }) {
  return (
    <span className="pattern" aria-label={`${player.gamesWithHit} hit games and ${player.gamesWithoutHit} no-hit games`}>
      {player.gamePattern.map((game, index) => (
        <span
          key={`${game.date}-${index}`}
          className={game.hadHit ? 'dot hit-dot' : 'dot miss-dot'}
          title={`${game.date}: ${game.line}`}
        >
          {game.hadHit ? 'H' : '0'}
        </span>
      ))}
    </span>
  );
}

function PlayerRow({ player, rank }: { player: PlayerRanking; rank: number }) {
  return (
    <li className="player">
      <span className="rank">{rank}</span>
      <span>
        <span className="name">{player.name}</span>
        <span className="statline">
          {player.position} · {player.gamesWithHit} games with a hit · {player.gamesWithoutHit} without · {player.hits} total hits
        </span>
        <PatternDots player={player} />
      </span>
      <span className="hits">{player.gamesWithHit}/{player.games}</span>
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
      <h2>League-wide consistency top 25</h2>
      <p className="muted">Ranked by games with at least one hit in each player&apos;s last 10 games.</p>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Team</th>
            <th>Hit Games</th>
            <th>No-Hit Games</th>
            <th>Total Hits</th>
            <th>Rate</th>
            <th>Last 10</th>
          </tr>
        </thead>
        <tbody>
          {data.leaders.map((player, index) => (
            <tr key={player.playerId}>
              <td>{index + 1}</td>
              <td><strong>{player.name}</strong></td>
              <td>{player.abbreviation}</td>
              <td>{player.gamesWithHit}/{player.games}</td>
              <td>{player.gamesWithoutHit}</td>
              <td>{player.hits}</td>
              <td>{player.hitRate}</td>
              <td><PatternDots player={player} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard({ initialData = null }: { initialData?: RankingsPayload | null }) {
  const [data, setData] = useState<RankingsPayload | null>(initialData);
  const [state, setState] = useState<LoadState>(initialData ? 'ready' : 'loading');
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
    if (!initialData) load();
  }, [initialData]);

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
          <p className="eyebrow">Daily MLB hit consistency</p>
          <h1>Top 3 hit-game players by team.</h1>
          <p className="lede">
            This ranks hitters by how often they recorded at least one hit in their last 10 games played. Total hits are used as the tiebreaker.
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
              <h2>What this means</h2>
              <p className="muted">A player at 8/10 had at least one hit in 8 of his last 10 games. A 0 means that game had no hit.</p>
              <ol className="rank-list">
                <li className="player"><span className="rank">1</span><span><span className="name">Primary stat</span><span className="statline">Games with at least one hit</span></span><span className="hits">8/10</span></li>
                <li className="player"><span className="rank">2</span><span><span className="name">Tiebreaker</span><span className="statline">Total hits in those 10 games</span></span><span className="hits">H</span></li>
                <li className="player"><span className="rank">3</span><span><span className="name">Before using it</span><span className="statline">Check today&apos;s lineup separately</span></span><span className="hits">Live</span></li>
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

          <p className="footer-note">{data.note} MLB data can lag during live games. Always verify current starting lineups separately.</p>
        </>
      )}

      {!data && state === 'loading' && <div className="card">Loading MLB consistency rankings...</div>}
    </main>
  );
}
