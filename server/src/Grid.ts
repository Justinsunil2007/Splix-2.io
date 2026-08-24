import { Position, TeamId } from '../../shared/types.js';
import { SERVER_CONFIG } from '../../shared/constants.js';

export class GridMap {
  public readonly width: number;
  public readonly height: number;
  public cells: (TeamId | null)[][];
  private pendingDiffs: Map<string, { x: number; y: number; teamId: TeamId | null }> = new Map();

  constructor(width: number = SERVER_CONFIG.MAP_WIDTH, height: number = SERVER_CONFIG.MAP_HEIGHT) {
    this.width = width;
    this.height = height;
    this.cells = Array.from({ length: height }, () => Array(width).fill(null));
  }

  public reset() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.cells[y][x] = null;
      }
    }
    this.pendingDiffs.clear();
  }

  public isWithinBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  public getCell(x: number, y: number): TeamId | null {
    if (!this.isWithinBounds(x, y)) return null;
    return this.cells[y][x];
  }

  public setCell(x: number, y: number, teamId: TeamId | null) {
    if (!this.isWithinBounds(x, y)) return;
    if (this.cells[y][x] !== teamId) {
      this.cells[y][x] = teamId;
      this.pendingDiffs.set(`${x},${y}`, { x, y, teamId });
    }
  }

  public initTeamSpawn(spawnX: number, spawnY: number, teamId: TeamId, radius: number = SERVER_CONFIG.STARTING_TERRITORY_RADIUS) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = spawnX + dx;
        const ny = spawnY + dy;
        this.setCell(nx, ny, teamId);
      }
    }
  }

  public clearTeamTerritory(teamId: TeamId) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.cells[y][x] === teamId) {
          this.setCell(x, y, null);
        }
      }
    }
  }

  /**
   * Fast polygon flood-fill capture algorithm.
   * Finds the bounding box of player trail + friendly territory anchor,
   * performs inverse flood fill from bounding box boundaries to determine enclosed tiles.
   */
  public captureTerritory(trail: Position[], teamId: TeamId): number {
    if (trail.length === 0) return 0;

    // Convert trail to team territory first
    for (const p of trail) {
      this.setCell(p.x, p.y, teamId);
    }

    // Determine bounding box with 1-tile padding
    let minX = this.width;
    let maxX = 0;
    let minY = this.height;
    let maxY = 0;

    for (const p of trail) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const pad = 1;
    const bbMinX = Math.max(0, minX - pad);
    const bbMaxX = Math.min(this.width - 1, maxX + pad);
    const bbMinY = Math.max(0, minY - pad);
    const bbMaxY = Math.min(this.height - 1, maxY + pad);

    const bWidth = bbMaxX - bbMinX + 1;
    const bHeight = bbMaxY - bbMinY + 1;

    // Mark visited for flood fill: 0 = unvisited, 1 = exterior reachable
    const visited = Array.from({ length: bHeight }, () => new Uint8Array(bWidth));
    const queue: [number, number][] = [];

    // Enqueue perimeter nodes of the bounding box that are NOT team territory
    for (let bx = 0; bx < bWidth; bx++) {
      // Top row
      const gxTop = bbMinX + bx;
      const gyTop = bbMinY;
      if (this.getCell(gxTop, gyTop) !== teamId) {
        visited[0][bx] = 1;
        queue.push([bx, 0]);
      }
      // Bottom row
      const gyBottom = bbMaxY;
      if (this.getCell(gxTop, gyBottom) !== teamId) {
        visited[bHeight - 1][bx] = 1;
        queue.push([bx, bHeight - 1]);
      }
    }

    for (let by = 0; by < bHeight; by++) {
      // Left col
      const gxLeft = bbMinX;
      const gyLeft = bbMinY + by;
      if (visited[by][0] === 0 && this.getCell(gxLeft, gyLeft) !== teamId) {
        visited[by][0] = 1;
        queue.push([0, by]);
      }
      // Right col
      const gxRight = bbMaxX;
      const gyRight = bbMinY + by;
      if (visited[by][bWidth - 1] === 0 && this.getCell(gxRight, gyRight) !== teamId) {
        visited[by][bWidth - 1] = 1;
        queue.push([bWidth - 1, by]);
      }
    }

    // BFS Flood Fill to mark outside nodes
    let head = 0;
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    while (head < queue.length) {
      const [currBx, currBy] = queue[head++];

      for (const [dx, dy] of dirs) {
        const nbx = currBx + dx;
        const nby = currBy + dy;

        if (nbx >= 0 && nbx < bWidth && nby >= 0 && nby < bHeight) {
          if (visited[nby][nbx] === 0) {
            const gx = bbMinX + nbx;
            const gy = bbMinY + nby;
            if (this.getCell(gx, gy) !== teamId) {
              visited[nby][nbx] = 1;
              queue.push([nbx, nby]);
            }
          }
        }
      }
    }

    // Every unvisited cell inside the bounding box is enclosed! Capture it!
    let capturedCount = 0;
    for (let by = 0; by < bHeight; by++) {
      for (let bx = 0; bx < bWidth; bx++) {
        if (visited[by][bx] === 0) {
          const gx = bbMinX + bx;
          const gy = bbMinY + by;
          if (this.getCell(gx, gy) !== teamId) {
            this.setCell(gx, gy, teamId);
            capturedCount++;
          }
        }
      }
    }

    return capturedCount;
  }

  public getTerritoryCounts(): Record<TeamId, number> {
    const counts: Record<TeamId, number> = {
      red: 0,
      blue: 0,
      green: 0,
      yellow: 0,
      purple: 0,
    };

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.cells[y][x];
        if (cell && counts[cell] !== undefined) {
          counts[cell]++;
        }
      }
    }
    return counts;
  }

  public flushDiffs(): { teamId: TeamId | null; tiles: [number, number][] }[] {
    if (this.pendingDiffs.size === 0) return [];

    const grouped = new Map<TeamId | null, [number, number][]>();
    for (const diff of this.pendingDiffs.values()) {
      if (!grouped.has(diff.teamId)) {
        grouped.set(diff.teamId, []);
      }
      grouped.get(diff.teamId)!.push([diff.x, diff.y]);
    }

    this.pendingDiffs.clear();
    return Array.from(grouped.entries()).map(([teamId, tiles]) => ({ teamId, tiles }));
  }
}
