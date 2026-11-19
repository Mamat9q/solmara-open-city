// Save / load through localStorage. One key, one JSON object, no network.
import { SAVE_KEY } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      cash: state.cash,
      hurricaneDay: state.hurricane.day,
      missionIndex: state.missionIndex,
      shopOwned: state.shopOwned,
      wanted: state.wanted,
      player: { x: state.player.pos.x, z: state.player.pos.z },
      car: state.currentCar ? state.currentCar.def.name : null,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return data;
  } catch {
    return null;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  try {
    return window.localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}
