// Traffic and pedestrians: 14 cars looping the road grid with headlights at
// night, and 24 walkers on the sidewalks. Traffic brakes for the car ahead and
// for the player; pedestrians wander, then flee from speeding cars and gunfire.
import * as THREE from 'three';
import { CITY_HALF, ROAD_STEP } from './config.js';
import { createCarMesh } from './vehicles.js';
import { range, pick } from './random.js';

const TRAFFIC_COLORS = [0xd8d8d8, 0x2a2f38, 0x7a2a2a, 0x2a4a7a, 0x4a6b2a, 0xc2a23c, 0x6b4a8a];
const PED_COLORS = [0xe05a4e, 0x4e8ae0, 0x5ac25a, 0xe0c04e, 0xb06ad9, 0xdddddd, 0x333333];

function roadLoopPoints(random) {
  // A rectangular loop on the grid: pick two avenues and two streets.
  const xs = [-240, -160, -80, 0, 80, 160, 240];
  const x0 = pick(random, xs); let x1 = pick(random, xs);
  if (x1 === x0) x1 = x0 + 80;
  const z0 = pick(random, xs); let z1 = pick(random, xs);
  if (z1 === z0) z1 = z0 + 80;
  return [
    { x: x0, z: z0 }, { x: x1, z: z0 }, { x: x1, z: z1 }, { x: x0, z: z1 },
  ];
}

export function createTraffic(scene, random) {
  const cars = [];
  for (let i = 0; i < 14; i++) {
    const mesh = createCarMesh(pick(random, TRAFFIC_COLORS), random() < 0.2 ? 'truck' : 'sedan');
    const route = roadLoopPoints(random);
    const start = route[Math.floor(random() * route.length)];
    mesh.position.set(start.x + range(random, -4, 4), 0, start.z + range(random, -4, 4));
    scene.add(mesh);
    cars.push({
      mesh, route, leg: 0, speed: range(random, 8, 13), cruise: range(random, 8, 13),
      stopped: 0, kind: 'traffic',
    });
  }

  const peds = [];
  const pedBodyGeo = new THREE.BoxGeometry(0.55, 1.1, 0.35);
  const pedHeadGeo = new THREE.SphereGeometry(0.22, 8, 6);
  for (let i = 0; i < 24; i++) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: pick(random, PED_COLORS), roughness: 0.9 });
    const body = new THREE.Mesh(pedBodyGeo, mat);
    body.position.y = 0.85;
    g.add(body);
    const head = new THREE.Mesh(pedHeadGeo, new THREE.MeshStandardMaterial({ color: 0xd9a986, roughness: 0.8 }));
    head.position.y = 1.6;
    g.add(head);
    const x = range(random, -280, 280);
    const z = range(random, -280, 230);
    g.position.set(x, 0, z);
    scene.add(g);
    peds.push({
      mesh: g, heading: random() * Math.PI * 2, speed: range(random, 0.8, 1.6),
      target: null, flee: 0, wander: random() * 4,
    });
  }
  return { cars, peds };
}

function nearestAhead(car, others, playerCar) {
  // Anything within 9 m ahead on roughly the same heading slows this car.
  const fx = Math.sin(car.mesh.rotation.y);
  const fz = Math.cos(car.mesh.rotation.y);
  let nearest = Infinity;
  const check = (x, z) => {
    const dx = x - car.mesh.position.x;
    const dz = z - car.mesh.position.z;
    const ahead = dx * fx + dz * fz;
    const side = Math.abs(dx * fz - dz * fx);
    if (ahead > 0 && ahead < 10 && side < 2.6) nearest = Math.min(nearest, ahead);
  };
  for (const o of others) if (o !== car) check(o.mesh.position.x, o.mesh.position.z);
  if (playerCar) check(playerCar.mesh.position.x, playerCar.mesh.position.z);
  return nearest;
}

export function updateTraffic(state, dt, night) {
  const { cars, peds } = state.traffic;
  for (const car of cars) {
    const target = car.route[(car.leg + 1) % car.route.length];
    const dx = target.x - car.mesh.position.x;
    const dz = target.z - car.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 3) { car.leg = (car.leg + 1) % car.route.length; continue; }
    const want = Math.atan2(dx, dz);
    let diff = want - car.mesh.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.mesh.rotation.y += THREE.MathUtils.clamp(diff, -1.4 * dt, 1.4 * dt);
    const blocked = nearestAhead(car, cars, state.playerCar);
    const speed = blocked < Infinity ? Math.max(0, car.cruise * (blocked / 10)) : car.cruise;
    car.speed += (speed - car.speed) * Math.min(1, dt * 2);
    car.mesh.position.x += Math.sin(car.mesh.rotation.y) * car.speed * dt;
    car.mesh.position.z += Math.cos(car.mesh.rotation.y) * car.speed * dt;
    // Headlights: brighten the lamp boxes at night (cheap: scale emissive via material is shared, so skip).
  }
  for (const ped of peds) {
    ped.wander -= dt;
    if (ped.flee > 0) ped.flee -= dt;
    const playerPos = state.player.mesh.position;
    const dPlayer = Math.hypot(ped.mesh.position.x - playerPos.x, ped.mesh.position.z - playerPos.z);
    const danger = state.playerCar && Math.abs(state.playerCar.speed) > 12
      ? Math.hypot(ped.mesh.position.x - state.playerCar.mesh.position.x, ped.mesh.position.z - state.playerCar.mesh.position.z) < 14
      : false;
    if ((dPlayer < 6 && state.shotsFired > 0) || danger) ped.flee = 2.5;
    if (ped.wander <= 0) {
      ped.heading = Math.random() * Math.PI * 2;
      ped.wander = 2 + Math.random() * 4;
    }
    const speed = ped.flee > 0 ? 4.2 : ped.speed;
    if (ped.flee > 0) {
      // Run away from the player.
      ped.heading = Math.atan2(ped.mesh.position.x - playerPos.x, ped.mesh.position.z - playerPos.z);
    }
    ped.mesh.position.x += Math.sin(ped.heading) * speed * dt;
    ped.mesh.position.z += Math.cos(ped.heading) * speed * dt;
    ped.mesh.position.x = THREE.MathUtils.clamp(ped.mesh.position.x, -CITY_HALF + 4, CITY_HALF - 4);
    ped.mesh.position.z = THREE.MathUtils.clamp(ped.mesh.position.z, -CITY_HALF + 4, 240);
    ped.mesh.rotation.y = ped.heading;
    // Simple walk bob.
    ped.mesh.children[0].position.y = 0.85 + Math.abs(Math.sin(state.time * 8 + ped.speed * 20)) * 0.06;
  }
}

/** The nearest traffic car to a point, within `maxDist`. */
export function nearestTrafficCar(traffic, x, z, maxDist) {
  let best = null; let bestD = maxDist;
  for (const car of traffic.cars) {
    const d = Math.hypot(car.mesh.position.x - x, car.mesh.position.z - z);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}
