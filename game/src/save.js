// localStorage save/load for Solmara: cash, mission progress, position, health,
// wanted level, clock, hurricane day, shop purchases and owned cars. One
// manual slot plus autosave after each mission and each shop purchase.
// Save v2 adds the hurricane and shop fields; a v1 save still loads, with
// the new fields defaulted.
export const SAVE_KEY = 'solmara-save-v2';
const OLD_KEY = 'solmara-save-v1';
export function saveGame(state) {
  try {
    const data = {
      cash: state.cash, missionIndex: state.missionIndex, completedMissions: state.completedMissions,
      health: state.player.health, maxHealth: state.player.maxHealth, wanted: state.wanted,
      pos: [state.player.pos.x, state.player.pos.y, state.player.pos.z],
      yaw: state.player.yaw, clock: state.clock,
      hurricaneDay: state.hurricane ? state.hurricane.day : 1,
      hurricaneProgress: state.hurricane ? state.hurricane.progress : 0,
      shopOwned: state.shopOwned || [],
      ownedCars: (state.vehicles ? state.vehicles.cars.filter((c) => c.owned).map((c) => ({ name: c.def.name, x: c.x, z: c.z })) : []),
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}
export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY) || window.localStorage.getItem(OLD_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d.cash !== 'number') return null;
    return d;
  } catch { return null; }
}
export function hasSave() { return loadGame() !== null; }
// Autosave is just a normal save, called after every completed mission.
export function autosave(state) { return saveGame(state); }
export function clearSave() { try { window.localStorage.removeItem(SAVE_KEY); window.localStorage.removeItem(OLD_KEY); } catch { /* noop */ } }
export function applySave(state, d) {
  state.cash = d.cash; state.missionIndex = d.missionIndex || 0;
  state.completedMissions = d.completedMissions || [];
  state.player.health = d.health ?? 100;
  state.player.maxHealth = d.maxHealth || 100;
  state.wanted = d.wanted || 0;
  if (Array.isArray(d.pos)) { state.player.pos.set(d.pos[0], d.pos[1] ?? 1, d.pos[2]); }
  if (typeof d.yaw === 'number') state.player.yaw = d.yaw;
  if (typeof d.clock === 'number') state.clock = d.clock;
  if (state.hurricane && typeof d.hurricaneDay === 'number') state.hurricane.setDay(d.hurricaneDay, d.hurricaneProgress || 0);
  state.shopOwned = Array.isArray(d.shopOwned) ? d.shopOwned.slice() : [];
  // Rebuild owned cars and re-apply bought upgrades.
  if (state.vehicles && Array.isArray(d.ownedCars)) {
    for (const oc of d.ownedCars) {
      const def = state.vehicles.cars.map((c) => c.def).find((x) => x.name === oc.name);
      const car = def ? state.vehicles.spawnOwnedCar(def, oc.x, oc.z) : null;
      if (car) {
        if (state.shopOwned.includes('engine')) car.tuned = true;
        if (state.shopOwned.includes('plating')) car.plated = true;
      }
    }
  }
}
