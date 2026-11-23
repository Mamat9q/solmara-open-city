// Effects: rain as a single Points cloud that falls around the camera, and a
// small pooled particle burst system (muzzle flashes, hits, explosions) that
// allocates nothing after boot.
import * as THREE from 'three';

const RAIN_COUNT = 900;
const BURST_COUNT = 240;

export function createEffects(scene) {
  // Rain: points in a box around the origin, re-wrapped above the camera.
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(RAIN_COUNT * 3);
  for (let i = 0; i < RAIN_COUNT; i++) {
    rainPos[i * 3] = (Math.random() - 0.5) * 90;
    rainPos[i * 3 + 1] = Math.random() * 45;
    rainPos[i * 3 + 2] = (Math.random() - 0.5) * 90;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({
    color: 0xaac8e0, size: 0.35, transparent: true, opacity: 0,
  }));
  rain.visible = false;
  scene.add(rain);

  // Particle pool.
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(BURST_COUNT * 3);
  const col = new Float32Array(BURST_COUNT * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, opacity: 0.95 }));
  points.frustumCulled = false;
  scene.add(points);
  const parts = [];
  for (let i = 0; i < BURST_COUNT; i++) parts.push({ life: 0, vx: 0, vy: 0, vz: 0 });
  let cursor = 0;

  return {
    rain,
    rainPos,
    points,
    parts,
    cursor: 0,
    setRain(amount, cameraPos, dt) {
      rain.visible = amount > 0.03;
      rain.material.opacity = Math.min(0.7, amount * 0.8);
      if (!rain.visible) return;
      for (let i = 0; i < RAIN_COUNT; i++) {
        rainPos[i * 3 + 1] -= 42 * dt;
        rainPos[i * 3] += 4 * dt;
        if (rainPos[i * 3 + 1] < 0) {
          rainPos[i * 3 + 1] = 42 + Math.random() * 3;
          rainPos[i * 3] = cameraPos.x + (Math.random() - 0.5) * 90;
          rainPos[i * 3 + 2] = cameraPos.z + (Math.random() - 0.5) * 90;
        }
      }
      rainGeo.attributes.position.needsUpdate = true;
      rain.position.set(0, 0, 0);
    },
    burst(at, colorHex, n) {
      const c = new THREE.Color(colorHex);
      for (let k = 0; k < n; k++) {
        const i = cursor;
        cursor = (cursor + 1) % BURST_COUNT;
        const p = parts[i];
        p.life = 0.5 + Math.random() * 0.4;
        p.vx = (Math.random() - 0.5) * 9;
        p.vy = Math.random() * 7 + 1;
        p.vz = (Math.random() - 0.5) * 9;
        pos[i * 3] = at.x; pos[i * 3 + 1] = at.y; pos[i * 3 + 2] = at.z;
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      geo.attributes.color.needsUpdate = true;
    },
    update(dt) {
      let any = false;
      for (let i = 0; i < BURST_COUNT; i++) {
        const p = parts[i];
        if (p.life <= 0) continue;
        any = true;
        p.life -= dt;
        p.vy -= 12 * dt;
        pos[i * 3] += p.vx * dt;
        pos[i * 3 + 1] += p.vy * dt;
        pos[i * 3 + 2] += p.vz * dt;
        if (pos[i * 3 + 1] < 0.05) { pos[i * 3 + 1] = 0.05; p.vy = 0; }
        if (p.life <= 0) pos[i * 3 + 1] = -50;
      }
      if (any) geo.attributes.position.needsUpdate = true;
    },
  };
}
