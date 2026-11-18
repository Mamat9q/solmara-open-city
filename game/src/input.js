// Keyboard + mouse input for Solmara: WASD, sprint, jump, E interact, R reload,
// F fists/pistol swap, Esc pause, mouse-look deltas and click-to-shoot state.
export function createInput(canvas) {
  const keys = new Set();
  let lookDX = 0, lookDY = 0, mouseDown = false, mouseClicked = false;
  let locked = false;
  const onKeyDown = (e) => {
    if (e.code === 'Tab') e.preventDefault();
    keys.add(e.code);
    // Pulse once per physical press: ignore auto-repeat so E/R/F never double-fire.
    if (!e.repeat && (e.code === 'KeyE' || e.code === 'KeyR' || e.code === 'KeyF' || e.code === 'KeyM' || e.code === 'KeyT' || e.code === 'KeyG')) keys.add('Pulse:' + e.code);
  };
  const onKeyUp = (e) => keys.delete(e.code);
  const onMouseMove = (e) => {
    if (document.pointerLockElement === canvas) { lookDX += e.movementX; lookDY += e.movementY; }
  };
  const onMouseDown = (e) => { if (e.button === 0) { mouseDown = true; mouseClicked = true; } };
  const onMouseUp = (e) => { if (e.button === 0) mouseDown = false; };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; });
  return {
    keys,
    get down() { return keys.has('KeyW') || keys.has('ArrowUp'); },
    get back() { return keys.has('KeyS') || keys.has('ArrowDown'); },
    get left() { return keys.has('KeyA') || keys.has('ArrowLeft'); },
    get right() { return keys.has('KeyD') || keys.has('ArrowRight'); },
    get sprint() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    get jump() { return keys.has('Space'); },
    get handbrake() { return keys.has('Space'); },
    get mouseDown() { return mouseDown; },
    get mouseClicked() { const c = mouseClicked; mouseClicked = false; return c; },
    get locked() { return locked; },
    consumeLook() { const d = { dx: lookDX, dy: lookDY }; lookDX = 0; lookDY = 0; return d; },
    // One-frame pulse: true once per key press, then cleared by the caller loop.
    pulse(code) { const k = 'Pulse:' + code; if (keys.has(k)) { keys.delete(k); return true; } return false; },
    lockPointer() { try { canvas.requestPointerLock(); } catch { /* pointer lock unavailable */ } },
    unlockPointer() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch { /* noop */ } },
  };
}
