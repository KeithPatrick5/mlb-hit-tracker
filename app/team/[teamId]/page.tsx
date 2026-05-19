import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildRankings } from '@/lib/mlb';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const data = await buildRankings();
  const team = data.teams.find((item) => String(item.teamId) === teamId);

  if (!team) notFound();

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">
          <span className="logo-mark">{team.abbreviation}</span>
          <div>
            <h1>{team.teamName}</h1>
            <p>Top 3 by games with 1+ hit in last 10. Updated SF: {data.generatedAtSanFrancisco}</p>
          </div>
        </div>
        <div className="actions">
          <Link className="btn" href="/">Back</Link>
        </div>
      </header>

      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <span className="section-label">Team board</span>
            <h2>Hit consistency</h2>
          </div>
          <span className="micro-copy">Ranked by hit games</span>
        </div>
        <div className="table-scroll">
          <table className="market-table leaders-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Pos</th>
                <th>Hit Games</th>
                <th>No-Hit</th>
                <th>Total H</th>
                <th>Rate</th>
                <th>Last 10</th>
                <th>Last Game</th>
              </tr>
            </thead>
            <tbody>
              {team.players.map((player, index) => (
                <tr key={player.playerId}>
                  <td className="rank-cell">{index + 1}</td>
                  <td><strong>{player.name}</strong></td>
                  <td>{player.position}</td>
                  <td className="value good">{player.gamesWithHit}/{player.games}</td>
                  <td className="value bad">{player.gamesWithoutHit}</td>
                  <td className="value">{player.hits}</td>
                  <td>{player.hitRate}</td>
                  <td>
                    <span className="pattern">
                      {player.gamePattern.map((game, gameIndex) => (
                        <span key={`${game.date}-${gameIndex}`} className={game.hadHit ? 'mark hit-mark' : 'mark miss-mark'} title={`${game.date}: ${game.line}`}>
                          {game.hadHit ? 'H' : '0'}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td>{player.lastGameLine}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
