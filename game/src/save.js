// Save / load: one localStorage slot holding cash, respect, day, mission progress,
// garage, weapons and health. Autosaves on mission completion; K saves by hand.

import { SAVE_KEY } from './config.js';

export function createSave(G) {
  function saveGame() {
    try {
      const s = G.state;
      const data = {
        cash: s.cash, respect: s.respect, day: s.day, missionIndex: s.missionIndex,
        missionsDone: s.missionsDone, ownedCars: s.ownedCars, carIndex: s.carIndex,
        upgrades: s.upgrades, paint: s.paint, ownedWeapons: s.ownedWeapons,
        weapon: s.weapon, ammo: s.ammo, health: s.health, radio: G.audio ? 0 : 0,
      };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  function loadGame() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (typeof d !== 'object' || d === null) return null;
      return d;
    } catch {
      return null;
    }
  }

  function hasSave() {
    try {
      return window.localStorage.getItem(SAVE_KEY) !== null;
    } catch {
      return false;
    }
  }

  function applySave(d) {
    const s = G.state;
    if (typeof d.cash === 'number') s.cash = d.cash;
    if (typeof d.respect === 'number') s.respect = d.respect;
    if (typeof d.day === 'number') s.day = Math.max(1, Math.min(7, d.day));
    if (typeof d.missionIndex === 'number') s.missionIndex = Math.max(0, Math.min(10, d.missionIndex));
    if (Array.isArray(d.missionsDone)) s.missionsDone = d.missionsDone;
    if (Array.isArray(d.ownedCars) && d.ownedCars.length) s.ownedCars = d.ownedCars;
    if (typeof d.carIndex === 'number') s.carIndex = Math.max(0, Math.min(2, d.carIndex));
    if (d.upgrades && typeof d.upgrades === 'object') s.upgrades = d.upgrades;
    if (typeof d.paint === 'number') s.paint = d.paint;
    if (Array.isArray(d.ownedWeapons)) s.ownedWeapons = d.ownedWeapons;
    if (typeof d.weapon === 'string') s.weapon = d.weapon;
    if (typeof d.ammo === 'number') s.ammo = d.ammo;
    if (typeof d.health === 'number') s.health = d.health;
  }

  return { saveGame, loadGame, hasSave, applySave };
}
