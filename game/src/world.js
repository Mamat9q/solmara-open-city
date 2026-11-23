// Solmara itself: a 600x600 city on a road grid, seven named districts, a
// beachfront to the south, a container port to the east, towers downtown.
// Everything is generated from one seeded RNG, so the city is identical on
// every load. Buildings are one InstancedMesh; collisions are AABBs.
import * as THREE from 'three';
import { CFG, DISTRICTS } from './config.js';
import { makeRng, clamp } from './random.js';

const ROADS = [];
for (let v = -240; v <= 240; v += 60) ROADS.push(v);

export function isRoad(x, z) {
  const mx = Math.abs(((x + 30) % 60 + 60) % 60 - 30);
  const mz = Math.abs(((z + 30) % 60 + 60) % 60 - 30);
  return mx > 30 - CFG.roadWidth / 2 || mz > 30 - CFG.roadWidth / 2;
}

export function nearestRoadPoint(x, z) {
  const snap = (v) => Math.round(v / 60) * 60;
  const sx = snap(x);
  const sz = snap(z);
  return Math.abs(x - sx) < Math.abs(z - sz) ? { x: sx, z } : { x, z: sz };
}

export function createWorld(scene, seed = 1) {
  const rng = makeRng(seed);
  const group = new THREE.Group();
  scene.add(group);

  const colliders = []; // {x, z, hx, hz}
  const buildings = [];
  const lights = [];

  // Ground: asphalt-grey base; the beach is a sand strip at the south edge.
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.9, metalness: 0.05 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = false;
  group.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 60),
    new THREE.MeshStandardMaterial({ color: 0xe8c98a, roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, 300);
  group.add(sand);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 90),
    new THREE.MeshStandardMaterial({ color: 0x1a5f8a, roughness: 0.25, metalness: 0.4 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.01, 375);
  group.add(sea);

  // Roads: dark strips along every grid line, plus pale centre dashes.
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.95 });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8c86a });
  for (const v of ROADS) {
    const h = new THREE.Mesh(new THREE.PlaneGeometry(600, CFG.roadWidth), roadMat);
    h.rotation.x = -Math.PI / 2;
    h.position.set(0, 0.05, v);
    group.add(h);
    const vt = new THREE.Mesh(new THREE.PlaneGeometry(CFG.roadWidth, 600), roadMat);
    vt.rotation.x = -Math.PI / 2;
    vt.position.set(v, 0.05, 0);
    group.add(vt);
    for (let d = -270; d <= 270; d += 30) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.6), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(d, 0.06, v);
      group.add(dash);
      const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 6), dashMat);
      dash2.rotation.x = -Math.PI / 2;
      dash2.position.set(v, 0.06, d);
      group.add(dash2);
    }
  }

  // Buildings: one InstancedMesh, per-instance colour; downtown towers tall.
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const boxMat = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.15 });
  const placements = [];
  for (let gx = -240; gx <= 240; gx += 60) {
    for (let gz = -240; gz <= 240; gz += 60) {
      const cx = gx + 30;
      const cz = gz + 30;
      if (Math.abs(cx) > 285 || Math.abs(cz) > 285) continue;
      if (cz > 270) continue; // beach
      const district = DISTRICTS.reduce((best, d) => {
        const dd = (cx - d.x) ** 2 + (cz - d.z) ** 2;
        return dd < best.dd ? { d, dd } : best;
      }, { d: DISTRICTS[0], dd: Infinity }).d;
      const tall = district.tall;
      const count = tall ? rng.int(2, 3) : rng.int(1, 2);
      for (let i = 0; i < count; i++) {
        const w = rng.range(14, 24);
        const d = rng.range(14, 24);
        const h = tall ? rng.range(35, 95) : rng.range(8, 26);
        const ox = cx + rng.range(-8, 8) + (i === 1 ? 14 : 0) - (count === 2 ? 7 : 0);
        const oz = cz + rng.range(-8, 8);
        placements.push({ x: ox, z: oz, w, d, h, color: district.color });
        colliders.push({ x: ox, z: oz, hx: w / 2 + 0.5, hz: d / 2 + 0.5 });
      }
    }
  }
  const inst = new THREE.InstancedMesh(boxGeo, boxMat, placements.length);
  const m4 = new THREE.Matrix4();
  const col = new THREE.Color();
  placements.forEach((p, i) => {
    m4.makeScale(p.w, p.h, p.d);
    m4.setPosition(p.x, p.h / 2, p.z);
    inst.setMatrixAt(i, m4);
    col.setHex(p.color);
    col.offsetHSL(0, 0, rng.range(-0.06, 0.06));
    inst.setColorAt(i, col);
    buildings.push(p);
  });
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  group.add(inst);

  // Rooftop beacons on the tallest towers.
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
  for (const p of placements) {
    if (p.h > 70) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), beaconMat);
      b.position.set(p.x, p.h + 1, p.z);
      group.add(b);
    }
  }

  // Port containers (east edge) and palm trees along the beach.
  const contColors = [0xc0392b, 0x2471a3, 0x229954, 0xd4ac0d, 0x7d3c98];
  for (let i = 0; i < 26; i++) {
    const c = new THREE.Mesh(
      new THREE.BoxGeometry(12, 3, 3),
      new THREE.MeshStandardMaterial({ color: contColors[i % contColors.length], roughness: 0.8 }),
    );
    c.position.set(252 + rng.range(-8, 8), 1.5 + (i % 3) * 3.1, -180 + i * 14);
    c.rotation.y = rng.range(-0.1, 0.1);
    group.add(c);
    colliders.push({ x: c.position.x, z: c.position.z, hx: 6.5, hz: 2 });
  }
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 1 });
  for (let i = 0; i < 18; i++) {
    const x = -270 + i * 32;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 7, 6), trunkMat);
    trunk.position.set(x, 3.5, 272);
    group.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(3.2, 4, 7), leafMat);
    leaves.position.set(x, 8.5, 272);
    group.add(leaves);
  }

  // Streetlights: poles with emissive heads; a few real point lights at night.
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.6 });
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 6, 6);
  const headGeo = new THREE.SphereGeometry(0.45, 8, 8);
  for (const v of ROADS) {
    for (let d = -240; d <= 240; d += 120) {
      // At the corner of each intersection, just off the road — never on a
      // driving line, so a chase camera never stares straight at a pole.
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(d + 8, 3, v + 8);
      group.add(pole);
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(d + 8, 6.1, v + 8);
      group.add(head);
      lights.push(head);
    }
  }

  // Sun, sky light and fog; time of day drives them in update().
  const sun = new THREE.DirectionalLight(0xffd9a0, 2.2);
  sun.position.set(180, 220, 120);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0x8fb8ff, 0x3a2f28, 0.9);
  scene.add(hemi);
  scene.fog = new THREE.Fog(0x1a2436, 120, 620);

  // Rain: one Points cloud, recycled vertically.
  const rainCount = 2400;
  const rainPos = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPos[i * 3] = rng.range(-300, 300);
    rainPos[i * 3 + 1] = rng.range(0, 60);
    rainPos[i * 3 + 2] = rng.range(-300, 300);
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.PointsMaterial({ color: 0x9fb8d8, size: 0.55, transparent: true, opacity: 0 });
  const rain = new THREE.Points(rainGeo, rainMat);
  rain.frustumCulled = false;
  group.add(rain);

  const world = {
    group,
    colliders,
    buildings,
    sun,
    hemi,
    rain,
    rainCount,
    timeOfDay: 0.52, // 0..1, 0.5 = noon; start late afternoon
    wet: 0,
    rainAmount: 0,
    storm: 0,

    districtAt(x, z) {
      let best = DISTRICTS[0];
      let bd = Infinity;
      for (const d of DISTRICTS) {
        const dd = (x - d.x) ** 2 + (z - d.z) ** 2;
        if (dd < bd) {
          bd = dd;
          best = d;
        }
      }
      return best.name;
    },

    // Push a circle (x,z,r) out of every building AABB it overlaps.
    collide(x, z, r) {
      for (const c of colliders) {
        const nx = clamp(x, c.x - c.hx, c.x + c.hx);
        const nz = clamp(z, c.z - c.hz, c.z + c.hz);
        const dx = x - nx;
        const dz = z - nz;
        const d2 = dx * dx + dz * dz;
        if (d2 < r * r) {
          if (d2 > 0.0001) {
            const d = Math.sqrt(d2);
            x = nx + (dx / d) * r;
            z = nz + (dz / d) * r;
          } else {
            x = c.x + c.hx + r;
          }
        }
      }
      x = clamp(x, -295, 295);
      z = clamp(z, -295, 295);
      return { x, z };
    },

    setRain(amount) {
      this.rainAmount = clamp(amount, 0, 1);
      rainMat.opacity = this.rainAmount * 0.7;
      this.wet = Math.max(this.wet, this.rainAmount);
      groundMat.roughness = 0.9 - this.wet * 0.55;
      groundMat.metalness = 0.05 + this.wet * 0.25;
    },

    update(dt, playerPos) {
      // Sky: interpolate night -> day, then pull toward a warm sunset orange
      // as the sun gets low, so dusk reads as dusk instead of flat pink.
      const t = this.timeOfDay;
      const day = Math.sin(t * Math.PI); // 0 at midnight, 1 at noon
      const sunset = clamp(1 - Math.abs(t - 0.72) * 6, 0, 1); // dusk peaks at 0.72
      const night = [0.04, 0.06, 0.12];
      const dayC = [0.42, 0.6, 0.88];
      const setC = [0.95, 0.5, 0.26];
      const sky = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
        sky[i] = night[i] + (dayC[i] - night[i]) * day;
        sky[i] += (setC[i] - sky[i]) * sunset * 0.7;
      }
      scene.background = new THREE.Color(sky[0], sky[1], sky[2]);
      scene.fog.color.setRGB(sky[0] * 0.9, sky[1] * 0.9, sky[2] * 0.95);
      sun.intensity = 0.25 + 2.1 * day;
      const ang = t * Math.PI * 2;
      sun.position.set(Math.cos(ang) * 220, 60 + 200 * day, Math.sin(ang) * 220);
      hemi.intensity = 0.35 + 0.7 * day;
      // Rain falls around the player.
      if (this.rainAmount > 0.01) {
        const arr = rainGeo.attributes.position.array;
        for (let i = 0; i < this.rainCount; i++) {
          arr[i * 3 + 1] -= dt * 55;
          if (arr[i * 3 + 1] < 0) {
            arr[i * 3] = playerPos.x + rng.range(-60, 60);
            arr[i * 3 + 1] = rng.range(40, 60);
            arr[i * 3 + 2] = playerPos.z + rng.range(-60, 60);
          }
        }
        rainGeo.attributes.position.needsUpdate = true;
      }
    },
  };
  return world;
}
