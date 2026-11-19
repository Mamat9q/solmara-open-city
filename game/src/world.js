// The city of Solmara: a neon sunset grid on the edge of the ocean, built from a
// painted ground texture, lit-window towers, palms, lamps and storm clouds.
import * as THREE from '../vendor/three.module.min.js';
import { WORLD } from './config.js';
import { makeRng } from './random.js';

function groundTexture() {
  const S = 1024;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const g = cv.getContext('2d');
  const px = S / WORLD.size; // pixels per world unit
  const toPx = (v) => (v + WORLD.size / 2) * px;
  g.fillStyle = '#232833';
  g.fillRect(0, 0, S, S);
  // City blocks.
  g.fillStyle = '#333948';
  const step = WORLD.block;
  for (let x = -WORLD.size / 2; x < WORLD.size / 2; x += step) {
    for (let z = -WORLD.size / 2; z < WORLD.size / 2; z += step) {
      g.fillRect(toPx(x + 7), toPx(z + 7), (step - 14) * px, (step - 14) * px);
    }
  }
  // Roads.
  g.fillStyle = '#22252e';
  for (let k = 0; k <= WORLD.size / step; k++) {
    const c = -WORLD.size / 2 + k * step;
    g.fillRect(0, toPx(c - 6), S, 12 * px);
    g.fillRect(toPx(c - 6), 0, 12 * px, S);
  }
  // Lane dashes.
  g.fillStyle = '#c8a84a';
  for (let k = 0; k <= WORLD.size / step; k++) {
    const c = -WORLD.size / 2 + k * step;
    for (let d = -WORLD.size / 2; d < WORLD.size / 2; d += 12) {
      g.fillRect(toPx(d), toPx(c) - 1, 6 * px, 2);
      g.fillRect(toPx(c) - 1, toPx(d), 2, 6 * px);
    }
  }
  // Crosswalks at every intersection.
  g.fillStyle = '#d8d8d8';
  for (let i = 0; i <= WORLD.size / step; i++) {
    for (let j = 0; j <= WORLD.size / step; j++) {
      const cx = -WORLD.size / 2 + i * step;
      const cz = -WORLD.size / 2 + j * step;
      for (let s = -5; s <= 5; s += 2) {
        g.fillRect(toPx(cx + s) - 1, toPx(cz - 8), 2, 3 * px);
        g.fillRect(toPx(cx + s) - 1, toPx(cz + 5), 2, 3 * px);
        g.fillRect(toPx(cx - 8), toPx(cz + s) - 1, 3 * px, 2);
        g.fillRect(toPx(cx + 5), toPx(cz + s) - 1, 3 * px, 2);
      }
    }
  }
  // Beach strip on the west edge.
  g.fillStyle = '#8a6f4d';
  g.fillRect(0, 0, 10 * px, S);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function windowTexture() {
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = '#181b28';
  g.fillRect(0, 0, 128, 256);
  const rng = makeRng(77);
  for (let y = 8; y < 248; y += 16) {
    for (let x = 8; x < 120; x += 16) {
      const lit = rng.next();
      g.fillStyle = lit < 0.42 ? '#ffd27a' : lit < 0.55 ? '#9fd8ff' : '#1c2233';
      g.fillRect(x, y, 10, 12);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function skyDome(scene) {
  const geo = new THREE.SphereGeometry(900, 24, 12);
  const top = new THREE.Color(0x2a1445);
  const mid = new THREE.Color(0x8a2f5e);
  const low = new THREE.Color(0xff7a3c);
  const colors = [];
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 900;
    const c = y > 0.25 ? top.clone().lerp(mid, 1 - (y - 0.25) / 0.75) : mid.clone().lerp(low, 1 - (y + 0.1) / 0.35);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false });
  const dome = new THREE.Mesh(geo, mat);
  scene.add(dome);
}

function neonSign(text, color, w = 22) {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#0a0a12';
  g.fillRect(0, 0, 256, 64);
  g.font = 'bold 40px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 18;
  g.fillStyle = color;
  g.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), mat);
  return mesh;
}

export function buildWorld(scene, seed = 20261118) {
  const rng = makeRng(seed);
  const group = new THREE.Group();
  scene.add(group);

  scene.fog = new THREE.Fog(0x33182e, 70, 420);
  const hemi = new THREE.HemisphereLight(0xff9a66, 0x2a2040, 1.3);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xff8a4a, 2.0);
  sun.position.set(-180, 90, 120);
  scene.add(sun);
  skyDome(scene);

  // Ground with painted streets.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.size, WORLD.size),
    new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.45, metalness: 0.3 }),
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // Ocean to the west, past the beach.
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(260, WORLD.size + 260),
    new THREE.MeshStandardMaterial({ color: 0x0e2a44, roughness: 0.12, metalness: 0.7 }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(-WORLD.size / 2 - 130, -0.4, 0);
  group.add(ocean);

  // Buildings with lit windows.
  const winTex = windowTexture();
  const palette = [0x3a4358, 0x4a3f55, 0x2f3d4a, 0x55443a, 0x39424f, 0x463752];
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);
  const buildings = [];
  const step = WORLD.block;
  for (let bx = -WORLD.size / 2 + step / 2; bx < WORLD.size / 2; bx += step) {
    for (let bz = -WORLD.size / 2 + step / 2; bz < WORLD.size / 2; bz += step) {
      if (rng.chance(0.16)) continue; // empty lot / plaza
      const w = rng.range(16, 26);
      const d = rng.range(16, 26);
      const h = rng.range(9, 58) * (rng.chance(0.12) ? 1.8 : 1);
      const mat = new THREE.MeshStandardMaterial({
        color: rng.pick(palette),
        map: winTex,
        emissiveMap: winTex,
        emissive: 0xffc98a,
        emissiveIntensity: 0.68,
        roughness: 0.85,
      });
      const b = new THREE.Mesh(boxGeo, mat);
      b.scale.set(w, h, d);
      b.position.set(bx + rng.range(-4, 4), 0, bz + rng.range(-4, 4));
      b.rotation.y = rng.chance(0.5) ? 0 : Math.PI / 2;
      group.add(b);
      buildings.push(b);
    }
  }

  // Street lamps.
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x22242c, roughness: 0.6, metalness: 0.7 });
  const lampGeo = new THREE.SphereGeometry(0.55, 8, 6);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  for (let k = 0; k <= WORLD.size / step; k++) {
    const c = -WORLD.size / 2 + k * step;
    for (const d of [-168, -84, 0, 84, 168]) {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(c + 7, 3.5, d);
      group.add(pole);
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(c + 7, 7.1, d);
      group.add(lamp);
    }
  }

  // Palms along the beach and plazas.
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 9, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 });
  const topGeo = new THREE.IcosahedronGeometry(2.6, 0);
  const topMat = new THREE.MeshStandardMaterial({ color: 0x1e6b3a, roughness: 0.9, flatShading: true });
  for (let i = 0; i < 42; i++) {
    const x = rng.chance(0.6) ? rng.range(-208, -196) : rng.range(-180, 180);
    const z = rng.range(-200, 200);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 4.5, z);
    trunk.rotation.z = rng.range(-0.12, 0.12);
    group.add(trunk);
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.set(x, 9.6, z);
    top.scale.y = 0.55;
    group.add(top);
  }

  // Neon signs on a few towers.
  const signs = [
    ['SOLMARA', '#ff4fd8', -42, 26, 84],
    ['HOTEL', '#37e0ff', 42, 34, -42],
    ['ARMS', '#ff5340', -58, 12, -46],
    ['24H', '#7dff5e', 126, 18, 42],
    ['PIER', '#ffb347', -168, 14, 126],
  ];
  for (const [text, color, x, h, z] of signs) {
    const s = neonSign(text, color);
    s.position.set(x, h, z);
    s.rotation.y = rng.chance(0.5) ? 0 : Math.PI / 2;
    group.add(s);
  }

  // Hurricane clouds: dark rings turning slowly overhead.
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0x241a2e, roughness: 1, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(rng.range(28, 55), 10, 8), cloudMat);
    c.position.set(rng.range(-320, 320), rng.range(120, 190), rng.range(-320, 320));
    c.scale.y = 0.32;
    clouds.add(c);
  }
  scene.add(clouds);

  // Roadblocks: striped barricades, hidden until the police deploy them.
  const roadblocks = [];
  const stripeTex = (() => {
    const cv = document.createElement('canvas');
    cv.width = 64;
    cv.height = 16;
    const g = cv.getContext('2d');
    for (let i = 0; i < 4; i++) {
      g.fillStyle = i % 2 === 0 ? '#ffcf3d' : '#1a1a1a';
      g.fillRect(i * 16, 0, 16, 16);
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const blockSpots = [
    [0, -42], [42, 0], [-42, 42], [84, -84], [-84, 84], [0, 126],
  ];
  for (const [x, z] of blockSpots) {
    const g = new THREE.Group();
    for (let i = -1; i <= 1; i++) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(4.4, 1.1, 0.5),
        new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.7 }),
      );
      bar.position.set(i * 4.8, 0.9, 0);
      g.add(bar);
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.9, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x333333 }),
      );
      leg.position.set(i * 4.8, 0.45, 0);
      g.add(leg);
    }
    g.position.set(x, 0, z);
    g.visible = false;
    group.add(g);
    roadblocks.push({ group: g, x, z, active: false });
  }

  return {
    group,
    clouds,
    roadblocks,
    buildings,
    bounds: WORLD.size / 2 - 6,
    blockSpots,
  };
}
