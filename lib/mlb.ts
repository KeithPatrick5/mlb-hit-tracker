import { formatSanFranciscoTime, getCurrentSeason } from './time';
import type { PlayerRanking, RankingsPayload, TeamRanking } from './types';

const MLB_BASE = 'https://statsapi.mlb.com/api/v1';
const SOURCE = 'MLB Stats API';

type MlbTeam = {
  id: number;
  name: string;
  abbreviation?: string;
};

type RosterPerson = {
  person: { id: number; fullName: string };
  position?: { abbreviation?: string; type?: string; name?: string };
};

type TeamRoster = {
  team: MlbTeam;
  players: Array<{
    id: number;
    name: string;
    position: string;
  }>;
};

type PeopleStatsResponse = {
  people?: Array<{
    id: number;
    fullName: string;
    stats?: Array<{
      type?: { displayName?: string };
      group?: { displayName?: string };
      splits?: Array<{
        date?: string;
        stat?: {
          gamesPlayed?: number;
          atBats?: number;
          hits?: number;
        };
      }>;
    }>;
  }>;
};

async function mlbFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${MLB_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'mlb-hit-tracker/1.0',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`MLB API error ${response.status} for ${path}`);
  }

  return (await response.json()) as T;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function formatAverage(hits: number, atBats: number): string {
  if (!atBats) return '.000';
  return (hits / atBats).toFixed(3).replace(/^0/, '');
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

async function getTeams(season: number): Promise<MlbTeam[]> {
  const data = await mlbFetch<{ teams?: MlbTeam[] }>(`/teams?sportId=1&season=${season}`);
  return (data.teams || [])
    .filter((team) => team.id && team.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function getRoster(team: MlbTeam): Promise<TeamRoster> {
  const data = await mlbFetch<{ roster?: RosterPerson[] }>(`/teams/${team.id}/roster?rosterType=active`);
  const players = (data.roster || [])
    .filter((item) => item.person?.id && item.person?.fullName)
    .filter((item) => {
      const type = item.position?.type || '';
      const abbr = item.position?.abbreviation || '';
      return type !== 'Pitcher' && abbr !== 'P';
    })
    .map((item) => ({
      id: item.person.id,
      name: item.person.fullName,
      position: item.position?.abbreviation || item.position?.name || 'H',
    }));

  return { team, players };
}

async function getAllRosters(teams: MlbTeam[]): Promise<TeamRoster[]> {
  const results: TeamRoster[] = [];
  for (const teamGroup of chunk(teams, 6)) {
    const settled = await Promise.allSettled(teamGroup.map((team) => getRoster(team)));
    for (const item of settled) {
      if (item.status === 'fulfilled') results.push(item.value);
    }
  }
  return results;
}

async function getPlayerGameLogs(playerIds: number[], season: number): Promise<PeopleStatsResponse['people']> {
  const people: NonNullable<PeopleStatsResponse['people']> = [];
  for (const idGroup of chunk(playerIds, 45)) {
    const ids = idGroup.join(',');
    const hydrate = encodeURIComponent(`stats(group=[hitting],type=[gameLog],season=${season})`);
    const data = await mlbFetch<PeopleStatsResponse>(`/people?personIds=${ids}&hydrate=${hydrate}`);
    people.push(...(data.people || []));
  }
  return people;
}

function buildRankingForPlayer(input: {
  playerId: number;
  name: string;
  teamId: number;
  teamName: string;
  abbreviation: string;
  position: string;
  person?: NonNullable<PeopleStatsResponse['people']>[number];
}): PlayerRanking | null {
  const gameLog = input.person?.stats?.find((stat) => {
    const type = (stat.type?.displayName || '').toLowerCase();
    const group = (stat.group?.displayName || '').toLowerCase();
    return type.includes('gamelog') && group.includes('hitting');
  });

  const splits = (gameLog?.splits || [])
    .filter((split) => split.date && asNumber(split.stat?.atBats) > 0)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 10);

  if (splits.length === 0) return null;

  const hits = splits.reduce((sum, split) => sum + asNumber(split.stat?.hits), 0);
  const atBats = splits.reduce((sum, split) => sum + asNumber(split.stat?.atBats), 0);
  const gamesWithHit = splits.filter((split) => asNumber(split.stat?.hits) > 0).length;
  const last = splits[0];
  const lastHits = asNumber(last?.stat?.hits);
  const lastAtBats = asNumber(last?.stat?.atBats);

  return {
    playerId: input.playerId,
    name: input.name,
    teamId: input.teamId,
    teamName: input.teamName,
    abbreviation: input.abbreviation,
    position: input.position,
    hits,
    games: splits.length,
    atBats,
    average: formatAverage(hits, atBats),
    gamesWithHit,
    gamesWithoutHit: splits.length - gamesWithHit,
    hitRate: `${Math.round((gamesWithHit / splits.length) * 100)}%`,
    gamePattern: splits.map((split) => {
      const splitHits = asNumber(split.stat?.hits);
      const splitAtBats = asNumber(split.stat?.atBats);
      return {
        date: split.date || '',
        hits: splitHits,
        atBats: splitAtBats,
        hadHit: splitHits > 0,
        line: `${splitHits}-for-${splitAtBats}`,
      };
    }),
    lastGameDate: last?.date || null,
    lastGameLine: `${lastHits}-for-${lastAtBats}`,
  };
}

export async function buildRankings(): Promise<RankingsPayload> {
  const season = getCurrentSeason();
  const generatedAt = new Date();
  const teams = await getTeams(season);
  const rosters = await getAllRosters(teams);
  const allPlayers = rosters.flatMap((roster) => roster.players.map((player) => ({ ...player, team: roster.team })));
  const playerIds = allPlayers.map((player) => player.id);
  const people = await getPlayerGameLogs(playerIds, season);
  const peopleById = new Map((people || []).map((person) => [person.id, person]));

  const rankingsByTeam = new Map<number, PlayerRanking[]>();

  for (const roster of rosters) {
    const teamRankings = roster.players
      .map((player) =>
        buildRankingForPlayer({
          playerId: player.id,
          name: player.name,
          teamId: roster.team.id,
          teamName: roster.team.name,
          abbreviation: roster.team.abbreviation || roster.team.name.slice(0, 3).toUpperCase(),
          position: player.position,
          person: peopleById.get(player.id),
        }),
      )
      .filter((player): player is PlayerRanking => Boolean(player))
      .sort((a, b) => b.gamesWithHit - a.gamesWithHit || b.hits - a.hits || Number.parseFloat(b.average) - Number.parseFloat(a.average) || a.name.localeCompare(b.name));

    rankingsByTeam.set(roster.team.id, teamRankings);
  }

  const teamRankings: TeamRanking[] = rosters
    .map((roster) => ({
      teamId: roster.team.id,
      teamName: roster.team.name,
      abbreviation: roster.team.abbreviation || roster.team.name.slice(0, 3).toUpperCase(),
      players: (rankingsByTeam.get(roster.team.id) || []).slice(0, 3),
    }))
    .filter((team) => team.players.length > 0)
    .sort((a, b) => a.teamName.localeCompare(b.teamName));

  const leaders = Array.from(rankingsByTeam.values())
    .flat()
    .sort((a, b) => b.gamesWithHit - a.gamesWithHit || b.hits - a.hits || Number.parseFloat(b.average) - Number.parseFloat(a.average) || a.name.localeCompare(b.name))
    .slice(0, 25);

  return {
    generatedAt: generatedAt.toISOString(),
    generatedAtSanFrancisco: formatSanFranciscoTime(generatedAt),
    season,
    source: SOURCE,
    note: 'Rankings use each player\'s last 10 games played with at least one at-bat. Primary rank is games with at least one hit, then total hits as the tiebreaker.',
    teams: teamRankings,
    leaders,
    cache: 'live',
  };
}

export function rankingsToCsv(payload: RankingsPayload): string {
  const rows = [
    ['team', 'team_abbreviation', 'rank', 'player', 'position', 'hit_games_last_10', 'no_hit_games_last_10', 'hit_rate', 'total_hits_last_10', 'games_counted', 'last_10_average', 'last_10_pattern', 'last_game_date', 'last_game_line'],
  ];

  for (const team of payload.teams) {
    team.players.forEach((player, index) => {
      rows.push([
        team.teamName,
        team.abbreviation,
        String(index + 1),
        player.name,
        player.position,
        String(player.gamesWithHit),
        String(player.gamesWithoutHit),
        player.hitRate,
        String(player.hits),
        String(player.games),
        player.average,
        player.gamePattern.map((game) => (game.hadHit ? 'H' : '0')).join(''),
        player.lastGameDate || '',
        player.lastGameLine,
      ]);
    });
  }

  return rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');
}
