// Traffic and pedestrians: 14 cars that cruise the road grid and turn at
// intersections, and 24 pedestrians strolling the sidewalks. Headlights glow at
// night. All meshes are boxes; nothing is loaded from disk.

import * as THREE from 'three';
import { CITY } from './config.js';
import { buildCarMesh } from './vehicles.js';
import { range, pick } from './random.js';

const TRAFFIC_COLORS = [0xb03030, 0x3f8f4f, 0xc0a02f, 0x7a7f8a, 0x4f6f9f, 0xd9d9d9, 0x8a4f9f];
const PED_COLORS = [0xd94f4f, 0x4fd97f, 0x4f7fd9, 0xd9c94f, 0x9f4fd9, 0x4fd9c9];

function roadLines() {
  // Same grid as the world: multiples of 40, -280..280.
  const out = [];
  for (let v = -280; v <= 280; v += CITY.roadGap) out.push(v);
  return out;
}

export function createTraffic(G) {
  const lines = roadLines();
  const cars = [];
  const peds = [];
  const group = new THREE.Group();
  G.scene.add(group);

  for (let i = 0; i < 14; i++) {
    const mesh = buildCarMesh(pick(G.rng, TRAFFIC_COLORS));
    mesh.scale.setScalar(0.92);
    group.add(mesh);
    const axis = G.rng() < 0.5 ? 'x' : 'z';
    const line = pick(G.rng, lines);
    const along = range(G.rng, -280, 280);
    cars.push({
      mesh,
      axis, line,
      pos: along,
      dir: G.rng() < 0.5 ? 1 : -1,
      speed: range(G.rng, 7, 12),
      offset: range(G.rng, -2.5, 2.5),
    });
  }

  for (let i = 0; i < 24; i++) {
    const pg = new THREE.Group();
    const col = pick(G.rng, PED_COLORS);
    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.85 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.32), mat);
    body.position.y = 1.05;
    pg.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36),
      new THREE.MeshStandardMaterial({ color: 0xc98a5f, roughness: 0.8 }));
    head.position.y = 1.66;
    pg.add(head);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.9 }));
    leg.position.y = 0.33;
    pg.add(leg);
    group.add(pg);
    const line = pick(G.rng, lines);
    peds.push({
      mesh: pg,
      axis: G.rng() < 0.5 ? 'x' : 'z',
      line: line + (G.rng() < 0.5 ? 8 : -8),
      pos: range(G.rng, -280, 280),
      dir: G.rng() < 0.5 ? 1 : -1,
      speed: range(G.rng, 1.2, 2.2),
      phase: G.rng() * 6,
    });
  }

  function stepCar(c, dt) {
    c.pos += c.dir * c.speed * dt;
    if (c.pos > 295 || c.pos < -295) c.dir *= -1;
    // At an intersection, sometimes turn onto the crossing road.
    const near = Math.abs(c.pos - Math.round(c.pos / CITY.roadGap) * CITY.roadGap) < c.speed * dt + 0.4;
    if (near && G.rng() < 0.02) {
      const newLine = Math.round(c.pos / CITY.roadGap) * CITY.roadGap;
      const oldLine = c.line;
      c.axis = c.axis === 'x' ? 'z' : 'x';
      c.line = newLine;
      c.pos = oldLine + c.offset;
      c.dir = G.rng() < 0.5 ? 1 : -1;
    }
    const x = c.axis === 'x' ? c.pos : c.line + c.offset;
    const z = c.axis === 'x' ? c.line + c.offset : c.pos;
    c.mesh.position.set(x, 0, z);
    const heading = c.axis === 'x' ? (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (c.dir > 0 ? 0 : Math.PI);
    c.mesh.rotation.y = heading;
    c.mesh.userData.headMat.emissiveIntensity = G.nightFactor > 0.4 ? 2.0 : 0.3;
  }

  function stepPed(p, dt) {
    p.pos += p.dir * p.speed * dt;
    if (p.pos > 295 || p.pos < -295) p.dir *= -1;
    if (G.rng() < 0.001) p.dir *= -1;
    const x = p.axis === 'x' ? p.pos : p.line;
    const z = p.axis === 'x' ? p.line : p.pos;
    p.mesh.position.set(x, 0, z);
    p.mesh.rotation.y = p.axis === 'x' ? (p.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (p.dir > 0 ? 0 : Math.PI);
    p.phase += dt * p.speed * 4;
    p.mesh.position.y = Math.abs(Math.sin(p.phase)) * 0.06;
  }

  return {
    cars, peds,
    update(dt) {
      for (const c of cars) stepCar(c, dt);
      for (const p of peds) stepPed(p, dt);
    },
    /** Nearest traffic car to (x,z) within radius, for carjacking. */
    nearestCar(x, z, radius) {
      let best = null;
      let bestD = radius;
      for (const c of cars) {
        const cx = c.mesh.position.x;
        const cz = c.mesh.position.z;
        const d = Math.hypot(cx - x, cz - z);
        if (d < bestD) { bestD = d; best = c; }
      }
      return best;
    },
    /** A traffic car is stolen: respawn it far away as a fresh car. */
    stealCar(c) {
      const line = pick(G.rng, lines);
      c.axis = G.rng() < 0.5 ? 'x' : 'z';
      c.line = line;
      c.pos = range(G.rng, -280, 280);
      c.dir = G.rng() < 0.5 ? 1 : -1;
    },
  };
}
