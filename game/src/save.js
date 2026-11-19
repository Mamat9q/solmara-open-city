// Save / load through localStorage. The save is a plain JSON snapshot of the
// run: cash, day, chapter, mission, ammo, armor, owned shop items, and the
// player / car transforms. Nothing leaves the browser.
import { SAVE_KEY, SAVE_VERSION } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      version: SAVE_VERSION,
      cash: state.cash,
      day: state.day,
      chapter: state.chapterIndex,
      missionIndex: state.missionIndex,
      ammo: state.ammo,
      armor: state.armor,
      owned: state.owned,
      player: { x: state.playerX, z: state.playerZ, heading: state.playerHeading },
      car: { x: state.carX, z: state.carZ, heading: state.carHeading, health: state.carHealth },
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== SAVE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}
