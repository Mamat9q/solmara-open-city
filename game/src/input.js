// SOLMARA input: keyboard state, mouse look deltas and click-to-shoot, with
// pointer lock requested only from a real click and every promise rejection
// swallowed, so a headless browser never sees an unhandled rejection.

export class Input {
  constructor(canvas, onFirstGesture) {
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.clicked = false;
    this.locked = false;
    this.canvas = canvas;
    this.onFirstGesture = onFirstGesture;
    this.handlers = [];
  }

  attach() {
    const down = (event) => {
      if (event.repeat) return;
      this.keys.add(event.code);
      if (this.onFirstGesture) this.onFirstGesture();
    };
    const up = (event) => {
      this.keys.delete(event.code);
    };
    const move = (event) => {
      if (!this.locked) return;
      this.mouseDX += event.movementX || 0;
      this.mouseDY += event.movementY || 0;
    };
    const click = () => {
      if (this.onFirstGesture) this.onFirstGesture();
      this.clicked = true;
      this.requestLock();
    };
    const lockChange = () => {
      this.locked = document.pointerLockElement === this.canvas;
    };
    const lockError = (event) => {
      if (event && event.preventDefault) event.preventDefault();
      this.locked = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    document.addEventListener('mousemove', move);
    this.canvas.addEventListener('mousedown', click);
    document.addEventListener('pointerlockchange', lockChange);
    document.addEventListener('pointerlockerror', lockError);
    this.handlers.push(
      ['keydown', down], ['keyup', up], ['mousemove', move],
    );
    this.canvasClick = click;
    this.lockChange = lockChange;
    this.lockError = lockError;
  }

  requestLock() {
    try {
      if (document.pointerLockElement === this.canvas) return;
      const result = this.canvas.requestPointerLock();
      if (result && typeof result.catch === 'function') {
        result.catch(() => {
          this.locked = false;
        });
      }
    } catch {
      this.locked = false;
    }
  }

  releaseLock() {
    try {
      if (document.pointerLockElement) document.exitPointerLock();
    } catch {
      // Leaving pointer lock must never throw.
    }
  }

  isDown(code) {
    return this.keys.has(code);
  }

  consumeLook() {
    const dx = this.mouseDX;
    const dy = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;
    return { dx, dy };
  }

  consumeClick() {
    const was = this.clicked;
    this.clicked = false;
    return was;
  }

  clear() {
    this.keys.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.clicked = false;
  }
}
