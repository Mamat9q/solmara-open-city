// The hurricane and the clock: a 7-day countdown to Hurricane Ilsa, a day/night
// cycle driven by the game clock, and weather that worsens as the storm nears —
// rain intensity, wet streets and fog all follow the day. Sunset is the game's
// look: warm low sun, long sky gradients, neon windows after dark.
import * as THREE from 'three';
import { PALETTE } from './config.js';

export function createHurricane(scene, sun, hemi) {
  return { scene, sun, hemi, rain: 0 };
}

/**
 * Drive the sky from the game clock (hours 0–24) and the day (1–7).
 * Returns { night, rain } for the other systems. `clock` advances in main.
 */
export function updateHurricane(h, state, dt) {
  const t = state.clock % 24;
  // Sun elevation: peaks at noon, below the horizon at night.
  const elev = Math.sin(((t - 6) / 12) * Math.PI);
  const sunset = THREE.MathUtils.clamp(1 - Math.abs(elev) * 3, 0, 1);
  const night = THREE.MathUtils.clamp(-elev * 2 + 0.15, 0, 1);
  const sunColor = new THREE.Color().copy(PALETTE.sunDay).lerp(PALETTE.sunSunset, sunset);
  h.sun.color.copy(sunColor);
  h.sun.intensity = THREE.MathUtils.clamp(elev * 2.2 + 0.15, 0.12, 2.4) * (1 - night * 0.55);
  h.sun.position.set(Math.cos(((t - 6) / 12) * Math.PI) * 180, Math.max(12, elev * 160 + 20), 90);
  const sky = new THREE.Color().copy(PALETTE.skyDay).lerp(PALETTE.skySunset, sunset).lerp(PALETTE.skyNight, night);
  h.scene.background = sky;
  h.scene.fog.color.copy(sky);
  h.scene.fog.near = 120 - night * 40;
  h.scene.fog.far = 520 - night * 160;
  h.hemi.intensity = 0.9 - night * 0.45;
  // Rain grows as Ilsa approaches: dry days 1–2, showers day 3–4, storm 5–7.
  const target = state.day <= 2 ? 0 : state.day <= 4 ? 0.35 : state.day === 5 ? 0.6 : 0.85;
  const rain = THREE.MathUtils.clamp(target + Math.sin(state.time * 0.11) * 0.08, 0, 1);
  h.rain = rain;
  state.rain = rain;
  state.world.setWet(rain);
  state.world.setLamps(night > 0.45);
  // The ocean swells as the storm nears.
  state.world.ocean.position.y = 0.15 + (state.day - 1) * 0.06 + Math.sin(state.time * 0.8) * 0.12 * rain;
  return { night, rain };
}
