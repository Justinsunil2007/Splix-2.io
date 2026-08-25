import { Direction, PlayerPublicState, Position, TeamId } from '../../shared/types.js';
import type { Socket } from 'socket.io';

export class Player {
  public readonly id: string;
  public name: string;
  public teamId: TeamId;
  public socket: Socket | null = null;

  public x: number = 0;
  public y: number = 0;
  public direction: Direction = 'RIGHT';
  public nextDirection: Direction = 'RIGHT';

  public isAlive: boolean = true;
  public trail: Position[] = [];
  public score: number = 0;
  public kills: number = 0;
  public isReady: boolean = false;
  public isInSafeZone: boolean = true;
  public outOfBoundsTicks: number = 0;

  public isOnOwnTerritory: boolean = true;
  public lastMoveTime: number = Date.now();
  public ping: number = 25;
  public isBot: boolean = false;

  public disconnectedAt: number | null = null;

  constructor(id: string, name: string, teamId: TeamId, socket: Socket | null = null) {
    this.id = id;
    this.name = name;
    this.teamId = teamId;
    this.socket = socket;
  }

  public setSpawn(x: number, y: number, initialDir: Direction) {
    this.x = x;
    this.y = y;
    this.direction = initialDir;
    this.nextDirection = initialDir;
    this.isAlive = true;
    this.trail = [];
    this.isOnOwnTerritory = true;
    this.outOfBoundsTicks = 0;
    this.isInSafeZone = true;
  }

  public queueDirection(newDir: Direction) {
    if (
      (this.direction === 'UP' && newDir === 'DOWN') ||
      (this.direction === 'DOWN' && newDir === 'UP') ||
      (this.direction === 'LEFT' && newDir === 'RIGHT') ||
      (this.direction === 'RIGHT' && newDir === 'LEFT')
    ) {
      return;
    }
    this.nextDirection = newDir;
  }

  public advance() {
    if (!this.isAlive) return;
    this.direction = this.nextDirection;

    switch (this.direction) {
      case 'UP':    this.y -= 1; break;
      case 'DOWN':  this.y += 1; break;
      case 'LEFT':  this.x -= 1; break;
      case 'RIGHT': this.x += 1; break;
    }
  }

  public toPublicState(): PlayerPublicState {
    return {
      id: this.id,
      name: this.name,
      teamId: this.teamId,
      x: this.x,
      y: this.y,
      direction: this.direction,
      isAlive: this.isAlive,
      trail: this.trail,
      score: this.score,
      kills: this.kills,
      isReady: this.isReady,
      isInSafeZone: this.isInSafeZone,
      ping: this.ping,
    };
  }
}
