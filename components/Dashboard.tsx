'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PlayerRanking, RankingsPayload, TeamRanking } from '@/lib/types';

type LoadState = 'loading' | 'ready' | 'refreshing' | 'error';

function PatternStrip({ player }: { player: PlayerRanking }) {
  return (
    <span className="pattern" aria-label={`${player.gamesWithHit} hit games and ${player.gamesWithoutHit} no-hit games`}>
      {player.gamePattern.map((game, index) => (
        <span
          key={`${game.date}-${index}`}
          className={game.hadHit ? 'mark hit-mark' : 'mark miss-mark'}
          title={`${game.date}: ${game.line}`}
        >
          {game.hadHit ? 'H' : '0'}
        </span>
      ))}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="mini-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TeamMarket({ team }: { team: TeamRanking }) {
  return (
    <article className="market-card">
      <div className="market-head">
        <div>
          <span className="ticker">{team.abbreviation}</span>
          <h2>{team.teamName}</h2>
        </div>
        <a className="mini-link" href={`/team/${team.teamId}`}>Detail</a>
      </div>

      <table className="market-table team-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Hit</th>
            <th>No</th>
            <th>Total</th>
            <th>Last 10</th>
          </tr>
        </thead>
        <tbody>
          {team.players.map((player, index) => (
            <tr key={player.playerId}>
              <td className="rank-cell">{index + 1}</td>
              <td>
                <strong>{player.name}</strong>
                <span className="subline">{player.position} · last: {player.lastGameLine}</span>
              </td>
              <td className="value good">{player.gamesWithHit}/{player.games}</td>
              <td className="value bad">{player.gamesWithoutHit}</td>
              <td className="value">{player.hits}</td>
              <td><PatternStrip player={player} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function LeaderTable({ data }: { data: RankingsPayload }) {
  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <div>
          <span className="section-label">Exchange board</span>
          <h2>League consistency top 25</h2>
        </div>
        <span className="micro-copy">Ranked by games with 1+ hit</span>
      </div>
      <div className="table-scroll">
        <table className="market-table leaders-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Team</th>
              <th>Hit Games</th>
              <th>No-Hit</th>
              <th>Total H</th>
              <th>Rate</th>
              <th>Last 10</th>
            </tr>
          </thead>
          <tbody>
            {data.leaders.map((player, index) => (
              <tr key={player.playerId}>
                <td className="rank-cell">{index + 1}</td>
                <td>
                  <strong>{player.name}</strong>
                  <span className="subline">{player.position} · {player.lastGameLine}</span>
                </td>
                <td>{player.abbreviation}</td>
                <td className="value good">{player.gamesWithHit}/{player.games}</td>
                <td className="value bad">{player.gamesWithoutHit}</td>
                <td className="value">{player.hits}</td>
                <td>{player.hitRate}</td>
                <td><PatternStrip player={player} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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

  const trackedPlayers = data ? data.teams.reduce((sum, team) => sum + team.players.length, 0) : 0;
  const bestRate = data?.leaders[0] ? `${data.leaders[0].gamesWithHit}/${data.leaders[0].games}` : '—';

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">
          <span className="logo-mark">MLB</span>
          <div>
            <h1>Hit Consistency Tracker</h1>
            <p>Top 3 per team by games with 1+ hit in last 10.</p>
          </div>
        </div>
        <div className="actions">
          <button className="btn primary" disabled={state === 'refreshing'} onClick={() => load('/api/refresh', 'refreshing')}>
            {state === 'refreshing' ? 'Refreshing' : 'Refresh'}
          </button>
          <a className="btn" href="/api/export">CSV</a>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      {data && (
        <>
          <section className="status-grid">
            <MiniStat label="Updated SF" value={data.generatedAtSanFrancisco} />
            <MiniStat label="Teams" value={data.teams.length} />
            <MiniStat label="Players" value={trackedPlayers} />
            <MiniStat label="Best rate" value={bestRate} />
            <MiniStat label="Cache" value={data.cache} />
          </section>

          <LeaderTable data={data} />

          <section className="filter-row">
            <input className="search" placeholder="Search team or player" value={query} onChange={(event) => setQuery(event.target.value)} />
            <span>{filteredTeams.length} teams</span>
            <span className="legend"><b className="hit-sample">H</b> hit game <b className="miss-sample">0</b> no-hit game</span>
          </section>

          <section className="market-grid">
            {filteredTeams.map((team) => <TeamMarket key={team.teamId} team={team} />)}
          </section>

          <footer className="footer-note">
            {data.note} Verify current starting lineups separately before making any decisions.
          </footer>
        </>
      )}

      {!data && state === 'loading' && <div className="panel loading">Loading MLB consistency rankings...</div>}
    </main>
  );
}
