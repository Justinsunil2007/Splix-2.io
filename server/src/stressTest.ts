import { WebSocket } from 'ws';
import { ClientMessage, Direction, ServerMessage, TeamId } from '../../shared/types.js';

const SERVER_URL = process.env.WS_URL || 'ws://localhost:8080';
const TOTAL_BOTS = 10;
const DIRS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

class BotClient {
  public ws: WebSocket | null = null;
  public id: string = '';
  public name: string;
  public teamId: TeamId;
  public isAlive: boolean = false;
  private changeDirInterval: NodeJS.Timeout | null = null;

  constructor(name: string, teamId: TeamId) {
    this.name = name;
    this.teamId = teamId;
  }

  public connect() {
    this.ws = new WebSocket(SERVER_URL);

    this.ws.on('open', () => {
      const joinMsg: ClientMessage = {
        type: 'JOIN_LOBBY',
        name: this.name,
        teamId: this.teamId,
      };
      this.ws?.send(JSON.stringify(joinMsg));
    });

    this.ws.on('message', (raw: string) => {
      const msg: ServerMessage = JSON.parse(raw.toString());
      if (msg.type === 'INIT_STATE') {
        this.id = msg.playerId;
      } else if (msg.type === 'MATCH_STARTED') {
        this.startMoving();
      } else if (msg.type === 'MATCH_ENDED') {
        this.stopMoving();
      }
    });

    this.ws.on('close', () => {
      this.stopMoving();
    });
  }

  private startMoving() {
    this.isAlive = true;
    this.changeDirInterval = setInterval(() => {
      if (!this.isAlive || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      // Random turn
      const randomDir = DIRS[Math.floor(Math.random() * DIRS.length)];
      const msg: ClientMessage = {
        type: 'SET_DIRECTION',
        direction: randomDir,
      };
      this.ws.send(JSON.stringify(msg));
    }, 400 + Math.random() * 400);
  }

  private stopMoving() {
    if (this.changeDirInterval) {
      clearInterval(this.changeDirInterval);
      this.changeDirInterval = null;
    }
  }

  public disconnect() {
    this.stopMoving();
    this.ws?.close();
  }
}

async function runSimulation() {
  console.log(`🤖 Starting Stress Simulation against ${SERVER_URL}...`);

  const bots: BotClient[] = [];

  for (let i = 0; i < TOTAL_BOTS; i++) {
    const bot = new BotClient(`Bot_${i + 1}`, `team_bot_${i % 2}`);
    bots.push(bot);
    bot.connect();
    await new Promise((r) => setTimeout(r, 60));
  }

  console.log(`✅ Bot Operatives connected!`);
}

runSimulation().catch(console.error);
