// Combat: the weapon wheel (1 pistol, 2 SMG, 3 shotgun), hitscan shooting at
// police and pedestrians, ammo + health pickups scattered around the city.
// Shooting a cop is a crime; shooting a pedestrian is a bigger one.

import * as THREE from 'three';
import { WEAPONS } from './config.js';
import { range } from './random.js';

export function createCombat(G) {
  const pickups = [];
  const group = new THREE.Group();
  G.scene.add(group);
  let cooldown = 0;

  function spawnPickup(kind) {
    const p = G.world.randomRoadPoint();
    const mesh = new THREE.Group();
    const color = kind === 'health' ? 0x2fd95f : 0xffd23f;
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.4 }));
    mesh.add(box);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6 }));
    mesh.add(cap);
    mesh.position.set(p.x, 1.2, p.z);
    group.add(mesh);
    pickups.push({ kind, mesh, x: p.x, z: p.z, bob: G.rng() * 6 });
  }
  for (let i = 0; i < 4; i++) spawnPickup('health');
  for (let i = 0; i < 4; i++) spawnPickup('ammo');

  function weaponDef() { return WEAPONS[G.state.weapon]; }

  function selectWeapon(key) {
    const id = key === 'pistol' ? 'pistol' : key === 'smg' ? 'smg' : 'shotgun';
    if (id === 'smg' && !G.state.ownedWeapons.includes('smg')) {
      G.hud.toast('Buy the SMG at the weapon shop (B) — $900.');
      return;
    }
    if (id === 'shotgun' && !G.state.ownedWeapons.includes('shotgun')) {
      G.hud.toast('Buy the Shotgun at the weapon shop (B) — $1,500.');
      return;
    }
    G.state.weapon = id;
    G.player.setArmed(true);
    G.hud.toast(`${WEAPONS[id].name} ready.`);
  }

  /** Aim direction: the camera yaw when on foot, the car heading when driving. */
  function aimDir() {
    if (G.player.inCar) return { x: Math.sin(G.car.heading), z: Math.cos(G.car.heading) };
    return { x: Math.sin(G.camYaw), z: Math.cos(G.camYaw) };
  }

  function origin() {
    return G.player.inCar ? { x: G.car.x, z: G.car.z, y: 1.2 } : { x: G.player.x, z: G.player.z, y: 1.5 };
  }

  function fire() {
    if (cooldown > 0 || G.mode !== 'play') return;
    const def = weaponDef();
    if (G.state.ammo <= 0) {
      G.hud.toast('Out of ammo — grab an ammo pickup (yellow box) or buy more (B).');
      G.audio.click();
      cooldown = 0.3;
      return;
    }
    cooldown = def.rate;
    G.state.ammo -= 1;
    G.audio.gunshot(def.name);
    const o = origin();
    const a = aimDir();
    G.effects.muzzle(o.x + a.x * 1.5, o.y, o.z + a.z * 1.5, a);
    const pellets = def.pellets || 1;
    let hitSomething = false;
    for (let p = 0; p < pellets; p++) {
      const spread = (G.rng() - 0.5) * 0.12;
      const ax = a.x + Math.cos(Math.atan2(a.z, a.x)) * spread;
      const az = a.z - Math.sin(Math.atan2(a.z, a.x)) * spread;
      // Nearest police patrol in the cone.
      let best = null;
      let bestD = def.range;
      for (const patrol of G.police.patrols) {
        const dx = patrol.x - o.x;
        const dz = patrol.z - o.z;
        const d = Math.hypot(dx, dz);
        if (d > def.range) continue;
        const dot = (dx * ax + dz * az) / (d || 1);
        if (dot > 0.92 && d < bestD) { bestD = d; best = { kind: 'cop', ref: patrol }; }
      }
      if (!best) {
        for (const ped of G.traffic.peds) {
          const dx = ped.mesh.position.x - o.x;
          const dz = ped.mesh.position.z - o.z;
          const d = Math.hypot(dx, dz);
          if (d > def.range) continue;
          const dot = (dx * ax + dz * az) / (d || 1);
          if (dot > 0.92 && d < bestD) { bestD = d; best = { kind: 'ped', ref: ped }; }
        }
      }
      if (best) {
        hitSomething = true;
        G.effects.burst(o.x + ax * bestD, 1.2, o.z + az * bestD, 0xff2222, 10);
        if (best.kind === 'cop') {
          best.ref.speed = Math.max(0, best.ref.speed - 6);
          G.police.addWanted(1, 'You shot a cop');
        } else {
          // The pedestrian drops and scrambles away.
          best.ref.pos += 30 * best.ref.dir;
          G.police.addWanted(2, 'You shot a pedestrian');
        }
      }
    }
    if (!hitSomething) {
      G.effects.burst(o.x + a.x * def.range * 0.7, 0.4, o.z + a.z * def.range * 0.7, 0x888888, 4);
    }
  }

  function update(dt) {
    if (cooldown > 0) cooldown -= dt;
    const p = origin();
    for (const pk of pickups) {
      pk.bob += dt;
      pk.mesh.position.y = 1.2 + Math.sin(pk.bob * 2) * 0.25;
      pk.mesh.rotation.y += dt * 1.5;
      if (Math.hypot(p.x - pk.x, p.z - pk.z) < 2.5) {
        if (pk.kind === 'health') {
          G.state.health = Math.min(100, G.state.health + 40);
          G.hud.toast('Health +40');
        } else {
          G.state.ammo = Math.min(weaponDef().ammoMax, G.state.ammo + 30);
          G.hud.toast('Ammo +30');
        }
        G.audio.pickup();
        // Respawn elsewhere.
        const np = G.world.randomRoadPoint();
        pk.x = np.x;
        pk.z = np.z;
        pk.mesh.position.set(np.x, 1.2, np.z);
      }
    }
  }

  return { selectWeapon, fire, update, weaponDef };
}
