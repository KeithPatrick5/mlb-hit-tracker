export type GameResult = {
  date: string;
  hits: number;
  atBats: number;
  hadHit: boolean;
  line: string;
};

export type PlayerRanking = {
  playerId: number;
  name: string;
  teamId: number;
  teamName: string;
  abbreviation: string;
  position: string;
  hits: number;
  games: number;
  atBats: number;
  average: string;
  gamesWithHit: number;
  gamesWithoutHit: number;
  hitRate: string;
  gamePattern: GameResult[];
  lastGameDate: string | null;
  lastGameLine: string;
};

export type TeamRanking = {
  teamId: number;
  teamName: string;
  abbreviation: string;
  players: PlayerRanking[];
};

export type RankingsPayload = {
  generatedAt: string;
  generatedAtSanFrancisco: string;
  season: number;
  source: string;
  note: string;
  teams: TeamRanking[];
  leaders: PlayerRanking[];
  cache: 'redis' | 'live';
};
