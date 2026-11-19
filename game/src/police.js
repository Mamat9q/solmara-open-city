// Wanted level 0-5 stars + police: patrol cars chase and ram, foot cops pursue
// at 3+ stars, stars decay when the player evades, busted/wasted respawn.
// Pursuit is fast now — a cruiser at 4 stars tops ~52 u/s (~187 km/h on the
// HUD), and at 3+ stars the PD throws roadblocks across the road ahead.
import * as THREE from 'three';
import { buildCarMesh, CAR_DEFS } from './vehicles.js';
export function createPolice(scene, world) {
  const copCars = [];
  const cops = [];
  const policeDef = CAR_DEFS.find((d) => d.police);
  for (let i = 0; i < 4; i++) {
    const mesh = buildCarMesh(policeDef); mesh.visible = false; scene.add(mesh);
    copCars.push({ mesh, x: 0, z: 0, yaw: 0, speed: 0, active: false });
  }
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 1.0, 8), new THREE.MeshLambertMaterial({ color: 0x1a2a44 }));
    body.position.y = 1.0; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshLambertMaterial({ color: 0xd8a070 }));
    head.position.y = 1.72; g.add(head);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.09, 10), new THREE.MeshLambertMaterial({ color: 0x101828 }));
    hat.position.y = 1.9; g.add(hat);
    g.visible = false; scene.add(g);
    cops.push({ mesh: g, x: 0, z: 0, yaw: 0, active: false, speed: 6.0 });
  }
  let decayTimer = 0, sirenTimer = 0;
  return {
    copCars, cops,
    wantedFor(stars) { return stars; },
    update(dt, state, audio) {
      const wanted = state.wanted;
      const px = state.player.pos.x, pz = state.player.pos.z;
      const nCars = wanted >= 1 ? Math.min(4, wanted >= 4 ? 4 : wanted >= 2 ? 3 : wanted >= 3 ? 3 : 1) : 0;
      const nCops = wanted >= 3 ? Math.min(4, wanted - 1) : 0;
      // Spawn police near (but not on top of) the player.
      for (let i = 0; i < copCars.length; i++) {
        const c = copCars[i];
        if (i < nCars && !c.active) {
          c.active = true; c.mesh.visible = true;
          c.x = px + (i % 2 ? 34 : -34); c.z = pz - 26; c.speed = 0;
        } else if (i >= nCars && c.active) { c.active = false; c.mesh.visible = false; }
        if (c.active) {
          const dx = px - c.x, dz = pz - c.z, d = Math.hypot(dx, dz) || 1;
          const wantYaw = Math.atan2(dx, dz);
          let dy = wantYaw - c.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
          c.yaw += Math.max(-2.8 * dt, Math.min(2.8 * dt, dy));
          // Cruisers accelerate hard and top out near 52 u/s at 5 stars —
          // faster than any stock street car, so only a tuned car or a
          // clever route shakes them.
          c.speed = Math.min(36 + wanted * 3.2, c.speed + 26 * dt);
          c.x += Math.sin(c.yaw) * c.speed * dt; c.z += Math.cos(c.yaw) * c.speed * dt;
          const h = world.collide(c.x, c.z, 1.4); c.x = h.x; c.z = h.z;
          c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.yaw;
          // Ram: slow the player's car / hurt the player on contact.
          if (d < 3.4) {
            if (state.currentCar) state.currentCar.speed *= state.currentCar.plated ? 0.8 : 0.45;
            else if (state.player.health > 0) { state.player.damage(6 * dt * 10); if (audio) audio.hurt(); }
            if (audio && Math.random() < dt * 2) audio.crash();
          }
        }
      }
      for (let i = 0; i < cops.length; i++) {
        const c = cops[i];
        if (i < nCops && !c.active) { c.active = true; c.mesh.visible = true; c.x = px + (i % 2 ? 18 : -18); c.z = pz + 14; }
        else if (i >= nCops && c.active) { c.active = false; c.mesh.visible = false; }
        if (c.active) {
          const dx = px - c.x, dz = pz - c.z, d = Math.hypot(dx, dz) || 1;
          c.yaw = Math.atan2(dx, dz);
          c.x += (dx / d) * c.speed * dt; c.z += (dz / d) * c.speed * dt;
          const h = world.collide(c.x, c.z, 0.4); c.x = h.x; c.z = h.z;
          c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.yaw;
          if (d < 1.6 && state.player.health > 0) { state.player.damage(10 * dt); }
        }
      }
      // Roadblocks: at 3+ stars the PD parks striped barriers across the
      // road ahead of the player. Two barriers, placed 40 and 70 units ahead
      // on the player's heading, re-placed as the player moves.
      const blocks = world.roadblocks || [];
      const wantBlocks = wanted >= 3 ? 2 : 0;
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (i < wantBlocks && !b.active) {
          b.active = true; b.mesh.visible = true; b.hit = false;
          const ahead = 40 + i * 30;
          const yaw = state.currentCar ? state.currentCar.yaw : state.player.yaw;
          b.x = px + Math.sin(yaw) * ahead; b.z = pz + Math.cos(yaw) * ahead;
          b.yaw = yaw + Math.PI / 2;
          b.mesh.position.set(b.x, 0, b.z); b.mesh.rotation.y = b.yaw;
        } else if (i >= wantBlocks && b.active) { b.active = false; b.mesh.visible = false; }
        if (b.active) {
          const d = Math.hypot(px - b.x, pz - b.z);
          if (!b.hit && d < 3.5) {
            b.hit = true;
            if (state.currentCar) state.currentCar.speed *= state.currentCar.plated ? 0.6 : 0.25;
            if (state.effects) { state.effects.sparks(b.x, 1, b.z); state.effects.addShake(0.6); }
            if (audio) audio.crash();
            state.message('Roadblock! The PD boxed you in — find another street.');
            state.police.addWanted(state, 0, '');
          }
          // Re-place a spent barrier further ahead so the net stays up.
          if (b.hit && d > 60) {
            b.hit = false;
            const yaw = state.currentCar ? state.currentCar.yaw : state.player.yaw;
            b.x = px + Math.sin(yaw) * 55; b.z = pz + Math.cos(yaw) * 55;
            b.yaw = yaw + Math.PI / 2;
            b.mesh.position.set(b.x, 0, b.z); b.mesh.rotation.y = b.yaw;
          }
        }
      }
      sirenTimer -= dt;
      if (wanted > 0 && sirenTimer <= 0) { sirenTimer = 2.2; if (audio) audio.sirenBlip(); }
      // Stars decay when no police is close: evade to cool down.
      const nearest = Math.min(...copCars.filter((c) => c.active).map((c) => Math.hypot(c.x - px, c.z - pz)), 999);
      if (wanted > 0 && nearest > 55) {
        decayTimer += dt;
        if (decayTimer > 9) { state.wanted = Math.max(0, state.wanted - 1); decayTimer = 0; state.message('Wanted level dropped — stay out of sight.'); }
      } else decayTimer = 0;
    },
    addWanted(state, n, reason) {
      const before = state.wanted;
      state.wanted = Math.min(5, state.wanted + n);
      if (reason && state.wanted !== before) state.message(reason + ` — wanted ${state.wanted}★`);
      else if (reason && n === 0) state.message(reason);
    },
    // Busted (caught on foot at low health / police close) or wasted (health 0).
    handleDown(state) {
      const fine = Math.min(state.cash, 150 + state.wanted * 100);
      state.cash -= fine; state.wanted = 0;
      state.player.pos.set(0, 0, 20); state.player.health = 100;
      if (state.currentCar) { state.currentCar.occupied = false; state.currentCar = null; }
      return fine;
    },
  };
}
