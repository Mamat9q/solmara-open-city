// The law: cruisers that chase the player, escalating with the wanted level.
// Cop top speed is 36 + 3.2 * wanted (48.8 u/s at 4 stars) — faster than any
// street car, so a 4-star chase is a real chase. update(dt, state, audio) is
// called by the game loop and is also callable directly (the playtest does).

import * as THREE from 'three';
import { POLICE } from './config.js';

function buildCopMesh() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 0.35, metalness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.75, 4.4), bodyMat);
  body.position.y = 0.65;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.65, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x1a2438, roughness: 0.25, metalness: 0.35 }),
  );
  cabin.position.set(0, 1.3, -0.2);
  g.add(cabin);
  const barMat = new THREE.MeshBasicMaterial({ color: 0xff2d55 });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.5), barMat);
  bar.position.set(0, 1.72, -0.2);
  g.add(bar);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.9 });
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.42, z);
    g.add(wheel);
  }
  return g;
}

export function createPolice(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const copCars = [];
  for (let i = 0; i < POLICE.maxCops; i++) {
    const mesh = buildCopMesh();
    mesh.visible = false;
    group.add(mesh);
    copCars.push({
      x: 0,
      z: 0,
      heading: 0,
      speed: 0,
      active: false,
      health: 100,
      mesh,
      bar: mesh.children[2],
    });
  }

  let sirenOn = false;
  let respawnTimer = 0;

  function wantedTopSpeed(wanted) {
    return POLICE.baseTopSpeed + POLICE.topSpeedPerStar * Math.min(4, Math.max(0, wanted));
  }

  function spawnCop(cop, state) {
    // Spawn ahead of the player on the nearest street, at a distance.
    const px = state.player.pos.x;
    const pz = state.player.pos.z;
    const angle = Math.random() * Math.PI * 2;
    const d = 55 + Math.random() * 25;
    cop.x = Math.max(-155, Math.min(155, px + Math.cos(angle) * d));
    cop.z = Math.max(-155, Math.min(155, pz + Math.sin(angle) * d));
    cop.speed = 12;
    cop.mesh.position.set(cop.x, 0, cop.z);
    cop.mesh.visible = true;
  }

  function update(dt, state, audio) {
    const wanted = state.wanted ?? 0;
    const wantActive = wanted === 0 ? 0 : Math.min(POLICE.maxCops, wanted + 1);
    let activeCount = 0;
    for (const cop of copCars) {
      if (activeCount >= wantActive) {
        if (cop.active) {
          cop.active = false;
          cop.speed = 0;
          cop.mesh.visible = false;
        }
        continue;
      }
      activeCount++;
      if (!cop.active) {
        cop.active = true;
        spawnCop(cop, state);
      }
      const cap = wantedTopSpeed(wanted);
      cop.speed = Math.min(cap, cop.speed + POLICE.accel * dt);
      // Steer toward the player.
      const dx = state.player.pos.x - cop.x;
      const dz = state.player.pos.z - cop.z;
      const dist = Math.hypot(dx, dz) || 1;
      const targetHeading = Math.atan2(dx, dz);
      let dh = targetHeading - cop.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      cop.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
      cop.x += Math.sin(cop.heading) * cop.speed * dt;
      cop.z += Math.cos(cop.heading) * cop.speed * dt;
      cop.x = Math.max(-158, Math.min(158, cop.x));
      cop.z = Math.max(-158, Math.min(158, cop.z));
      cop.mesh.position.set(cop.x, 0, cop.z);
      cop.mesh.rotation.y = cop.heading;
      // Light bar flashes.
      if (cop.bar) cop.bar.material.color.setHex(Math.floor(performance.now() / 300) % 2 ? 0xff2d55 : 0x2d7dff);
      // Ram the player's car: slow it, raise the heat.
      if (state.currentCar && dist < 3.5) {
        state.currentCar.speed *= 0.985;
      }
    }
    // Roadblocks deploy at 2+ stars.
    if (state.world) state.world.setRoadblocks(wanted >= POLICE.roadblockStars ? 2 : 0);
    // Siren follows the chase.
    const shouldSiren = wantActive > 0;
    if (shouldSiren !== sirenOn) {
      sirenOn = shouldSiren;
      if (audio) audio.setSiren(sirenOn);
    }
    // If the player outruns every cop for a while, the heat cools by one star.
    respawnTimer += dt;
    if (respawnTimer > 25 && wanted > 0) {
      respawnTimer = 0;
      const nearest = Math.min(...copCars.filter((c) => c.active).map((c) => Math.hypot(c.x - state.player.pos.x, c.z - state.player.pos.z)), 999);
      if (nearest > 120) state.wanted = Math.max(0, wanted - 1);
    }
  }

  return { group, copCars, update, wantedTopSpeed };
}
