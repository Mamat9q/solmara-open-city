// On-foot combat: hitscan shots with a tracer line, muzzle flash and ammo
// count. Shooting a cruiser damages it and raises heat; shooting while the
// player is in a car is not possible (hands on the wheel).
import * as THREE from 'three';
import { dist2 } from './random.js';

export class Combat {
  constructor(scene, audio) {
    this.scene = scene;
    this.audio = audio;
    this.tracers = [];
    this.flash = null;
  }

  shoot(from, heading, ammo, police, traffic) {
    if (ammo <= 0) return { fired: false, ammo };
    this.audio.shot();
    const dirX = Math.sin(heading);
    const dirZ = -Math.cos(heading);
    const range = 90;
    const endX = from.x + dirX * range;
    const endZ = from.z + dirZ * range;
    // Tracer: a thin bright line that fades in 80 ms.
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(from.x, 1.4, from.z),
      new THREE.Vector3(endX, 1.4, endZ),
    ]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 1 }));
    this.scene.add(line);
    this.tracers.push({ line, life: 0.08 });
    // Hit test: nearest cruiser within a narrow cone in front.
    let hit = false;
    for (const c of police.cruisers) {
      const dx = c.x - from.x;
      const dz = c.z - from.z;
      const d = Math.hypot(dx, dz);
      if (d > range) continue;
      const dot = (dx * dirX + dz * dirZ) / (d || 1);
      if (dot > 0.985 && dist2(c.x, c.z, from.x + dirX * d, from.z + dirZ * d) < 9) {
        c.health -= 25;
        if (c.health <= 0) {
          c.health = 100;
          police.setWanted(Math.max(0, police.wanted - 1));
        }
        hit = true;
        break;
      }
    }
    if (hit) police.addHeat(0); // heat already counted by the shot itself
    return { fired: true, ammo: ammo - 1, hit };
  }

  step(dt) {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      t.line.material.opacity = Math.max(0, t.life / 0.08);
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        t.line.material.dispose();
        this.tracers.splice(i, 1);
      }
    }
  }
}
