// The city of Solmara: a grid of avenues, tower blocks with lit windows, palm
// rows, a neon strip, the ocean to the west and storm clouds rolling in from
// the east. Built once from a fixed seed so every run stages the same city.
// Buildings are simple boxes with a shared emissive-window texture painted on
// a canvas — cheap enough for SwiftShader at 720p.
import * as THREE from 'three';
import { WORLD } from './config.js';
import { mulberry32, range, pick } from './random.js';

function windowTexture(rng, litRatio) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#101018';
  g.fillRect(0, 0, 64, 128);
  const cols = ['#ffd27a', '#9fd8ff', '#ff9d6b', '#c9f2c7'];
  for (let y = 6; y < 122; y += 10) {
    for (let x = 5; x < 58; x += 9) {
      if (rng() < litRatio) {
        g.fillStyle = pick(rng, cols);
        g.globalAlpha = 0.55 + rng() * 0.45;
        g.fillRect(x, y, 6, 7);
      }
    }
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.rng = mulberry32(1);
    this.buildings = []; // {x, z, half, height} for collision + minimap
    this.palms = [];
    this.shopSpots = [];
    this.group = new THREE.Group();
    scene.add(this.group);
    this.buildSky();
    this.buildGround();
    this.buildOcean();
    this.buildCity();
    this.buildStorm();
  }

  buildSky() {
    // Neon sunset: deep violet up top, burning orange at the horizon.
    const sky = new THREE.Color(0x2a1548);
    this.scene.background = sky;
    this.scene.fog = new THREE.Fog(0x3a1c52, 120, 520);
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(26, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xff8c3a, fog: false }),
    );
    sun.position.set(-260, 42, -320);
    this.group.add(sun);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(40, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0.25, fog: false }),
    );
    glow.position.copy(sun.position);
    this.group.add(glow);
    const hemi = new THREE.HemisphereLight(0x8a6bbf, 0x1a1024, 0.85);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffb36b, 1.1);
    dir.position.set(-180, 120, -220);
    this.scene.add(dir);
  }

  buildGround() {
    const geo = new THREE.PlaneGeometry(WORLD.size * 2, WORLD.size * 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x23202e, roughness: 0.55, metalness: 0.35 });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    this.group.add(ground);
    // Wet-look puddle strips that catch the sunset.
    const puddleMat = new THREE.MeshStandardMaterial({ color: 0x4a3a6b, roughness: 0.08, metalness: 0.7, transparent: true, opacity: 0.55 });
    for (let i = 0; i < 26; i++) {
      const w = range(this.rng, 6, 22);
      const d = range(this.rng, 3, 8);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), puddleMat);
      p.rotation.x = -Math.PI / 2;
      p.position.set(range(this.rng, -280, 280), 0.02, range(this.rng, -280, 280));
      this.group.add(p);
    }
  }

  buildOcean() {
    const geo = new THREE.PlaneGeometry(360, WORLD.size * 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x0e2a4a, roughness: 0.15, metalness: 0.55 });
    const sea = new THREE.Mesh(geo, mat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(-WORLD.size - 150, WORLD.seaLevel, 0);
    this.group.add(sea);
    // The pier: the first chapter's target.
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x3a2e22, roughness: 0.9 });
    const pier = new THREE.Mesh(new THREE.BoxGeometry(60, 1.2, 8), pierMat);
    pier.position.set(-WORLD.size - 20, 0.8, 220);
    this.group.add(pier);
  }

  buildCity() {
    const rng = this.rng;
    const tex = windowTexture(rng, 0.42);
    const half = WORLD.size / 2 - 20;
    // Roads: dark strips along every avenue.
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x17141f, roughness: 0.7, metalness: 0.2 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8c25a });
    for (let a = -WORLD.size / 2; a <= WORLD.size / 2; a += WORLD.roadSpacing) {
      const ns = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadWidth, WORLD.size), roadMat);
      ns.rotation.x = -Math.PI / 2;
      ns.position.set(a, 0.03, 0);
      this.group.add(ns);
      const ew = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size, WORLD.roadWidth), roadMat);
      ew.rotation.x = -Math.PI / 2;
      ew.position.set(0, 0.03, a);
      this.group.add(ew);
      for (let d = -WORLD.size / 2 + 20; d < WORLD.size / 2; d += 24) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 5), lineMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(a, 0.05, d);
        this.group.add(dash);
      }
    }
    // Tower blocks inside the blocks between avenues.
    const palette = [0x2e2a3e, 0x3a2f45, 0x27303e, 0x3d2b33, 0x2b3644];
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    for (let gx = -WORLD.size / 2 + WORLD.roadSpacing / 2; gx < WORLD.size / 2; gx += WORLD.roadSpacing) {
      for (let gz = -WORLD.size / 2 + WORLD.roadSpacing / 2; gz < WORLD.size / 2; gz += WORLD.roadSpacing) {
        if (Math.abs(gx) < 24 && Math.abs(gz) < 24) continue; // keep the central plaza open
        const count = 1 + Math.floor(rng() * 2);
        for (let k = 0; k < count; k++) {
          const w = range(rng, 18, 30);
          const d = range(rng, 18, 30);
          const h = range(rng, 22, 95);
          const x = gx + range(rng, -16, 16);
          const z = gz + range(rng, -16, 16);
          const mat = new THREE.MeshStandardMaterial({
            color: pick(rng, palette), roughness: 0.8, metalness: 0.15,
            emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55,
          });
          const b = new THREE.Mesh(boxGeo, mat);
          b.scale.set(w, h, d);
          b.position.set(x, h / 2, z);
          this.group.add(b);
          // Rooftop beacon light on the tall ones.
          if (h > 60) {
            const beacon = new THREE.Mesh(
              new THREE.SphereGeometry(1.2, 8, 8),
              new THREE.MeshBasicMaterial({ color: 0xff2a3a }),
            );
            beacon.position.set(x, h + 1.5, z);
            this.group.add(beacon);
          }
          this.buildings.push({ x, z, half: Math.max(w, d) / 2 + 1, height: h });
        }
      }
    }
    // Palm rows along the main avenue.
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.95 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1f7a3a, roughness: 0.85, side: THREE.DoubleSide });
    for (let z = -280; z <= 280; z += 40) {
      for (const x of [-12, 12]) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 9, 6), trunkMat);
        trunk.position.set(x, 4.5, z);
        this.group.add(trunk);
        for (let l = 0; l < 5; l++) {
          const leaf = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.4), leafMat);
          const a = (l / 5) * Math.PI * 2 + rng();
          leaf.position.set(x + Math.cos(a) * 2.2, 9.4, z + Math.sin(a) * 2.2);
          leaf.rotation.set(0.5, -a, 0.4);
          this.group.add(leaf);
        }
        this.palms.push({ x, z });
      }
    }
    // Neon shop signs on the strip (avenue x = 0, south end).
    const neonColors = [0x00f0ff, 0xff2a7a, 0xffe14a, 0x7cff4a];
    for (let i = 0; i < 6; i++) {
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(10, 2.2, 0.6),
        new THREE.MeshBasicMaterial({ color: neonColors[i % neonColors.length] }),
      );
      sign.position.set(-40 + i * 16, 14, 236);
      this.group.add(sign);
      this.shopSpots.push({ x: -40 + i * 16, z: 228 });
    }
    // Streetlights.
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x30303a, roughness: 0.6, metalness: 0.6 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    for (let a = -240; a <= 240; a += 80) {
      for (const [x, z] of [[a + 9, -240], [a - 9, 240], [-240, a + 9], [240, a - 9]]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 8, 6), poleMat);
        pole.position.set(x, 4, z);
        this.group.add(pole);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), lampMat);
        lamp.position.set(x, 8.2, z);
        this.group.add(lamp);
      }
    }
  }

  buildStorm() {
    // Storm clouds rolling in from the east, dark bellies lit from below.
    const rng = mulberry32(99);
    const mat = new THREE.MeshStandardMaterial({ color: 0x1c1426, roughness: 1, transparent: true, opacity: 0.92 });
    for (let i = 0; i < 14; i++) {
      const s = range(rng, 40, 90);
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(s, 12, 8), mat);
      cloud.scale.y = 0.35;
      cloud.position.set(range(rng, 180, 420), range(rng, 90, 150), range(rng, -320, 320));
      this.group.add(cloud);
    }
  }

  // True when (x, z) is inside a building footprint (with margin).
  hitsBuilding(x, z, margin) {
    for (const b of this.buildings) {
      if (Math.abs(x - b.x) < b.half + margin && Math.abs(z - b.z) < b.half + margin) return b;
    }
    return null;
  }

  // Clamp a position to the drivable city bounds.
  clampToCity(x, z) {
    const m = WORLD.size / 2 - 6;
    return [Math.max(-m, Math.min(m, x)), Math.max(-m, Math.min(m, z))];
  }
}
