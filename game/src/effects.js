// Effects: a pooled particle burst system (one THREE.Points, reused), a muzzle
// flash light, and screen shake for crashes, spike strips and explosions.

import * as THREE from 'three';

export function createEffects(G) {
  const MAX = 600;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(MAX * 3);
  const col = new Float32Array(MAX * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 0.7, vertexColors: true, transparent: true, opacity: 0.95 });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  G.scene.add(points);
  const parts = [];
  for (let i = 0; i < MAX; i++) parts.push({ life: 0, vx: 0, vy: 0, vz: 0 });
  let cursor = 0;
  let shakeAmt = 0;

  const flash = new THREE.PointLight(0xffc266, 0, 18);
  G.scene.add(flash);
  let flashLife = 0;

  function burst(x, y, z, colorHex, n) {
    const c = new THREE.Color(colorHex);
    for (let k = 0; k < n; k++) {
      const p = parts[cursor];
      const i = cursor;
      cursor = (cursor + 1) % MAX;
      p.life = 0.6 + G.rng() * 0.5;
      p.vx = (G.rng() - 0.5) * 12;
      p.vy = G.rng() * 9;
      p.vz = (G.rng() - 0.5) * 12;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  function muzzle(x, y, z, dir) {
    flash.position.set(x, y, z);
    flash.intensity = 26;
    flashLife = 0.07;
    burst(x, y, z, 0xffc266, 5);
  }

  function shake(amount) {
    shakeAmt = Math.max(shakeAmt, amount);
  }

  function update(dt) {
    let any = false;
    for (let i = 0; i < MAX; i++) {
      const p = parts[i];
      if (p.life <= 0) continue;
      any = true;
      p.life -= dt;
      pos[i * 3] += p.vx * dt;
      pos[i * 3 + 1] += p.vy * dt;
      pos[i * 3 + 2] += p.vz * dt;
      p.vy -= 14 * dt;
      if (pos[i * 3 + 1] < 0.05) { pos[i * 3 + 1] = 0.05; p.vy = Math.abs(p.vy) * 0.3; }
      if (p.life <= 0) pos[i * 3 + 1] = -100;
    }
    if (any) geo.attributes.position.needsUpdate = true;
    if (flashLife > 0) {
      flashLife -= dt;
      if (flashLife <= 0) flash.intensity = 0;
    }
    if (shakeAmt > 0) {
      shakeAmt = Math.max(0, shakeAmt - dt * 1.8);
      const s = shakeAmt * 0.5;
      G.camera.position.x += (G.rng() - 0.5) * s;
      G.camera.position.y += (G.rng() - 0.5) * s;
    }
  }

  return { burst, muzzle, shake, update };
}
