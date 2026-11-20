// The 7-day hurricane countdown: each story mission advances the day, the storm
// grows (more rain, darker skies), and a chapter banner names the new day.

import { CHAPTERS } from './config.js';

export function createHurricane(G) {
  function stormLevel() {
    return Math.min(1, (G.state.day - 1) / 6);
  }

  /** Called when a mission pushes the story to a later day. */
  function advanceDay(day) {
    if (day <= G.state.day) return;
    G.state.day = day;
    const chapter = CHAPTERS[day - 1];
    G.hud.banner(`DAY ${day} OF 7 — ${chapter}`, `Hurricane Mara is ${Math.round(stormLevel() * 100)}% here. The rain gets worse from now on.`);
    G.weather.rainTarget = 0.25 + stormLevel() * 0.65;
    G.audio.thunder();
  }

  function update(dt) {
    // Weather drifts toward its target; the storm makes rain likelier each day.
    const target = G.weather.rainTarget;
    G.weather.rain += (target - G.weather.rain) * Math.min(1, dt * 0.05);
    if (G.rng() < dt * 0.002 * stormLevel()) {
      G.weather.rainTarget = Math.min(1, target + 0.3);
      G.audio.thunder();
    }
  }

  return { stormLevel, advanceDay, update };
}
