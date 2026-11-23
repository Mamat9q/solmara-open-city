// The city of Solmara: a 640x640 m street grid with 7 districts, a beach and a
// harbour, built once from a seeded random. One canvas texture paints the ground
// (asphalt, lane dashes, sidewalks, sand, water, port concrete); buildings are a
// single InstancedMesh with a window texture, so the whole city is a handful of
// draw calls. No shadows — the sun is a directional light and the fog does the depth.
import * as THREE from 'three';
import { CITY_HALF, ROAD_STEP, ROAD_WIDTH, PALETTE, districtAt } from './config.js';
import { range } from './random.js';

const TEX = 1024;

function groundTexture(random) {
  const c = document.createElement('canvas');
  c.width = TEX; c.height = TEX;
  const g = c.getContext('2d');
  const toPx = (v) => ((v + CITY_HALF) / (CITY_HALF * 2)) * TEX;
  // Base: grass / ground.
  g.fillStyle = '#3d4c31'; g.fillRect(0, 0, TEX, TEX);
  // Beach sand (south) and water beyond it.
  g.fillStyle = '#d9c08a'; g.fillRect(0, toPx(240), TEX, toPx(CITY_HALF) - toPx(240));
  g.fillStyle = '#14506b'; g.fillRect(0, toPx(296), TEX, TEX - toPx(296));
  g.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 0; i < 40; i++) g.fillRect(random() * TEX, toPx(300) + random() * 20, 30 + random() * 60, 2);
  // Port concrete (west).
  g.fillStyle = '#6a6a66'; g.fillRect(0, toPx(-80), toPx(-240), toPx(240) - toPx(-80));
  // Blocks: sidewalk grey with asphalt roads between them.
  const road = (x0, z0, x1, z1) => { g.fillStyle = '#2b2f36'; g.fillRect(toPx(x0), toPx(z0), toPx(x1) - toPx(x0), toPx(z1) - toPx(z0)); };
  for (let v = -CITY_HALF + ROAD_STEP; v < CITY_HALF; v += ROAD_STEP) {
    road(v - ROAD_WIDTH / 2, -CITY_HALF, v + ROAD_WIDTH / 2, CITY_HALF);
    road(-CITY_HALF, v - ROAD_WIDTH / 2, CITY_HALF, v + ROAD_WIDTH / 2);
  }
  // Sidewalks around each block.
  g.fillStyle = '#555a63';
  for (let x = -CITY_HALF + ROAD_STEP; x < CITY_HALF; x += ROAD_STEP) {
    for (let z = -CITY_HALF + ROAD_STEP; z < CITY_HALF; z += ROAD_STEP) {
      g.fillRect(toPx(x - ROAD_WIDTH / 2 - 3), toPx(z - ROAD_WIDTH / 2 - 3), toPx(x + ROAD_WIDTH / 2 + 3) - toPx(x - ROAD_WIDTH / 2 - 3), 3);
    }
  }
  // Lane dashes.
  g.fillStyle = '#c8a83c';
  for (let v = -CITY_HALF + ROAD_STEP; v < CITY_HALF; v += ROAD_STEP) {
    for (let t = -CITY_HALF + 10; t < CITY_HALF; t += 24) {
      g.fillRect(toPx(v) - 1, toPx(t), 2, 10);
      g.fillRect(toPx(t), toPx(v) - 1, 10, 2);
    }
  }
  // Crosswalks at the centre junctions.
  g.fillStyle = 'rgba(255,255,255,0.55)';
  for (const j of [-160, -80, 0, 80, 160]) {
    for (let k = -2; k <= 2; k++) {
      g.fillRect(toPx(j + k * 4) - 1.5, toPx(-ROAD_WIDTH / 2), 3, ROAD_WIDTH);
      g.fillRect(toPx(-ROAD_WIDTH / 2), toPx(j + k * 4) - 1.5, ROAD_WIDTH, 3);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function windowTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#8a93a6'; g.fillRect(0, 0, 128, 256);
  for (let y = 8; y < 248; y += 16) {
    for (let x = 8; x < 120; x += 16) {
      const lit = Math.random() < 0.45;
      g.fillStyle = lit ? '#ffd98a' : '#1c2436';
      g.fillRect(x, y, 10, 10);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A point on the road grid: the nearest road coordinate, snapped to a lane. */
export function snapToRoad(x, z) {
  const snap = (v) => Math.round(v / ROAD_STEP) * ROAD_STEP;
  const dx = Math.abs(x - snap(x));
  const dz = Math.abs(z - snap(z));
  return dx < dz ? { x: snap(x), z } : { x, z: snap(z) };
}

export function createWorld(scene, random) {
  const group = new THREE.Group();
  scene.add(group);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_HALF * 2, CITY_HALF * 2),
    new THREE.MeshStandardMaterial({ map: groundTexture(random), roughness: 0.9, metalness: 0.05 }),
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // Wet-street sheen: a transparent plane just above the roads, dialled up by rain.
  const wet = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_HALF * 2, CITY_HALF * 2),
    new THREE.MeshStandardMaterial({ color: 0x8fb4d8, roughness: 0.08, metalness: 0.85, transparent: true, opacity: 0 }),
  );
  wet.rotation.x = -Math.PI / 2;
  wet.position.y = 0.06;
  group.add(wet);

  // Buildings: one instanced box, window texture, per-instance colour.
  const winTex = windowTexture();
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.85, metalness: 0.1, emissive: 0x223044, emissiveIntensity: 0.35 });
  // Buildings sit at block CENTRES (offset half a block from the road grid),
  // so the avenues stay clear to drive: roads run on the multiples of 80,
  // buildings on the midpoints between them. (An earlier layout centred them
  // on the road lines and every avenue ran straight through a tower.)
  const spots = [];
  for (let bx = -CITY_HALF + ROAD_STEP / 2; bx < CITY_HALF; bx += ROAD_STEP) {
    for (let bz = -CITY_HALF + ROAD_STEP / 2; bz < CITY_HALF; bz += ROAD_STEP) {
      if (bz >= 240) continue; // beach: no buildings
      if (bx <= -240) continue; // port: containers instead
      const d = districtAt(bx, bz);
      const tall = d === 'Downtown';
      const h = tall ? range(random, 28, 85) : range(random, 8, 26);
      const w = range(random, 34, 52);
      const dep = range(random, 34, 52);
      spots.push({ x: bx, z: bz, w, h, d: dep, tall });
    }
  }
  const buildings = new THREE.InstancedMesh(geo, mat, spots.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const col = new THREE.Color();
  spots.forEach((b, i) => {
    m4.compose(new THREE.Vector3(b.x, 0, b.z), q, new THREE.Vector3(b.w, b.h, b.d));
    buildings.setMatrixAt(i, m4);
    const base = b.tall ? new THREE.Color(0x5a6b8c) : new THREE.Color().setHSL(0.08 + random() * 0.06, 0.25, 0.45 + random() * 0.2);
    col.copy(base);
    buildings.setColorAt(i, col);
  });
  buildings.instanceMatrix.needsUpdate = true;
  if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
  group.add(buildings);

  // Port containers: a few coloured boxes.
  const contMat = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0.2 });
  const contCols = [0xc23b2e, 0x2e7fc2, 0x3fae5a, 0xd9a03c];
  for (let i = 0; i < 18; i++) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(12, 3, 3), contMat.clone());
    box.material.color.setHex(contCols[i % contCols.length]);
    box.position.set(-300 + random() * 50, 1.5, -60 + i * 13 + random() * 4);
    box.rotation.y = (random() - 0.5) * 0.3;
    group.add(box);
  }

  // Palm trees on the beachfront.
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f8f4e, roughness: 1 });
  for (let i = 0; i < 26; i++) {
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 7, 5), trunkMat);
    trunk.position.y = 3.5;
    palm.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.4, 6), leafMat);
    leaves.position.y = 7.6;
    palm.add(leaves);
    palm.position.set(-260 + i * 22 + random() * 8, 0, 258 + random() * 14);
    palm.rotation.z = (random() - 0.5) * 0.25;
    group.add(palm);
  }

  // Street lights: poles with a glowing head; lit at night.
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.6, metalness: 0.6 });
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffd98a, emissiveIntensity: 0 });
  const lamps = [];
  for (let x = -240; x <= 240; x += 80) {
    for (let z = -240; z <= 240; z += 80) {
      if (z >= 240) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 5), poleMat);
      pole.position.set(x + 9, 3.5, z + 9);
      group.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), lampMat);
      head.position.set(x + 9, 7.1, z + 9);
      group.add(head);
      lamps.push(head);
    }
  }

  // Mission beacon: a glowing column + ring, moved to the active objective.
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.55 });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 60, 12, 1, true), beaconMat);
  beacon.position.y = 30;
  beacon.visible = false;
  group.add(beacon);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3, 4.5, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.12;
  ring.visible = false;
  group.add(ring);

  // Ocean plane beyond the beach (animated by the hurricane module via material).
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 160),
    new THREE.MeshStandardMaterial({ color: PALETTE.water, roughness: 0.15, metalness: 0.4 }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0.15, 380);
  group.add(ocean);

  return {
    group, wet, lamps, lampMat, beacon, ring, ocean, buildings: spots,
    setBeacon(x, z, on) {
      beacon.visible = on; ring.visible = on;
      beacon.position.x = x; beacon.position.z = z;
      ring.position.x = x; ring.position.z = z;
    },
    setWet(amount) { wet.material.opacity = amount * 0.35; },
    setLamps(on) { lampMat.emissiveIntensity = on ? 1.6 : 0; },
  };
}
