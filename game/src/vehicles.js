// Cars: the player's Vesper GT, police cruisers and ambient traffic. One
// shared arcade physics model (accel 22, drag 0.15, top speed cap) so the
// headless drive test reaches cruising speed even at ~1 fps.
import * as THREE from 'three';
import { CAR } from './config.js';
import { clamp, angleLerp } from './random.js';

function carMesh(bodyColor, opts) {
  const o = opts || {};
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.25, metalness: 0.7 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0a1420, roughness: 0.1, metalness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), bodyMat);
  body.position.y = 0.62;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glassMat);
  cabin.position.set(0, 1.15, -0.2);
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.9 });
  const wheels = [];
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.36, z);
    group.add(w);
    wheels.push(w);
  }
  // Headlights: a spotlight plus two bright discs, so night driving reads.
  const beam = new THREE.SpotLight(0xffe9b0, 60, 42, 0.5, 0.45, 1.2);
  beam.position.set(0, 0.9, 2.1);
  const beamTarget = new THREE.Object3D();
  beamTarget.position.set(0, 0, 14);
  group.add(beamTarget);
  beam.target = beamTarget;
  group.add(beam);
  for (const x of [-0.6, 0.6]) {
    const lamp = new THREE.Mesh(
      new THREE.CircleGeometry(0.16, 10),
      new THREE.MeshBasicMaterial({ color: 0xfff2c8 }),
    );
    lamp.position.set(x, 0.66, 2.21);
    group.add(lamp);
  }
  for (const x of [-0.6, 0.6]) {
    const tail = new THREE.Mesh(
      new THREE.CircleGeometry(0.14, 10),
      new THREE.MeshBasicMaterial({ color: 0xff2020 }),
    );
    tail.position.set(x, 0.66, -2.21);
    tail.rotation.y = Math.PI;
    group.add(tail);
  }
  if (o.police) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.22, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    bar.position.set(0, 1.55, -0.2);
    bar.name = 'lightbar';
    group.add(bar);
  }
  return { group, wheels, beam };
}

export class Car {
  constructor(scene, bodyColor, opts) {
    this.scene = scene;
    this.opts = opts || {};
    const built = carMesh(bodyColor, this.opts);
    this.group = built.group;
    this.wheels = built.wheels;
    this.beam = built.beam;
    scene.add(this.group);
    this.x = 0;
    this.z = 0;
    this.heading = 0; // radians, 0 = -Z (north)
    this.speed = 0;
    this.health = 100;
    this.nitroLeft = 0;
    this.steerVis = 0;
  }

  place(x, z, heading, speed) {
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = speed || 0;
    this.sync();
  }

  sync() {
    // The model is built nose-first along local +Z; forward is
    // (sin h, -cos h), so rotation.y = PI - heading puts the nose forward.
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = Math.PI - this.heading;
    for (const w of this.wheels) w.rotation.x += this.speed * 0.02;
  }

  // Arcade step: throttle -1..1 (reverse), steer -1..1, dt seconds.
  step(throttle, steer, dt, world) {
    const top = CAR.maxSpeed + (this.nitroLeft > 0 ? CAR.nitroBoost : 0);
    if (this.nitroLeft > 0) this.nitroLeft -= dt;
    if (throttle > 0) this.speed += CAR.accel * throttle * dt;
    else if (throttle < 0) {
      if (this.speed > 0.5) this.speed -= CAR.brake * dt;
      else this.speed -= CAR.reverseAccel * dt;
    }
    this.speed -= this.speed * CAR.drag * dt;
    if (this.speed > top) this.speed = top;
    if (this.speed < -CAR.maxReverse) this.speed = -CAR.maxReverse;
    if (Math.abs(this.speed) < 0.05 && throttle === 0) this.speed = 0;
    const dir = this.speed >= 0 ? 1 : -1;
    const steerScale = clamp(1 - Math.abs(this.speed) / 60, 0.35, 1);
    this.heading += steer * CAR.steer * steerScale * dir * dt * clamp(Math.abs(this.speed) / 6, 0, 1);
    this.steerVis = angleLerp(this.steerVis, steer, dt * 8);
    const nx = this.x + Math.sin(this.heading) * this.speed * dt;
    const nz = this.z + Math.cos(this.heading) * this.speed * dt * -1;
    // Buildings block the car: slide along them instead of passing through.
    if (world) {
      const hit = world.hitsBuilding(nx, nz, 1.6);
      if (hit) {
        const hx = world.hitsBuilding(nx, this.z, 1.6);
        const hz = world.hitsBuilding(this.x, nz, 1.6);
        if (!hx) this.x = nx;
        if (!hz) this.z = nz;
        if (hx && hz) this.speed *= 0.4;
      } else {
        this.x = nx;
        this.z = nz;
      }
      const clamped = world.clampToCity(this.x, this.z);
      this.x = clamped[0];
      this.z = clamped[1];
    } else {
      this.x = nx;
      this.z = nz;
    }
    this.sync();
  }

  get speedKmh() {
    return Math.abs(this.speed) * 3.6;
  }

  dispose() {
    this.scene.remove(this.group);
  }
}

// Ambient traffic: cars that cruise the avenues and turn at intersections.
export class Traffic {
  constructor(scene, world, rng) {
    this.scene = scene;
    this.world = world;
    this.rng = rng;
    this.cars = [];
    const colors = [0x8a8f9a, 0x5a6b8a, 0x7a4a3a, 0x3a5a4a, 0x9a7a2a, 0x6a4a7a];
    for (let i = 0; i < 12; i++) {
      const car = new Car(scene, colors[i % colors.length], {});
      const avenue = (Math.floor(rng() * 9) - 4) * 80;
      const along = (rng() * 2 - 1) * 280;
      const vertical = rng() < 0.5;
      car.place(vertical ? avenue : along, vertical ? along : avenue, vertical ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2), 9 + rng() * 5);
      car.cruise = 9 + rng() * 5;
      car.vertical = vertical;
      this.cars.push(car);
    }
  }

  step(dt) {
    for (const car of this.cars) {
      // Ease back to cruising speed, keep the lane, turn at the city edge.
      const target = car.cruise;
      car.speed += (target - car.speed) * Math.min(1, dt * 0.8);
      car.step(0, 0, dt, null);
      if (Math.abs(car.x) > 300 || Math.abs(car.z) > 300) {
        car.heading += Math.PI / 2;
        const c = this.world.clampToCity(car.x, car.z);
        car.x = c[0];
        car.z = c[1];
      }
    }
  }
}
