// The 7-day hurricane countdown: Solmara has seven days until the storm
// makes landfall, and Dario's story is one chapter a day. Each completed
// story mission — and every seven minutes of play — advances the day: the sky
// darkens from golden sunset toward a purple-grey storm, the rain thickens,
// the wind starts shoving cars around, and the countdown in the HUD ticks
// down. Day 7 is landfall itself: the final mission plays in the hurricane.
import * as THREE from 'three';

export const DAY_SECONDS = 420; // 7 real minutes per in-game day
export const CHAPTERS = [
  'Day 1 — Calm Before',
  'Day 2 — First Bands',
  'Day 3 — Rising Water',
  'Day 4 — Blackout',
  'Day 5 — Eye Wall',
  'Day 6 — Storm Surge',
  'Day 7 — LANDFALL',
];
export const WEATHER_LABELS = ['Clear sunset', 'Light drizzle', 'Steady rain', 'Heavy rain', 'Storm', 'Near-hurricane', 'HURRICANE'];

export function createHurricane(scene, world, effects) {
  let day = 1; // 1..7
  let progress = 0; // 0..1 through the current day
  let announced = 1;
  let thunderTimer = 20;
  const api = {
    get day() { return day; },
    get progress() { return progress; },
    get storm() { return (day - 1 + progress) / 6; }, // 0 (calm) .. 1 (landfall)
    get chapter() { return CHAPTERS[day - 1]; },
    get weather() { return WEATHER_LABELS[Math.min(6, Math.floor(api.storm * 6.99))]; },
    get rain() { return Math.min(1, api.storm * 1.15); },
    get wind() { return api.storm * 9; }, // m/s of sideways push at full storm
    secondsLeft() {
      const total = (7 - day) * DAY_SECONDS + (1 - progress) * DAY_SECONDS;
      return Math.max(0, Math.round(total));
    },
    countdownText() {
      const s = api.secondsLeft();
      const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
      return d > 0 ? `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m` : `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
    },
    setDay(d, p) { day = Math.max(1, Math.min(7, d | 0)); progress = Math.max(0, Math.min(0.999, p || 0)); announced = day; },
    // Mission completions push the story a day forward: the arc is driven by
    // what Dario does, not just by the clock.
    advanceDay(reason) {
      if (day >= 7) return;
      day += 1; progress = 0; announced = day;
      return day;
    },
    update(dt, state) {
      if (state.screen !== 'playing') return;
      progress += dt / DAY_SECONDS;
      if (progress >= 1) {
        progress = 0;
        if (day < 7) {
          day += 1;
          if (state) {
            state.message(`${CHAPTERS[day - 1]} — the storm is closer.`);
            state.say(`Radio: "Hurricane Mara is now a category ${Math.min(5, day - 1)}. Landfall in ${7 - day} days."`);
          }
        }
      }
      if (day !== announced) announced = day;
      const storm = api.storm;
      world.setWet(storm);
      world.setSky(storm, storm > 0.6 ? 0xb08a9a : 0xffc890);
      if (effects) effects.setRain(api.rain);
      // Thunder rolls once the storm is serious; louder and more often late.
      thunderTimer -= dt;
      if (thunderTimer <= 0) {
        thunderTimer = storm > 0.4 ? 9 + Math.random() * 14 : 30 + Math.random() * 30;
        if (storm > 0.4 && state.audio) state.audio.thunder();
        if (storm > 0.55 && effects) effects.addShake(0.25);
      }
      // Wind gusts shove a speeding car sideways in the late storm.
      if (storm > 0.5 && state.currentCar) {
        const car = state.currentCar;
        const gust = Math.sin(performance.now() / 1400) * api.wind * dt * 0.35;
        car.x += Math.cos(car.yaw) * gust;
        car.z -= Math.sin(car.yaw) * gust;
      }
    },
  };
  return api;
}
