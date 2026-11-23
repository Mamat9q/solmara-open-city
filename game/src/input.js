// Keyboard and mouse input. Held keys give a driving/walking direction; one-shot
// presses (confirm, pause, enter car, weapon, radio, activity) are queued as bit
// flags and taken once by the loop, so a press between two frames is never lost
// and never counted twice. Pointer lock is requested on click; a rejection (the
// browser refusing it, headless, an iframe) is swallowed, never thrown.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_RADIO = 8;
export const ACTION_ACTIVITY = 16;
export const ACTION_HORN = 32;
export const ACTION_MISSIONS = 64;

const FORWARD = new Set(['KeyW', 'ArrowUp']);
const BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let lookDX = 0;
  let lookDY = 0;
  let mouseDown = false;
  let locked = false;

  function lockPointer() {
    try {
      const p = canvas.requestPointerLock();
      if (p && typeof p.catch === 'function') p.catch(() => { /* pointer lock refused: mouse look stays off */ });
    } catch {
      // Older browsers throw synchronously; mouse look stays off.
    }
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (event.code === 'KeyE') actions |= ACTION_ENTER;
    else if (event.code === 'KeyR') actions |= ACTION_RADIO;
    else if (event.code === 'KeyF') actions |= ACTION_ACTIVITY;
    else if (event.code === 'KeyH') actions |= ACTION_HORN;
    else if (event.code === 'KeyM') actions |= ACTION_MISSIONS;
    else return;
    if (CONFIRM.has(event.code) || PAUSE.has(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => { held.delete(event.code); });
  window.addEventListener('blur', () => { held.clear(); mouseDown = false; });
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
  });
  document.addEventListener('mousemove', (event) => {
    if (!locked) return;
    lookDX += event.movementX || 0;
    lookDY += event.movementY || 0;
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    if (event.button === 0) actions |= ACTION_CONFIRM;
    lockPointer();
  });
  window.addEventListener('pointerup', () => { mouseDown = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** -1/0/1 forward and strafe, from held keys. */
    drive() {
      const f = (FORWARD.has('KeyW') && held.has('KeyW')) || held.has('ArrowUp') ? 1 : 0;
      const b = held.has('KeyS') || held.has('ArrowDown') ? 1 : 0;
      const l = held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0;
      const r = held.has('KeyD') || held.has('ArrowRight') ? 1 : 0;
      return { forward: f - b, steer: r - l, run: held.has('ShiftLeft') || held.has('ShiftRight') };
    },
    has(code) { return held.has(code); },
    isMouseDown() { return mouseDown; },
    isLocked() { return locked; },
    /** Mouse-look deltas since the last call. */
    takeLook() {
      const d = { x: lookDX, y: lookDY };
      lookDX = 0; lookDY = 0;
      return d;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    lockPointer,
  };
}
