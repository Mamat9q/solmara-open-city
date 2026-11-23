// Cars: a simple arcade physics model (accel 22, drag 0.15, tuned headless)
// and a low-poly car mesh built from boxes, with spinning wheels, brake
// lights and headlights. One class serves the player, traffic and police.
import * as THREE from 'three';
import { CFG } from './config.js';
import { clamp, angleDiff } from './random.js';

export function makeCarMesh(colorHex, opts = {}) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({
    color: colorHex, roughness: 0.35, metalness: 0.55,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 0.2, metalness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), paint);
  body.position.y = 0.62;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.58, 2.2), dark);
  cabin.position.set(0, 1.18, -0.25);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
  const wheels = [];
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.38, z);
    g.add(w);
    wheels.push(w);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  for (const x of [-0.7, 0.7]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.08), tailMat);
    t.position.set(x, 0.72, -2.22);
    g.add(t);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
  for (const x of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.08), headMat);
    h.position.set(x, 0.72, 2.22);
    g.add(h);
  }
  if (opts.taxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xf2c200 }));
    sign.position.set(0, 1.62, -0.25);
    g.add(sign);
  }
  if (opts.police) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    bar.position.set(0, 1.55, -0.25);
    g.add(bar);
    g.userData.lightbar = bar;
  }
  g.userData.wheels = wheels;
  return g;
}

export class Car {
  constructor(scene, def, colorHex, opts = {}) {
    this.def = def;
    this.mesh = makeCarMesh(colorHex, opts);
    this.wheels = this.mesh.userData.wheels;
    scene.add(this.mesh);
    this.x = 0;
    this.z = 0;
    this.heading = 0;
    this.speed = 0;
    this.steer = 0;
    this.top = def.top || 38;
    this.accel = def.accel || CFG.car.accel;
    this.armor = 0;
    this.engineLevel = 0;
    this.dead = false;
    this.spin = 0;
  }

  place(x, z, heading) {
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = 0;
    this.sync();
  }

  sync() {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    for (const w of this.wheels) w.rotation.x += this.speed * 0.016 * 2.6;
  }

  // controls: {throttle 0..1, brake 0..1, reverse bool, steer -1..1, handbrake 0..1}
  update(dt, controls, collide) {
    const top = this.top * (1 + this.engineLevel * 0.12);
    const accel = this.accel * (1 + this.engineLevel * 0.15);
    if (controls.throttle > 0) this.speed += accel * dt;
    if (controls.reverse) {
      if (this.speed > 0.5) this.speed -= CFG.car.brake * dt;
      else this.speed -= accel * 0.55 * dt;
    }
    if (controls.brake > 0) this.speed -= CFG.car.brake * dt;
    if (controls.handbrake > 0) this.speed *= Math.max(0, 1 - 3.2 * dt);
    // Quadratic drag keeps the top speed honest.
    this.speed -= this.speed * Math.abs(this.speed) * CFG.car.drag * dt * 0.12;
    this.speed = clamp(this.speed, -12, top);
    if (Math.abs(this.speed) < 0.05 && controls.throttle === 0) this.speed = 0;
    const targetSteer = clamp(controls.steer, -1, 1) * CFG.car.steerMax;
    this.steer += (targetSteer - this.steer) * Math.min(1, dt * 8);
    const turn = this.steer * clamp(Math.abs(this.speed) / 8, 0, 1) * (this.speed >= 0 ? 1 : -1);
    this.heading += turn * dt * 1.9;
    this.x += Math.sin(this.heading) * this.speed * dt;
    this.z += Math.cos(this.heading) * this.speed * dt;
    if (collide) {
      const p = collide(this.x, this.z, 2.1);
      this.x = p.x;
      this.z = p.z;
    }
    this.sync();
  }

  // Simple chase steering toward a target point (used by traffic + police).
  steerToward(tx, tz, throttle = 1) {
    const want = Math.atan2(tx - this.x, tz - this.z);
    const dh = angleDiff(this.heading, want);
    return { throttle, brake: 0, reverse: false, steer: clamp(dh * 2.4, -1, 1), handbrake: 0 };
  }

  kmh() {
    return Math.abs(this.speed) * 3.6;
  }
}
