// The wanted system and the police: 1-2 stars send patrol cars, 3 stars add
// roadblocks, 4-5 stars add the AIR-1 helicopter and spike strips. Crimes raise
// the level; laying low lets it fall. "EVADING" shows while the heat cools.

import * as THREE from 'three';
import { buildCarMesh } from './vehicles.js';
import { range } from './random.js';

const POLICE_COLOR = 0x1a2a4a;

export function createPolice(G) {
  const group = new THREE.Group();
  G.scene.add(group);
  const patrols = []; // {mesh, x, z, heading, speed}
  const roadblocks = []; // meshes placed ahead of the player
  const spikes = []; // {mesh, x, z, armed}
  let heli = null;
  let heliRotor = null;
  let evadeTimer = 0;
  let lastCrimeAt = -100;

  function spawnPatrol() {
    const mesh = buildCarMesh(POLICE_COLOR);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2 }));
    bar.position.y = 1.55;
    mesh.add(bar);
    mesh.userData.bar = bar;
    group.add(mesh);
    const p = { mesh, x: G.player.x + range(G.rng, -80, 80), z: G.player.z + range(G.rng, -80, 80), heading: 0, speed: 0 };
    patrols.push(p);
    return p;
  }

  function spawnHeli() {
    if (heli) return;
    heli = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 5.2),
      new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.4, metalness: 0.5 }));
    heli.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 4.5),
      new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.4, metalness: 0.5 }));
    tail.position.set(0, 0.2, -4.2);
    heli.add(tail);
    heliRotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.12, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 }));
    heliRotor.position.y = 1.1;
    heli.add(heliRotor);
    const spot = new THREE.Mesh(new THREE.ConeGeometry(6, 26, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff6c9, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }));
    spot.position.y = -13;
    spot.rotation.x = Math.PI;
    heli.add(spot);
    group.add(heli);
  }

  function placeRoadblock() {
    clearRoadblocks();
    for (let i = 0; i < 2; i++) {
      const mesh = buildCarMesh(POLICE_COLOR);
      const fx = Math.sin(G.playerHeading);
      const fz = Math.cos(G.playerHeading);
      const bx = G.player.x + fx * (34 + i * 7) + (i === 0 ? -6 : 6) * Math.cos(G.playerHeading);
      const bz = G.player.z + fz * (34 + i * 7) - (i === 0 ? -6 : 6) * Math.sin(G.playerHeading);
      mesh.position.set(bx, 0, bz);
      mesh.rotation.y = G.playerHeading + Math.PI / 2;
      group.add(mesh);
      roadblocks.push(mesh);
    }
  }

  function clearRoadblocks() {
    for (const m of roadblocks) group.remove(m);
    roadblocks.length = 0;
  }

  function placeSpikes() {
    for (const s of spikes) group.remove(s.mesh);
    spikes.length = 0;
    const fx = Math.sin(G.playerHeading);
    const fz = Math.cos(G.playerHeading);
    for (let i = 0; i < 2; i++) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(7, 0.25, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.8 }));
      mesh.position.set(G.player.x + fx * (26 + i * 12), 0.12, G.player.z + fz * (26 + i * 12));
      mesh.rotation.y = G.playerHeading;
      group.add(mesh);
      spikes.push({ mesh, x: mesh.position.x, z: mesh.position.z, armed: true });
    }
  }

  function addWanted(n, reason) {
    const before = G.state.wanted;
    G.state.wanted = Math.max(0, Math.min(5, G.state.wanted + n));
    if (G.state.wanted > before) {
      lastCrimeAt = G.time;
      evadeTimer = 0;
      if (reason) G.hud.toast(`${reason} — wanted level ${G.state.wanted}★`);
      G.audio.siren(G.state.wanted > 0);
    }
  }

  function update(dt) {
    const wanted = G.state.wanted;
    const px = G.player.inCar ? G.car.x : G.player.x;
    const pz = G.player.inCar ? G.car.z : G.player.z;
    const pSpeed = G.player.inCar ? Math.abs(G.car.speed) : G.player.speed;

    // Spawn / despawn patrol cars to match the wanted level.
    const wantPatrols = wanted === 0 ? 0 : Math.min(4, wanted + 1);
    while (patrols.length < wantPatrols) spawnPatrol();
    while (patrols.length > wantPatrols) {
      const p = patrols.pop();
      group.remove(p.mesh);
    }
    // Roadblocks at 3+, refreshed when the player moves far.
    if (wanted >= 3 && roadblocks.length === 0) placeRoadblock();
    if (wanted < 3 && roadblocks.length > 0) clearRoadblocks();
    // Helicopter at 4+.
    if (wanted >= 4) spawnHeli();
    else if (heli) { group.remove(heli); heli = null; heliRotor = null; }
    // Spike strips at 4+, re-laid ahead of the player.
    if (wanted >= 4 && spikes.length === 0) placeSpikes();
    if (wanted < 4 && spikes.length > 0) {
      for (const s of spikes) group.remove(s.mesh);
      spikes.length = 0;
    }

    // Patrol pursuit: steer toward the player, ram speed scales with stars.
    for (const p of patrols) {
      const dx = px - p.x;
      const dz = pz - p.z;
      const dist = Math.hypot(dx, dz) || 1;
      const targetHeading = Math.atan2(dx, dz);
      let dh = targetHeading - p.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      p.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
      const top = 16 + wanted * 4.5;
      p.speed = Math.min(top, p.speed + 14 * dt);
      p.x += Math.sin(p.heading) * p.speed * dt;
      p.z += Math.cos(p.heading) * p.speed * dt;
      const hit = G.world.collideCircle(p.x, p.z, 2.1);
      if (hit.hit) { p.x = hit.x; p.z = hit.z; p.speed *= 0.4; }
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.heading;
      p.mesh.userData.bar.material.emissiveIntensity = 1.5 + Math.sin(G.time * 12 + p.x) * 1.2;
      // Ram the player: a hard hit slows the car and shakes the camera.
      if (dist < 3.4 && pSpeed > 2) {
        G.car.speed *= 0.55;
        G.effects.shake(0.5);
        G.effects.burst(px, 1, pz, 0xff5533, 8);
      }
    }

    // Helicopter hovers above the player, rotor spinning, spotlight sweeping.
    if (heli) {
      heli.position.set(px + Math.sin(G.time * 0.7) * 12, 34, pz + Math.cos(G.time * 0.5) * 12);
      heli.rotation.y = Math.atan2(px - heli.position.x, pz - heli.position.z);
      heliRotor.rotation.y += dt * 22;
    }

    // Spike strips pop the tyres: a hard slowdown + shake.
    for (const s of spikes) {
      if (!s.armed) continue;
      if (Math.hypot(px - s.x, pz - s.z) < 3.5 && pSpeed > 4) {
        s.armed = false;
        G.car.speed *= 0.25;
        G.effects.shake(0.8);
        G.hud.toast('Spike strip! Tyres shredded.');
        G.audio.thud();
      }
    }

    // Heat cools: 25 s without a crime and the cops lose interest, one star at a time.
    if (wanted > 0 && G.time - lastCrimeAt > 25) {
      evadeTimer += dt;
      if (evadeTimer > 6) {
        evadeTimer = 0;
        G.state.wanted -= 1;
        if (G.state.wanted === 0) {
          G.hud.toast('You lost the cops. Heat is off.');
          G.audio.siren(false);
        }
      }
    }
  }

  return {
    patrols, roadblocks, spikes,
    get heli() { return heli; },
    addWanted, update,
    get evading() { return G.state.wanted > 0 && G.time - lastCrimeAt > 8; },
  };
}
