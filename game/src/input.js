// Keyboard + pointer state. Pointer lock is requested on canvas click and its
// promise rejection is caught (headless browsers and non-gesture clicks must
// never throw); the game is fully playable on keyboard alone.
export class Input {
  constructor(canvas, onFirstGesture) {
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.locked = false;
    this._gesture = onFirstGesture || null;
    this._gestured = false;
    window.addEventListener('keydown', (e) => {
      this._noteGesture();
      this.keys.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('click', () => {
      this._noteGesture();
      if (canvas.requestPointerLock) {
        try {
          const p = canvas.requestPointerLock();
          if (p && typeof p.catch === 'function') p.catch(() => { /* lock refused: keyboard still works */ });
        } catch { /* pointer lock unavailable */ }
      }
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX || 0;
      this.mouseDY += e.movementY || 0;
    });
    canvas.addEventListener('mousedown', () => this._noteGesture());
  }

  _noteGesture() {
    if (this._gestured) return;
    this._gestured = true;
    if (this._gesture) this._gesture();
  }

  down(...codes) {
    for (const c of codes) if (this.keys.has(c)) return true;
    return false;
  }

  pressed(code) {
    // One-shot edge: callers clear it after handling.
    if (this.keys.has(code)) {
      this.keys.delete(code);
      return true;
    }
    return false;
  }

  consumeMouse() {
    const dx = this.mouseDX;
    const dy = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;
    return { dx, dy };
  }

  get throttle() {
    return this.down('KeyW', 'ArrowUp') ? 1 : 0;
  }

  get brake() {
    return this.down('KeyS', 'ArrowDown') ? 1 : 0;
  }

  get steer() {
    let s = 0;
    if (this.down('KeyA', 'ArrowLeft')) s -= 1;
    if (this.down('KeyD', 'ArrowRight')) s += 1;
    return s;
  }

  get walkX() {
    let x = 0;
    if (this.down('KeyA', 'ArrowLeft')) x -= 1;
    if (this.down('KeyD', 'ArrowRight')) x += 1;
    return x;
  }

  get walkZ() {
    let z = 0;
    if (this.down('KeyW', 'ArrowUp')) z -= 1;
    if (this.down('KeyS', 'ArrowDown')) z += 1;
    return z;
  }
}
