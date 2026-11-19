// The player on foot: a simple capsule figure, WASD walking with a run key,
// and getting in and out of the nearest car with E.
import * as THREE from 'three';
import { PLAYER } from './config.js';
import { clamp } from './random.js';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    const jacket = new THREE.MeshStandardMaterial({ color: 0xc22a3a, roughness: 0.7 });
    const jeans = new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.85 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xd8a077, roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.85, 6, 10), jacket);
    body.position.y = 1.15;
    this.group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), skin);
    head.position.y = 2.05;
    this.group.add(head);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.4), jeans);
    legs.position.y = 0.38;
    this.group.add(legs);
    scene.add(this.group);
    this.x = 0;
    this.z = 0;
    this.heading = 0;
    this.health = PLAYER.health;
    this.armor = 0;
    this.ammo = PLAYER.startAmmo;
    this.inCar = false;
    this.car = null;
  }

  place(x, z, heading) {
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.sync();
  }

  sync() {
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.heading;
    this.group.visible = !this.inCar;
  }

  step(input, dt, world) {
    if (this.inCar) return;
    const run = input.down('ShiftLeft', 'ShiftRight') ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const fx = input.walkX;
    const fz = input.walkZ;
    if (fx === 0 && fz === 0) {
      this.sync();
      return;
    }
    const len = Math.hypot(fx, fz) || 1;
    const mx = (fx / len) * run * dt;
    const mz = (fz / len) * run * dt;
    // Camera-relative movement: forward is -Z on screen, heading follows motion.
    const nx = this.x + mx;
    const nz = this.z + mz;
    if (world && !world.hitsBuilding(nx, nz, 0.7)) {
      this.x = nx;
      this.z = nz;
    }
    const clamped = world ? world.clampToCity(this.x, this.z) : [this.x, this.z];
    this.x = clamped[0];
    this.z = clamped[1];
    this.heading = Math.atan2(mx, mz) + Math.PI;
    this.sync();
  }

  damage(amount) {
    let left = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, left);
      this.armor -= absorbed;
      left -= absorbed;
    }
    this.health = clamp(this.health - left, 0, PLAYER.health);
    return this.health <= 0;
  }

  enterCar(car) {
    this.inCar = true;
    this.car = car;
    this.sync();
  }

  exitCar() {
    if (!this.car) return;
    const car = this.car;
    // Step out to the driver's side.
    const side = 2.6;
    this.x = car.x + Math.cos(car.heading) * side;
    this.z = car.z - Math.sin(car.heading) * side;
    this.heading = car.heading;
    this.inCar = false;
    this.car = null;
    this.sync();
  }
}
