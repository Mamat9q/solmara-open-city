// Police: cruisers that spawn on wanted stars, chase the player, ram the car,
// and roadblocks that force a detour. Sirens wail while any cruiser is out.
import * as THREE from 'three';
import { WANTED } from './config.js';
import { clamp, angleLerp, dist2 } from './random.js';
import { Car } from './vehicles.js';

export class Police {
  constructor(scene, world, audio) {
    this.scene = scene;
    this.world = world;
    this.audio = audio;
    this.cruisers = [];
    this.roadblocks = [];
    this.wanted = 0;
    this.cleanSeconds = 0;
    this.flash = 0;
    this.spawnX = 0;
    this.spawnZ = 0;
  }

  wantedCount() {
    return Math.min(this.wanted * WANTED.copsPerStar, WANTED.maxCops);
  }

  setWanted(stars, cx, cz) {
    const next = clamp(Math.round(stars), 0, WANTED.maxStars);
    this.spawnX = cx || 0;
    this.spawnZ = cz || 0;
    if (next === this.wanted) return;
    this.wanted = next;
    this.cleanSeconds = 0;
    this.syncCruisers();
    this.audio.setSiren(this.wanted > 0);
  }

  addHeat(amount, cx, cz) {
    this.setWanted(this.wanted + amount, cx, cz);
  }

  // Stage the chase shot: two cruisers ahead of the player, headlights toward
  // the camera, the rest scattered behind.
  stageChase(x, z, heading) {
    const fx = Math.sin(heading);
    const fz = -Math.cos(heading);
    if (this.cruisers.length >= 1) {
      const c0 = this.cruisers[0];
      c0.place(x + fx * 55, z + fz * 55, heading + Math.PI, 22);
    }
    if (this.cruisers.length >= 2) {
      const c1 = this.cruisers[1];
      c1.place(x + fx * 85 - fz * 10, z + fz * 85 + fx * 10, heading + Math.PI, 20);
    }
    for (let i = 2; i < this.cruisers.length; i++) {
      const c = this.cruisers[i];
      const a = (i / this.cruisers.length) * Math.PI * 2;
      c.place(x - fx * 40 + Math.cos(a) * 30, z - fz * 40 + Math.sin(a) * 30, a, 16);
    }
  }

  syncCruisers() {
    const want = this.wantedCount();
    while (this.cruisers.length < want) {
      const cruiser = new Car(this.scene, 0x101418, { police: true });
      const a = Math.random() * Math.PI * 2;
      cruiser.place(this.spawnX + Math.cos(a) * 60, this.spawnZ + Math.sin(a) * 60, a, 12);
      this.cruisers.push(cruiser);
    }
    while (this.cruisers.length > want) {
      const cruiser = this.cruisers.pop();
      cruiser.dispose();
    }
    // Roadblocks: two barricades ahead on the avenue when heat is high.
    while (this.roadblocks.length > 0) {
      const b = this.roadblocks.pop();
      this.scene.remove(b);
    }
    if (this.wanted >= 3) {
      for (const z of [90, 150]) {
        const block = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.7 });
        const stripe = new THREE.MeshBasicMaterial({ color: 0xff5a2a });
        for (let i = -1; i <= 1; i++) {
          const barrier = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.1, 0.8), mat);
          barrier.position.set(i * 3.6, 0.55, 0);
          block.add(barrier);
          const tape = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 0.85), stripe);
          tape.position.set(i * 3.6, 1.0, 0);
          block.add(tape);
        }
        block.position.set(0, 0, z);
        this.scene.add(block);
        this.roadblocks.push(block);
      }
    }
  }

  // target: {x, z, speed} of the player car (or the player on foot).
  step(dt, target, playerCar) {
    this.flash += dt * 6;
    for (const c of this.cruisers) {
      const bar = c.group.getObjectByName('lightbar');
      if (bar) bar.material.color.setHex(Math.sin(this.flash) > 0 ? 0xff2020 : 0x2040ff);
    }
    if (this.wanted === 0) {
      this.audio.setSiren(false);
      return;
    }
    // Clean driving sheds heat slowly.
    if (target.speed < 8) this.cleanSeconds += dt;
    else this.cleanSeconds = 0;
    if (this.cleanSeconds > WANTED.decaySeconds) {
      this.setWanted(this.wanted - 1);
      return;
    }
    for (const c of this.cruisers) {
      const dx = target.x - c.x;
      const dz = target.z - c.z;
      const d = Math.hypot(dx, dz) || 1;
      const wantHeading = Math.atan2(dx, -dz);
      c.heading = angleLerp(c.heading, wantHeading, Math.min(1, dt * 1.4));
      const top = Math.min(WANTED.copTopSpeed, Math.abs(target.speed) + 6);
      c.speed += ((d > 26 ? top : top * 0.55) - c.speed) * Math.min(1, dt * 1.2);
      const nx = c.x + Math.sin(c.heading) * c.speed * dt;
      const nz = c.z - Math.cos(c.heading) * c.speed * dt;
      if (!this.world.hitsBuilding(nx, nz, 1.6)) {
        c.x = nx;
        c.z = nz;
      }
      const cl = this.world.clampToCity(c.x, c.z);
      c.x = cl[0];
      c.z = cl[1];
      c.sync();
      // Ram: contact with the player's car damages it.
      if (playerCar && dist2(c.x, c.z, playerCar.x, playerCar.z) < 12) {
        playerCar.health = Math.max(0, playerCar.health - WANTED.ramDamage * dt * 2);
        c.speed *= 0.92;
      }
    }
  }

  count() {
    return this.cruisers.length;
  }
}
