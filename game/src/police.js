// Wanted system: 0-5 stars. 1-2 stars bring patrol cars, 3 stars adds
// roadblocks, 4-5 stars adds the AIR-1 helicopter and spike strips. Stars
// decay while the player stays unseen; "Lose the cops" is an evade state.
import * as THREE from 'three';
import { makeRng, clamp } from './random.js';
import { Car, makeCarMesh } from './vehicles.js';

export class Police {
  constructor(scene, world, seed = 21) {
    this.scene = scene;
    this.world = world;
    this.rng = makeRng(seed);
    this.wanted = 0;
    this.evade = 0; // seconds of unseen time
    this.units = []; // patrol cars
    this.heli = null;
    this.heliRotor = null;
    this.spikes = [];
    this.spawnTimer = 0;
    this.sirenOn = false;
  }

  addWanted(n) {
    this.wanted = clamp(this.wanted + n, 0, 5);
    this.evade = 0;
  }

  clearWanted() {
    this.wanted = 0;
    this.evade = 0;
    for (const u of this.units) this.scene.remove(u.mesh);
    this.units = [];
    this.clearHeli();
    this.clearSpikes();
  }

  clearHeli() {
    if (this.heli) {
      this.scene.remove(this.heli);
      this.heli = null;
      this.heliRotor = null;
    }
  }

  clearSpikes() {
    for (const s of this.spikes) this.scene.remove(s);
    this.spikes = [];
  }

  makeHeli() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.1, 5.2),
      new THREE.MeshStandardMaterial({ color: 0x1a2a44, roughness: 0.4, metalness: 0.5 }));
    body.position.y = 0;
    g.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.4),
      new THREE.MeshStandardMaterial({ color: 0x1a2a44, roughness: 0.4, metalness: 0.5 }));
    tail.position.set(0, 0.2, -4.4);
    g.add(tail);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }));
    rotor.position.y = 0.8;
    g.add(rotor);
    this.heliRotor = rotor;
    const spot = new THREE.Mesh(new THREE.ConeGeometry(4, 18, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.14, side: THREE.DoubleSide }));
    spot.position.y = -9;
    g.add(spot);
    return g;
  }

  spawnUnit(px, pz) {
    const car = new Car(this.scene, { top: 40, accel: 26 }, 0x101418, { police: true });
    const a = this.rng.next() * Math.PI * 2;
    car.place(px + Math.sin(a) * 55, pz + Math.cos(a) * 55, a);
    this.units.push(car);
    return car;
  }

  dropSpikes(px, pz, heading) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.8 });
    for (let i = -2; i <= 2; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.8, 5), mat);
      spike.position.set(i * 1.1, 0.4, 0);
      g.add(spike);
    }
    g.position.set(px, 0, pz);
    g.rotation.y = heading;
    this.scene.add(g);
    this.spikes.push(g);
    if (this.spikes.length > 3) {
      const old = this.spikes.shift();
      this.scene.remove(old);
    }
  }

  update(dt, playerPos, playerSpeed, onFoot) {
    const w = this.wanted;
    this.sirenOn = w > 0;
    // Wanted decays when the player is slow and out of sight of every unit.
    let seen = false;
    for (const u of this.units) {
      const d2 = (u.x - playerPos.x) ** 2 + (u.z - playerPos.z) ** 2;
      if (d2 < 60 * 60) seen = true;
    }
    if (w > 0 && !seen && Math.abs(playerSpeed) < 3) {
      this.evade += dt;
      if (this.evade > 14) {
        this.wanted = Math.max(0, w - 1);
        this.evade = 0;
      }
    } else {
      this.evade = 0;
    }
    // Keep the right number of patrol cars on the street.
    const wantUnits = w === 0 ? 0 : w <= 2 ? 2 : w === 3 ? 3 : 4;
    this.spawnTimer -= dt;
    if (this.units.length < wantUnits && this.spawnTimer <= 0) {
      this.spawnUnit(playerPos.x, playerPos.z);
      this.spawnTimer = 2.5;
    }
    while (this.units.length > wantUnits) {
      const u = this.units.pop();
      this.scene.remove(u.mesh);
    }
    // Patrol cars chase the player; at 3+ stars they lay spike strips ahead.
    for (const u of this.units) {
      const ctrl = u.steerToward(playerPos.x, playerPos.z, 1);
      u.update(dt, ctrl, (x, z, r) => this.world.collide(x, z, r));
      if (w >= 3 && this.rng.chance(dt * 0.05)) {
        this.dropSpikes(playerPos.x + Math.sin(u.heading) * 12, playerPos.z + Math.cos(u.heading) * 12, u.heading);
      }
      // Flash the light bar.
      if (u.mesh.userData.lightbar) {
        u.mesh.userData.lightbar.material.color.setHex(Math.floor(performance.now() / 300) % 2 === 0 ? 0x2244ff : 0xff2222);
      }
    }
    // Helicopter at 4-5 stars: hovers above, keeps the player lit.
    if (w >= 4 && !this.heli) this.heli = this.makeHeli(), this.scene.add(this.heli);
    if (w < 4 && this.heli) this.clearHeli();
    if (this.heli) {
      this.heli.position.set(
        playerPos.x + Math.sin(performance.now() / 2600) * 12,
        34,
        playerPos.z + Math.cos(performance.now() / 2600) * 12,
      );
      this.heli.rotation.y = Math.atan2(playerPos.x - this.heli.position.x, playerPos.z - this.heli.position.z);
      if (this.heliRotor) this.heliRotor.rotation.y += dt * 22;
    }
    void onFoot;
  }
}
