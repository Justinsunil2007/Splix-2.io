import { Server, Socket } from 'socket.io';
import crypto from 'crypto';
import { ClientMessage, ServerMessage } from '../../shared/types.js';
import { SERVER_CONFIG, TEAM_PALETTES } from '../../shared/constants.js';
import { Match } from './Match.js';

// ── Admin password — fallback 'admin123' for dev, set ADMIN_SECRET in production ──
const ADMIN_PASSWORD = process.env.ADMIN_SECRET || 'admin123';
const activeAdminTokens = new Set<string>();

// ── Reconnection grace: keep player alive for 30s after socket disconnect ──
const RECONNECT_GRACE_MS = 30_000;
const pendingDisconnects = new Map<string, NodeJS.Timeout>();

export class GameServer {
  private io: Server;
  public match: Match;
  // Socket ID → Player ID
  private socketToPlayer: Map<string, string> = new Map();
  // Player ID → Socket
  private playerToSocket: Map<string, Socket> = new Map();

  private loopInterval: NodeJS.Timeout | null = null;
  private botMoveInterval: NodeJS.Timeout | null = null;
  private lastTickTime: number = Date.now();
  private simulatedBots: string[] = [];

  constructor(io: Server) {
    this.io = io;
    this.match = new Match((msg) => this.broadcast(msg));
    this.setupSocketServer();
    this.startGameLoop();
  }

  private setupSocketServer() {
    this.io.on('connection', (socket: Socket) => {
      const playerId = 'p_' + crypto.randomBytes(8).toString('hex');
      this.socketToPlayer.set(socket.id, playerId);
      this.playerToSocket.set(playerId, socket);

      // Send initial state immediately on connect
      socket.emit('INIT_STATE', {
        type: 'INIT_STATE',
        playerId,
        mapWidth: SERVER_CONFIG.MAP_WIDTH,
        mapHeight: SERVER_CONFIG.MAP_HEIGHT,
        grid: this.match.grid.cells,
        state: this.match.getSnapshot(),
      });

      socket.emit('TOURNAMENT_STANDINGS', {
        type: 'TOURNAMENT_STANDINGS',
        standings: this.match.getTournamentStandings(),
      });

      socket.emit('MATCH_HISTORY', {
        type: 'MATCH_HISTORY',
        records: this.match.matchHistory,
      });

      // ── Message handlers ──────────────────────────────────────
      socket.on('PING', (data: { clientTime: number }) => {
        const player = this.match.players.get(playerId);
        if (player) {
          player.ping = Math.max(5, Math.floor(Date.now() - (data.clientTime || 0)));
        }
        socket.emit('PONG', { type: 'PONG', clientTime: data.clientTime, serverTime: Date.now() });
      });

      socket.on('JOIN_LOBBY', (data: { name?: string; teamId?: string }) => {
        const cleanName = ((data.name || 'Operative').trim().substring(0, SERVER_CONFIG.MAX_NAME_LENGTH)) || 'Operative';

        const activeStatuses = ['ACTIVE', 'ZONE_SHRINKING', 'ENDGAME', 'COUNTDOWN', 'INTRO'];
        const existingPlayer = this.match.players.get(playerId);

        if (activeStatuses.includes(this.match.status) && !existingPlayer) {
          if (!pendingDisconnects.has(playerId)) {
            socket.emit('ERROR_MESSAGE', {
              type: 'ERROR_MESSAGE',
              code: 'MATCH_IN_PROGRESS',
              message: 'A match is in progress. Please wait for the next round.',
            });
            return;
          }
        }

        // Cancel pending disconnect grace if player reconnects
        if (pendingDisconnects.has(playerId)) {
          clearTimeout(pendingDisconnects.get(playerId)!);
          pendingDisconnects.delete(playerId);
          console.log(`Player ${playerId} reconnected within grace period`);
        }

        if (this.match.status === 'MATCH_END') {
          this.match.resetToLobby();
        }

        let player = this.match.players.get(playerId);
        if (!player) {
          const added = this.match.addPlayer(playerId, cleanName, data.teamId, socket);
          player = added ?? undefined;
        } else {
          player.name = cleanName;
          player.socket = socket;
          if (data.teamId) this.match.setPlayerTeam(playerId, data.teamId);
        }

        if (!player) {
          socket.emit('ERROR_MESSAGE', {
            type: 'ERROR_MESSAGE',
            code: 'JOIN_FAILED',
            message: 'Lobby is full (max 30 players). Please wait for the next round.',
          });
          return;
        }

        socket.emit('INIT_STATE', {
          type: 'INIT_STATE',
          playerId,
          mapWidth: SERVER_CONFIG.MAP_WIDTH,
          mapHeight: SERVER_CONFIG.MAP_HEIGHT,
          grid: this.match.grid.cells,
          state: this.match.getSnapshot(),
        });
      });

      socket.on('CREATE_TEAM', (data: { name?: string; colorIndex?: number; symbol?: string }) => {
        if (this.match.status !== 'LOBBY' && this.match.status !== 'WAITING') {
          socket.emit('ERROR_MESSAGE', {
            type: 'ERROR_MESSAGE',
            code: 'CREATE_TEAM_FAILED',
            message: 'Cannot create squads while a match is in progress.',
          });
          return;
        }

        if (this.match.customTeams.size >= SERVER_CONFIG.MAX_TEAMS) {
          socket.emit('ERROR_MESSAGE', {
            type: 'ERROR_MESSAGE',
            code: 'CREATE_TEAM_FAILED',
            message: 'Maximum squads (6) already created.',
          });
          return;
        }

        // Auto-join lobby if not joined yet (fixes "squad not creating" bug)
        let player = this.match.players.get(playerId);
        if (!player) {
          const added = this.match.addPlayer(playerId, 'Operative', undefined, socket);
          player = added ?? undefined;
        }

        const creatorName = player ? player.name : 'Operative';
        const team = this.match.createTeam(creatorName, data.name || 'Squad', data.colorIndex, data.symbol);

        if (!team) {
          socket.emit('ERROR_MESSAGE', {
            type: 'ERROR_MESSAGE',
            code: 'CREATE_TEAM_FAILED',
            message: 'Could not create squad. Maximum 6 squads reached.',
          });
          return;
        }

        // Auto-assign creator to their new team
        if (player) {
          this.match.setPlayerTeam(playerId, team.id);
        }

        // Broadcast the updated state to everyone
        this.broadcast({ type: 'TICK_UPDATE', state: this.match.getSnapshot() });
      });

      socket.on('SELECT_TEAM', (data: { teamId: string }) => {
        const success = this.match.setPlayerTeam(playerId, data.teamId);
        if (!success) {
          socket.emit('ERROR_MESSAGE', {
            type: 'ERROR_MESSAGE',
            code: 'TEAM_CHANGE_FAILED',
            message: 'Cannot switch squad (full, or match is active).',
          });
        }
      });

      socket.on('TOGGLE_READY', () => {
        const player = this.match.players.get(playerId);
        if (player && (this.match.status === 'LOBBY' || this.match.status === 'WAITING')) {
          player.isReady = !player.isReady;
        }
      });

      socket.on('SET_DIRECTION', (data: { direction: string }) => {
        const player = this.match.players.get(playerId);
        if (
          player && player.isAlive && !player.isBot && !this.match.isPaused &&
          (this.match.status === 'ACTIVE' || this.match.status === 'ZONE_SHRINKING' || this.match.status === 'ENDGAME')
        ) {
          player.queueDirection(data.direction as any);
        }
      });

      socket.on('ADMIN_LOGIN', (data: { token: string }) => {
        if (data.token === ADMIN_PASSWORD) {
          const sessionToken = 'adm_' + crypto.randomBytes(16).toString('hex');
          activeAdminTokens.add(sessionToken);
          socket.emit('ADMIN_AUTH_RESULT', { type: 'ADMIN_AUTH_RESULT', success: true, message: sessionToken });
          this.match.logEvent('MATCH_START', 'Admin session authenticated');
        } else {
          socket.emit('ADMIN_AUTH_RESULT', { type: 'ADMIN_AUTH_RESULT', success: false, message: 'Invalid credentials.' });
        }
      });

      socket.on('ADMIN_COMMAND', (data: { command: string; token: string; targetId?: string }) => {
        if (!activeAdminTokens.has(data.token) && data.token !== ADMIN_PASSWORD) {
          socket.emit('ERROR_MESSAGE', { type: 'ERROR_MESSAGE', code: 'UNAUTHORIZED', message: 'Unauthorized.' });
          return;
        }

        switch (data.command) {
          case 'START_MATCH':
            if (this.match.status === 'LOBBY' || this.match.status === 'WAITING') this.match.startIntro();
            break;
          case 'PAUSE_MATCH':   this.match.pauseMatch(); break;
          case 'RESUME_MATCH':  this.match.resumeMatch(); break;
          case 'EMERGENCY_RESET':
            this.clearSimulatedBots();
            this.match.resetToLobby();
            break;
          case 'END_MATCH':     this.match.endMatch(); break;
          case 'FORCE_SHRINK':  this.match.zone.triggerNextPhase(); break;
          case 'KICK_PLAYER':   if (data.targetId) this.match.removePlayer(data.targetId); break;
          case 'SIMULATE_BOTS': this.simulateTournamentBots(25); break;
          case 'CLEAR_BOTS':    this.clearSimulatedBots(); break;
          case 'CLEAR_HISTORY':
            this.match.matchHistory = [];
            this.broadcast({ type: 'TOURNAMENT_STANDINGS', standings: [] });
            this.broadcast({ type: 'MATCH_HISTORY', records: [] });
            break;
        }
      });

      // ── Disconnect ────────────────────────────────────────────
      socket.on('disconnect', () => {
        this.socketToPlayer.delete(socket.id);
        this.playerToSocket.delete(playerId);

        const activeStatuses = ['ACTIVE', 'ZONE_SHRINKING', 'ENDGAME', 'PAUSED'];
        if (activeStatuses.includes(this.match.status)) {
          const timeout = setTimeout(() => {
            pendingDisconnects.delete(playerId);
            this.match.removePlayer(playerId);
            this.broadcast({ type: 'TICK_UPDATE', state: this.match.getSnapshot() });
          }, RECONNECT_GRACE_MS);
          pendingDisconnects.set(playerId, timeout);
        } else {
          this.match.removePlayer(playerId);
        }

        if (this.match.status === 'MATCH_END' && this.socketToPlayer.size === 0) {
          this.match.resetToLobby();
        }
      });
    });
  }

  public simulateTournamentBots(totalBots: number = 25) {
    this.clearSimulatedBots();

    const squadNames = ['Phoenix Apex', 'Cobalt Vanguard', 'Emerald Pulse', 'Solaris Prime', 'Vortex Legion'];
    const teamIds: string[] = [];

    for (let i = 0; i < 5; i++) {
      const palette = TEAM_PALETTES[i % TEAM_PALETTES.length];
      const team = this.match.createTeam('System Bot', squadNames[i], i, palette.symbol);
      if (team) teamIds.push(team.id);
    }

    let botIndex = 1;
    for (let s = 0; s < teamIds.length; s++) {
      const tid = teamIds[s];
      for (let p = 0; p < 5; p++) {
        const botId = `bot_${botIndex}`;
        const bot = this.match.addPlayer(botId, `Bot_${botIndex}`, tid, null);
        if (bot) {
          bot.isBot = true;
          bot.isReady = true;
          this.simulatedBots.push(botId);
        }
        botIndex++;
      }
    }

    const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const;
    this.botMoveInterval = setInterval(() => {
      if (
        this.match.status !== 'ACTIVE' &&
        this.match.status !== 'ZONE_SHRINKING' &&
        this.match.status !== 'ENDGAME'
      ) return;
      if (this.match.isPaused) return;

      for (const botId of this.simulatedBots) {
        const bot = this.match.players.get(botId);
        if (bot && bot.isAlive && Math.random() < 0.25) {
          bot.queueDirection(dirs[Math.floor(Math.random() * dirs.length)]);
        }
      }
    }, 450);

    this.match.logEvent('MATCH_START', `Simulated ${totalBots} Tournament Bots across 5 squads`);
  }

  public clearSimulatedBots() {
    if (this.botMoveInterval) {
      clearInterval(this.botMoveInterval);
      this.botMoveInterval = null;
    }
    for (const botId of this.simulatedBots) {
      this.match.players.delete(botId);
    }
    this.simulatedBots = [];
  }

  private startGameLoop() {
    const tickIntervalMs = 1000 / SERVER_CONFIG.TICK_RATE;

    this.loopInterval = setInterval(() => {
      const now = Date.now();
      const dtSeconds = (now - this.lastTickTime) / 1000;
      this.lastTickTime = now;

      this.match.update(dtSeconds);

      const diffs = this.match.grid.flushDiffs();
      const snapshot = this.match.getSnapshot();

      this.broadcast({
        type: 'TICK_UPDATE',
        state: snapshot,
        territoryDiffs: diffs.length > 0 ? diffs : undefined,
      });
    }, tickIntervalMs);
  }

  public send(socket: Socket, msg: ServerMessage) {
    socket.emit(msg.type, msg);
  }

  public broadcast(msg: ServerMessage) {
    this.io.emit(msg.type, msg);
  }
}
