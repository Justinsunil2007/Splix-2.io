import { SERVER_CONFIG } from '../../shared/constants.js';
import { ZoneState } from '../../shared/types.js';

export class BattleZone {
  public minX: number = 0;
  public minY: number = 0;
  public maxX: number = SERVER_CONFIG.MAP_WIDTH - 1;
  public maxY: number = SERVER_CONFIG.MAP_HEIGHT - 1;

  public targetMinX: number = 0;
  public targetMinY: number = 0;
  public targetMaxX: number = SERVER_CONFIG.MAP_WIDTH - 1;
  public targetMaxY: number = SERVER_CONFIG.MAP_HEIGHT - 1;

  public isShrinking: boolean = false;
  public shrinkPhase: number = 0;
  public timeUntilNextShrink: number = SERVER_CONFIG.ZONE_START_DELAY_SECONDS;
  private currentStep: number = 0;
  private totalSteps: number = 100;

  constructor() {
    this.reset();
  }

  public reset() {
    this.minX = 0;
    this.minY = 0;
    this.maxX = SERVER_CONFIG.MAP_WIDTH - 1;
    this.maxY = SERVER_CONFIG.MAP_HEIGHT - 1;
    this.targetMinX = 0;
    this.targetMinY = 0;
    this.targetMaxX = SERVER_CONFIG.MAP_WIDTH - 1;
    this.targetMaxY = SERVER_CONFIG.MAP_HEIGHT - 1;
    this.isShrinking = false;
    this.shrinkPhase = 0;
    this.timeUntilNextShrink = SERVER_CONFIG.ZONE_START_DELAY_SECONDS;
    this.currentStep = 0;
  }

  public triggerNextPhase() {
    if (this.shrinkPhase >= SERVER_CONFIG.ZONE_TOTAL_PHASES) return;

    this.shrinkPhase++;
    this.isShrinking = true;
    this.currentStep = 0;

    // Shrink by 8-10 tiles each phase symmetrically towards center
    const shrinkAmount = 10;
    this.targetMinX = Math.min(Math.floor(SERVER_CONFIG.MAP_WIDTH / 2) - 10, this.minX + shrinkAmount);
    this.targetMinY = Math.min(Math.floor(SERVER_CONFIG.MAP_HEIGHT / 2) - 10, this.minY + shrinkAmount);
    this.targetMaxX = Math.max(Math.floor(SERVER_CONFIG.MAP_WIDTH / 2) + 10, this.maxX - shrinkAmount);
    this.targetMaxY = Math.max(Math.floor(SERVER_CONFIG.MAP_HEIGHT / 2) + 10, this.maxY - shrinkAmount);
  }

  public update(dtSeconds: number) {
    if (this.isShrinking) {
      // Smoothly interpolate bounds
      const shrinkSpeed = 1.0 * dtSeconds; // Move bounds inward gradually
      if (this.minX < this.targetMinX) this.minX = Math.min(this.targetMinX, this.minX + shrinkSpeed);
      if (this.minY < this.targetMinY) this.minY = Math.min(this.targetMinY, this.minY + shrinkSpeed);
      if (this.maxX > this.targetMaxX) this.maxX = Math.max(this.targetMaxX, this.maxX - shrinkSpeed);
      if (this.maxY > this.targetMaxY) this.maxY = Math.max(this.targetMaxY, this.maxY - shrinkSpeed);

      if (
        Math.abs(this.minX - this.targetMinX) < 0.05 &&
        Math.abs(this.minY - this.targetMinY) < 0.05 &&
        Math.abs(this.maxX - this.targetMaxX) < 0.05 &&
        Math.abs(this.maxY - this.targetMaxY) < 0.05
      ) {
        this.minX = this.targetMinX;
        this.minY = this.targetMinY;
        this.maxX = this.targetMaxX;
        this.maxY = this.targetMaxY;
        this.isShrinking = false;
        this.timeUntilNextShrink = SERVER_CONFIG.ZONE_SHRINK_INTERVAL_SECONDS;
      }
    } else {
      this.timeUntilNextShrink -= dtSeconds;
      if (this.timeUntilNextShrink <= 0 && this.shrinkPhase < SERVER_CONFIG.ZONE_TOTAL_PHASES) {
        this.triggerNextPhase();
      }
    }
  }

  public isInsideZone(x: number, y: number): boolean {
    return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY;
  }

  public getSnapshot(): ZoneState {
    return {
      minX: Math.floor(this.minX),
      minY: Math.floor(this.minY),
      maxX: Math.ceil(this.maxX),
      maxY: Math.ceil(this.maxY),
      targetMinX: this.targetMinX,
      targetMinY: this.targetMinY,
      targetMaxX: this.targetMaxX,
      targetMaxY: this.targetMaxY,
      isShrinking: this.isShrinking,
      shrinkPhase: this.shrinkPhase,
      timeUntilShrink: Math.max(0, Math.ceil(this.timeUntilNextShrink)),
    };
  }
}
