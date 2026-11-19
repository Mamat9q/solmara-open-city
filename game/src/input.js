// Keyboard + mouse input. Keys are tracked by e.code. `pressed` is the edge set:
// a code lands there on keydown (never on repeat) and stays until the game loop
// consumes it at the end of a frame, so a quick synthetic key press is never lost
// between two slow headless frames.
export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.locked = false;
    this._onKeyDown = (e) => {
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    };
    this._onKeyUp = (e) => {
      this.down.delete(e.code);
    };
    this._onMouseMove = (e) => {
      if (this.locked) {
        this.mouseDX += e.movementX || 0;
        this.mouseDY += e.movementY || 0;
      }
    };
    this._onPointerLock = () => {
      this.locked = document.pointerLockElement != null;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onPointerLock);
  }

  isDown(code) {
    return this.down.has(code);
  }

  // True once per physical press; the game loop clears it in endFrame().
  wasPressed(code) {
    return this.pressed.has(code);
  }

  endFrame() {
    this.pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
  }

  lockPointer(canvas) {
    try {
      canvas.requestPointerLock();
    } catch {
      // Pointer lock is a nicety, not a requirement.
    }
  }
}
