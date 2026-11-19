// SOLMARA city: a coastal grid of streets, pastel blocks, neon signs, palms,
// a boardwalk and the ocean, plus the storm dressing — rain, puddles and
// lightning — that thickens as the hurricane countdown runs down.

import * as THREE from 'three';
import { CITY } from './config.js';

const SKY_CLEAR = new THREE.Color(0xff8f4d);
const SKY_STORM = new THREE.Color(0x565064);
const FOG_CLEAR = new THREE.Color(0xf2a06a);
const FOG_STORM = new THREE.Color(0x4a4557);
const SUN_CLEAR = new THREE.Color(0xffd9a0);
const SUN_STORM = new THREE.Color(0x8f8aa0);

const BUILDING_COLORS = [0xe8b48c, 0xd98a7a, 0x7fb3a8, 0xe6d3a3, 0xc98bb0, 0x9ab8d9, 0xf0e0c0, 0xb98a6e];
const NEON_COLORS = [0xff2e88, 0x19e3ff, 0xffc233, 0x7cff5e, 0xff5e3a];

function boxMaterial(color, emissive = 0x000000, emissiveIntensity = 1) {
  return new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity });
}

export function createWorld(scene, rng) {
  const world = {
    scene,
    buildings: [],
    roadblocks: [],
    puddles: [],
    rain: null,
    rainVelocity: null,
    sun: null,
    hemi: null,
    lightningTimer: 8,
    flashTimer: 0,
    stormAmount: 0,
  };

  scene.background = new THREE.Color(SKY_CLEAR);
  scene.fog = new THREE.Fog(FOG_CLEAR, 90, 320);

  world.hemi = new THREE.HemisphereLight(0xffd9b0, 0x3a3348, 0.9);
  scene.add(world.hemi);
  world.sun = new THREE.DirectionalLight(SUN_CLEAR, 1.6);
  world.sun.position.set(120, 90, -60);
  scene.add(world.sun);
  scene.add(new THREE.AmbientLight(0x604a55, 0.5));

  // Ground: one big asphalt slab, then road ribbons on top of it.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.halfSize * 2 + 80, CITY.halfSize * 2 + 80),
    boxMaterial(0x33323a),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 10);
  scene.add(ground);

  const roadMaterial = boxMaterial(0x23222a);
  const lineMaterial = boxMaterial(0xd8b13a, 0x554411, 0.6);
  for (const line of CITY.roadLines) {
    const vertical = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadWidth, CITY.halfSize * 2), roadMaterial);
    vertical.rotation.x = -Math.PI / 2;
    vertical.position.set(line, 0.02, 0);
    scene.add(vertical);
    const horizontal = new THREE.Mesh(new THREE.PlaneGeometry(CITY.halfSize * 2, CITY.roadWidth), roadMaterial);
    horizontal.rotation.x = -Math.PI / 2;
    horizontal.position.set(0, 0.02, line);
    scene.add(horizontal);
    for (let mark = -120; mark <= 120; mark += 12) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 3), lineMaterial);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(line, 0.04, mark);
      scene.add(dash);
      const dashAcross = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.4), lineMaterial);
      dashAcross.rotation.x = -Math.PI / 2;
      dashAcross.position.set(mark, 0.04, line);
      scene.add(dashAcross);
    }
  }

  // Sidewalks: pale strips flanking every road.
  const walkMaterial = boxMaterial(0x8a8378);
  for (const line of CITY.roadLines) {
    for (const side of [-1, 1]) {
      const stripV = new THREE.Mesh(new THREE.PlaneGeometry(3, CITY.halfSize * 2), walkMaterial);
      stripV.rotation.x = -Math.PI / 2;
      stripV.position.set(line + side * 6.5, 0.03, 0);
      scene.add(stripV);
      const stripH = new THREE.Mesh(new THREE.PlaneGeometry(CITY.halfSize * 2, 3), walkMaterial);
      stripH.rotation.x = -Math.PI / 2;
      stripH.position.set(0, 0.03, line + side * 6.5);
      scene.add(stripH);
    }
  }

  // Buildings fill every block between the roads; none of them ever sits on
  // a road, so every mission target on a road is open ground.
  for (const bx of CITY.blockCentres) {
    for (const bz of CITY.blockCentres) {
      if (bz >= 90) continue;
      const count = rng.int(1, 3);
      for (let i = 0; i < count; i += 1) {
        const w = rng.range(10, 20);
        const d = rng.range(10, 20);
        const h = rng.range(8, 42);
        const ox = bx + rng.range(-8, 8);
        const oz = bz + rng.range(-8, 8);
        const color = rng.pick(BUILDING_COLORS);
        const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), boxMaterial(color));
        block.position.set(ox, h / 2, oz);
        scene.add(block);
        world.buildings.push({ x: ox, z: oz, halfW: w / 2 + 0.6, halfD: d / 2 + 0.6 });
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 1.6, d * 0.4), boxMaterial(0x4a4450));
        roof.position.set(ox, h + 0.8, oz);
        scene.add(roof);
        if (rng.chance(0.45)) {
          const neon = new THREE.Mesh(
            new THREE.PlaneGeometry(rng.range(4, 8), 1.1),
            new THREE.MeshBasicMaterial({ color: rng.pick(NEON_COLORS) }),
          );
          neon.position.set(ox, Math.min(h - 1.5, 12), oz + d / 2 + 0.15);
          scene.add(neon);
        }
      }
    }
  }

  // Palms and lamps line the roads.
  const trunkMaterial = boxMaterial(0x6e5138);
  const leafMaterial = boxMaterial(0x2f8f5b);
  const lampMaterial = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const line of CITY.roadLines) {
    for (let spot = -110; spot <= 110; spot += 22) {
      if (rng.chance(0.5)) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 6, 6), trunkMaterial);
        trunk.position.set(line + 8.5, 3, spot);
        scene.add(trunk);
        const crown = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.2, 7), leafMaterial);
        crown.position.set(line + 8.5, 7, spot);
        scene.add(crown);
      }
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), boxMaterial(0x2c2c34));
      pole.position.set(line - 8.5, 3.5, spot + 11);
      scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampMaterial);
      lamp.position.set(line - 8.5, 7.1, spot + 11);
      scene.add(lamp);
    }
  }

  // Beach, boardwalk and ocean at the south edge.
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(CITY.halfSize * 2 + 80, 26), boxMaterial(0xd9c08a));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.01, CITY.beachZ + 8);
  scene.add(sand);
  const boardwalk = new THREE.Mesh(new THREE.PlaneGeometry(CITY.halfSize * 2, 8), boxMaterial(0x9a6b4a));
  boardwalk.rotation.x = -Math.PI / 2;
  boardwalk.position.set(0, 0.05, CITY.beachZ - 4);
  scene.add(boardwalk);
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.halfSize * 2 + 80, 60),
    new THREE.MeshLambertMaterial({ color: 0x1e6f8f, transparent: true, opacity: 0.9 }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0.06, CITY.oceanZ + 24);
  scene.add(ocean);

  // Puddles on the roads: faint on day one, wide and glossy by day seven.
  const puddleMaterial = new THREE.MeshLambertMaterial({ color: 0x3a5a7a, transparent: true, opacity: 0.2 });
  for (let i = 0; i < 14; i += 1) {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(rng.range(2, 4.5), 18), puddleMaterial.clone());
    const onVertical = rng.chance(0.5);
    const line = rng.pick(CITY.roadLines);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(
      onVertical ? line + rng.range(-3, 3) : rng.range(-110, 110),
      0.06,
      onVertical ? rng.range(-110, 110) : line + rng.range(-3, 3),
    );
    scene.add(puddle);
    world.puddles.push(puddle);
  }

  // Rain: a cloud of points that falls and recycles above the camera.
  const rainCount = 1400;
  const positions = new Float32Array(rainCount * 3);
  world.rainVelocity = new Float32Array(rainCount);
  for (let i = 0; i < rainCount; i += 1) {
    positions[i * 3] = rng.range(-70, 70);
    positions[i * 3 + 1] = rng.range(0, 55);
    positions[i * 3 + 2] = rng.range(-70, 70);
    world.rainVelocity[i] = rng.range(28, 44);
  }
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  world.rain = new THREE.Points(
    rainGeometry,
    new THREE.PointsMaterial({ color: 0xaec6e0, size: 0.35, transparent: true, opacity: 0.25 }),
  );
  world.rain.visible = false;
  scene.add(world.rain);

  // Roadblocks: striped barriers the police deploy at three stars and up.
  for (let i = 0; i < 3; i += 1) {
    const group = new THREE.Group();
    const barrier = new THREE.Mesh(
      new THREE.BoxGeometry(9, 1.1, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xff7a1a, emissive: 0x662200, emissiveIntensity: 0.7 }),
    );
    barrier.position.y = 1.1;
    group.add(barrier);
    for (const legX of [-4, 4]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.5), boxMaterial(0x2c2c34));
      leg.position.set(legX, 0.55, 0);
      group.add(leg);
    }
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff2200 }),
    );
    light.position.set(0, 1.9, 0);
    group.add(light);
    group.visible = false;
    scene.add(group);
    world.roadblocks.push({ group, active: false, x: 0, z: 0 });
  }

  return world;
}

export function updateStorm(world, day, dt, time, cameraPosition, audio) {
  const amount = Math.min(1, Math.max(0, (day - 1) / 6));
  world.stormAmount = amount;
  world.scene.background.copy(SKY_CLEAR).lerp(SKY_STORM, amount);
  world.scene.fog.color.copy(FOG_CLEAR).lerp(FOG_STORM, amount);
  world.sun.color.copy(SUN_CLEAR).lerp(SUN_STORM, amount);
  world.sun.intensity = 1.6 - amount * 0.9;
  world.hemi.intensity = 0.9 - amount * 0.35;

  for (const puddle of world.puddles) {
    puddle.material.opacity = 0.18 + amount * 0.5;
    const scale = 1 + amount * 0.9;
    puddle.scale.set(scale, scale, 1);
  }

  const rainOpacity = 0.1 + amount * 0.55;
  world.rain.visible = rainOpacity > 0.12;
  world.rain.material.opacity = rainOpacity;
  if (world.rain.visible) {
    const positions = world.rain.geometry.attributes.position.array;
    for (let i = 0; i < world.rainVelocity.length; i += 1) {
      positions[i * 3 + 1] -= world.rainVelocity[i] * dt;
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3] = cameraPosition.x + (Math.random() - 0.5) * 140;
        positions[i * 3 + 1] = 50 + Math.random() * 5;
        positions[i * 3 + 2] = cameraPosition.z + (Math.random() - 0.5) * 140;
      }
    }
    world.rain.geometry.attributes.position.needsUpdate = true;
  }

  world.lightningTimer -= dt;
  if (world.lightningTimer <= 0) {
    world.lightningTimer = Math.max(2.5, 14 - amount * 10) * (0.6 + Math.random() * 0.8);
    world.flashTimer = 0.22;
    if (audio) audio.thunder();
  }
  if (world.flashTimer > 0) {
    world.flashTimer -= dt;
    world.sun.intensity = 3.2;
    world.scene.background.setHex(0xcfc8e8);
  }
}

export function collideWithBuildings(world, x, z, radius) {
  let px = x;
  let pz = z;
  for (const b of world.buildings) {
    const dx = px - b.x;
    const dz = pz - b.z;
    if (Math.abs(dx) < b.halfW + radius && Math.abs(dz) < b.halfD + radius) {
      const pushX = b.halfW + radius - Math.abs(dx);
      const pushZ = b.halfD + radius - Math.abs(dz);
      if (pushX < pushZ) px = b.x + Math.sign(dx || 1) * (b.halfW + radius);
      else pz = b.z + Math.sign(dz || 1) * (b.halfD + radius);
    }
  }
  const limit = CITY.halfSize;
  px = Math.max(-limit, Math.min(limit, px));
  pz = Math.max(-limit, Math.min(limit, pz));
  return { x: px, z: pz };
}
