import { Direction } from '../../../shared/types.js';

export class InputManager {
  private onDirectionChange: (dir: Direction) => void;
  private currentDir: Direction = 'RIGHT';

  constructor(onDirectionChange: (dir: Direction) => void) {
    this.onDirectionChange = onDirectionChange;
    this.initKeyboard();
    this.initTouchGestures();
  }

  private initKeyboard() {
    window.addEventListener('keydown', (e) => {
      let newDir: Direction | null = null;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          newDir = 'UP';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          newDir = 'DOWN';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          newDir = 'LEFT';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          newDir = 'RIGHT';
          break;
      }

      if (newDir && newDir !== this.currentDir) {
        this.setDirection(newDir);
      }
    });
  }

  private initTouchGestures() {
    let touchStartX = 0;
    let touchStartY = 0;

    window.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length > 0) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      },
      { passive: true }
    );

    window.addEventListener(
      'touchend',
      (e) => {
        if (e.changedTouches.length > 0) {
          const touchEndX = e.changedTouches[0].clientX;
          const touchEndY = e.changedTouches[0].clientY;

          const dx = touchEndX - touchStartX;
          const dy = touchEndY - touchStartY;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          // Threshold of 20px swipe
          if (Math.max(absDx, absDy) > 20) {
            if (absDx > absDy) {
              this.setDirection(dx > 0 ? 'RIGHT' : 'LEFT');
            } else {
              this.setDirection(dy > 0 ? 'DOWN' : 'UP');
            }
          }
        }
      },
      { passive: true }
    );
  }

  public setDirection(dir: Direction) {
    this.currentDir = dir;
    this.onDirectionChange(dir);
  }

  public destroy() {
    // Window listeners remain clean
  }
}
