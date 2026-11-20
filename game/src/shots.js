// The screenshot scenes behind ?shot=start|drive|chase|mission. Each one sets the
// time of day, weather, wanted level and an active job, then drives the real game
// forward with a simple autopilot (steer along the road, full throttle), so the
// frame is what a short session really looks like — and the same seed always
// gives the same frame. Cover = sunset rain chase with wanted stars + minimap +
// mission objective on the HUD.

import { STEP } from './config.js';

function autopilotDrive(G, dt) {
  // Stay on the current road: steer toward the nearest road line ahead.
  const car = G.car;
  const ahead = 26;
  const ax = car.x + Math.sin(car.heading) * ahead;
  const az = car.z + Math.cos(car.heading) * ahead;
  const snapX = G.world.nearestRoadCoord(ax);
  const snapZ = G.world.nearestRoadCoord(az);
  const dx = snapX - ax;
  const dz = snapZ - az;
  const wantHeading = Math.atan2(dx, dz);
  let dh = wantHeading - car.heading;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  // drive() turns right when steer is positive (heading decreases), so steer
  // against the heading error to close it.
  const steer = Math.max(-1, Math.min(1, -dh * 2.2));
  car.drive(dt, 1, steer);
}

function simulate(G, seconds) {
  const steps = Math.round(seconds / STEP);
  const trace = [];
  for (let i = 0; i < steps; i++) {
    G.time += STEP;
    autopilotDrive(G, STEP);
    G.traffic.update(STEP);
    G.police.update(STEP);
    G.missions.update(STEP);
    G.combat.update(STEP);
    G.world.update(STEP, { x: G.car.x, z: G.car.z });
    G.hud.update();
    if (i % 30 === 0) trace.push({ t: +(i * STEP).toFixed(1), x: +G.car.x.toFixed(1), z: +G.car.z.toFixed(1), kmh: +Math.round(Math.abs(G.car.speed) * 3.6), h: +G.car.heading.toFixed(2) });
  }
  window.__shotTrace = trace;
  G.updateCamera(0);
  G.world.setTimeOfDay(G.timeOfDay);
}

function baseSetup(G, opts) {
  G.state.wanted = opts.wanted || 0;
  G.state.cash = opts.cash ?? 2450;
  G.state.respect = opts.respect ?? 42;
  G.state.day = opts.day || 3;
  G.timeOfDay = opts.time;
  G.weather.rain = opts.rain || 0;
  G.weather.rainTarget = opts.rain || 0;
  G.world.setTimeOfDay(G.timeOfDay);
  G.player.inCar = true;
  G.player.mesh.visible = false;
  G.car.teleport(opts.x, opts.z, opts.heading);
  G.camYaw = opts.heading;
  G.camPitch = 0.32;
  G.playerHeading = opts.heading;
  G.audio.siren(G.state.wanted > 0);
  G.mode = 'play';
  G.hud.hideStart();
  G.hud.hidePanel();
}

/** Stage one named scene on the live game, then return (main paints it twice). */
export function stageShot(name, G) {
  // Fresh deterministic state for the shot.
  G.state.missionIndex = name === 'mission' ? 3 : name === 'chase' ? 1 : 0;
  G.state.missionsDone = [];
  if (name === 'drive') {
    baseSetup(G, { time: 13.0, rain: 0, wanted: 0, x: -80, z: -40, heading: Math.PI / 2, cash: 1250, respect: 18, day: 1 });
    G.missions.startMission();
    simulate(G, 5);
    return;
  }
  if (name === 'chase') {
    baseSetup(G, { time: 21.5, rain: 1, wanted: 5, x: 40, z: 120, heading: 0, cash: 3800, respect: 74, day: 5 });
    G.missions.startMission();
    G.police.addWanted(0, null);
    simulate(G, 4);
    return;
  }
  if (name === 'mission') {
    baseSetup(G, { time: 10.0, rain: 0.15, wanted: 1, x: -160, z: -120, heading: -Math.PI / 2, cash: 1950, respect: 36, day: 3 });
    G.missions.startMission();
    simulate(G, 5);
    return;
  }
  // start (cover): sunset rain chase, wanted 3, mission 1 objective live.
  baseSetup(G, { time: 18.2, rain: 0.7, wanted: 3, x: -40, z: 200, heading: Math.PI, cash: 2450, respect: 42, day: 3 });
  G.missions.startMission();
  simulate(G, 6);
}
