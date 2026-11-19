// The seven-day story: one chapter per day until Hurricane Solmara makes
// landfall. Each chapter is a waypoint job; reaching it pays out, advances the
// day and opens the next chapter.
export const CHAPTERS = [
  { id: 1, title: 'The Package', brief: 'Pick up the package at the pier and bring it back.', target: { x: -168, z: 126 }, reward: 200 },
  { id: 2, title: 'Hot Wheels', brief: 'The crew needs wheels. Take the Stiletto from the north lot.', target: { x: 126, z: -42 }, reward: 250 },
  { id: 3, title: 'Storm Runners', brief: 'Deliver the meds to Solmara Arms before the roads flood.', target: { x: -58, z: -46 }, reward: 300 },
  { id: 4, title: 'The Informant', brief: 'Meet the informant at the hotel roof garage.', target: { x: 42, z: -42 }, reward: 350 },
  { id: 5, title: 'Blackout Run', brief: 'The grid is failing. Reach the substation on the east side.', target: { x: 168, z: 42 }, reward: 400 },
  { id: 6, title: 'Eye of the Storm', brief: 'Climb to the radio tower and warn the city.', target: { x: -42, z: -168 }, reward: 500 },
  { id: 7, title: 'Landfall', brief: 'The hurricane is here. Get to the airport and get out.', target: { x: 168, z: -168 }, reward: 1000 },
];

export class Missions {
  constructor() {
    this.active = null;
  }

  start(state) {
    if (this.active) return this.active;
    const idx = state.missionIndex;
    if (idx >= CHAPTERS.length) {
      state.toast('Every chapter is done — Solmara is yours');
      return null;
    }
    const ch = CHAPTERS[idx];
    this.active = { id: ch.id, title: ch.title, brief: ch.brief, target: { x: ch.target.x, z: ch.target.z }, reward: ch.reward };
    state.toast(`Chapter ${ch.id}: ${ch.title} — ${ch.brief}`);
    return this.active;
  }

  update(state) {
    if (!this.active) return;
    const px = state.currentCar ? state.currentCar.x : state.player.pos.x;
    const pz = state.currentCar ? state.currentCar.z : state.player.pos.z;
    const d = Math.hypot(px - this.active.target.x, pz - this.active.target.z);
    if (d > 7) return;
    const done = this.active;
    this.active = null;
    state.cash += done.reward;
    state.missionIndex += 1;
    if (state.hurricane.day < 7) state.hurricane.day += 1;
    state.audio.cash();
    state.toast(`Chapter ${done.id} complete: ${done.title} — +$${done.reward}`);
    if (state.missionIndex >= CHAPTERS.length) {
      state.toast('LANDFALL survived. You beat the storm, Solmara is yours.');
    }
  }
}
