// localStorage save/load for Solmara: cash, mission progress, position, health,
// wanted level and clock. One manual slot plus autosave after each mission.
export const SAVE_KEY = 'solmara-save-v1';
export function saveGame(state) {
  try {
    const data = {
      cash: state.cash, missionIndex: state.missionIndex, completedMissions: state.completedMissions,
      health: state.player.health, wanted: state.wanted,
      pos: [state.player.pos.x, state.player.pos.y, state.player.pos.z],
      yaw: state.player.yaw, clock: state.clock, savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}
export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d.cash !== 'number') return null;
    return d;
  } catch { return null; }
}
export function hasSave() { return loadGame() !== null; }
// Autosave is just a normal save, called after every completed mission.
export function autosave(state) { return saveGame(state); }
export function clearSave() { try { window.localStorage.removeItem(SAVE_KEY); } catch { /* noop */ } }
export function applySave(state, d) {
  state.cash = d.cash; state.missionIndex = d.missionIndex || 0;
  state.completedMissions = d.completedMissions || [];
  state.player.health = d.health ?? 100; state.wanted = d.wanted || 0;
  if (Array.isArray(d.pos)) { state.player.pos.set(d.pos[0], d.pos[1] ?? 1, d.pos[2]); }
  if (typeof d.yaw === 'number') state.player.yaw = d.yaw;
  if (typeof d.clock === 'number') state.clock = d.clock;
}
