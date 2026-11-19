// The seven chapters of the hurricane week. Each mission is a goto job: reach
// the marker and the chapter closes, the storm moves one day closer, the pay
// lands. M is the trigger; the game loop completes by proximity.

import { MISSIONS } from './config.js';

export function createMissions(world) {
  const missions = {
    active: null,
    completed: [],
    start(state) {
      if (this.active) return this.active;
      const def = MISSIONS[state.missionIndex];
      if (!def) return null;
      this.active = {
        id: def.id,
        title: def.title,
        brief: def.brief,
        target: { x: def.target.x, z: def.target.z },
        reward: def.reward,
      };
      world.setBeacon(def.target.x, def.target.z, true);
      return this.active;
    },
    complete(state) {
      const m = this.active;
      if (!m) return null;
      state.cash += m.reward;
      state.missionIndex += 1;
      state.hurricane.day = Math.min(7, state.hurricane.day + 1);
      this.completed.push(m.id);
      this.active = null;
      world.setBeacon(0, 0, false);
      if (state.audio) state.audio.cash();
      return m;
    },
    update(dt, state) {
      if (!this.active) return null;
      const t = this.active.target;
      const d = Math.hypot(state.player.pos.x - t.x, state.player.pos.z - t.z);
      if (d < 10) return this.complete(state);
      return null;
    },
  };
  return missions;
}
