// Particles, screen shake, muzzle flashes, rain streaks and damage vignette
// for Solmara. Particles are pooled THREE.Points sprites so the frame cost
// stays flat; rain is a second pooled Points cloud whose fall speed and
// visible count follow the hurricane's intensity.
import * as THREE from 'three';
export function createEffects(scene) {
  const MAX = 400;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(MAX * 3);
  const col = new Float32Array(MAX * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);
  const parts = [];
  for (let i = 0; i < MAX; i++) parts.push({ life: 0, x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1 });
  // Rain: 700 drops in a 120-unit box that follows the camera target.
  const RAIN_N = 700;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(RAIN_N * 3);
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.PointsMaterial({ size: 0.28, color: 0xaac8e8, transparent: true, opacity: 0.55, depthWrite: false });
  const rain = new THREE.Points(rainGeo, rainMat);
  rain.frustumCulled = false; rain.visible = false;
  scene.add(rain);
  const drops = [];
  for (let i = 0; i < RAIN_N; i++) drops.push({ x: (Math.random() - 0.5) * 120, y: Math.random() * 40, z: (Math.random() - 0.5) * 120 });
  let rainLevel = 0, rainCX = 0, rainCZ = 0;
  let shake = 0;
  function spawn(x, y, z, vx, vy, vz, life, r, g, b) {
    const p = parts.find((q) => q.life <= 0);
    if (!p) return;
    p.life = life; p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.r = r; p.g = g; p.b = b;
  }
  return {
    burst(x, y, z, n, color, speed, life) {
      const c = new THREE.Color(color);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * Math.PI;
        const s = speed * (0.4 + Math.random() * 0.8);
        spawn(x, y, z, Math.cos(a) * Math.cos(e) * s, Math.abs(Math.sin(e)) * s + 1, Math.sin(a) * Math.cos(e) * s, life * (0.6 + Math.random() * 0.7), c.r, c.g, c.b);
      }
    },
    exhaust(x, y, z) { spawn(x, y, z, (Math.random() - 0.5) * 0.6, 0.6, (Math.random() - 0.5) * 0.6, 0.5, 0.45, 0.45, 0.45); },
    muzzle(x, y, z) { this.burst(x, y, z, 8, 0xffcc33, 6, 0.12); },
    // A short smoke puff for a hard landing or a burnout start.
    smoke(x, y, z) { this.burst(x, y, z, 6, 0x888888, 1.5, 0.7); },
    sparks(x, y, z) { this.burst(x, y, z, 14, 0xffaa22, 7, 0.4); },
    // Rain intensity 0..1; the cloud follows (cx, cz) so the rain is always
    // around the player instead of fixed over the map centre.
    setRain(v) { rainLevel = Math.max(0, Math.min(1, v)); rain.visible = rainLevel > 0.02; },
    setRainCentre(x, z) { rainCX = x; rainCZ = z; },
    addShake(v) { shake = Math.min(1, shake + v); },
    get shake() { return shake; },
    update(dt) {
      shake = Math.max(0, shake - dt * 2.2);
      for (let i = 0; i < MAX; i++) {
        const p = parts[i];
        if (p.life > 0) {
          p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vy -= 4 * dt;
          if (p.y < 0.05) { p.y = 0.05; p.vy *= -0.3; }
        }
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.life > 0 ? p.y : -99; pos[i * 3 + 2] = p.z;
        col[i * 3] = p.r; col[i * 3 + 1] = p.g; col[i * 3 + 2] = p.b;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      if (rain.visible) {
        const fall = 26 + rainLevel * 22;
        const shown = Math.floor(RAIN_N * rainLevel);
        for (let i = 0; i < RAIN_N; i++) {
          const d = drops[i];
          if (i < shown) {
            d.y -= fall * dt; d.x += rainLevel * 4 * dt;
            if (d.y < 0) { d.y = 34 + Math.random() * 8; d.x = rainCX + (Math.random() - 0.5) * 120; d.z = rainCZ + (Math.random() - 0.5) * 120; }
            rainPos[i * 3] = d.x; rainPos[i * 3 + 1] = d.y; rainPos[i * 3 + 2] = d.z;
          } else { rainPos[i * 3 + 1] = -99; }
        }
        rainGeo.attributes.position.needsUpdate = true;
      }
    },
  };
}
