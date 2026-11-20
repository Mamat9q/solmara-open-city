// Keyboard and mouse input. Held keys give steering/throttle; one-shot presses are
// queued as named actions and taken once by the loop, so a press between frames is
// never lost and never counted twice. Pointer lock is best-effort: its promise
// rejection is swallowed, and mouse drag always works as a fallback.

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_ENTER_CAR = 'enterCar';
export const ACTION_MISSION = 'mission';
export const ACTION_TAXI = 'taxi';
export const ACTION_RACE = 'race';
export const ACTION_DELIVERY = 'delivery';
export const ACTION_GARAGE = 'garage';
export const ACTION_SHOP = 'shop';
export const ACTION_SAVE = 'save';
export const ACTION_RADIO = 'radio';
export const ACTION_HORN = 'horn';
export const ACTION_FIRE = 'fire';

const KEY_ACTIONS = {
  Space: ACTION_CONFIRM, Enter: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE, Escape: ACTION_PAUSE,
  KeyE: ACTION_ENTER_CAR,
  KeyM: ACTION_MISSION,
  KeyT: ACTION_TAXI,
  KeyR: ACTION_RACE,
  KeyY: ACTION_DELIVERY,
  KeyG: ACTION_GARAGE,
  KeyB: ACTION_SHOP,
  KeyK: ACTION_SAVE,
  KeyC: ACTION_RADIO,
  KeyH: ACTION_HORN,
};

export function createInput(canvas) {
  const keys = {};
  const actions = [];
  let mouseDX = 0;
  let mouseDY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys[event.code] = true;
    const action = KEY_ACTIONS[event.code];
    if (action) {
      actions.push(action);
      if (action === ACTION_CONFIRM || action === ACTION_PAUSE) event.preventDefault();
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => { keys[event.code] = false; });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
    dragging = false;
  });

  canvas.addEventListener('pointerdown', (event) => {
    actions.push(ACTION_CONFIRM);
    if (event.button === 0) actions.push(ACTION_FIRE);
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    try {
      const p = canvas.requestPointerLock();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch { /* pointer lock is optional */ }
  });
  window.addEventListener('pointerup', () => { dragging = false; });
  window.addEventListener('pointermove', (event) => {
    if (document.pointerLockElement === canvas) {
      mouseDX += event.movementX || 0;
      mouseDY += event.movementY || 0;
    } else if (dragging) {
      mouseDX += event.clientX - lastX;
      mouseDY += event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
    }
  });
  document.addEventListener('pointerlockerror', () => { /* drag fallback stays live */ });

  return {
    keys,
    /** -1 left, 1 right. */
    steer() {
      const l = keys.ArrowLeft || keys.KeyA;
      const r = keys.ArrowRight || keys.KeyD;
      return (r ? 1 : 0) - (l ? 1 : 0);
    },
    throttle() {
      const up = keys.ArrowUp || keys.KeyW;
      const down = keys.ArrowDown || keys.KeyS;
      return (up ? 1 : 0) - (down ? 1 : 0);
    },
    sprint() { return !!keys.ShiftLeft || !!keys.ShiftRight; },
    takeMouse() {
      const dx = mouseDX;
      const dy = mouseDY;
      mouseDX = 0;
      mouseDY = 0;
      return { dx, dy };
    },
    /** Drain the one-shot action queue. */
    takeActions() {
      const out = actions.splice(0, actions.length);
      return out;
    },
    has(action) { return actions.includes(action); },
  };
}
