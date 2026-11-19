// Keyboard input: a live set of held codes plus edge-triggered presses.
// The game reads e.code (KeyW, KeyE, ...) so layout and case never matter.

export function createInput() {
  const held = new Set();
  const pressed = new Set();
  const listeners = [];

  function onKeyDown(e) {
    if (e.repeat) return;
    held.add(e.code);
    pressed.add(e.code);
    for (const fn of listeners) fn(e.code, true);
  }

  function onKeyUp(e) {
    held.delete(e.code);
    for (const fn of listeners) fn(e.code, false);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return {
    isHeld(code) {
      return held.has(code);
    },
    wasPressed(code) {
      return pressed.has(code);
    },
    consume(code) {
      pressed.delete(code);
    },
    clearPressed() {
      pressed.clear();
    },
    onKey(fn) {
      listeners.push(fn);
    },
  };
}
