export class Camera {
  public x: number = 0;
  public y: number = 0;
  public zoom: number = 1.0;

  // Smoothing factor (lerp)
  private lerpFactor: number = 0.15;

  public update(targetX: number, targetY: number) {
    this.x += (targetX - this.x) * this.lerpFactor;
    this.y += (targetY - this.y) * this.lerpFactor;
  }

  public setInstant(targetX: number, targetY: number) {
    this.x = targetX;
    this.y = targetY;
  }
}
