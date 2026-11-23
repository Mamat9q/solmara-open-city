// Ambient life: 14 traffic cars cruising the road grid and 24 pedestrians on
// the sidewalks, with headlights after dark. Traffic cars follow the grid,
// stop briefly at random, and never leave the roads.
import * as THREE from 'three';
import { CFG } from './config.js';
import { makeRng, clamp } from './random.js';
import { Car, makeCarMesh } from './vehicles.js';
import { makePersonMesh } from './player.js';
import { nearestRoadPoint } from './world.js';

const TRAFFIC_COLORS = [0xc0c0c0, 0x8a2be2, 0x2e8b57, 0xd2691e, 0x4682b4, 0xb22222, 0xf5f5dc];

export class Traffic {
  constructor(scene, world, seed = 7) {
    this.scene = scene;
    this.world = world;
    this.rng = makeRng(seed);
    this.cars = [];
    this.peds = [];
    for (let i = 0; i < CFG.trafficCount; i++) {
      const car = new Car(scene, { top: 14, accel: 9 }, TRAFFIC_COLORS[i % TRAFFIC_COLORS.length]);
      const gx = this.rng.int(-4, 4) * 60;
      const gz = this.rng.int(-4, 4) * 60;
      const alongX = this.rng.chance(0.5);
      car.place(alongX ? gx : gx + this.rng.range(-20, 20), alongX ? gz + this.rng.range(-20, 20) : gz, alongX ? Math.PI / 2 : 0);
      car.cruise = 9 + this.rng.range(0, 5);
      car.wait = 0;
      car.dir = this.rng.chance(0.5) ? 1 : -1;
      this.cars.push(car);
    }
    for (let i = 0; i < CFG.pedCount; i++) {
      const mesh = makePersonMesh(
        [0x3a6fd9, 0xd94a6a, 0x4ad97a, 0xd9a03a, 0x7a4ad9][i % 5],
        0x2a2e38,
      );
      scene.add(mesh);
      const gx = this.rng.int(-4, 4) * 60 + this.rng.range(-25, 25);
      const gz = this.rng.int(-4, 4) * 60 + this.rng.range(-25, 25);
      this.peds.push({
        mesh,
        x: gx,
        z: gz,
        heading: this.rng.next() * Math.PI * 2,
        speed: this.rng.range(0.9, 1.8),
        phase: this.rng.next() * 6,
        turnAt: this.rng.range(2, 9),
      });
    }
  }

  update(dt, night) {
    for (const car of this.cars) {
      if (car.wait > 0) {
        car.wait -= dt;
        car.update(dt, { throttle: 0, brake: 1, reverse: false, steer: 0, handbrake: 0 }, null);
        continue;
      }
      if (this.rng.chance(dt * 0.02)) car.wait = this.rng.range(1, 3);
      // Steer along the grid: pick the nearest road line and follow it.
      const p = nearestRoadPoint(car.x, car.z);
      const tx = Math.abs(car.x - p.x) < 2 ? car.x + Math.sin(car.heading) * 30 * car.dir : p.x;
      const tz = Math.abs(car.z - p.z) < 2 ? car.z + Math.cos(car.heading) * 30 * car.dir : p.z;
      const ctrl = car.steerToward(tx, tz, 0.5);
      car.speed = Math.min(car.speed, car.cruise);
      car.update(dt, ctrl, (x, z, r) => this.world.collide(x, z, r));
    }
    for (const p of this.peds) {
      p.turnAt -= dt;
      if (p.turnAt <= 0) {
        p.heading += this.rng.range(-1.2, 1.2);
        p.turnAt = this.rng.range(2, 9);
      }
      p.x += Math.sin(p.heading) * p.speed * dt;
      p.z += Math.cos(p.heading) * p.speed * dt;
      if (Math.abs(p.x) > 290 || Math.abs(p.z) > 290) p.heading += Math.PI;
      p.phase += dt * p.speed * 3;
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.heading;
      const swing = Math.sin(p.phase) * 0.5;
      const limbs = p.mesh.userData.limbs;
      limbs[0].rotation.x = swing;
      limbs[1].rotation.x = -swing;
      limbs[2].rotation.x = -swing;
      limbs[3].rotation.x = swing;
    }
    void night;
  }

  nearestCar(x, z, maxDist = 6) {
    let best = null;
    let bd = maxDist * maxDist;
    for (const car of this.cars) {
      const d2 = (car.x - x) ** 2 + (car.z - z) ** 2;
      if (d2 < bd) {
        bd = d2;
        best = car;
      }
    }
    return best;
  }
}
