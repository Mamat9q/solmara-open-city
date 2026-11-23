// Save / load: one JSON blob in localStorage holding money, respect, owned cars
// and upgrades, weapons and ammo, mission progress, the day and the player's
// position. Saving never throws (private windows, full storage) — it just skips.
import { SAVE_KEY, START_CASH, START_HEALTH } from './config.js';

export function defaultSave() {
  return {
    money: START_CASH,
    respect: 0,
    day: 1,
    carId: 'dune',
    ownedCars: ['dune'],
    upgrades: [],
    engineLevel: 0,
    armor: false,
    paintIndex: 0,
    ownedWeapons: ['pistol'],
    ammo: { pistol: 60, smg: 0, shotgun: 0 },
    weapon: 'pistol',
    missionIndex: 0,
    missionsDone: [],
    health: START_HEALTH,
    px: 0, pz: 40,
  };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.money !== 'number') return null;
    return { ...defaultSave(), ...data };
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    const data = {
      money: state.money,
      respect: state.respect,
      day: state.day,
      carId: state.carId,
      ownedCars: state.ownedCars,
      upgrades: state.upgrades,
      engineLevel: state.engineLevel || 0,
      armor: !!state.armor,
      paintIndex: state.paintIndex || 0,
      ownedWeapons: state.ownedWeapons,
      ammo: state.ammo,
      weapon: state.weapon,
      missionIndex: state.missions.index,
      missionsDone: [...state.missions.completed],
      health: state.health,
      px: state.player.mesh.position.x,
      pz: state.player.mesh.position.z,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable: the session keeps playing, nothing is saved.
  }
}

export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
