// Cars: a boxy arcade car mesh (body, cabin, wheels, headlights, brake lights),
// arcade driving physics, and the garage's 3 ownable cars + upgrades.
// Proven tuning: accel 22, drag 0.15 — top speed is capped per car.

import * as THREE from 'three';
import { CAR_TUNING, CARS, UPGRADE_PRICES, PAINTS } from './config.js';

export function buildCarMesh(color) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.55 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 0.2, metalness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), paint);
  body.position.y = 0.62;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), dark);
  cabin.position.set(0, 1.18, -0.25);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.9 });
  const wheels = [];
  for (const [wx, wz] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(wx, 0.42, wz);
    g.add(w);
    wheels.push(w);
  }
  // Headlight glow cones (emissive, cheap at night) and brake lights.
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6c9, emissive: 0xffe9a0, emissiveIntensity: 0.4 });
  for (const hx of [-0.65, 0.65]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), headMat);
    h.position.set(hx, 0.72, 2.22);
    g.add(h);
  }
  const brakeMat = new THREE.MeshStandardMaterial({ color: 0x881111, emissive: 0xff2222, emissiveIntensity: 0.25 });
  for (const hx of [-0.65, 0.65]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), brakeMat);
    b.position.set(hx, 0.72, -2.22);
    g.add(b);
  }
  g.userData = { paint, headMat, brakeMat, wheels };
  return g;
}

export function createCar(G, def) {
  const mesh = buildCarMesh(def.color);
  G.scene.add(mesh);
  const car = {
    def, mesh,
    x: 0, z: 0, heading: 0, speed: 0, steerVis: 0,
    maxSpeed: def.maxSpeed, accel: def.accel,
    armor: 0, engineLevel: 0, armorLevel: 0,
    applyUpgrades(up) {
      this.engineLevel = up.engine || 0;
      this.armorLevel = up.armor || 0;
      this.maxSpeed = def.maxSpeed + this.engineLevel * 3;
      this.accel = def.accel + this.engineLevel * 1.5;
      this.armor = this.armorLevel * 25;
    },
    setPaint(color) { mesh.userData.paint.color.setHex(color); },
    teleport(x, z, heading) {
      this.x = x;
      this.z = z;
      this.heading = heading;
      this.speed = 0;
      this.sync();
    },
    sync() {
      mesh.position.set(this.x, 0, this.z);
      mesh.rotation.y = this.heading;
      const spin = this.speed * 0.016 * 2.4;
      for (const w of mesh.userData.wheels) w.rotation.x += spin;
      mesh.userData.headMat.emissiveIntensity = G.nightFactor > 0.4 ? 2.2 : 0.4;
    },
    /** Arcade drive step. throttle -1..1, steer -1..1. Returns {crashed}. */
    drive(dt, throttle, steer) {
      const a = CAR_TUNING.accel;
      if (throttle > 0) this.speed += this.accel * throttle * dt;
      else if (throttle < 0) {
        if (this.speed > 0.5) this.speed -= CAR_TUNING.brake * dt;
        else this.speed += CAR_TUNING.reverseAccel * throttle * dt;
      }
      // Linear drag (proven 0.15) + rolling drag.
      this.speed -= this.speed * CAR_TUNING.drag * dt;
      if (Math.abs(this.speed) < 0.05 && throttle === 0) this.speed = 0;
      this.speed = Math.max(-12, Math.min(this.maxSpeed, this.speed));
      const spd = Math.min(1, Math.abs(this.speed) / 18);
      this.heading -= steer * CAR_TUNING.turn * spd * dt * Math.sign(this.speed || 1);
      const fx = Math.sin(this.heading);
      const fz = Math.cos(this.heading);
      let nx = this.x + fx * this.speed * dt;
      let nz = this.z + fz * this.speed * dt;
      let crashed = false;
      const hit = G.world.collideCircle(nx, nz, 2.1);
      if (hit.hit) { nx = hit.x; nz = hit.z; crashed = true; this.speed *= 0.45; }
      nx = Math.max(-CITY_BOUND, Math.min(CITY_BOUND, nx));
      nz = Math.max(-CITY_BOUND, Math.min(CITY_BOUND, nz));
      this.x = nx;
      this.z = nz;
      this.steerVis += (steer - this.steerVis) * Math.min(1, dt * 8);
      this.sync();
      mesh.userData.brakeMat.emissiveIntensity = throttle < 0 ? 2.5 : 0.25;
      return { crashed };
    },
  };
  return car;
}

const CITY_BOUND = 305;

/** The garage: own 3 cars, buy/upgrade with mission cash. Operates on G.state. */
export function createGarage(G) {
  function ownedIds() { return G.state.ownedCars; }
  function currentDef() { return CARS[G.state.carIndex]; }
  function buyCar(index) {
    const def = CARS[index];
    if (!def) return { ok: false, msg: 'No such car.' };
    if (ownedIds().includes(def.id)) return { ok: false, msg: `${def.name} is already yours.` };
    if (G.state.cash < def.price) return { ok: false, msg: `Need $${def.price} for the ${def.name}.` };
    G.state.cash -= def.price;
    G.state.ownedCars.push(def.id);
    G.state.carIndex = index;
    G.switchCar(index);
    return { ok: true, msg: `${def.name} bought! Press G to drive it.` };
  }
  function buyUpgrade(kind) {
    const up = G.state.upgrades;
    const level = up[kind] || 0;
    const prices = UPGRADE_PRICES[kind];
    if (level >= prices.length - 1) return { ok: false, msg: `${kind} is maxed out.` };
    const price = prices[level + 1];
    if (G.state.cash < price) return { ok: false, msg: `Need $${price} for ${kind} level ${level + 1}.` };
    G.state.cash -= price;
    up[kind] = level + 1;
    G.car.applyUpgrades(up);
    return { ok: true, msg: `${kind} upgraded to level ${level + 1}.` };
  }
  function buyPaint(index) {
    const paint = PAINTS[index];
    if (!paint) return { ok: false, msg: 'No such paint.' };
    if (G.state.cash < paint.price) return { ok: false, msg: `Need $${paint.price} for ${paint.name}.` };
    G.state.cash -= paint.price;
    G.state.paint = index;
    G.car.setPaint(paint.color);
    return { ok: true, msg: `Painted ${paint.name}.` };
  }
  return { ownedIds, currentDef, buyCar, buyUpgrade, buyPaint };
}
