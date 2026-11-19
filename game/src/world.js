// The city of Solmara Bay: a 320x320 grid of streets, neon towers, wet roads
// and a hurricane sunset. Everything is generated from the seed — no assets,
// no network. three.js r187.

import * as THREE from 'three';
import { CITY, SHOPS } from './config.js';
import { makeRng } from './random.js';

function windowTexture(rng, litRatio) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#17141f';
  g.fillRect(0, 0, 128, 256);
  for (let y = 8; y < 248; y += 16) {
    for (let x = 8; x < 120; x += 14) {
      const lit = rng.next() < litRatio;
      g.fillStyle = lit ? (rng.next() < 0.5 ? '#ffd27a' : '#7ad4ff') : '#0c0a12';
      g.fillRect(x, y, 9, 10);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roadTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#23232c';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#3d3d48';
  g.fillRect(0, 0, 128, 6);
  g.fillRect(0, 122, 128, 6);
  g.fillStyle = '#d8c25a';
  g.fillRect(60, 8, 8, 44);
  g.fillRect(60, 76, 8, 44);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 20);
  return tex;
}

function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x2b1a4a) },
      mid: { value: new THREE.Color(0xb34a6e) },
      low: { value: new THREE.Color(0xff7e3d) },
      sunDir: { value: new THREE.Vector3(-0.55, 0.16, -0.8).normalize() },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 top; uniform vec3 mid; uniform vec3 low; uniform vec3 sunDir;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, -0.05, 1.0);
        vec3 col = h < 0.25 ? mix(low, mid, h / 0.25) : mix(mid, top, (h - 0.25) / 0.75);
        float sun = pow(max(dot(normalize(vDir), normalize(sunDir)), 0.0), 90.0);
        col += vec3(1.0, 0.75, 0.45) * sun * 1.4;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

export function createWorld(scene, seed, renderer) {
  const rng = makeRng(seed);
  const group = new THREE.Group();
  scene.add(group);

  // Sky dome + lights.
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 24, 16), skyMaterial());
  group.add(sky);
  // A blurred copy of the sunset as the environment map, so metal and wet
  // roads reflect the sky instead of going black (no env map = black metal).
  if (renderer) {
    try {
      const envScene = new THREE.Scene();
      envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 24, 16), skyMaterial()));
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envRT = pmrem.fromScene(envScene, 0.06);
      scene.environment = envRT.texture;
      pmrem.dispose();
    } catch {
      // No env map: the lights still carry the scene.
    }
  }
  const sun = new THREE.DirectionalLight(0xffb36b, 2.2);
  sun.position.set(-140, 90, -180);
  group.add(sun);
  group.add(new THREE.HemisphereLight(0x8a6bbf, 0x1a1210, 1.1));
  group.add(new THREE.AmbientLight(0x403050, 0.85));

  // Base ground (wet dark asphalt look far from the streets).
  const base = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshStandardMaterial({ color: 0x1c1c26, roughness: 0.3, metalness: 0.2 }),
  );
  base.rotation.x = -Math.PI / 2;
  base.position.y = -0.08;
  group.add(base);

  // Roads: one plane per street line, shared dash texture.
  const roadTex = roadTexture();
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.35, metalness: 0.15 });
  const streetLines = [];
  for (let k = -4; k <= 4; k++) streetLines.push(k * CITY.block);
  for (const x of streetLines) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadWidth, CITY.half * 2), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = Math.PI / 2;
    road.position.set(x, 0, 0);
    group.add(road);
  }
  for (const z of streetLines) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadWidth, CITY.half * 2), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, z);
    group.add(road);
  }

  // Sidewalks: raised slabs inside each block.
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.85, metalness: 0.05 });
  for (let bx = -4; bx < 4; bx++) {
    for (let bz = -4; bz < 4; bz++) {
      const cx = bx * CITY.block + CITY.block / 2;
      const cz = bz * CITY.block + CITY.block / 2;
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(cx, 0.06, cz);
      group.add(walk);
    }
  }

  // Buildings: one tower per block, seeded heights, lit-window facades.
  const wallTexs = [windowTexture(rng, 0.45), windowTexture(rng, 0.3), windowTexture(rng, 0.55)];
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x0e0c14, roughness: 0.9 });
  const neonColors = [0xff2d78, 0x2dd4ff, 0xffe14d, 0x7dff5e, 0xff6a00];
  const buildings = [];
  const shopClear = SHOPS.map((s) => ({ x: s.x, z: s.z, r: 16 }));
  const clearOfShops = (x, z) => shopClear.every((s) => Math.hypot(x - s.x, z - s.z) > s.r);
  for (let bx = -4; bx < 4; bx++) {
    for (let bz = -4; bz < 4; bz++) {
      const cx = bx * CITY.block + CITY.block / 2;
      const cz = bz * CITY.block + CITY.block / 2;
      if (!clearOfShops(cx, cz)) continue;
      const w = rng.range(14, 22);
      const d = rng.range(14, 22);
      const h = rng.range(12, 52);
      const wallMat = new THREE.MeshStandardMaterial({ map: wallTexs[rng.int(0, 2)], roughness: 0.7, metalness: 0.1 });
      const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat]);
      tower.position.set(cx + rng.range(-2, 2), h / 2, cz + rng.range(-2, 2));
      group.add(tower);
      buildings.push(tower);
      // Neon sign on some towers.
      if (rng.next() < 0.35) {
        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(rng.range(4, 8), 1.2),
          new THREE.MeshBasicMaterial({ color: neonColors[rng.int(0, neonColors.length - 1)] }),
        );
        sign.position.set(tower.position.x, h * rng.range(0.55, 0.9), tower.position.z + d / 2 + 0.15);
        group.add(sign);
      }
    }
  }

  // Shop storefronts: low kiosks with a glowing sign at the door point.
  const shops = [];
  for (const shop of SHOPS) {
    const kiosk = new THREE.Mesh(
      new THREE.BoxGeometry(10, 5, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a2438, roughness: 0.6, metalness: 0.3 }),
    );
    kiosk.position.set(shop.x - 8, 2.5, shop.z - 8);
    group.add(kiosk);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 1.6),
      new THREE.MeshBasicMaterial({ color: 0xffe14d }),
    );
    sign.position.set(shop.x - 8, 5.6, shop.z - 3.9);
    group.add(sign);
    const lamp = new THREE.PointLight(0xffd27a, 30, 30);
    lamp.position.set(shop.x, 4, shop.z);
    group.add(lamp);
    shops.push({ ...shop, mesh: kiosk });
  }

  // Street lamps: poles with warm glowing heads (emissive only, no lights).
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.6, metalness: 0.7 });
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  for (const x of streetLines) {
    for (const z of [-120, -40, 40, 120]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), poleMat);
      pole.position.set(x + 7, 3, z);
      group.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), headMat);
      head.position.set(x + 7, 6.2, z);
      group.add(head);
    }
  }

  // Palm trees along the central avenues.
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f7a3d, roughness: 0.8 });
  for (let i = 0; i < 18; i++) {
    const along = rng.range(-140, 140);
    const horizontal = rng.next() < 0.5;
    const x = horizontal ? along : rng.pick([-40, 40]);
    const z = horizontal ? rng.pick([-40, 40]) : along;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 5, 6), trunkMat);
    trunk.position.set(x + 8, 2.5, z + 8);
    group.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.4, 7), leafMat);
    crown.position.set(x + 8, 6, z + 8);
    group.add(crown);
  }

  // Roadblocks: striped barriers, hidden until the wanted level deploys them.
  const roadblocks = [];
  const blockSpots = [
    { x: 40, z: 0, rot: 0 },
    { x: -40, z: 40, rot: Math.PI / 2 },
    { x: 0, z: -80, rot: Math.PI / 2 },
    { x: 80, z: 40, rot: 0 },
  ];
  const stripeTex = (() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 16;
    const g = c.getContext('2d');
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#f5f5f5' : '#d43d2a';
      g.fillRect(i * 8, 0, 8, 16);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  for (const spot of blockSpots) {
    const barrier = new THREE.Mesh(
      new THREE.BoxGeometry(7, 1.1, 0.5),
      new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.5, emissive: 0x883322, emissiveIntensity: 0.4 }),
    );
    barrier.position.set(spot.x, 0.8, spot.z);
    barrier.rotation.y = spot.rot;
    barrier.visible = false;
    group.add(barrier);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), poleMat);
    legL.position.set(spot.x - 3, 0.4, spot.z);
    legL.visible = false;
    group.add(legL);
    const legR = legL.clone();
    legR.position.set(spot.x + 3, 0.4, spot.z);
    legR.visible = false;
    group.add(legR);
    roadblocks.push({ x: spot.x, z: spot.z, active: false, mesh: barrier, legs: [legL, legR] });
  }

  // Mission beacon: a vertical light pillar at the active target.
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  );
  beacon.position.y = 30;
  beacon.visible = false;
  group.add(beacon);
  const beaconRing = new THREE.Mesh(
    new THREE.RingGeometry(2.4, 3.2, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  );
  beaconRing.rotation.x = -Math.PI / 2;
  beaconRing.position.y = 0.12;
  beaconRing.visible = false;
  group.add(beaconRing);

  // Parked-car spawn spots: along street edges, deterministic.
  const carSpots = [];
  const spotStreets = [-120, -80, -40, 0, 40, 80, 120];
  for (const sx of spotStreets) {
    for (const sz of [-100, -20, 60, 140]) {
      if (Math.hypot(sx, sz) < 12) continue;
      carSpots.push({ x: sx + 4.4, z: sz, heading: 0 });
    }
  }

  // Pedestrians wandering the sidewalks.
  const pedestrians = [];
  const pedMat = new THREE.MeshStandardMaterial({ color: 0x8a5a3b, roughness: 0.8 });
  const pedMat2 = new THREE.MeshStandardMaterial({ color: 0x3b5a8a, roughness: 0.8 });
  for (let i = 0; i < 10; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.9, 4, 8), i % 2 ? pedMat : pedMat2);
    body.position.y = 1.05;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshStandardMaterial({ color: 0xd9a986 }));
    head.position.y = 1.95;
    g.add(head);
    const street = rng.pick(streetLines);
    const along = rng.range(-140, 140);
    const horizontal = rng.next() < 0.5;
    g.position.set(horizontal ? along : street + 8, 0, horizontal ? street + 8 : along);
    group.add(g);
    pedestrians.push({ group: g, dir: rng.next() < 0.5 ? 1 : -1, speed: rng.range(0.8, 1.6), horizontal, street, t: rng.range(0, 20) });
  }

  return {
    group,
    buildings,
    shops,
    roadblocks,
    carSpots,
    setBeacon(x, z, visible) {
      beacon.position.x = x;
      beacon.position.z = z;
      beacon.visible = visible;
      beaconRing.position.x = x;
      beaconRing.position.z = z;
      beaconRing.visible = visible;
    },
    setRoadblocks(count) {
      roadblocks.forEach((b, i) => {
        b.active = i < count;
        b.mesh.visible = b.active;
        b.legs.forEach((l) => { l.visible = b.active; });
      });
    },
    update(dt) {
      const t = performance.now() / 1000;
      beaconRing.rotation.z = t * 0.5;
      for (const p of pedestrians) {
        p.t += dt;
        const pos = p.group.position;
        if (p.horizontal) pos.x += p.dir * p.speed * dt;
        else pos.z += p.dir * p.speed * dt;
        const v = p.horizontal ? pos.x : pos.z;
        if (v > 150 || v < -150) p.dir *= -1;
        p.group.position.y = Math.abs(Math.sin(p.t * 6)) * 0.06;
      }
    },
  };
}
