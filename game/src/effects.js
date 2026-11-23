// Particles and screen shake: one recycled Points cloud for sparks, smoke,
// muzzle flashes and rain splashes. Cheap, allocation-free after construction.
import * as THREE from 'three';
import { makeRng } from './random.js';

const MAX = 900;

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.rng = makeRng(99);
    this.pos = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.head = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, opacity: 0.95 });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.shakeAmt = 0;
    this.flash = null;
  }

  burst(x, y, z, colorHex, count, speed = 6, up = 4, life = 0.7) {
    const c = new THREE.Color(colorHex);
    for (let i = 0; i < count; i++) {
      const n = this.head;
      this.head = (this.head + 1) % MAX;
      this.pos[n * 3] = x;
      this.pos[n * 3 + 1] = y;
      this.pos[n * 3 + 2] = z;
      const a = this.rng.next() * Math.PI * 2;
      const s = speed * (0.4 + this.rng.next() * 0.8);
      this.vel[n * 3] = Math.cos(a) * s;
      this.vel[n * 3 + 1] = up * this.rng.next();
      this.vel[n * 3 + 2] = Math.sin(a) * s;
      this.col[n * 3] = c.r;
      this.col[n * 3 + 1] = c.g;
      this.col[n * 3 + 2] = c.b;
      this.life[n] = life * (0.5 + this.rng.next());
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  muzzle(x, y, z) {
    this.burst(x, y, z, 0xffd24a, 10, 9, 2, 0.18);
  }

  smoke(x, y, z) {
    this.burst(x, y, z, 0x555555, 8, 1.5, 2.5, 1.1);
  }

  sparks(x, y, z) {
    this.burst(x, y, z, 0xffa040, 16, 8, 5, 0.5);
  }

  shake(amount) {
    this.shakeAmt = Math.max(this.shakeAmt, amount);
  }

  update(dt) {
    let any = false;
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      any = true;
      this.life[i] -= dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.vel[i * 3 + 1] -= 9 * dt;
      if (this.pos[i * 3 + 1] < 0.05) this.pos[i * 3 + 1] = 0.05;
    }
    if (any) this.points.geometry.attributes.position.needsUpdate = true;
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.2);
  }

  shakeOffset() {
    if (this.shakeAmt <= 0) return { x: 0, y: 0 };
    const s = this.shakeAmt;
    return { x: (Math.random() - 0.5) * s * 0.6, y: (Math.random() - 0.5) * s * 0.6 };
  }
}
