// SOLMARA people: pedestrians who stroll the sidewalks and flee gunfire,
// and the Hollow Point enforcers who guard mission targets and shoot back.

import * as THREE from 'three';
import { CITY } from './config.js';

const SHIRT_COLORS = [0xe8e0d0, 0x4a7fb5, 0xc25a6e, 0x5aa87a, 0xe0a53a, 0x8a6fb5];
const ENEMY_COLOR = 0x2b2b33;

function makePersonMesh(shirtColor, skinColor = 0xc98f6a) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.38, 1.05, 8),
    new THREE.MeshLambertMaterial({ color: shirtColor }),
  );
  body.position.y = 0.95;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 10, 8),
    new THREE.MeshLambertMaterial({ color: skinColor }),
  );
  head.position.y = 1.72;
  group.add(head);
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.55, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x2e3440 }),
  );
  legs.position.y = 0.28;
  group.add(legs);
  return group;
}

export class PedestrianManager {
  constructor(scene, rng) {
    this.walkers = [];
    for (let i = 0; i < 14; i += 1) {
      const line = rng.pick(CITY.roadLines);
      const onVertical = rng.chance(0.5);
      const group = makePersonMesh(rng.pick(SHIRT_COLORS));
      const walker = {
        group,
        x: onVertical ? line + 6.5 : rng.range(-110, 110),
        z: onVertical ? rng.range(-110, 110) : line + 6.5,
        heading: rng.range(0, Math.PI * 2),
        speed: rng.range(1.2, 2.2),
        targetX: 0,
        targetZ: 0,
        fleeing: 0,
      };
      walker.targetX = walker.x;
      walker.targetZ = walker.z;
      group.position.set(walker.x, 0, walker.z);
      scene.add(group);
      this.walkers.push(walker);
    }
  }

  scareAt(x, z, radius) {
    for (const w of this.walkers) {
      const dx = w.x - x;
      const dz = w.z - z;
      if (dx * dx + dz * dz < radius * radius) w.fleeing = 4;
    }
  }

  update(dt) {
    for (const w of this.walkers) {
      if (w.fleeing > 0) {
        w.fleeing -= dt;
        w.speed = 5.5;
      } else {
        w.speed = 1.6;
      }
      const dx = w.targetX - w.x;
      const dz = w.targetZ - w.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.5) {
        const line = CITY.roadLines[Math.floor(Math.random() * CITY.roadLines.length)];
        const onVertical = Math.random() < 0.5;
        w.targetX = onVertical ? line + 6.5 : (Math.random() - 0.5) * 220;
        w.targetZ = onVertical ? (Math.random() - 0.5) * 220 : line + 6.5;
      } else {
        w.heading = Math.atan2(dx, dz);
        w.x += Math.sin(w.heading) * w.speed * dt;
        w.z += Math.cos(w.heading) * w.speed * dt;
      }
      w.group.position.set(w.x, 0, w.z);
      w.group.rotation.y = w.heading;
      w.group.position.y = Math.abs(Math.sin(Date.now() * 0.006 + w.x)) * 0.05;
    }
  }
}

export class Enemy {
  constructor(scene, x, z) {
    this.group = makePersonMesh(ENEMY_COLOR, 0xb98a68);
    this.group.position.set(x, 0, z);
    scene.add(this.group);
    this.x = x;
    this.z = z;
    this.health = 50;
    this.alive = true;
    this.shootCooldown = 1 + Math.random();
    this.speed = 3.4;
  }

  damage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.alive = false;
      this.group.visible = false;
    }
  }

  update(dt, playerPos, onShootPlayer) {
    if (!this.alive) return;
    const dx = playerPos.x - this.x;
    const dz = playerPos.z - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 26) {
      this.x += (dx / dist) * this.speed * dt;
      this.z += (dz / dist) * this.speed * dt;
    }
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = Math.atan2(dx, dz);
    this.shootCooldown -= dt;
    if (dist < 30 && this.shootCooldown <= 0) {
      this.shootCooldown = 1.3 + Math.random() * 0.7;
      const hitChance = Math.max(0.15, 0.55 - dist * 0.012);
      if (Math.random() < hitChance) onShootPlayer(8);
    }
  }

  remove(scene) {
    scene.remove(this.group);
  }
}
