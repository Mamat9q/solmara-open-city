// Solmara city generation: street grid, sidewalks, procedural buildings with
// canvas window textures, palm trees, streetlights, beach + marina district,
// day sky, sun and fog. Also exports collision boxes and road data for AI.
import * as THREE from 'three';

export const CITY = { half: 260, block: 44, road: 14 };
const PALETTE = [0xd8c9a8, 0xc9b8a0, 0xe0d6c0, 0xb8a88e, 0xd0bfa5, 0xc4a882, 0x9fb8c8, 0xe8b48a];

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function buildingTexture(rand, base) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, 128, 10);
  for (let y = 18; y < 244; y += 22) for (let x = 10; x < 118; x += 22) {
    const lit = rand() < 0.22;
    g.fillStyle = lit ? '#ffe9a8' : (rand() < 0.5 ? '#2c3e55' : '#3d5a78');
    g.fillRect(x, y, 14, 14);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y, 14, 3);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function makePalm(rand) {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6b48 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 5.2, 6), trunkMat);
  trunk.position.y = 2.6; trunk.rotation.z = (rand() - 0.5) * 0.16; g.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f9e4f, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.7), leafMat);
    const a = (i / 7) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.9, 5.3, Math.sin(a) * 0.9);
    leaf.rotation.set(0.5, -a, 0); leaf.rotation.y = -a; leaf.rotateX(-0.7);
    g.add(leaf);
  }
  const nut = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshLambertMaterial({ color: 0x6b4a2a }));
  nut.position.y = 5.0; g.add(nut);
  return g;
}

export function createWorld(scene, seed) {
  const rand = mulberry(seed || 12345);
  const colliders = []; // {x,z,hx,hz}
  const roads = []; // {x1,z1,x2,z2} axis-aligned road centre lines
  const carSpawns = []; const pedSpawns = [];
  const { half, block, road } = CITY;
  // Sky, sun, fog, lights.
  scene.background = new THREE.Color(0x87bfe8);
  scene.fog = new THREE.Fog(0x9fc8e8, 180, 520);
  const sun = new THREE.DirectionalLight(0xfff2d0, 2.4); sun.position.set(120, 180, 60); scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 1.1));
  // Ground: grass base, then sand beach strip on the south edge, sea plane beyond.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 400, half * 2 + 400), new THREE.MeshLambertMaterial({ color: 0x7fae62 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 400, 60), new THREE.MeshLambertMaterial({ color: 0xe8d49a }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.02, half + 30); scene.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 600, 220), new THREE.MeshLambertMaterial({ color: 0x2a7fae }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.01, half + 170); scene.add(sea);
  // Marina pier + boats on the beach side.
  const pier = new THREE.Mesh(new THREE.BoxGeometry(60, 0.6, 8), new THREE.MeshLambertMaterial({ color: 0x9a7b52 }));
  pier.position.set(-120, 0.4, half + 62); scene.add(pier);
  for (let i = 0; i < 4; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(7, 1.2, 2.6), new THREE.MeshLambertMaterial({ color: [0xffffff, 0xd84a4a, 0x3a6fd8, 0xf0c040][i] }));
    hull.position.y = 0.6; boat.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 6), new THREE.MeshLambertMaterial({ color: 0x555555 }));
    mast.position.y = 2.6; boat.add(mast);
    boat.position.set(-140 + i * 16, 0.1, half + 95 + (i % 2) * 14); scene.add(boat);
  }
  // Roads: grid lines every block+road, plus the beachfront avenue.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xe8d44d });
  const roadLines = [];
  for (let k = -4; k <= 4; k++) roadLines.push(k * (block + road));
  for (const v of roadLines) {
    const h = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, road), roadMat);
    h.rotation.x = -Math.PI / 2; h.position.set(0, 0.03, v); scene.add(h);
    const vv = new THREE.Mesh(new THREE.PlaneGeometry(road, half * 2), roadMat);
    vv.rotation.x = -Math.PI / 2; vv.position.set(v, 0.03, 0); scene.add(vv);
    roads.push({ x1: -half, z1: v, x2: half, z2: v }, { x1: v, z1: -half, x2: v, z2: half });
    for (let d = -half + 12; d < half; d += 24) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.5), lineMat);
      dash.rotation.x = -Math.PI / 2; dash.position.set(d, 0.05, v); scene.add(dash);
      const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4), lineMat);
      dash2.rotation.x = -Math.PI / 2; dash2.position.set(v, 0.05, d); scene.add(dash2);
    }
  }
  // Sidewalks: light strips flanking each road (also the pedestrian walking band).
  const walkMat = new THREE.MeshLambertMaterial({ color: 0xb8b0a0 });
  for (const v of roadLines) {
    for (const off of [-road / 2 - 2.5, road / 2 + 2.5]) {
      const s1 = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, 5), walkMat);
      s1.rotation.x = -Math.PI / 2; s1.position.set(0, 0.04, v + off); scene.add(s1);
      const s2 = new THREE.Mesh(new THREE.PlaneGeometry(5, half * 2), walkMat);
      s2.rotation.x = -Math.PI / 2; s2.position.set(v + off, 0.04, 0); scene.add(s2);
    }
  }
  // Buildings: one or two per block cell, varied height/colour, with window texture.
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const texCache = [];
  for (let i = 0; i < 6; i++) texCache.push(buildingTexture(rand, '#' + PALETTE[i % PALETTE.length].toString(16).padStart(6, '0')));
  let bi = 0;
  for (let gx = -4; gx < 4; gx++) for (let gz = -4; gz < 4; gz++) {
    const cx = gx * (block + road) + (block + road) / 2;
    const cz = gz * (block + road) + (block + road) / 2;
    if (Math.abs(cz) > half - 40 && cz > 0) continue; // keep beachfront open
    const n = rand() < 0.6 ? 1 : 2;
    for (let j = 0; j < n; j++) {
      const w = 14 + rand() * 14, d = 14 + rand() * 14, h = 8 + rand() * rand() * 42;
      const bx = cx + (j === 0 ? -w / 4 : w / 4) + (rand() - 0.5) * 4;
      const bz = cz + (rand() - 0.5) * 6;
      const mat = new THREE.MeshLambertMaterial({ map: texCache[bi++ % texCache.length] });
      const b = new THREE.Mesh(boxGeo, mat);
      b.scale.set(w, h, d); b.position.set(bx, h / 2, bz); scene.add(b);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6), new THREE.MeshLambertMaterial({ color: 0x555a60 }));
      roof.position.set(bx, h + 0.25, bz); scene.add(roof);
      colliders.push({ x: bx, z: bz, hx: w / 2 + 0.3, hz: d / 2 + 0.3 });
    }
    // Palms + streetlights around the block corners.
    if (rand() < 0.75) { const p = makePalm(rand); p.position.set(cx - block / 2 + 3, 0, cz - block / 2 + 3); scene.add(p); }
    if (rand() < 0.5) { const p = makePalm(rand); p.position.set(cx + block / 2 - 3, 0, cz + block / 2 - 3); scene.add(p); }
  }
  // Streetlights along roads.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x333a40 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (let v of roadLines) for (let d = -half + 20; d < half; d += 58) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 6), poleMat);
    pole.position.set(d, 3.5, v + road / 2 + 4); scene.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), lampMat);
    lamp.position.set(d, 7, v + road / 2 + 4); scene.add(lamp);
  }
  // Beach palms row + spawn points.
  for (let x = -240; x <= 240; x += 26) { const p = makePalm(rand); p.position.set(x, 0, half + 18); scene.add(p); }
  for (let i = 0; i < 26; i++) carSpawns.push({ x: roadLines[i % roadLines.length] + (rand() - 0.5) * 4, z: roadLines[(i * 3) % roadLines.length], yaw: (i % 4) * Math.PI / 2 });
  for (let i = 0; i < 40; i++) pedSpawns.push({ x: roadLines[i % roadLines.length] + 10, z: roadLines[(i * 7) % roadLines.length] + 10 });
  return {
    colliders, roads, carSpawns, pedSpawns, sun,
    // Circle-vs-box collision: push a point out of every building box it enters.
    collide(x, z, r) {
      let nx = x, nz = z;
      for (const c of colliders) {
        const dx = nx - c.x, dz = nz - c.z;
        const px = c.hx + r - Math.abs(dx), pz = c.hz + r - Math.abs(dz);
        if (px > 0 && pz > 0) {
          if (px < pz) nx = c.x + Math.sign(dx || 1) * (c.hx + r);
          else nz = c.z + Math.sign(dz || 1) * (c.hz + r);
        }
      }
      return { x: Math.max(-half, Math.min(half + 40, nx)), z: Math.max(-half, Math.min(half + 120, nz)) };
    },
    isOnRoad(x, z) {
      for (const v of roadLines) if (Math.abs(z - v) < road / 2 + 1 || Math.abs(x - v) < road / 2 + 1) return true;
      return false;
    },
    roadLines,
  };
}
