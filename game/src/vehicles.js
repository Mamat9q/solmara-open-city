// Cars: procedural models (body, cabin, wheels), distinct colours/handling,
// enter/exit with E, driving physics, collisions, stealing raises wanted.
// Top speeds are in game units per second; the HUD shows speed x3.6, so the
// Marina GT's 48 u/s reads as ~173 km/h and the Interceptor's 52 as ~187.
import * as THREE from 'three';
export const CAR_DEFS = [
  { name: 'Solmar Runner', color: 0xd84a4a, top: 30, accel: 15, max: 32, grip: 0.9 },
  { name: 'Cortez Coupe', color: 0x2a6fd8, top: 38, accel: 17, max: 40, grip: 1.0 },
  { name: 'Marina GT', color: 0xf0c040, top: 46, accel: 20, max: 48, grip: 1.1 },
  { name: 'Palm Taxi', color: 0xf0e040, top: 32, accel: 14, max: 34, grip: 0.85, taxi: true },
  { name: 'Dock Van', color: 0x7a8a99, top: 26, accel: 11, max: 28, grip: 0.7 },
  { name: 'Interceptor', color: 0x1a1d22, top: 50, accel: 24, max: 52, grip: 1.2, police: true },
];
export function buildCarMesh(def) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: def.color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), bodyMat); body.position.y = 0.55; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glassMat); cabin.position.set(0, 1.05, -0.2); g.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 2.0), bodyMat); roof.position.set(0, 1.36, -0.2); g.add(roof);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const wheels = [];
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.36, z); g.add(w); wheels.push(w);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  for (const x of [-0.6, 0.6]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.06), headMat); h.position.set(x, 0.62, 2.22); g.add(h); }
  if (def.taxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.3), new THREE.MeshBasicMaterial({ color: 0xffe040 }));
    sign.position.set(0, 1.5, -0.2); g.add(sign);
  }
  if (def.police) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 0.4), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    bar.position.set(0, 1.45, -0.2); g.add(bar);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.2, 4.42), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    stripe.position.y = 0.72; g.add(stripe);
  }
  g.userData.wheels = wheels;
  return g;
}
export function createVehicles(scene, world) {
  const cars = [];
  const defs = CAR_DEFS.filter((d) => !d.police);
  for (let i = 0; i < 14; i++) {
    const def = defs[i % defs.length];
    const s = world.carSpawns[i % world.carSpawns.length];
    const mesh = buildCarMesh(def);
    mesh.position.set(s.x + (i % 3) * 6, 0, s.z + Math.floor(i / 3) * 4);
    mesh.rotation.y = s.yaw; scene.add(mesh);
    cars.push({ def, mesh, x: mesh.position.x, z: mesh.position.z, yaw: s.yaw, speed: 0, occupied: false, traffic: false, parked: true, steer: 0, tuned: false, plated: false, owned: false });
  }
  return {
    cars,
    nearestCar(x, z, maxD) {
      let best = null, bd = maxD;
      for (const c of cars) { const d = Math.hypot(c.x - x, c.z - z); if (d < bd) { bd = d; best = c; } }
      return best;
    },
    // A car bought at Rico's Motors: parked near the player, owned, never
    // raises wanted when entered.
    spawnOwnedCar(def, x, z) {
      if (!def) return null;
      const mesh = buildCarMesh(def);
      mesh.position.set(x, 0, z); scene.add(mesh);
      const car = { def, mesh, x, z, yaw: 0, speed: 0, occupied: false, traffic: false, parked: true, steer: 0, tuned: false, plated: false, owned: true };
      cars.push(car);
      return car;
    },
    // Arcade driving: accelerate/brake, steering scales down with speed, handbrake slides.
    drive(car, dt, input, world, effects, audio, onCrash) {
      const fwd = input.down ? 1 : 0, rev = input.back ? 1 : 0;
      const target = input.left ? 1 : input.right ? -1 : 0;
      const top = car.def.max * (car.tuned ? 1.15 : 1);
      car.steer += (target - car.steer) * Math.min(1, dt * 8);
      if (fwd) car.speed += car.def.accel * dt;
      if (rev) car.speed -= (car.speed > 0.5 ? 22 : 9) * dt;
      if (!fwd && !rev) car.speed -= Math.sign(car.speed) * 6 * dt;
      if (input.handbrake) car.speed -= Math.sign(car.speed) * 26 * dt;
      car.speed = Math.max(-top * 0.35, Math.min(top, car.speed));
      if (Math.abs(car.speed) < 0.15 && !fwd && !rev) car.speed = 0;
      const turn = car.steer * 1.9 * car.def.grip * dt * Math.min(1, Math.abs(car.speed) / 6) * (car.speed >= 0 ? 1 : -1);
      car.yaw += turn * (input.handbrake ? 1.5 : 1);
      const nx = car.x + Math.sin(car.yaw) * car.speed * dt;
      const nz = car.z + Math.cos(car.yaw) * car.speed * dt;
      const hit = world.collide(nx, nz, 1.4);
      const crashed = Math.abs(hit.x - nx) > 0.001 || Math.abs(hit.z - nz) > 0.001;
      if (crashed && Math.abs(car.speed) > 6) { if (onCrash) onCrash(Math.abs(car.speed)); car.speed *= car.plated ? -0.08 : -0.25; }
      else if (crashed) car.speed *= car.plated ? 0.8 : 0.4;
      car.x = hit.x; car.z = hit.z;
      car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.yaw;
      for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2.4;
      if (audio) audio.startEngine(Math.abs(car.speed) / top);
      // Wheel spin is visual only; steering angle tilts the front wheels slightly.
      car.mesh.userData.wheels[0].rotation.y = car.steer * 0.3; car.mesh.userData.wheels[1].rotation.y = car.steer * 0.3;
      if (effects && Math.abs(car.speed) > 14 && Math.random() < 0.5) {
        effects.exhaust(car.x - Math.sin(car.yaw) * 2.2, 0.4, car.z - Math.cos(car.yaw) * 2.2);
      }
      return Math.abs(car.speed);
    },
  };
}
