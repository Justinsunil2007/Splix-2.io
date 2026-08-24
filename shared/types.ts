export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Position {
  x: number;
  y: number;
}

export type TeamId = string;

export interface TeamInfo {
  id: string;
  name: string;
  color: string;
  trailColor: string;
  glowColor: string;
  secondaryColor: string;
  symbol: string;
  creatorName?: string;
}

export type MatchStatus = 'WAITING' | 'LOBBY' | 'INTRO' | 'COUNTDOWN' | 'ACTIVE' | 'ZONE_SHRINKING' | 'ENDGAME' | 'PAUSED' | 'MATCH_END';

export interface PlayerPublicState {
  id: string;
  name: string;
  teamId: string;
  x: number;
  y: number;
  direction: Direction;
  isAlive: boolean;
  trail: Position[];
  score: number;
  kills: number;
  isReady: boolean;
  isInSafeZone: boolean;
  ping?: number;
}

export interface TeamState {
  id: string;
  name: string;
  color: string;
  symbol?: string;
  aliveCount: number;
  totalPlayers: number;
  territoryCount: number;
  territoryPercentage: number;
  isEliminated: boolean;
  creatorName?: string;
  kills: number;
}

export interface ZoneState {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  targetMinX: number;
  targetMinY: number;
  targetMaxX: number;
  targetMaxY: number;
  isShrinking: boolean;
  shrinkPhase: number;
  timeUntilShrink: number;
}

export interface KillEvent {
  killerId: string;
  killerName: string;
  killerTeam: string;
  victimId: string;
  victimName: string;
  victimTeam: string;
  reason: 'TRAIL_CUT' | 'HEAD_COLLISION' | 'ZONE_DEATH' | 'SELF_COLLISION';
  streak?: number;
  timestamp: number;
}

export interface TerritoryDiff {
  teamId: string | null;
  tiles: [number, number][]; // [x, y]
}

export interface MatchHistoryRecord {
  matchId: string;
  timestamp: number;
  winnerTeamId: string | null;
  winnerTeamName: string;
  durationSeconds: number;
  rankings: TeamState[];
}

export interface TournamentStanding {
  teamName: string;
  color: string;
  symbol: string;
  matchesPlayed: number;
  wins: number;
  totalKills: number;
  totalTerritoryPct: number;
  points: number;
}

export interface GameEventLogEntry {
  timestamp: number;
  type: 'PLAYER_JOIN' | 'PLAYER_LEAVE' | 'TEAM_CREATE' | 'MATCH_START' | 'PLAYER_KILL' | 'TEAM_ELIM' | 'ZONE_PHASE' | 'MATCH_PAUSE' | 'MATCH_RESUME' | 'MATCH_END';
  description: string;
}

export interface GameStateSnapshot {
  status: MatchStatus;
  timer: number;
  countdownTimer?: number;
  introTimer?: number;
  isPaused?: boolean;
  matchCount: number;
  matchId: string;
  players: PlayerPublicState[];
  teams: TeamState[];
  availableTeams: TeamInfo[];
  zone: ZoneState;
  winnerTeam: string | null;
  recentKills: KillEvent[];
  eliminatedTeams: string[];
  totalConnectedCount: number;
  readyCount: number;
  serverTickRate: number;
}

// Client to Server Message Types
export type ClientMessage =
  | { type: 'JOIN_LOBBY'; name: string; teamId?: string; reconnectSessionId?: string }
  | { type: 'CREATE_TEAM'; name: string; colorIndex?: number; symbol?: string }
  | { type: 'SELECT_TEAM'; teamId: string }
  | { type: 'TOGGLE_READY' }
  | { type: 'SET_DIRECTION'; direction: Direction }
  | { type: 'ADMIN_LOGIN'; token: string }
  | { type: 'ADMIN_COMMAND'; command: 'START_MATCH' | 'PAUSE_MATCH' | 'RESUME_MATCH' | 'EMERGENCY_RESET' | 'END_MATCH' | 'FORCE_SHRINK' | 'KICK_PLAYER' | 'SIMULATE_BOTS' | 'CLEAR_BOTS' | 'CLEAR_HISTORY'; targetId?: string; token: string }
  | { type: 'PING'; clientTime: number };

// Server to Client Message Types
export type ServerMessage =
  | { type: 'INIT_STATE'; playerId: string; mapWidth: number; mapHeight: number; grid: (string | null)[][]; state: GameStateSnapshot }
  | { type: 'TICK_UPDATE'; state: GameStateSnapshot; territoryDiffs?: TerritoryDiff[] }
  | { type: 'TERRITORY_FULL_SYNC'; grid: (string | null)[][] }
  | { type: 'KILL_FEED'; event: KillEvent }
  | { type: 'TEAM_ELIMINATED'; teamId: string; remainingTeams: number }
  | { type: 'TERRITORY_CLAIM_ANIMATION'; teamId: string; tilesCount: number; percentage: number; centerX: number; centerY: number }
  | { type: 'MATCH_INTRO'; matchId: string; teams: TeamInfo[] }
  | { type: 'MATCH_COUNTDOWN'; seconds: number }
  | { type: 'MATCH_STARTED' }
  | { type: 'MATCH_PAUSED' }
  | { type: 'MATCH_RESUMED' }
  | { type: 'MATCH_ENDED'; winnerTeam: string | null; teamRankings: TeamState[]; historyRecord: MatchHistoryRecord }
  | { type: 'TOURNAMENT_STANDINGS'; standings: TournamentStanding[] }
  | { type: 'MATCH_HISTORY'; records: MatchHistoryRecord[] }
  | { type: 'EVENT_LOGS'; logs: GameEventLogEntry[] }
  | { type: 'ERROR_MESSAGE'; code: string; message: string }
  | { type: 'ADMIN_AUTH_RESULT'; success: boolean; message: string }
  | { type: 'PONG'; clientTime: number; serverTime: number };
