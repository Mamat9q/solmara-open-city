// The screenshot scenes behind ?shot=start|drive|chase|mission. Each one sets
// the time of day, weather, wanted level and an active job, then drives the real
// game forward with a simple autopilot (steer along the road, full throttle), so
// the frame is what a short session really looks like — and the same seed always
// gives the same frame. Cover = sunset rain chase with wanted stars + minimap +
// mission objective on the HUD.

import { STEP, ROAD_STEP } from './config.js';
import { startMission } from './missions.js';

/** Steer the player's car along the road it is already on, full throttle.
 * The car follows its current road line (vertical x = k*80 or horizontal
 * z = k*80, whichever matches the heading) instead of snapping to the
 * nearest road point, which used to cut corners straight across city blocks. */
function autopilotDrive(G) {
  const car = G.S.playerCar;
  if (!car) return { forward: 0, steer: 0, run: false };
  const px = car.mesh.position.x;
  const pz = car.mesh.position.z;
  const hx = Math.sin(car.heading);
  const hz = Math.cos(car.heading);
  const ahead = 26;
  let tx; let tz;
  if (Math.abs(hx) > Math.abs(hz)) {
    // Travelling along x: stay on the z road line.
    tx = px + hx * ahead;
    tz = Math.round(pz / ROAD_STEP) * ROAD_STEP;
  } else {
    // Travelling along z: stay on the x road line.
    tx = Math.round(px / ROAD_STEP) * ROAD_STEP;
    tz = pz + hz * ahead;
  }
  const wantHeading = Math.atan2(tx - px, tz - pz);
  let dh = wantHeading - car.heading;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  // updateCarPhysics turns right when steer is positive (heading decreases),
  // so steer against the heading error to close it.
  const steer = Math.max(-1, Math.min(1, -dh * 2.2));
  return { forward: 1, steer, run: false };
}

/** Run the live game forward `seconds` on autopilot, one fixed step at a time. */
function simulate(G, seconds) {
  // No per-step renders while simulating: SwiftShader paints ~1 fps, so the
  // frames are painted once at the end by main instead.
  G.S.skipRender = true;
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    G.stepWorld(STEP, autopilotDrive(G));
  }
  G.S.skipRender = false;
}

function baseSetup(G, opts) {
  const S = G.S;
  S.money = opts.cash ?? 2450;
  S.respect = opts.respect ?? 42;
  S.day = opts.day || 3;
  S.clock = opts.time;
  S.wantedHeat = opts.wanted >= 5 ? 90 : opts.wanted >= 4 ? 70 : opts.wanted >= 3 ? 50 : opts.wanted >= 2 ? 30 : opts.wanted >= 1 ? 12 : 0;
  S.wanted = opts.wanted || 0;
  // Mara starts in her car, on the road, heading where the shot wants.
  const car = S.parkedCar || S.playerCar;
  if (car) {
    car.mesh.position.set(opts.x, 0, opts.z);
    car.heading = opts.heading;
    car.mesh.rotation.y = opts.heading;
    car.speed = 0;
    if (S.playerCar !== car) {
      S.playerCar = car;
      S.parkedCar = null;
      S.player.onFoot = false;
      S.player.mesh.visible = false;
    }
  }
  S.player.mesh.position.set(opts.x, 0, opts.z);
  G.missions.active = false;
  startMission(G.missions, opts.mission ?? 0, S);
}

/** Keep pursuing cruisers out of the chase camera: a cop tailgating the player
 * sits between the camera and the car and fills the bottom of the frame with
 * its roof and light bar. Any cruiser closer than 20 m is moved ahead of the
 * player, left or right, facing back toward them — a visible pursuit, not a
 * photobomb. */
function framePolice(G) {
  const S = G.S;
  const car = S.playerCar;
  if (!car) return;
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  const rx = Math.cos(car.heading);
  const rz = -Math.sin(car.heading);
  G.police.cars.forEach((cop, i) => {
    const d = Math.hypot(cop.mesh.position.x - car.mesh.position.x, cop.mesh.position.z - car.mesh.position.z);
    if (d < 20) {
      const side = i % 2 === 0 ? -12 : 12;
      const ahead = 30 + i * 6;
      cop.mesh.position.set(
        car.mesh.position.x + fx * ahead + rx * side,
        0,
        car.mesh.position.z + fz * ahead + rz * side,
      );
      cop.mesh.rotation.y = car.heading + Math.PI;
      cop.speed = 0;
    }
  });
}

/** Stage one named scene on the live game, then return (main paints it twice). */
export function stageShot(name, G) {
  if (name === 'drive') {
    // Midday Downtown cruise, on the x=-80 avenue heading north.
    baseSetup(G, { time: 13.0, wanted: 0, x: -80, z: -80, heading: 0, cash: 1250, respect: 18, day: 1, mission: 0 });
    simulate(G, 5);
    framePolice(G);
    return;
  }
  if (name === 'chase') {
    baseSetup(G, { time: 21.5, wanted: 5, x: 80, z: 80, heading: 0, cash: 3800, respect: 74, day: 5, mission: 1 });
    simulate(G, 4);
    // Frame the pursuit: two cruisers ahead of Mara and AIR-1 overhead, so
    // the chase reads in one still instead of hiding behind the camera.
    const S = G.S;
    const car = S.playerCar;
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    const rx = Math.cos(car.heading);
    const rz = -Math.sin(car.heading);
    G.police.cars.slice(0, 2).forEach((cop, i) => {
      const side = i === 0 ? -7 : 7;
      cop.mesh.position.set(
        car.mesh.position.x + fx * 26 + rx * side,
        0,
        car.mesh.position.z + fz * 26 + rz * side,
      );
      cop.mesh.rotation.y = car.heading + Math.PI;
      cop.speed = 0;
    });
    const heli = G.police.heli;
    heli.mesh.visible = true;
    heli.mesh.position.set(
      car.mesh.position.x + fx * 34,
      22,
      car.mesh.position.z + fz * 34,
    );
    framePolice(G);
    return;
  }
  if (name === 'mission') {
    // Morning race: on the x=0 avenue, first Beachfront checkpoint 40 m ahead.
    // Only 1.2 s of driving, so the shot catches Mara approaching the beacon
    // instead of having already blown past it to the next checkpoint.
    baseSetup(G, { time: 10.0, wanted: 1, x: 0, z: 240, heading: 0, cash: 1950, respect: 36, day: 3, mission: 4 });
    simulate(G, 1.2);
    framePolice(G);
    return;
  }
  // start (cover): sunset rain chase, wanted 3, mission 1 objective live.
  // On the x=0 avenue heading south into Downtown.
  baseSetup(G, { time: 18.2, wanted: 3, x: 0, z: 200, heading: Math.PI, cash: 2450, respect: 42, day: 3, mission: 0 });
  simulate(G, 6);
  framePolice(G);
}
