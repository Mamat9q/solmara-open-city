// The city of Solmara: a 640-unit grid of roads across 7 named districts, a beach
// and a port, built from instanced boxes with a procedural window texture, a painted
// ground texture (roads, lane dashes, beach, water, port), palms and streetlights.
// Owns the day/night cycle, the rain, and the wet-street sheen. No network, no assets.

import * as THREE from 'three';
import { CITY, PALETTE, districtAt } from './config.js';
import { range } from './random.js';

const ROAD_LINES = [];
// Roads sit on multiples of 40 (…, -80, -40, 0, 40, 80, …): the same grid
// nearestRoadCoord snaps to, the missions target, and traffic drives on.
// (Starting at -300 would offset the grid by 20 and put the car in the blocks.)
for (let v = -280; v <= 280; v += CITY.roadGap) ROAD_LINES.push(v);

function footprintOnRoad(x, z, w, d) {
  // A building's whole footprint must clear the road strips, not just its centre:
  // a wide building centred off-road can still jut into the lane and trap a car.
  for (const v of ROAD_LINES) {
    if (Math.abs(x - v) < w / 2 + CITY.roadWidth / 2 + 2) return true;
    if (Math.abs(z - v) < d / 2 + CITY.roadWidth / 2 + 2) return true;
  }
  return false;
}

function nearestRoadCoord(v) {
  return Math.round(v / CITY.roadGap) * CITY.roadGap;
}

/** Paint the ground: asphalt, road grid with lane dashes, sidewalks, beach, sea, port. */
function paintGroundTexture() {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  const toPx = (v) => ((v + CITY.size / 2) / CITY.size) * S;
  g.fillStyle = '#43483c';
  g.fillRect(0, 0, S, S);
  // Blocks: slightly varied grass/concrete.
  g.fillStyle = '#3d4a3a';
  g.fillRect(toPx(-260), toPx(-260), toPx(40) - toPx(-260), toPx(0) - toPx(-260));
  // Beach sand (south) and sea.
  g.fillStyle = '#c9a86a';
  g.fillRect(0, toPx(CITY.beachZ), S, toPx(CITY.size / 2) - toPx(CITY.beachZ));
  g.fillStyle = '#1d6f8e';
  g.fillRect(0, toPx(CITY.beachZ + 24), S, S - toPx(CITY.beachZ + 24));
  g.fillStyle = '#2f8aa8';
  for (let i = 0; i < 40; i++) {
    g.fillRect(Math.random() * S, toPx(CITY.beachZ + 30) + Math.random() * 60, 30 + Math.random() * 60, 2);
  }
  // Port concrete (east).
  g.fillStyle = '#5a5a52';
  g.fillRect(toPx(220), toPx(-40), toPx(CITY.size / 2) - toPx(220), toPx(160) - toPx(-40));
  // Roads.
  for (const v of ROAD_LINES) {
    g.fillStyle = '#23262b';
    g.fillRect(0, toPx(v - CITY.roadWidth / 2), S, toPx(v + CITY.roadWidth / 2) - toPx(v - CITY.roadWidth / 2));
    g.fillRect(toPx(v - CITY.roadWidth / 2), 0, toPx(v + CITY.roadWidth / 2) - toPx(v - CITY.roadWidth / 2), S);
    // Lane dashes.
    g.fillStyle = '#d8c95a';
    for (let u = -CITY.bound; u < CITY.bound; u += 16) {
      g.fillRect(toPx(u), toPx(v) - 1, 7, 2);
      g.fillRect(toPx(v) - 1, toPx(u), 2, 7);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Window texture for building facades. */
function paintWindowTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#7d838d';
  g.fillRect(0, 0, 128, 256);
  for (let y = 8; y < 248; y += 18) {
    for (let x = 8; x < 120; x += 16) {
      g.fillStyle = Math.random() < 0.35 ? '#ffd98a' : '#2a3340';
      g.fillRect(x, y, 10, 12);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createWorld(G) {
  const { scene, rng } = G;
  const colliders = []; // {x, z, hw, hd} axis-aligned building boxes for car/ped collisions
  const group = new THREE.Group();
  scene.add(group);

  const groundTex = paintGroundTexture();
  const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.9, metalness: 0.05 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CITY.size + 160, CITY.size + 160), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 20);
  group.add(ground);

  // Wet-street sheen: a glossy transparent sheet that fades in with the rain.
  const sheenMat = new THREE.MeshStandardMaterial({ color: 0x1a2436, roughness: 0.08, metalness: 0.85, transparent: true, opacity: 0 });
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(CITY.size, CITY.size), sheenMat);
  sheen.rotation.x = -Math.PI / 2;
  sheen.position.y = 0.06;
  group.add(sheen);

  // Sea plane beyond the beach, animated gently.
  const seaMat = new THREE.MeshStandardMaterial({ color: 0x1d6f8e, roughness: 0.25, metalness: 0.4 });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 160), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.4, CITY.size / 2 + 60);
  group.add(sea);

  // Buildings: three instanced classes (low / mid / tower) with the window texture.
  const winTex = paintWindowTexture();
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);
  const placements = [];
  let guard = 0;
  while (placements.length < 190 && guard < 12000) {
    guard++;
    const x = range(rng, -CITY.bound, CITY.bound);
    const z = range(rng, -CITY.bound, CITY.beachZ - 16);
    if (Math.abs(x) < 24 && Math.abs(z) < 24) continue; // central plaza
    const distC = Math.hypot(x, z);
    const tall = distC < 110 ? rng() < 0.55 : rng() < 0.12;
    const w = range(rng, 12, 24);
    const d = range(rng, 12, 24);
    if (footprintOnRoad(x, z, w, d)) continue;
    const h = tall ? range(rng, 45, 95) : range(rng, 8, 30);
    let clash = false;
    for (const p of placements) {
      if (Math.abs(p.x - x) < (p.w + w) / 2 + 4 && Math.abs(p.z - z) < (p.d + d) / 2 + 4) { clash = true; break; }
    }
    if (clash) continue;
    placements.push({ x, z, w, d, h, tall });
    colliders.push({ x, z, hw: w / 2, hd: d / 2 });
  }
  const classes = [
    { list: placements.filter((p) => !p.tall), color: 0xa89a86 },
    { list: placements.filter((p) => p.tall), color: 0x8a9ab0 },
  ];
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  for (const cls of classes) {
    const mat = new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.85, metalness: 0.05 });
    const inst = new THREE.InstancedMesh(boxGeo, mat, Math.max(1, cls.list.length));
    cls.list.forEach((p, i) => {
      dummy.position.set(p.x, 0, p.z);
      dummy.scale.set(p.w, p.h, p.d);
      dummy.rotation.y = 0;
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      col.setHex(cls.color).multiplyScalar(0.75 + rng() * 0.5);
      inst.setColorAt(i, col);
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    group.add(inst);
  }

  // Port cranes + containers (east).
  const craneMat = new THREE.MeshStandardMaterial({ color: 0xd98a2f, roughness: 0.6, metalness: 0.4 });
  for (let i = 0; i < 3; i++) {
    const crane = new THREE.Group();
    const leg = new THREE.Mesh(new THREE.BoxGeometry(3, 42, 3), craneMat);
    leg.position.y = 21;
    crane.add(leg);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(46, 3, 3), craneMat);
    arm.position.set(14, 40, 0);
    crane.add(arm);
    crane.position.set(250 + i * 8, 0, -20 + i * 60);
    group.add(crane);
  }
  const contColors = [0xb03030, 0x2f6fb0, 0x3f8f4f, 0xc0a02f];
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(12, 3, 3),
      new THREE.MeshStandardMaterial({ color: contColors[i % 4], roughness: 0.7, metalness: 0.3 }));
    m.position.set(range(rng, 225, 285), 1.5 + (i % 3) * 3.1, range(rng, -30, 150));
    m.rotation.y = (i % 2) * 0.12;
    group.add(m);
  }

  // Palm trees along the beach.
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f7f3f, roughness: 0.8 });
  for (let i = 0; i < 26; i++) {
    const px = -280 + i * 22 + range(rng, -6, 6);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 9, 6), trunkMat);
    trunk.position.set(px, 4.5, CITY.beachZ - 6);
    trunk.rotation.z = range(rng, -0.12, 0.12);
    group.add(trunk);
    const top = new THREE.Mesh(new THREE.ConeGeometry(4.5, 5, 7), leafMat);
    top.position.set(px, 11, CITY.beachZ - 6);
    group.add(top);
  }

  // Streetlights along roads (emissive at night).
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x30343a, roughness: 0.5, metalness: 0.6 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffd76a, emissiveIntensity: 0 });
  const lamps = [];
  for (const v of ROAD_LINES) {
    for (let u = -280; u <= 280; u += 80) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 7, 6), poleMat);
      pole.position.set(u + 8, 3.5, v + 8);
      group.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), lampMat);
      lamp.position.set(u + 8, 7.2, v + 8);
      group.add(lamp);
      lamps.push(lamp);
    }
  }

  // Rain: a points cloud that follows the camera.
  const RAIN_N = 1400;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(RAIN_N * 3);
  for (let i = 0; i < RAIN_N; i++) {
    rainPos[i * 3] = range(rng, -60, 60);
    rainPos[i * 3 + 1] = range(rng, 0, 40);
    rainPos[i * 3 + 2] = range(rng, -60, 60);
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.PointsMaterial({ color: 0xaac4dd, size: 0.35, transparent: true, opacity: 0 });
  const rain = new THREE.Points(rainGeo, rainMat);
  rain.frustumCulled = false;
  group.add(rain);

  // Lights: sun + hemisphere. Sky and fog are driven by time of day.
  const sun = new THREE.DirectionalLight(0xfff2d9, 2.2);
  sun.position.set(120, 180, 60);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xbfd4e6, 0x3a3f35, 0.9);
  scene.add(hemi);
  scene.fog = new THREE.Fog(0x9db8c9, 120, 620);

  const skyDay = new THREE.Color(PALETTE.skyDay);
  const skySunset = new THREE.Color(PALETTE.skySunset);
  const skyNight = new THREE.Color(PALETTE.skyNight);

  function setTimeOfDay(hours) {
    const t = ((hours % 24) + 24) % 24;
    const dayF = Math.max(0, Math.min(1, (Math.sin(((t - 6) / 12) * Math.PI) + 0.25) / 1.25));
    const sunsetF = Math.max(0, 1 - Math.abs(t - 18.2) / 1.6);
    const sky = new THREE.Color().copy(skyNight).lerp(skyDay, dayF).lerp(skySunset, sunsetF * 0.75);
    scene.background = sky;
    scene.fog.color.copy(sky);
    const sunCol = new THREE.Color(PALETTE.sunNight).lerp(new THREE.Color(PALETTE.sunDay), dayF)
      .lerp(new THREE.Color(PALETTE.sunSunset), sunsetF * 0.8);
    sun.color.copy(sunCol);
    sun.intensity = 0.25 + dayF * 2.0;
    const ang = ((t - 6) / 12) * Math.PI;
    sun.position.set(Math.cos(ang) * 180, Math.max(18, Math.sin(ang) * 200 + 20), 80);
    hemi.intensity = 0.5 + dayF * 0.7;
    const night = 1 - dayF;
    lampMat.emissiveIntensity = night * 2.4;
    return { dayF, sunsetF, night };
  }

  function update(dt, focus) {
    // Rain falls around the focus point (player/camera).
    if (G.weather.rain > 0.01) {
      rainMat.opacity = Math.min(0.85, G.weather.rain * 0.9);
      const pos = rainGeo.attributes.position;
      for (let i = 0; i < RAIN_N; i++) {
        let y = pos.getY(i) - dt * 42;
        if (y < 0) y = 40;
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + dt * 6 * G.weather.rain);
      }
      pos.needsUpdate = true;
      rain.position.set(focus.x, 0, focus.z);
    } else {
      rainMat.opacity = 0;
    }
    sheenMat.opacity = G.weather.rain * 0.28;
    groundMat.roughness = 0.9 - G.weather.rain * 0.55;
    sea.position.y = -0.4 + Math.sin(performance.now() * 0.0004) * 0.15;
  }

  /** Push a circle (x,z,r) out of building boxes; returns true on hit. */
  function collideCircle(x, z, r) {
    for (const b of colliders) {
      const cx = Math.max(b.x - b.hw, Math.min(x, b.x + b.hw));
      const cz = Math.max(b.z - b.hd, Math.min(z, b.z + b.hd));
      const dx = x - cx;
      const dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        const d = Math.sqrt(d2) || 0.001;
        const push = r - d;
        return { x: x + (dx / d) * push, z: z + (dz / d) * push, hit: true };
      }
    }
    return { x, z, hit: false };
  }

  return {
    group, colliders, setTimeOfDay, update, collideCircle,
    nearestRoadCoord, districtAt,
    randomRoadPoint() {
      const rx = ROAD_LINES[Math.floor(rng() * ROAD_LINES.length)];
      const rz = ROAD_LINES[Math.floor(rng() * ROAD_LINES.length)];
      return { x: rx, z: rz };
    },
  };
}
