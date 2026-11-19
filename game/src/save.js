// Save / load: one localStorage key, version 2. The save holds cash, the
// hurricane day, the mission index, owned shop items, the player's position
// and health — everything Continue needs to restore a run.

import { SAVE_KEY } from './config.js';

export function saveGame(state) {
  const data = {
    version: 2,
    cash: state.cash,
    hurricaneDay: state.hurricane.day,
    missionIndex: state.missionIndex,
    shopOwned: [...state.shopOwned],
    player: {
      x: state.player.pos.x,
      z: state.player.pos.z,
      heading: state.player.heading,
      health: state.player.health ?? 100,
      armor: state.player.armor ?? 0,
      reserve: state.player.reserve,
    },
    savedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 2) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadSave() !== null;
}

export function applySave(state, data) {
  state.cash = data.cash;
  state.hurricane.day = data.hurricaneDay;
  state.missionIndex = data.missionIndex;
  state.shopOwned = [...(data.shopOwned ?? [])];
  state.player.pos.set(data.player.x, 0, data.player.z);
  state.player.group.position.copy(state.player.pos);
  state.player.heading = data.player.heading ?? 0;
  state.player.health = data.player.health ?? 100;
  state.player.armor = data.player.armor ?? 0;
  state.player.reserve = data.player.reserve ?? 0;
}
