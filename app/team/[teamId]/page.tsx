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
      <section className="header">
        <div>
          <p className="eyebrow">Team detail</p>
          <h1>{team.teamName}</h1>
          <p className="lede">Top 3 by games with at least one hit in each player&apos;s last 10 games. Updated in San Francisco time: {data.generatedAtSanFrancisco}</p>
        </div>
        <Link className="btn" href="/">Back</Link>
      </section>

      <section className="card table-wrap">
        <h2>Top 3 hit consistency</h2>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Position</th>
              <th>Hit Games</th>
              <th>No-Hit Games</th>
              <th>Total Hits</th>
              <th>Rate</th>
              <th>Last 10</th>
              <th>Last Game</th>
            </tr>
          </thead>
          <tbody>
            {team.players.map((player, index) => (
              <tr key={player.playerId}>
                <td>{index + 1}</td>
                <td><strong>{player.name}</strong></td>
                <td>{player.position}</td>
                <td>{player.gamesWithHit}/{player.games}</td>
                <td>{player.gamesWithoutHit}</td>
                <td>{player.hits}</td>
                <td>{player.hitRate}</td>
                <td>{player.gamePattern.map((game) => (game.hadHit ? 'H' : '0')).join(' ')}</td>
                <td>{player.lastGameLine}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
