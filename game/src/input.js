// Keyboard + mouse input. Keys are tracked by code; the game reads them every
// frame, so held keys steer and drive smoothly. Pointer lock is requested on
// the first click of the canvas (its promise rejection is swallowed).
export const input = {
  keys: new Set(),
  mouseDX: 0,
  mouseDY: 0,
  locked: false,
  attached: false,

  attach(canvas) {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') e.preventDefault();
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('click', () => {
      if (!this.locked && canvas.requestPointerLock) {
        const p = canvas.requestPointerLock();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
    document.addEventListener('mousemove', (e) => {
      if (this.locked) {
        this.mouseDX += e.movementX || 0;
        this.mouseDY += e.movementY || 0;
      }
    });
  },

  down(code) {
    return this.keys.has(code);
  },

  // Synthetic input for the autopilot / staged shots: pretend these keys are held.
  inject(codes) {
    for (const c of codes) this.keys.add(c);
  },
  release(codes) {
    for (const c of codes) this.keys.delete(c);
  },

  consumeMouse() {
    const dx = this.mouseDX;
    const dy = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;
    return { dx, dy };
  },
};

export function driveControls() {
  return {
    throttle: input.down('KeyW') || input.down('ArrowUp') ? 1 : 0,
    brake: input.down('KeyS') || input.down('ArrowDown') ? 1 : 0,
    reverse: input.down('KeyS') || input.down('ArrowDown'),
    steer: (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0) - (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0),
    handbrake: input.down('Space') ? 1 : 0,
  };
}
