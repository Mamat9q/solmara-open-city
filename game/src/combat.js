// Combat: weapon wheel (keys 1-3), hitscan shots with tracers, ammo and
// health pickups scattered around the city. Shooting near police raises
// the wanted level.
import * as THREE from 'three';
import { WEAPONS } from './config.js';
import { makeRng } from './random.js';

export class Combat {
  constructor(game) {
    this.game = game;
    this.weaponIndex = 0;
    this.ammo = WEAPONS.map((w) => w.mag);
    this.reserve = WEAPONS.map(() => 60);
    this.cooldown = 0;
    this.pickups = [];
    this.tracers = [];
    this.rng = makeRng(55);
    this.buildPickups();
  }

  buildPickups() {
    const spots = [
      [60, 60, 'health'], [-60, 120, 'ammo'], [180, -60, 'health'],
      [-180, -120, 'ammo'], [0, 180, 'health'], [240, 180, 'ammo'],
      [-120, -180, 'health'], [120, -180, 'ammo'],
    ];
    for (const [x, z, kind] of spots) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 1.4, 1.4),
        new THREE.MeshBasicMaterial({ color: kind === 'health' ? 0x2ed97a : 0xffd24a }),
      );
      mesh.position.set(x, 0.9, z);
      this.game.scene.add(mesh);
      this.pickups.push({ mesh, x, z, kind, taken: false });
    }
  }

  weapon() {
    return WEAPONS[this.weaponIndex];
  }

  select(i) {
    if (i >= 0 && i < WEAPONS.length) {
      this.weaponIndex = i;
      this.game.hud.message(`Weapon: ${WEAPONS[i].name}`);
    }
  }

  // Fire from the camera toward the crosshair; returns true when a shot went off.
  shoot(origin, dir) {
    if (this.cooldown > 0) return false;
    const w = this.weapon();
    if (this.ammo[this.weaponIndex] <= 0) {
      this.game.hud.message('Out of ammo — find a yellow crate');
      this.cooldown = 0.4;
      return false;
    }
    this.ammo[this.weaponIndex] -= 1;
    this.cooldown = w.rate;
    const pellets = w.pellets || 1;
    for (let p = 0; p < pellets; p++) {
      const spread = w.spread;
      const d = dir.clone();
      d.x += (this.rng.next() - 0.5) * spread * 2;
      d.y += (this.rng.next() - 0.5) * spread * 2;
      d.z += (this.rng.next() - 0.5) * spread * 2;
      d.normalize();
      this.spawnTracer(origin, d, w.range);
      this.hitTest(origin, d, w);
    }
    const muzzle = origin.clone().add(dir.clone().multiplyScalar(1.2));
    this.game.effects.muzzle(muzzle.x, muzzle.y, muzzle.z);
    this.game.audio.shot();
    if (this.game.police.wanted < 2) this.game.police.addWanted(1);
    return true;
  }

  spawnTracer(origin, dir, range) {
    const end = origin.clone().add(dir.clone().multiplyScalar(range));
    const geo = new THREE.BufferGeometry().setFromPoints([origin, end]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }));
    this.game.scene.add(line);
    this.tracers.push({ line, life: 0.08 });
  }

  hitTest(origin, dir, w) {
    // Hit traffic cars and police cars: a simple sphere test per car.
    const targets = [...this.game.traffic.cars, ...this.game.police.units];
    for (const car of targets) {
      const cx = car.x - origin.x;
      const cz = car.z - origin.z;
      const along = cx * dir.x + cz * dir.z;
      if (along < 0 || along > w.range) continue;
      const px = origin.x + dir.x * along;
      const pz = origin.z + dir.z * along;
      const d2 = (px - car.x) ** 2 + (pz - car.z) ** 2;
      if (d2 < 2.6 * 2.6) {
        this.game.effects.sparks(car.x, 1, car.z);
        car.speed *= 0.7;
        if (this.game.police.units.includes(car)) this.game.police.addWanted(1);
        break;
      }
    }
  }

  update(dt, playerPos) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    for (const t of this.tracers) t.life -= dt;
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      if (this.tracers[i].life <= 0) {
        this.game.scene.remove(this.tracers[i].line);
        this.tracers.splice(i, 1);
      }
    }
    for (const p of this.pickups) {
      if (p.taken) continue;
      p.mesh.rotation.y += dt * 1.5;
      p.mesh.position.y = 0.9 + Math.sin(performance.now() / 400 + p.x) * 0.15;
      const d2 = (playerPos.x - p.x) ** 2 + (playerPos.z - p.z) ** 2;
      if (d2 < 2.5 * 2.5) {
        p.taken = true;
        p.mesh.visible = false;
        if (p.kind === 'health') {
          this.game.player.health = Math.min(100, this.game.player.health + 40);
          this.game.hud.message('Health +40');
        } else {
          this.reserve[this.weaponIndex] += 30;
          this.ammo[this.weaponIndex] = WEAPONS[this.weaponIndex].mag;
          this.game.hud.message('Ammo restocked');
        }
        this.game.audio.pickup();
      }
    }
  }
}
