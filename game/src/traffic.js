// Traffic cars + pedestrians: AI cars follow the road grid, turn at
// intersections, stop for nothing but walls; pedestrians stroll sidewalks and
// flee from the player, gunfire or a speeding car. In the late storm the
// pedestrians hurry for cover and the traffic slows on the slick roads.
import * as THREE from 'three';
import { buildCarMesh, CAR_DEFS } from './vehicles.js';
export function createTraffic(scene, world) {
  const cars = [];
  const defs = CAR_DEFS.filter((d) => !d.police && !d.taxi);
  const lines = world.roadLines;
  for (let i = 0; i < 10; i++) {
    const def = defs[i % defs.length];
    const mesh = buildCarMesh(def);
    const horizontal = i % 2 === 0;
    const line = lines[i % lines.length];
    const t = { def, mesh, horizontal, line, along: -200 + i * 40, speed: 7 + (i % 4) * 1.5, dir: i % 4 < 2 ? 1 : -1, x: 0, z: 0, yaw: 0 };
    scene.add(mesh); cars.push(t);
  }
  const peds = [];
  const shirtCols = [0xd84a4a, 0x2a9e4f, 0xe8a040, 0x9a5fd8, 0xffffff, 0x3a3f46];
  for (let i = 0; i < 18; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.9, 8), new THREE.MeshLambertMaterial({ color: shirtCols[i % shirtCols.length] }));
    body.position.y = 0.95; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshLambertMaterial({ color: [0xd8a070, 0x8a5a30, 0xf0c8a0][i % 3] }));
    head.position.y = 1.6; g.add(head);
    const s = world.pedSpawns[i % world.pedSpawns.length];
    g.position.set(s.x, 0, s.z); scene.add(g);
    peds.push({ mesh: g, x: s.x, z: s.z, yaw: Math.random() * Math.PI * 2, speed: 1.2 + Math.random(), flee: 0, panic: 0, alive: true });
  }
  return {
    cars, peds,
    update(dt, playerPos, playerSpeed, gunfireAt, storm) {
      const wet = storm || 0;
      for (const c of cars) {
        // Slick roads in the storm: traffic runs slower and a touch wider.
        const v = c.speed * (1 - wet * 0.25);
        c.along += v * c.dir * dt;
        if (c.along > 260) { c.along = -260; c.line = lines[Math.floor(Math.random() * lines.length)]; c.horizontal = Math.random() < 0.5; }
        if (c.along < -260) { c.along = 260; c.line = lines[Math.floor(Math.random() * lines.length)]; c.horizontal = Math.random() < 0.5; }
        // Random turn at an intersection: switch axis/line occasionally.
        if (Math.random() < dt * 0.04 && world.isOnRoad(c.x, c.z)) {
          c.horizontal = !c.horizontal; const nl = lines[Math.floor(Math.random() * lines.length)];
          c.line = nl; c.along = c.horizontal ? c.z : c.x;
        }
        c.x = c.horizontal ? c.along : c.line + 3.5 * c.dir;
        c.z = c.horizontal ? c.line + 3.5 * c.dir : c.along;
        c.yaw = c.horizontal ? (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (c.dir > 0 ? 0 : Math.PI);
        c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.yaw;
      }
      for (const p of peds) {
        if (!p.alive) continue;
        // Keep pedestrians inside the city bounds even when fleeing.
        p.x = Math.max(-255, Math.min(255, p.x)); p.z = Math.max(-255, Math.min(255, p.z));
        const dPlayer = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
        const dGun = gunfireAt ? Math.hypot(p.x - gunfireAt.x, p.z - gunfireAt.z) : 999;
        if (dPlayer < 8 && playerSpeed > 8) p.flee = 2.5;
        if (dGun < 14) p.flee = 3;
        if (p.flee > 0) {
          p.flee -= dt; p.panic = 1;
          const a = Math.atan2(p.x - playerPos.x, p.z - playerPos.z);
          p.x += Math.sin(a) * 4.5 * dt; p.z += Math.cos(a) * 4.5 * dt; p.yaw = a;
        } else {
          p.panic = 0; p.yaw += (Math.random() - 0.5) * dt * 1.4;
          // In heavy rain pedestrians hurry along a little faster.
          const hurry = 1 + wet * 0.8;
          p.x += Math.sin(p.yaw) * p.speed * hurry * dt; p.z += Math.cos(p.yaw) * p.speed * hurry * dt;
          const h = world.collide(p.x, p.z, 0.4);
          if (h.x !== p.x || h.z !== p.z) { p.x = h.x; p.z = h.z; p.yaw += Math.PI / 2; }
        }
        p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.yaw;
        p.mesh.position.y = p.flee > 0 ? Math.abs(Math.sin(performance.now() / 90)) * 0.12 : 0;
      }
    },
    // A pedestrian hit by a car: knock down, count as a crime for wanted level.
    hitPed(x, z, radius) {
      for (const p of peds) {
        if (!p.alive) continue;
        if (Math.hypot(p.x - x, p.z - z) < radius) {
          p.alive = false; p.mesh.visible = false; return p;
        }
      }
      return null;
    },
    nearestPed(x, z, maxD) {
      let best = null, bd = maxD;
      for (const p of peds) { if (!p.alive) continue; const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } }
      return best;
    },
  };
}
