// The Solmara PD: cruisers that wake up with the wanted level, chase the
// player, and deploy roadblocks. A cop never stops on contact: it matches speed,
// so update() is safe to call directly with big dt in a deterministic check.
import * as THREE from '../vendor/three.module.min.js';
import { POLICE, WORLD } from './config.js';
import { makeRng } from './random.js';

function makeCopMesh() {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.3, metalness: 0.7 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.4, metalness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0e1420, roughness: 0.1, metalness: 0.9 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(2, 0.62, 4.4), body);
  base.position.y = 0.55;
  g.add(base);
  const doors = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.34, 2.4), white);
  doors.position.set(0, 0.62, 0.2);
  g.add(doors);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.0), glass);
  cabin.position.set(0, 1.05, -0.2);
  g.add(cabin);
  const bar = new THREE.Group();
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  red.position.x = -0.35;
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
  blue.position.x = 0.35;
  bar.add(red);
  bar.add(blue);
  bar.position.y = 1.42;
  g.add(bar);
  g.userData.bar = bar;
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const dark = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.8 });
  for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.position.set(x, 0.38, z);
    g.add(w);
  }
  return g;
}

export class Police {
  constructor(scene, seed = 99) {
    this.rng = makeRng(seed);
    this.copCars = [];
    for (let i = 0; i < 6; i++) {
      const group = makeCopMesh();
      group.visible = false;
      scene.add(group);
      this.copCars.push({
        group,
        x: 0,
        z: 0,
        heading: 0,
        speed: 0,
        active: false,
      });
    }
    this.decayTimer = 0;
  }

  capFor(wanted) {
    return POLICE.baseCap + wanted * POLICE.perStar;
  }

  update(dt, state, audio) {
    const wanted = state.wanted | 0;
    const want = POLICE.countByWanted[Math.min(wanted, 4)] ?? 0;
    const px = state.currentCar ? state.currentCar.x : state.player.pos.x;
    const pz = state.currentCar ? state.currentCar.z : state.player.pos.z;
    let active = 0;
    for (const cop of this.copCars) {
      if (active >= want) {
        if (cop.active) {
          cop.active = false;
          cop.group.visible = false;
          cop.speed = 0;
        }
        continue;
      }
      if (!cop.active) {
        cop.active = true;
        cop.group.visible = true;
        const a = this.rng.range(0, Math.PI * 2);
        cop.x = px + Math.cos(a) * this.rng.range(28, 45);
        cop.z = pz + Math.sin(a) * this.rng.range(28, 45);
        cop.speed = 12;
      }
      active++;
      // Steer toward the player and accelerate to the wanted cap.
      const dx = px - cop.x;
      const dz = pz - cop.z;
      const dist = Math.hypot(dx, dz) || 1;
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - cop.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      cop.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
      const cap = this.capFor(wanted);
      cop.speed += POLICE.accel * dt;
      if (cop.speed > cap) cop.speed = cap;
      // Close in but never stop: match the target's speed at contact range.
      if (dist < 5) {
        const targetSpeed = state.currentCar ? Math.max(6, state.currentCar.speed * 0.9) : 6;
        cop.speed = Math.max(cop.speed, targetSpeed);
      }
      cop.x += Math.sin(cop.heading) * cop.speed * dt;
      cop.z += Math.cos(cop.heading) * cop.speed * dt;
      const b = WORLD.size / 2 - 4;
      cop.x = Math.max(-b, Math.min(b, cop.x));
      cop.z = Math.max(-b, Math.min(b, cop.z));
      cop.group.position.set(cop.x, 0, cop.z);
      cop.group.rotation.y = cop.heading;
      const bar = cop.group.userData.bar;
      if (bar) bar.visible = Math.floor(performance.now() / 280) % 2 === 0;
    }
    // Roadblocks deploy at wanted 3 and up.
    const blocksOn = wanted >= POLICE.roadblockAt;
    for (const rb of state.world.roadblocks) {
      rb.active = blocksOn;
      rb.group.visible = blocksOn;
    }
    if (audio) audio.setSiren(active > 0, performance.now() / 1000);
    // Wanted decays when the player stays clean.
    if (wanted > 0) {
      this.decayTimer += dt;
      if (this.decayTimer > 25) {
        this.decayTimer = 0;
        state.wanted = Math.max(0, wanted - 1);
      }
    } else {
      this.decayTimer = 0;
    }
  }
}
