// Cars: definitions, parked cars to steal, traffic, and the driving model.
// Physics: speed += (accel - drag * speed) * dt, so the car tops out at
// accel / drag. Steering scales with speed so a parked car does not spin.
import * as THREE from '../vendor/three.module.min.js';
import { CAR, WORLD } from './config.js';
import { makeRng } from './random.js';

export const CAR_DEFS = [
  { name: 'Vesper GT', color: 0xc22a3a, accel: 24, top: 62, price: 0 },
  { name: 'Cortez Sedan', color: 0x2a5ac2, accel: 21, top: 52, price: 0 },
  { name: 'Mule Pickup', color: 0x8a6f3a, accel: 19, top: 48, price: 0 },
  { name: 'Comet Coupe', color: 0xe8b73a, accel: 23, top: 58, price: 0 },
  { name: 'Bison Van', color: 0x3a8a5a, accel: 17, top: 44, price: 0 },
  { name: 'Stiletto', color: 0x1a1a22, accel: 25, top: 64, price: 0 },
  { name: 'Marlin Cabrio', color: 0x2ac2b0, accel: 22, top: 56, price: 0 },
  { name: 'Dune Buggy', color: 0xc26a2a, accel: 20, top: 50, price: 0 },
];

function makeCarMesh(def) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.28, metalness: 0.75 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x101828, roughness: 0.1, metalness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.62, 4.4), paint);
  body.position.y = 0.55;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glass);
  cabin.position.set(0, 1.05, -0.2);
  g.add(cabin);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.3, 0.5), paint);
  nose.position.set(0, 0.5, 2.2);
  g.add(nose);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
  for (const x of [-0.7, 0.7]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.08), lightMat);
    lamp.position.set(x, 0.62, 2.46);
    g.add(lamp);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.position.set(x, 0.38, z);
    g.add(w);
  }
  return g;
}

export class Vehicles {
  constructor(scene, seed = 4242) {
    this.scene = scene;
    this.rng = makeRng(seed);
    this.cars = []; // parked, stealable
    this.traffic = []; // moving traffic
    const spots = [
      [6, -2, 0], [-14, 38, 1], [30, -84, 2], [-84, -14, 3],
      [84, 42, 4], [-42, 84, 5], [126, -42, 6], [-126, 126, 7],
    ];
    for (let i = 0; i < spots.length; i++) {
      const [x, z, defIdx] = spots[i];
      const def = CAR_DEFS[defIdx % CAR_DEFS.length];
      const group = makeCarMesh(def);
      group.position.set(x, 0, z);
      group.rotation.y = this.rng.range(0, Math.PI * 2);
      scene.add(group);
      this.cars.push({
        def,
        group,
        x,
        z,
        heading: group.rotation.y,
        speed: 0,
        stolen: false,
        mesh: group,
      });
    }
    // Traffic: slow cars looping the ring roads.
    for (let i = 0; i < 8; i++) {
      const def = CAR_DEFS[this.rng.int(0, CAR_DEFS.length - 1)];
      const group = makeCarMesh(def);
      scene.add(group);
      const ring = this.rng.pick([42, 84, 126]);
      this.traffic.push({
        def,
        group,
        ring,
        angle: this.rng.range(0, Math.PI * 2),
        speed: this.rng.range(7, 12),
        dir: this.rng.chance(0.5) ? 1 : -1,
      });
    }
  }

  updateTraffic(dt, time) {
    for (const t of this.traffic) {
      t.angle += (t.dir * t.speed * dt) / t.ring;
      const x = Math.cos(t.angle) * t.ring;
      const z = Math.sin(t.angle) * t.ring;
      t.group.position.set(x, 0, z);
      t.group.rotation.y = -t.angle + (t.dir > 0 ? 0 : Math.PI);
    }
  }

  // One driving step for the car the player is in. Returns nothing; the car
  // object carries heading and speed.
  drive(car, input, dt) {
    const throttle = input.isDown('KeyW') ? 1 : input.isDown('KeyS') ? -0.55 : 0;
    const steer = (input.isDown('KeyA') ? 1 : 0) - (input.isDown('KeyD') ? 1 : 0);
    const accel = throttle >= 0 ? CAR.accel : CAR.reverseAccel;
    car.speed += (accel * throttle - CAR.drag * car.speed) * dt;
    const cap = Math.min(CAR.maxSpeed, car.def.top);
    if (car.speed > cap) car.speed = cap;
    if (car.speed < -14) car.speed = -14;
    if (Math.abs(car.speed) < 0.05 && throttle === 0) car.speed = 0;
    const grip = Math.min(1, Math.abs(car.speed) / 8);
    car.heading += steer * CAR.turnRate * grip * dt * (car.speed >= 0 ? 1 : -1);
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    const b = WORLD.size / 2 - 4;
    car.x = Math.max(-b, Math.min(b, car.x));
    car.z = Math.max(-b, Math.min(b, car.z));
    car.group.position.set(car.x, 0, car.z);
    car.group.rotation.y = car.heading;
  }

  nearestCar(x, z, maxDist = CAR.enterRadius) {
    let best = null;
    let bestD = maxDist;
    for (const c of this.cars) {
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }
}
