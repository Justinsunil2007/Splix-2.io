import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import crypto from 'crypto';
import { ClientMessage, ServerMessage } from '../../shared/types.js';
import { SERVER_CONFIG, TEAM_PALETTES } from '../../shared/constants.js';
import { Match } from './Match.js';

// Server-side authoritative admin token management
const ADMIN_PASSWORD = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || 'justin';
const activeAdminTokens = new Set<string>();

export class GameServer {
  private wss: WebSocketServer;
  public match: Match;
  private clientSockets: Map<WebSocket, string> = new Map(); // socket -> playerId
  private loopInterval: NodeJS.Timeout | null = null;
  private botMoveInterval: NodeJS.Timeout | null = null;
  private lastTickTime: number = Date.now();
  private simulatedBots: string[] = [];

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.match = new Match((msg) => this.broadcast(msg));
    this.setupWebSocketServer();
    this.startGameLoop();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
      this.clientSockets.set(ws, playerId);

      // Send initial state upon connection
      this.send(ws, {
        type: 'INIT_STATE',
        playerId,
        mapWidth: SERVER_CONFIG.MAP_WIDTH,
        mapHeight: SERVER_CONFIG.MAP_HEIGHT,
        grid: this.match.grid.cells,
        state: this.match.getSnapshot(),
      });

      // Send current match history & standings
      this.send(ws, {
        type: 'TOURNAMENT_STANDINGS',
        standings: this.match.getTournamentStandings(),
      });
      this.send(ws, {
        type: 'MATCH_HISTORY',
        records: this.match.matchHistory,
      });

      ws.on('message', (raw: string) => {
        try {
          const data: ClientMessage = JSON.parse(raw.toString());
          this.handleClientMessage(ws, playerId, data);
        } catch (err) {
          console.error('Failed to parse client message:', err);
        }
      });

      ws.on('close', () => {
        this.clientSockets.delete(ws);
        this.match.removePlayer(playerId);
        if (this.match.status === 'MATCH_END' && this.clientSockets.size === 0) {
          this.match.resetToLobby();
        }
      });

      ws.on('error', (err) => {
        console.error(`Socket error for player ${playerId}:`, err);
      });
    });
  }

  private handleClientMessage(ws: WebSocket, playerId: string, msg: ClientMessage) {
    switch (msg.type) {
      case 'PING': {
        const player = this.match.players.get(playerId);
        if (player) {
          player.ping = Math.max(5, Math.floor(Date.now() - msg.clientTime));
        }
        this.send(ws, {
          type: 'PONG',
          clientTime: msg.clientTime,
          serverTime: Date.now(),
        });
        break;
      }

      case 'CREATE_TEAM': {
        const player = this.match.players.get(playerId);
        const creatorName = player ? player.name : 'Operative';
        const team = this.match.createTeam(creatorName, msg.name, msg.colorIndex, msg.symbol);
        if (!team) {
          this.send(ws, {
            type: 'ERROR_MESSAGE',
            code: 'CREATE_TEAM_FAILED',
            message: 'Could not create team. Maximum 6 teams reached or match is in progress.',
          });
          return;
        }

        if (player) {
          this.match.setPlayerTeam(playerId, team.id);
        }
        break;
      }

      case 'JOIN_LOBBY': {
        const cleanName = (msg.name || 'Operative').trim().substring(0, SERVER_CONFIG.MAX_NAME_LENGTH) || 'Operative';

        if (this.match.status === 'MATCH_END') {
          this.match.resetToLobby();
        }

        let player: import('./Player.js').Player | undefined = this.match.players.get(playerId);
        if (!player) {
          const added = this.match.addPlayer(playerId, cleanName, msg.teamId, ws);
          player = added ?? undefined;
        } else {
          player.name = cleanName;
          if (msg.teamId) {
            this.match.setPlayerTeam(playerId, msg.teamId);
          }
        }

        if (!player) {
          this.send(ws, {
            type: 'ERROR_MESSAGE',
            code: 'JOIN_FAILED',
            message: 'Match in progress or lobby is full (max 30 players). Please wait for the next round.',
          });
          return;
        }

        this.send(ws, {
          type: 'INIT_STATE',
          playerId,
          mapWidth: SERVER_CONFIG.MAP_WIDTH,
          mapHeight: SERVER_CONFIG.MAP_HEIGHT,
          grid: this.match.grid.cells,
          state: this.match.getSnapshot(),
        });
        break;
      }

      case 'SELECT_TEAM': {
        const success = this.match.setPlayerTeam(playerId, msg.teamId);
        if (!success) {
          this.send(ws, {
            type: 'ERROR_MESSAGE',
            code: 'TEAM_CHANGE_FAILED',
            message: 'Cannot switch to this squad (squad is full with 5 players or match is active).',
          });
        }
        break;
      }

      case 'TOGGLE_READY': {
        const player = this.match.players.get(playerId);
        if (player) {
          player.isReady = !player.isReady;
        }
        break;
      }

      case 'SET_DIRECTION': {
        const player = this.match.players.get(playerId);
        if (player && player.isAlive && !this.match.isPaused) {
          player.queueDirection(msg.direction);
        }
        break;
      }

      case 'ADMIN_LOGIN': {
        // Authoritative secure token generation
        if (msg.token === ADMIN_PASSWORD) {
          const sessionToken = 'adm_' + crypto.randomBytes(16).toString('hex');
          activeAdminTokens.add(sessionToken);
          this.send(ws, {
            type: 'ADMIN_AUTH_RESULT',
            success: true,
            message: sessionToken,
          });
          this.match.logEvent('MATCH_START', 'Admin session authenticated');
        } else {
          this.send(ws, {
            type: 'ADMIN_AUTH_RESULT',
            success: false,
            message: 'Invalid administrator credentials.',
          });
        }
        break;
      }

      case 'ADMIN_COMMAND': {
        // Validate admin session token
        if (!activeAdminTokens.has(msg.token) && msg.token !== ADMIN_PASSWORD) {
          this.send(ws, {
            type: 'ERROR_MESSAGE',
            code: 'UNAUTHORIZED',
            message: 'Unauthorized action. Invalid organizer authorization token.',
          });
          return;
        }

        if (msg.command === 'START_MATCH') {
          if (this.match.status === 'LOBBY') {
            this.match.startIntro();
          }
        } else if (msg.command === 'PAUSE_MATCH') {
          this.match.pauseMatch();
        } else if (msg.command === 'RESUME_MATCH') {
          this.match.resumeMatch();
        } else if (msg.command === 'EMERGENCY_RESET') {
          this.clearSimulatedBots();
          this.match.resetToLobby();
        } else if (msg.command === 'END_MATCH') {
          this.match.endMatch();
        } else if (msg.command === 'FORCE_SHRINK') {
          this.match.zone.triggerNextPhase();
        } else if (msg.command === 'KICK_PLAYER' && msg.targetId) {
          this.match.removePlayer(msg.targetId);
        } else if (msg.command === 'SIMULATE_BOTS') {
          this.simulateTournamentBots(25);
        } else if (msg.command === 'CLEAR_BOTS') {
          this.clearSimulatedBots();
        } else if (msg.command === 'CLEAR_HISTORY') {
          this.match.matchHistory = [];
          this.broadcast({
            type: 'TOURNAMENT_STANDINGS',
            standings: [],
          });
          this.broadcast({
            type: 'MATCH_HISTORY',
            records: [],
          });
        }
        break;
      }
    }
  }

  public simulateTournamentBots(totalBots: number = 25) {
    this.clearSimulatedBots();

    // Create 5 squads
    const squadNames = ['Phoenix Apex', 'Cobalt Vanguard', 'Emerald Pulse', 'Solaris Prime', 'Vortex Legion'];
    const teamIds: string[] = [];

    for (let i = 0; i < 5; i++) {
      const palette = TEAM_PALETTES[i % TEAM_PALETTES.length];
      const team = this.match.createTeam('System Bot', squadNames[i], i, palette.symbol);
      if (team) teamIds.push(team.id);
    }

    // Add 5 bots per squad = 25 bots
    let botIndex = 1;
    for (let s = 0; s < teamIds.length; s++) {
      const tid = teamIds[s];
      for (let p = 0; p < 5; p++) {
        const botId = `bot_${botIndex}`;
        const bot = this.match.addPlayer(botId, `Operative_${botIndex}`, tid, null);
        if (bot) {
          bot.isBot = true;
          bot.isReady = true;
          this.simulatedBots.push(botId);
        }
        botIndex++;
      }
    }

    // Start bot random steering
    const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const;
    this.botMoveInterval = setInterval(() => {
      if (this.match.status !== 'ACTIVE' && this.match.status !== 'ZONE_SHRINKING' && this.match.status !== 'ENDGAME') return;
      if (this.match.isPaused) return;

      for (const botId of this.simulatedBots) {
        const bot = this.match.players.get(botId);
        if (bot && bot.isAlive && Math.random() < 0.25) {
          const nextDir = dirs[Math.floor(Math.random() * dirs.length)];
          bot.queueDirection(nextDir);
        }
      }
    }, 450);

    this.match.logEvent('MATCH_START', `Simulated 25 Tournament Bots across 5 squads`);
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

      // Update simulation
      this.match.update(dtSeconds);

      // Collect diffs and broadcast snapshot
      const diffs = this.match.grid.flushDiffs();
      const snapshot = this.match.getSnapshot();

      this.broadcast({
        type: 'TICK_UPDATE',
        state: snapshot,
        territoryDiffs: diffs.length > 0 ? diffs : undefined,
      });
    }, tickIntervalMs);
  }

  public send(ws: WebSocket, msg: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  public broadcast(msg: ServerMessage) {
    const payload = JSON.stringify(msg);
    for (const ws of this.clientSockets.keys()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}
