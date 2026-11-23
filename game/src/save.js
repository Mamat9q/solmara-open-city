// Save / load through localStorage. One key, one JSON blob: cash, respect,
// missions done, cars owned, upgrades, day. Loading a save never throws.
const KEY = 'solmara-save-v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

export function saveGame(state) {
  try {
    const data = {
      cash: state.cash,
      respect: state.respect,
      missionsDone: [...state.missionsDone],
      carsOwned: [...state.carsOwned],
      carIndex: state.carIndex,
      engineLevel: state.engineLevel,
      armorLevel: state.armorLevel,
      paint: state.paint,
      day: state.day,
      savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}
