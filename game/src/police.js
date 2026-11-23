// The Solmara Police Department: wanted level 0–5, patrol cars that chase and
// ram, roadblocks at 3 stars, the AIR-1 helicopter and spike strips at 4–5, and
// the "Lose the cops" evade state — wanted decays once no unit can see you.
import * as THREE from 'three';
import { CITY_HALF } from './config.js';
import { createCarMesh } from './vehicles.js';
import { range } from './random.js';

const POLICE_COLOR = 0x1e2a3a;

function makePoliceCar(scene, random) {
  const mesh = createCarMesh(POLICE_COLOR, 'sedan');
  // Light bar.
  const barMat = new THREE.MeshBasicMaterial({ color: 0x3355ff });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.5), barMat);
  bar.position.set(0, 1.7, -0.2);
  mesh.add(bar);
  mesh.userData.barMat = barMat;
  const a = range(random, 0, Math.PI * 2);
  mesh.position.set(Math.sin(a) * 120, 0, Math.cos(a) * 120);
  scene.add(mesh);
  return { mesh, speed: 0, heading: 0, barMat, stuck: 0 };
}

function makeHelicopter(scene) {
  const heli = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 4.2), new THREE.MeshStandardMaterial({ color: 0x223044, roughness: 0.5, metalness: 0.4 }));
  heli.add(body);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 1.2), new THREE.MeshStandardMaterial({ color: 0x101826, roughness: 0.15, metalness: 0.7 }));
  glass.position.set(0, 0.2, 1.6);
  heli.add(glass);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0x111214 }));
  rotor.position.y = 1.0;
  heli.add(rotor);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4), new THREE.MeshStandardMaterial({ color: 0x223044 }));
  tail.position.set(0, 0.2, -3.6);
  heli.add(tail);
  const spot = new THREE.Mesh(
    new THREE.ConeGeometry(6, 40, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
  );
  spot.position.y = -20;
  spot.rotation.x = Math.PI;
  heli.add(spot);
  heli.position.set(0, 55, 0);
  scene.add(heli);
  return { mesh: heli, rotor, angle: 0 };
}

export function createPolice(scene, random) {
  const heli = makeHelicopter(scene);
  heli.mesh.visible = false;
  return {
    cars: [],
    heli,
    spikes: [],
    evadeTimer: 0,
    losTimer: 0,
    roadblockAt: null,
    random,
    scene,
  };
}

function spawnCar(police) {
  if (police.cars.length >= 6) return;
  const car = makePoliceCar(police.scene, police.random);
  police.cars.push(car);
}

function spawnRoadblock(police, tx, tz) {
  if (police.roadblockAt) return;
  const cars = [];
  for (let i = -1; i <= 1; i++) {
    const mesh = createCarMesh(POLICE_COLOR, 'sedan');
    mesh.position.set(tx + i * 5, 0, tz);
    mesh.rotation.y = Math.PI / 2;
    police.scene.add(mesh);
    cars.push(mesh);
  }
  police.roadblockAt = { x: tx, z: tz, meshes: cars };
}

function clearRoadblock(police) {
  if (!police.roadblockAt) return;
  for (const m of police.roadblockAt.meshes) police.scene.remove(m);
  police.roadblockAt = null;
}

function dropSpikes(police, x, z) {
  const strip = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.8 });
  for (let i = 0; i < 6; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 4), mat);
    spike.position.set(i * 1.1 - 2.75, 0.35, 0);
    strip.add(spike);
  }
  strip.position.set(x, 0, z);
  police.scene.add(strip);
  police.spikes.push({ mesh: strip, x, z, life: 25 });
}

/**
 * One police step. `target` is the player's position (car or on foot),
 * `playerSpeed` the current speed. Returns events: {busted} when a cop touches
 * the player on foot at low speed, {spiked} when the player car hits a strip.
 */
export function updatePolice(police, state, dt) {
  const wanted = state.wanted;
  const target = state.playerCar ? state.playerCar.mesh.position : state.player.mesh.position;
  const events = { busted: false, spiked: false };

  // Spawn pressure scales with wanted; despawn below it.
  const wantCars = wanted === 0 ? 0 : wanted <= 2 ? 2 : wanted === 3 ? 3 : 4;
  while (police.cars.length < wantCars) spawnCar(police);
  while (police.cars.length > wantCars) {
    const c = police.cars.pop();
    police.scene.remove(c.mesh);
  }
  if (wanted >= 4) {
    if (police.spikes.length === 0 && Math.random() < dt * 0.2) {
      dropSpikes(police, target.x + (Math.random() - 0.5) * 40, target.z + (Math.random() - 0.5) * 40);
    }
  } else {
    for (const s of police.spikes) police.scene.remove(s.mesh);
    police.spikes = [];
  }
  if (wanted >= 3 && !police.roadblockAt) {
    spawnRoadblock(police, THREE.MathUtils.clamp(target.x + 40, -280, 280), THREE.MathUtils.clamp(target.z + 20, -280, 280));
  }
  if (wanted < 3) clearRoadblock(police);

  // Chase: steer toward the player, faster than traffic, ramming at close range.
  for (const car of police.cars) {
    const dx = target.x - car.mesh.position.x;
    const dz = target.z - car.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 260) {
      // Teleport a lost unit back near the player (keeps pressure on, cheap).
      const a = Math.random() * Math.PI * 2;
      car.mesh.position.set(target.x + Math.sin(a) * 90, 0, target.z + Math.cos(a) * 90);
    }
    const want = Math.atan2(dx, dz);
    let diff = want - car.mesh.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.mesh.rotation.y += THREE.MathUtils.clamp(diff, -2.2 * dt, 2.2 * dt);
    const top = 34 + wanted * 2.5;
    car.speed += (top - car.speed) * Math.min(1, dt * 1.2);
    if (dist < 6) car.speed *= 0.6; // ramming contact
    car.mesh.position.x += Math.sin(car.mesh.rotation.y) * car.speed * dt;
    car.mesh.position.z += Math.cos(car.mesh.rotation.y) * car.speed * dt;
    car.mesh.position.x = THREE.MathUtils.clamp(car.mesh.position.x, -CITY_HALF + 4, CITY_HALF - 4);
    car.mesh.position.z = THREE.MathUtils.clamp(car.mesh.position.z, -CITY_HALF + 4, CITY_HALF - 4);
    // Flashing light bar.
    car.barMat.color.setHex(Math.floor(state.time * 6) % 2 === 0 ? 0x3355ff : 0xff2222);
    if (dist < 2.2 && !state.playerCar) events.busted = true;
    // A cop ramming the player car damages it.
    if (dist < 3.2 && state.playerCar && Math.abs(state.playerCar.speed) < 20) {
      state.playerCar.damaged = Math.min(100, state.playerCar.damaged + dt * 6);
    }
  }

  // Helicopter at 4–5 stars: circles overhead, keeps the wanted level hot.
  const heli = police.heli;
  if (wanted >= 4) {
    heli.mesh.visible = true;
    heli.angle += dt * 0.25;
    heli.mesh.position.set(
      target.x + Math.sin(heli.angle) * 26,
      55 + Math.sin(state.time * 0.7) * 3,
      target.z + Math.cos(heli.angle) * 26,
    );
    heli.rotor.rotation.y += dt * 22;
    heli.mesh.lookAt(target.x, 0, target.z);
    police.losTimer = 0;
  } else {
    heli.mesh.visible = false;
  }

  // Spike strips: pop the player car's tyres.
  if (state.playerCar) {
    for (const s of police.spikes) {
      const d = Math.hypot(state.playerCar.mesh.position.x - s.x, state.playerCar.mesh.position.z - s.z);
      if (d < 3) {
        state.playerCar.spikeSlow = 8;
        events.spiked = true;
        police.scene.remove(s.mesh);
        police.spikes = police.spikes.filter((o) => o !== s);
      }
    }
    for (const s of police.spikes) {
      s.life -= dt;
      if (s.life <= 0) { police.scene.remove(s.mesh); }
    }
    police.spikes = police.spikes.filter((s) => s.life > 0);
  }

  // Evade: wanted decays only when no police car is close and the heli is gone.
  const nearest = police.cars.reduce((m, c) => Math.min(m, Math.hypot(c.mesh.position.x - target.x, c.mesh.position.z - target.z)), Infinity);
  if (wanted > 0 && nearest > 55 && wanted < 4) {
    police.losTimer += dt;
    if (police.losTimer > 6) {
      state.wantedHeat = Math.max(0, state.wantedHeat - dt * 8);
      if (state.wantedHeat <= 0) {
        state.wanted = 0;
        state.evading = false;
        police.losTimer = 0;
      }
    }
  } else {
    police.losTimer = 0;
  }
  return events;
}

/** Raise the wanted level by `amount` (heat 0–100, stars = heat bands). */
export function addWanted(state, amount) {
  state.wantedHeat = Math.min(100, state.wantedHeat + amount);
  const stars = state.wantedHeat <= 0 ? 0 : state.wantedHeat < 20 ? 1 : state.wantedHeat < 40 ? 2 : state.wantedHeat < 60 ? 3 : state.wantedHeat < 85 ? 4 : 5;
  if (stars > state.wanted) state.evading = false;
  state.wanted = stars;
}
