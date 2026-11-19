// Weapons + enemies: pistol with raycast-style hit test, fists, reload,
// muzzle flash, enemy NPCs who shoot back, health packs scattered in the city.
// A bought Kevlar vest halves the damage enemies deal to Dario.
import * as THREE from 'three';
export function createCombat(scene, world) {
  const enemies = [];
  const packs = [];
  const packGeo = new THREE.BoxGeometry(0.7, 0.5, 0.7);
  const packMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const crossMat = new THREE.MeshBasicMaterial({ color: 0xd84a4a });
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const box = new THREE.Mesh(packGeo, packMat); box.position.y = 0.35; g.add(box);
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.1), crossMat); c1.position.y = 0.4; c1.position.z = 0.36; g.add(c1);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.1), crossMat); c2.position.y = 0.4; c2.position.z = 0.36; g.add(c2);
    const s = world.pedSpawns[(i * 5 + 3) % world.pedSpawns.length];
    g.position.set(s.x + 4, 0, s.z + 4); scene.add(g);
    packs.push({ mesh: g, x: g.position.x, z: g.position.z, taken: false });
  }
  return {
    enemies, packs,
    spawnEnemies(n, cx, cz, label) {
      for (let i = 0; i < n; i++) {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 1.0, 8), new THREE.MeshLambertMaterial({ color: 0x3a1a2a }));
        body.position.y = 1.05; g.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), new THREE.MeshLambertMaterial({ color: 0xd8a070 }));
        head.position.y = 1.75; g.add(head);
        const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.5), new THREE.MeshLambertMaterial({ color: 0x14161a }));
        gun.position.set(0.4, 1.2, 0.3); g.add(gun);
        g.position.set(cx + (Math.random() - 0.5) * 18, 0, cz + (Math.random() - 0.5) * 18);
        scene.add(g);
        enemies.push({ mesh: g, x: g.position.x, z: g.position.z, health: 60, label: label || 'Hollow Point gunman', shootTimer: 1 + Math.random(), alive: true });
      }
    },
    clearEnemies() { for (const e of enemies) { e.mesh.visible = false; e.alive = false; } enemies.length = 0; },
    // Shoot from the camera through the crosshair: nearest enemy within a cone.
    shoot(state, effects, audio) {
      const p = state.player;
      if (p.weapon === 'fists') {
        const ped = state.traffic.nearestPed(p.pos.x + Math.sin(p.yaw) * 2, p.pos.z + Math.cos(p.yaw) * 2, 2.2);
        if (ped) { ped.alive = false; ped.mesh.visible = false; state.police.addWanted(state, 1, 'Assault'); state.message('You knocked out a pedestrian.'); }
        if (audio) audio.click();
        return;
      }
      if (p.ammo <= 0) { if (audio) audio.click(); state.message('Out of ammo — press R to reload.'); return; }
      p.ammo--;
      const cam = state.camera;
      const dir = new THREE.Vector3(); cam.getWorldDirection(dir);
      const origin = cam.position.clone();
      let best = null, bd = 60;
      for (const e of enemies) {
        if (!e.alive) continue;
        const to = new THREE.Vector3(e.x - origin.x, 1.2 - origin.y, e.z - origin.z);
        const dist = to.length(); if (dist > 60) continue;
        const ang = to.normalize().angleTo(dir);
        if (ang < 0.09 && dist < bd) { bd = dist; best = e; }
      }
      const muzzle = origin.clone().add(dir.clone().multiplyScalar(1.2));
      if (effects) { effects.muzzle(muzzle.x, muzzle.y, muzzle.z); effects.addShake(0.25); }
      if (audio) audio.gunshot();
      if (best) {
        best.health -= 34;
        if (effects) effects.burst(best.x, 1.3, best.z, 10, 0xd84a4a, 4, 0.4);
        if (best.health <= 0) { best.alive = false; best.mesh.visible = false; state.message(`Down — ${best.label}.`); if (state.missions) state.missions.onEnemyDown(state); }
        else state.message(`Hit ${best.label} (${best.health} HP left).`);
      }
      if (p.ammo === 0) state.message('Magazine empty — press R.');
      // Firing in public draws attention.
      if (state.wanted < 2) state.wanted = 2;
    },
    reload(state, audio) {
      const p = state.player;
      if (p.weapon === 'fists' || p.ammo === 12 || p.reserve <= 0) return;
      const need = 12 - p.ammo, take = Math.min(need, p.reserve);
      p.ammo += take; p.reserve -= take;
      if (audio) audio.click(); state.message(`Reloaded — ${p.ammo}/12, reserve ${p.reserve}.`);
    },
    update(dt, state, audio) {
      const pp = state.player.pos;
      const armored = (state.shopOwned || []).includes('armor');
      for (const e of enemies) {
        if (!e.alive) continue;
        const dx = pp.x - e.x, dz = pp.z - e.z, d = Math.hypot(dx, dz) || 1;
        e.mesh.rotation.y = Math.atan2(dx, dz);
        if (d > 12) { e.x += (dx / d) * 3.2 * dt; e.z += (dz / d) * 3.2 * dt; }
        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && d < 38) {
          e.shootTimer = 1.4 + Math.random();
          if (Math.random() < 0.55) {
            state.player.damage((7 + Math.random() * 6) * (armored ? 0.5 : 1));
            if (audio) audio.enemyShot();
            if (state.effects) state.effects.addShake(0.3);
            state.message(`${e.label} hit you!`);
          } else if (audio) audio.enemyShot();
        }
        e.mesh.position.set(e.x, 0, e.z);
        e.x = Math.max(-260, Math.min(260, e.x)); e.z = Math.max(-260, Math.min(260, e.z));
      }
      for (const pack of packs) {
        if (pack.taken) continue;
        pack.mesh.rotation.y += dt;
        if (Math.hypot(pack.x - pp.x, pack.z - pp.z) < 1.8) {
          pack.taken = true; pack.mesh.visible = false;
          state.player.heal(40); state.player.reserve += 12;
          if (audio) audio.pickup(); state.message('Health pack +40 HP, +12 ammo.');
        }
      }
    },
  };
}
