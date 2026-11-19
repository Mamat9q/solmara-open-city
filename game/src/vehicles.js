// SOLMARA vehicles: parked cars to steal, traffic that cruises the grid,
// and the arcade driving model — accelerate, brake, steer, and a top speed
// that tuning can raise by fifteen percent.

import * as THREE from 'three';
import { CAR_DEFS, CITY } from './config.js';
import { collideWithBuildings } from './world.js';

export function makeCarMesh(def, accent = null) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: accent ?? def.color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x18222e, emissive: 0x0a1420, emissiveIntensity: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(def.width, 0.75, def.length), paint);
  body.position.y = 0.65;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(def.width * 0.85, 0.65, def.length * 0.5), glass);
  cabin.position.set(0, 1.3, -def.length * 0.05);
  group.add(cabin);
  const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x14141a });
  const wheelGeometry = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  wheelGeometry.rotateZ(Math.PI / 2);
  for (const wx of [-def.width / 2, def.width / 2]) {
    for (const wz of [-def.length * 0.32, def.length * 0.32]) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(wx, 0.38, wz);
      group.add(wheel);
    }
  }
  const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const hx of [-def.width * 0.32, def.width * 0.32]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), headlightMaterial);
    lamp.position.set(hx, 0.7, def.length / 2 + 0.02);
    group.add(lamp);
  }
  return group;
}

export class Vehicle {
  constructor(defKey, x, z, heading, owned = false) {
    this.defKey = defKey;
    this.def = CAR_DEFS[defKey];
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = 0;
    this.owned = owned;
    this.traffic = false;
    this.active = true;
    this.group = makeCarMesh(this.def);
    this.group.position.set(x, 0, z);
    this.group.rotation.y = heading;
  }

  topSpeed(tuned) {
    return this.def.topSpeed * (tuned ? 1.15 : 1);
  }

  drive(forward, steering, dt, tuned, armoured, world) {
    const top = this.topSpeed(tuned);
    if (forward > 0) this.speed += this.def.accel * dt;
    else if (forward < 0) this.speed -= this.def.accel * 1.1 * dt;
    else this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 8 * dt);
    this.speed = Math.max(-top * 0.35, Math.min(top, this.speed));
    const steerAmount = steering * this.def.turn * dt * Math.min(1, Math.abs(this.speed) / 8) * Math.sign(this.speed || 1);
    this.heading += steerAmount;
    let nx = this.x + Math.sin(this.heading) * this.speed * dt;
    let nz = this.z + Math.cos(this.heading) * this.speed * dt;
    // At the city edge the car turns around instead of grinding to a halt
    // against the boundary, so a long drive never stalls out.
    if (Math.abs(nx) > 122 || Math.abs(nz) > 122) {
      this.heading += Math.PI;
      nx = this.x + Math.sin(this.heading) * this.speed * dt;
      nz = this.z + Math.cos(this.heading) * this.speed * dt;
    }
    const fixed = collideWithBuildings(world, nx, nz, 1.4);
    if (fixed.x !== nx || fixed.z !== nz) this.speed *= armoured ? 0.9 : 0.55;
    this.x = fixed.x;
    this.z = fixed.z;
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.heading;
  }
}

export class TrafficManager {
  constructor(scene, rng, world) {
    this.cars = [];
    this.world = world;
    const keys = ['sedan', 'coupe', 'taxi', 'van', 'sedan', 'coupe', 'taxi', 'van', 'sedan', 'coupe'];
    for (let i = 0; i < keys.length; i += 1) {
      const onVertical = rng.chance(0.5);
      const line = rng.pick(CITY.roadLines);
      const along = rng.range(-110, 110);
      const heading = onVertical ? (rng.chance(0.5) ? 0 : Math.PI) : (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
      const car = new Vehicle(keys[i], onVertical ? line : along, onVertical ? along : line, heading);
      car.traffic = true;
      car.cruise = rng.range(9, 14);
      scene.add(car.group);
      this.cars.push(car);
    }
  }

  update(dt, playerPos) {
    for (const car of this.cars) {
      let speed = car.cruise;
      for (const other of this.cars) {
        if (other === car) continue;
        const dx = other.x - car.x;
        const dz = other.z - car.z;
        const ahead = dx * Math.sin(car.heading) + dz * Math.cos(car.heading);
        if (ahead > 0 && ahead < 9 && Math.abs(dx * Math.cos(car.heading) - dz * Math.sin(car.heading)) < 3) {
          speed = Math.min(speed, other.speed * 0.8);
        }
      }
      const pdx = playerPos.x - car.x;
      const pdz = playerPos.z - car.z;
      const aheadP = pdx * Math.sin(car.heading) + pdz * Math.cos(car.heading);
      if (aheadP > 0 && aheadP < 8 && Math.abs(pdx * Math.cos(car.heading) - pdz * Math.sin(car.heading)) < 3) {
        speed = 0;
      }
      car.speed += (speed - car.speed) * Math.min(1, dt * 1.5);
      car.x += Math.sin(car.heading) * car.speed * dt;
      car.z += Math.cos(car.heading) * car.speed * dt;
      if (Math.abs(car.x) > 125 || Math.abs(car.z) > 125) {
        const onVertical = Math.random() < 0.5;
        const line = CITY.roadLines[Math.floor(Math.random() * CITY.roadLines.length)];
        car.x = onVertical ? line : (Math.random() < 0.5 ? -120 : 120);
        car.z = onVertical ? (Math.random() < 0.5 ? -120 : 120) : line;
        car.heading = onVertical ? (car.z < 0 ? 0 : Math.PI) : (car.x < 0 ? Math.PI / 2 : -Math.PI / 2);
      }
      car.group.position.set(car.x, 0, car.z);
      car.group.rotation.y = car.heading;
    }
  }
}
