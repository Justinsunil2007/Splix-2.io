import { SERVER_CONFIG, TEAM_PALETTES } from '../../shared/constants.js';
import {
  Direction,
  GameEventLogEntry,
  GameStateSnapshot,
  KillEvent,
  MatchHistoryRecord,
  MatchStatus,
  ServerMessage,
  TeamId,
  TeamInfo,
  TeamState,
  TournamentStanding,
} from '../../shared/types.js';
import { GridMap } from './Grid.js';
import { Player } from './Player.js';
import { BattleZone } from './Zone.js';
import { saveMatchRecordToDB } from './db.js';

export class Match {
  public status: MatchStatus = 'LOBBY';
  public timer: number = SERVER_CONFIG.MATCH_DURATION_SECONDS;
  public introTimer: number = SERVER_CONFIG.INTRO_SECONDS;
  public countdownTimer: number = SERVER_CONFIG.COUNTDOWN_SECONDS;
  public isPaused: boolean = false;
  public matchCount: number = 1;
  public matchId: string = 'M-001';

  public grid: GridMap;
  public zone: BattleZone;
  public players: Map<string, Player> = new Map();
  public customTeams: Map<string, TeamInfo> = new Map();
  public recentKills: KillEvent[] = [];
  public winnerTeam: TeamId | null = null;
  public eliminatedTeams: Set<TeamId> = new Set();

  // Tournament data persistence in memory
  public matchHistory: MatchHistoryRecord[] = [];
  public eventLogs: GameEventLogEntry[] = [];
  public teamKillsMap: Map<string, number> = new Map();

  private lastBroadcastCountdownSec: number = -1;
  private onBroadcastState: (msg: ServerMessage) => void;

  constructor(broadcastCallback: (msg: ServerMessage) => void) {
    this.grid = new GridMap();
    this.zone = new BattleZone();
    this.onBroadcastState = broadcastCallback;
    this.logEvent('MATCH_START', 'Match system initialized');
  }

  public logEvent(type: GameEventLogEntry['type'], description: string) {
    const entry: GameEventLogEntry = {
      timestamp: Date.now(),
      type,
      description,
    };
    this.eventLogs.unshift(entry);
    if (this.eventLogs.length > 200) this.eventLogs.pop();
  }

  public createTeam(creatorName: string, customName: string, colorIndex?: number, customSymbol?: string): TeamInfo | null {
    if (this.status !== 'LOBBY' && this.status !== 'WAITING') {
      return null;
    }

    if (this.customTeams.size >= SERVER_CONFIG.MAX_TEAMS) {
      return null;
    }

    const cleanName = (customName || 'Vanguard').trim().substring(0, SERVER_CONFIG.MAX_NAME_LENGTH) || 'Vanguard';
    const teamId = 'team_' + Math.random().toString(36).substring(2, 7);

    const palIndex = (typeof colorIndex === 'number' && colorIndex >= 0 && colorIndex < TEAM_PALETTES.length)
      ? colorIndex
      : this.customTeams.size % TEAM_PALETTES.length;
    const palette = TEAM_PALETTES[palIndex];

    const teamInfo: TeamInfo = {
      id: teamId,
      name: cleanName,
      color: palette.color,
      trailColor: palette.trailColor,
      glowColor: palette.glowColor,
      secondaryColor: palette.secondaryColor,
      symbol: customSymbol || palette.symbol,
      creatorName,
    };

    this.customTeams.set(teamId, teamInfo);
    this.logEvent('TEAM_CREATE', `Team "${cleanName}" created by ${creatorName}`);
    return teamInfo;
  }

  public addPlayer(id: string, name: string, teamId?: TeamId, socket: any = null): Player | null {
    if (this.players.size >= SERVER_CONFIG.MAX_TOTAL_PLAYERS) {
      return null;
    }

    // Match in progress lock: Don't allow new player joins during match unless reconnecting
    if (this.status !== 'LOBBY' && this.status !== 'WAITING' && this.status !== 'MATCH_END') {
      return null;
    }

    let assignedTeamId = teamId || '';
    if (!assignedTeamId || !this.customTeams.has(assignedTeamId)) {
      if (this.customTeams.size === 0) {
        const defaultTeam = this.createTeam(name, `${name}'s Squad`, 0);
        assignedTeamId = defaultTeam ? defaultTeam.id : '';
      } else {
        for (const [tid] of this.customTeams) {
          const count = Array.from(this.players.values()).filter((p) => p.teamId === tid).length;
          if (count < SERVER_CONFIG.MAX_PLAYERS_PER_TEAM) {
            assignedTeamId = tid;
            break;
          }
        }
      }
    }

    if (!assignedTeamId || !this.customTeams.has(assignedTeamId)) {
      return null;
    }

    const teamPlayers = Array.from(this.players.values()).filter((p) => p.teamId === assignedTeamId);
    if (teamPlayers.length >= SERVER_CONFIG.MAX_PLAYERS_PER_TEAM) {
      return null;
    }

    const player = new Player(id, name, assignedTeamId, socket);
    this.players.set(id, player);
    this.logEvent('PLAYER_JOIN', `${name} joined team ${this.customTeams.get(assignedTeamId)?.name}`);
    return player;
  }

  public reconnectPlayer(existingPlayerId: string, socket: any): Player | null {
    const player = this.players.get(existingPlayerId);
    if (player) {
      player.socket = socket;
      player.disconnectedAt = null;
      this.logEvent('PLAYER_JOIN', `${player.name} reconnected to match`);
      return player;
    }
    return null;
  }

  public removePlayer(id: string) {
    const player = this.players.get(id);
    if (!player) return;

    this.logEvent('PLAYER_LEAVE', `${player.name} disconnected`);

    if (this.status === 'ACTIVE' || this.status === 'ZONE_SHRINKING' || this.status === 'ENDGAME') {
      // Grace period for disconnection during active match
      player.disconnectedAt = Date.now();
      // If disconnected for > 15s or match ends, eliminate
      setTimeout(() => {
        const p = this.players.get(id);
        if (p && p.disconnectedAt && p.isAlive) {
          p.isAlive = false;
          p.trail = [];
          this.checkTeamElimination();
        }
      }, 15000);
    } else {
      this.players.delete(id);

      // Clean up empty teams in lobby
      if (this.status === 'LOBBY' || this.status === 'WAITING') {
        const remainingTeamIds = new Set(Array.from(this.players.values()).map((p) => p.teamId));
        for (const tid of Array.from(this.customTeams.keys())) {
          if (!remainingTeamIds.has(tid)) {
            this.customTeams.delete(tid);
          }
        }
      }
    }
  }

  public setPlayerTeam(playerId: string, targetTeamId: TeamId): boolean {
    if (this.status !== 'LOBBY' && this.status !== 'WAITING') return false;
    if (!this.customTeams.has(targetTeamId)) return false;

    const teamCount = Array.from(this.players.values()).filter((p) => p.teamId === targetTeamId).length;
    if (teamCount >= SERVER_CONFIG.MAX_PLAYERS_PER_TEAM) return false;

    const player = this.players.get(playerId);
    if (player) {
      player.teamId = targetTeamId;
      return true;
    }
    return false;
  }

  public startIntro() {
    if (this.status !== 'LOBBY') return;
    this.status = 'INTRO';
    this.introTimer = SERVER_CONFIG.INTRO_SECONDS;
    this.matchId = `M-00${this.matchCount}`;

    this.onBroadcastState({
      type: 'MATCH_INTRO',
      matchId: this.matchId,
      teams: Array.from(this.customTeams.values()),
    });
    this.logEvent('MATCH_START', `Match ${this.matchId} starting with ${this.players.size} players`);
  }

  public startCountdown() {
    this.status = 'COUNTDOWN';
    this.countdownTimer = SERVER_CONFIG.COUNTDOWN_SECONDS;
    this.lastBroadcastCountdownSec = -1;
  }

  public startMatch() {
    this.status = 'ACTIVE';
    this.timer = SERVER_CONFIG.MATCH_DURATION_SECONDS;
    this.isPaused = false;
    this.grid.reset();
    this.zone.reset();
    this.recentKills = [];
    this.winnerTeam = null;
    this.eliminatedTeams.clear();
    this.teamKillsMap.clear();

    const mapW = SERVER_CONFIG.MAP_WIDTH;
    const mapH = SERVER_CONFIG.MAP_HEIGHT;

    const activeTeamIds = Array.from(this.customTeams.keys()).filter((tid) =>
      Array.from(this.players.values()).some((p) => p.teamId === tid)
    );

    const baseSpawns = [
      { x: 25, y: 25, dir: 'RIGHT' as Direction },
      { x: mapW - 26, y: mapH - 26, dir: 'LEFT' as Direction },
      { x: 25, y: mapH - 26, dir: 'RIGHT' as Direction },
      { x: mapW - 26, y: 25, dir: 'LEFT' as Direction },
      { x: Math.floor(mapW / 2), y: Math.floor(mapH / 2), dir: 'UP' as Direction },
      { x: Math.floor(mapW / 2), y: 25, dir: 'DOWN' as Direction },
    ];

    const teamSpawnMap = new Map<string, { x: number; y: number; dir: Direction }>();
    activeTeamIds.forEach((tid, idx) => {
      teamSpawnMap.set(tid, baseSpawns[idx % baseSpawns.length]);
      this.teamKillsMap.set(tid, 0);
    });

    for (const teamId of activeTeamIds) {
      const sp = teamSpawnMap.get(teamId)!;
      this.grid.initTeamSpawn(sp.x, sp.y, teamId, SERVER_CONFIG.STARTING_TERRITORY_RADIUS);
    }

    for (const player of this.players.values()) {
      const sp = teamSpawnMap.get(player.teamId) || baseSpawns[0];
      const teamPlayers = Array.from(this.players.values()).filter((p) => p.teamId === player.teamId);
      const idx = teamPlayers.indexOf(player);
      const offsetX = (idx % 3) - 1;
      const offsetY = Math.floor(idx / 3) - 1;

      player.setSpawn(sp.x + offsetX, sp.y + offsetY, sp.dir);
    }

    this.onBroadcastState({
      type: 'TERRITORY_FULL_SYNC',
      grid: this.grid.cells,
    });
    this.onBroadcastState({
      type: 'MATCH_STARTED',
    });
  }

  public pauseMatch() {
    if (this.status === 'ACTIVE' || this.status === 'ZONE_SHRINKING' || this.status === 'ENDGAME') {
      this.status = 'PAUSED';
      this.isPaused = true;
      this.onBroadcastState({ type: 'MATCH_PAUSED' });
      this.logEvent('MATCH_PAUSE', 'Match paused by organizer');
    }
  }

  public resumeMatch() {
    if (this.status === 'PAUSED') {
      this.status = 'ACTIVE';
      this.isPaused = false;
      this.onBroadcastState({ type: 'MATCH_RESUMED' });
      this.logEvent('MATCH_RESUME', 'Match resumed by organizer');
    }
  }

  public endMatch(winner: TeamId | null = null) {
    this.status = 'MATCH_END';
    this.winnerTeam = winner || this.calculateHighestScoringTeam();

    // Sort team rankings: winner first, then by territory + kills
    const teamRankings = this.getTeamStates().sort((a, b) => {
      if (a.id === this.winnerTeam) return -1;
      if (b.id === this.winnerTeam) return 1;
      const scoreA = a.territoryCount + a.kills * 100;
      const scoreB = b.territoryCount + b.kills * 100;
      return scoreB - scoreA;
    });

    const winnerInfo = this.customTeams.get(this.winnerTeam || '');
    const historyRecord: MatchHistoryRecord = {
      matchId: this.matchId,
      timestamp: Date.now(),
      winnerTeamId: this.winnerTeam,
      winnerTeamName: winnerInfo ? winnerInfo.name : 'Unknown Squad',
      durationSeconds: SERVER_CONFIG.MATCH_DURATION_SECONDS - Math.ceil(this.timer),
      rankings: teamRankings,
    };

    this.matchHistory.unshift(historyRecord);
    saveMatchRecordToDB(historyRecord);
    this.matchCount++;
    this.logEvent('MATCH_END', `Match ${this.matchId} ended. Winner: ${historyRecord.winnerTeamName}`);

    this.onBroadcastState({
      type: 'MATCH_ENDED',
      winnerTeam: this.winnerTeam,
      teamRankings,
      historyRecord,
    });

    // Also update and broadcast tournament standings immediately
    this.onBroadcastState({
      type: 'TOURNAMENT_STANDINGS',
      standings: this.getTournamentStandings(),
    });
  }

  public resetToLobby() {
    this.status = 'LOBBY';
    this.isPaused = false;
    this.timer = SERVER_CONFIG.MATCH_DURATION_SECONDS;
    this.countdownTimer = SERVER_CONFIG.COUNTDOWN_SECONDS;
    this.lastBroadcastCountdownSec = -1;
    this.grid.reset();
    this.zone.reset();
    this.recentKills = [];
    this.winnerTeam = null;
    this.eliminatedTeams.clear();

    for (const player of this.players.values()) {
      player.isAlive = true;
      player.trail = [];
      player.score = 0;
      player.kills = 0;
      player.isReady = false;
    }

    this.logEvent('MATCH_START', 'Lobby reset for next round');

    this.onBroadcastState({
      type: 'TERRITORY_FULL_SYNC',
      grid: this.grid.cells,
    });
  }

  public update(dtSeconds: number) {
    if (this.isPaused) return;

    if (this.status === 'INTRO') {
      this.introTimer -= dtSeconds;
      if (this.introTimer <= 0) {
        this.startCountdown();
      }
      return;
    }

    if (this.status === 'COUNTDOWN') {
      this.countdownTimer -= dtSeconds;
      const currentCeilSec = Math.max(1, Math.ceil(this.countdownTimer));

      if (currentCeilSec !== this.lastBroadcastCountdownSec) {
        this.lastBroadcastCountdownSec = currentCeilSec;
        this.onBroadcastState({
          type: 'MATCH_COUNTDOWN',
          seconds: currentCeilSec,
        });
      }

      if (this.countdownTimer <= 0) {
        this.startMatch();
      }
      return;
    }

    if (this.status !== 'ACTIVE' && this.status !== 'ZONE_SHRINKING' && this.status !== 'ENDGAME') {
      return;
    }

    // Match Timer
    this.timer -= dtSeconds;
    if (this.timer <= 0) {
      this.timer = 0;
      this.endMatch();
      return;
    }

    // Update Shrink Zone
    this.zone.update(dtSeconds);
    if (this.zone.isShrinking) {
      this.status = this.zone.shrinkPhase >= 3 ? 'ENDGAME' : 'ZONE_SHRINKING';
    } else {
      this.status = 'ACTIVE';
    }

    // 1. Advance alive players & process trail generation
    const alivePlayers = Array.from(this.players.values()).filter((p) => p.isAlive);

    for (const player of alivePlayers) {
      player.advance();

      // Check Out of Map Boundary Death
      if (!this.grid.isWithinBounds(player.x, player.y)) {
        this.killPlayer(player, null, 'ZONE_DEATH');
        continue;
      }

      // Check Safe Zone Status
      const inZone = this.zone.isInsideZone(player.x, player.y);
      player.isInSafeZone = inZone;
      if (!inZone) {
        player.outOfBoundsTicks++;
        if (player.outOfBoundsTicks > SERVER_CONFIG.ZONE_OUT_OF_BOUNDS_GRACE_TICKS + SERVER_CONFIG.ZONE_DAMAGE_TICKS) {
          this.killPlayer(player, null, 'ZONE_DEATH');
          continue;
        }
      } else {
        player.outOfBoundsTicks = 0;
      }

      const cellOwner = this.grid.getCell(player.x, player.y);
      const isFriendlyLand = cellOwner === player.teamId;

      if (isFriendlyLand) {
        if (!player.isOnOwnTerritory && player.trail.length > 0) {
          // Captured territory!
          player.trail.push({ x: player.x, y: player.y });
          const capturedCount = this.grid.captureTerritory(player.trail, player.teamId);
          player.score += capturedCount * 10;

          const totalTiles = SERVER_CONFIG.MAP_WIDTH * SERVER_CONFIG.MAP_HEIGHT;
          const pct = parseFloat(((capturedCount / totalTiles) * 100).toFixed(1));

          // Broadcast territory claim visual event
          this.onBroadcastState({
            type: 'TERRITORY_CLAIM_ANIMATION',
            teamId: player.teamId,
            tilesCount: capturedCount,
            percentage: pct,
            centerX: player.x,
            centerY: player.y,
          });

          player.trail = [];
        }
        player.isOnOwnTerritory = true;
      } else {
        player.isOnOwnTerritory = false;

        const hitSelfTrail = player.trail.some((p) => p.x === player.x && p.y === player.y);
        if (hitSelfTrail) {
          this.killPlayer(player, null, 'SELF_COLLISION');
          continue;
        }

        player.trail.push({ x: player.x, y: player.y });
      }
    }

    // 2. Authoritative Combat & Trail Collision Check
    const activeAlive = Array.from(this.players.values()).filter((p) => p.isAlive);

    for (const player of activeAlive) {
      for (const other of activeAlive) {
        if (player.teamId !== other.teamId && other.trail.length > 0) {
          const trailHit = other.trail.some((tp) => tp.x === player.x && tp.y === player.y);
          if (trailHit) {
            player.kills++;
            player.score += 150;
            const curTeamKills = (this.teamKillsMap.get(player.teamId) || 0) + 1;
            this.teamKillsMap.set(player.teamId, curTeamKills);
            this.killPlayer(other, player, 'TRAIL_CUT');
          }
        }

        if (player !== other && player.teamId !== other.teamId && player.x === other.x && player.y === other.y) {
          this.killPlayer(player, other, 'HEAD_COLLISION');
          this.killPlayer(other, player, 'HEAD_COLLISION');
        }
      }
    }

    // 3. Check for team elimination & victory conditions
    this.checkTeamElimination();
  }

  public killPlayer(victim: Player, killer: Player | null, reason: KillEvent['reason']) {
    if (!victim.isAlive) return;

    victim.isAlive = false;
    victim.trail = [];

    const killEv: KillEvent = {
      killerId: killer ? killer.id : 'WORLD',
      killerName: killer ? killer.name : 'The Zone',
      killerTeam: killer ? killer.teamId : victim.teamId,
      victimId: victim.id,
      victimName: victim.name,
      victimTeam: victim.teamId,
      reason,
      streak: killer ? killer.kills : undefined,
      timestamp: Date.now(),
    };

    this.recentKills.unshift(killEv);
    if (this.recentKills.length > 10) this.recentKills.pop();

    this.logEvent('PLAYER_KILL', `${killEv.killerName} eliminated ${killEv.victimName} (${reason})`);

    this.onBroadcastState({
      type: 'KILL_FEED',
      event: killEv,
    });
  }

  public checkTeamElimination() {
    const teamsWithPlayers = new Set<TeamId>();
    const livingTeams = new Set<TeamId>();

    for (const p of this.players.values()) {
      teamsWithPlayers.add(p.teamId);
      if (p.isAlive) {
        livingTeams.add(p.teamId);
      }
    }

    for (const teamId of teamsWithPlayers) {
      if (!livingTeams.has(teamId) && !this.eliminatedTeams.has(teamId)) {
        this.eliminatedTeams.add(teamId);
        this.grid.clearTeamTerritory(teamId);

        const tName = this.customTeams.get(teamId)?.name || teamId;
        this.logEvent('TEAM_ELIM', `Team ${tName} has been completely eliminated!`);

        this.onBroadcastState({
          type: 'TEAM_ELIMINATED',
          teamId,
          remainingTeams: livingTeams.size,
        });
      }
    }

    if (this.status === 'ACTIVE' || this.status === 'ZONE_SHRINKING' || this.status === 'ENDGAME') {
      if (livingTeams.size === 0 || (livingTeams.size === 1 && teamsWithPlayers.size >= 1)) {
        const winner = Array.from(livingTeams)[0] || this.calculateHighestScoringTeam();
        this.endMatch(winner);
      }
    }
  }

  public calculateHighestScoringTeam(): TeamId {
    const teamTerritory = this.grid.getTerritoryCounts();
    const livingTeams = new Set<TeamId>();
    for (const p of this.players.values()) {
      if (p.isAlive) livingTeams.add(p.teamId);
    }

    let highestTeam: TeamId = Array.from(this.customTeams.keys())[0] || 'default';
    let highestScore = -1;

    for (const teamId of this.customTeams.keys()) {
      const isAliveBonus = livingTeams.has(teamId) ? 10000 : 0;
      const territory = teamTerritory[teamId] || 0;
      const score = isAliveBonus + territory;
      if (score > highestScore) {
        highestScore = score;
        highestTeam = teamId;
      }
    }

    return highestTeam;
  }

  public getTeamStates(): TeamState[] {
    const territoryCounts = this.grid.getTerritoryCounts();
    const totalTiles = SERVER_CONFIG.MAP_WIDTH * SERVER_CONFIG.MAP_HEIGHT;

    return Array.from(this.customTeams.values()).map((teamInfo) => {
      const teamPlayers = Array.from(this.players.values()).filter((p) => p.teamId === teamInfo.id);
      const alivePlayers = teamPlayers.filter((p) => p.isAlive).length;
      const territoryCount = territoryCounts[teamInfo.id] || 0;
      const territoryPercentage = parseFloat(((territoryCount / totalTiles) * 100).toFixed(1));
      const kills = this.teamKillsMap.get(teamInfo.id) || teamPlayers.reduce((acc, p) => acc + p.kills, 0);

      return {
        id: teamInfo.id,
        name: teamInfo.name,
        color: teamInfo.color,
        symbol: teamInfo.symbol,
        creatorName: teamInfo.creatorName,
        aliveCount: alivePlayers,
        totalPlayers: teamPlayers.length,
        territoryCount,
        territoryPercentage,
        kills,
        isEliminated: teamPlayers.length > 0 && (this.eliminatedTeams.has(teamInfo.id) || (alivePlayers === 0 && this.status !== 'LOBBY' && this.status !== 'COUNTDOWN' && this.status !== 'INTRO')),
      };
    });
  }

  public getTournamentStandings(): TournamentStanding[] {
    const standingsMap = new Map<string, TournamentStanding>();

    for (const record of this.matchHistory) {
      record.rankings.forEach((r, idx) => {
        let standing = standingsMap.get(r.name);
        if (!standing) {
          standing = {
            teamName: r.name,
            color: r.color,
            symbol: r.symbol || '🛡️',
            matchesPlayed: 0,
            wins: 0,
            totalKills: 0,
            totalTerritoryPct: 0,
            points: 0,
          };
          standingsMap.set(r.name, standing);
        }

        standing.matchesPlayed++;
        if (idx === 0) {
          standing.wins++;
          standing.points += 100;
        } else if (idx === 1) {
          standing.points += 60;
        } else if (idx === 2) {
          standing.points += 40;
        } else {
          standing.points += 20;
        }

        standing.totalKills += r.kills || 0;
        standing.points += (r.kills || 0) * 15;
        standing.totalTerritoryPct += r.territoryPercentage;
      });
    }

    return Array.from(standingsMap.values()).sort((a, b) => b.points - a.points);
  }

  public getSnapshot(): GameStateSnapshot {
    const readyPlayers = Array.from(this.players.values()).filter((p) => p.isReady).length;

    return {
      status: this.status,
      timer: Math.max(0, Math.ceil(this.timer)),
      introTimer: Math.max(0, Math.ceil(this.introTimer)),
      countdownTimer: Math.max(0, Math.ceil(this.countdownTimer)),
      isPaused: this.isPaused,
      matchCount: this.matchCount,
      matchId: this.matchId,
      players: Array.from(this.players.values()).map((p) => p.toPublicState()),
      teams: this.getTeamStates(),
      availableTeams: Array.from(this.customTeams.values()),
      zone: this.zone.getSnapshot(),
      winnerTeam: this.winnerTeam,
      recentKills: this.recentKills,
      eliminatedTeams: Array.from(this.eliminatedTeams),
      totalConnectedCount: this.players.size,
      readyCount: readyPlayers,
      serverTickRate: SERVER_CONFIG.TICK_RATE,
    };
  }
}
