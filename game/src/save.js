// SOLMARA saving: version 2 in localStorage, holding the hurricane day,
// mission progress, shop items, owned cars and the player's state. A version
// 1 save, if one is ever found, loads through the same path.

export const SAVE_KEY_V2 = 'solmara-save-v2';
export const SAVE_KEY_V1 = 'solmara-save';

export function buildSaveData(game) {
  return {
    version: 2,
    cash: game.cash,
    missionIndex: game.missionIndex,
    hurricaneDay: game.hurricane.day,
    shopOwned: [...game.shopOwned],
    ownedCars: game.vehicles.cars
      .filter((car) => car.owned)
      .map((car) => ({ defKey: car.defKey, x: car.x, z: car.z, heading: car.heading })),
    player: {
      x: game.player.pos.x,
      z: game.player.pos.z,
      heading: game.player.heading,
      health: game.player.health,
      ammo: game.player.ammo,
      reserve: game.player.reserve,
    },
    wanted: 0,
  };
}

export function writeSave(game) {
  try {
    const data = buildSaveData(game);
    window.localStorage.setItem(SAVE_KEY_V2, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function readSave() {
  try {
    const rawV2 = window.localStorage.getItem(SAVE_KEY_V2);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (parsed && typeof parsed === 'object') return { version: 2, data: parsed };
    }
    const rawV1 = window.localStorage.getItem(SAVE_KEY_V1);
    if (rawV1) {
      const parsed = JSON.parse(rawV1);
      if (parsed && typeof parsed === 'object') return { version: 1, data: parsed };
    }
  } catch {
    return null;
  }
  return null;
}

export function hasSave() {
  return readSave() !== null;
}
