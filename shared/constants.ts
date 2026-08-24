export const GAME_TITLE = 'Splix 2.io';
export const GAME_TAGLINE = 'Multiplayer Team Battle Royale';
export const GAME_VERSION = 'v2.5.0-TOURNAMENT';

export const SERVER_CONFIG = {
  PORT: (typeof process !== 'undefined' && process?.env?.PORT) ? parseInt(process.env.PORT) : 8080,
  // Admin password is read from process.env.ADMIN_SECRET / ADMIN_PASSWORD or fallback server-side
  TICK_RATE: 20, // 20 ticks per second (50ms per tick)
  MAP_WIDTH: 130, // Increased map size: 130x130 (was 100x100)
  MAP_HEIGHT: 130,
  MAX_TOTAL_PLAYERS: 35, // Safety margin for 25-30 players
  MAX_PLAYERS_PER_TEAM: 5,
  MAX_TEAMS: 6,
  MATCH_DURATION_SECONDS: 600, // 10 minutes (600s) for testing & full gameplay understanding
  INTRO_SECONDS: 3, // Cinematic intro duration
  COUNTDOWN_SECONDS: 5,
  STARTING_TERRITORY_RADIUS: 2, // 5x5 starting patch
  ZONE_START_DELAY_SECONDS: 90, // First shrink starts at 90s for a 10-min match
  ZONE_SHRINK_INTERVAL_SECONDS: 90, // Shrink every 90s
  ZONE_TOTAL_PHASES: 4,
  ZONE_OUT_OF_BOUNDS_GRACE_TICKS: 30, // ~1.5s warning before taking damage
  ZONE_DAMAGE_TICKS: 10, // ~0.5s ticks to eliminate if still outside
  MAX_NAME_LENGTH: 15,
};

export interface TeamPalette {
  color: string;
  trailColor: string;
  glowColor: string;
  secondaryColor: string;
  symbol: string;
  defaultName: string;
}

export const TEAM_PALETTES: TeamPalette[] = [
  {
    color: '#FF2A5F',
    trailColor: 'rgba(255, 42, 95, 0.85)',
    glowColor: '#FF2A5F80',
    secondaryColor: '#8A0A2A',
    symbol: '🦅',
    defaultName: 'Phoenix Vanguard',
  },
  {
    color: '#00D2FF',
    trailColor: 'rgba(0, 210, 255, 0.85)',
    glowColor: '#00D2FF80',
    secondaryColor: '#005580',
    symbol: '⚡',
    defaultName: 'Cobalt Surge',
  },
  {
    color: '#00FF88',
    trailColor: 'rgba(0, 255, 136, 0.85)',
    glowColor: '#00FF8880',
    secondaryColor: '#006633',
    symbol: '🐉',
    defaultName: 'Emerald Dragons',
  },
  {
    color: '#FFD600',
    trailColor: 'rgba(255, 214, 0, 0.85)',
    glowColor: '#FFD60080',
    secondaryColor: '#806B00',
    symbol: '👑',
    defaultName: 'Solar Monarchs',
  },
  {
    color: '#B026FF',
    trailColor: 'rgba(176, 38, 255, 0.85)',
    glowColor: '#B026FF80',
    secondaryColor: '#520080',
    symbol: '🌀',
    defaultName: 'Vortex Legion',
  },
  {
    color: '#FF7A00',
    trailColor: 'rgba(255, 122, 0, 0.85)',
    glowColor: '#FF7A0080',
    secondaryColor: '#803D00',
    symbol: '🔥',
    defaultName: 'Nova Syndicate',
  },
];

export const TEAM_ICONS = ['🦅', '⚡', '🐉', '👑', '🌀', '🔥', '💀', '🛡️', '⚔️', '⭐'];
