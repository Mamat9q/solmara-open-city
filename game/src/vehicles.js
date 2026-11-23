// Cars: a boxy low-poly build (body, cabin, wheels, headlights) and arcade
// physics — accel 22, drag 0.15, top speed ~43 m/s (155 km/h). Steering bites
// harder at low speed and washes out at high speed, like a street car should.
import * as THREE from 'three';
import { CAR_ACCEL, CAR_DRAG, CAR_TOP_SPEED, CAR_STEER, CITY_HALF } from './config.js';

const WHEEL_GEO = new THREE.BoxGeometry(0.55, 0.55, 0.9);
const WHEEL_MAT = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.9 });

export function createCarMesh(color, kind = 'sedan') {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.2 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x101826, roughness: 0.15, metalness: 0.8 });
  const bodyLen = kind === 'truck' ? 5.6 : 4.4;
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.75, bodyLen), bodyMat);
  body.position.y = 0.62;
  car.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, kind === 'truck' ? 1.6 : 2.2), glassMat);
  cabin.position.set(0, 1.3, kind === 'truck' ? -0.4 : -0.2);
  car.add(cabin);
  const wheels = [];
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(WHEEL_GEO, WHEEL_MAT);
    w.position.set(x, 0.28, z);
    car.add(w);
    wheels.push(w);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const x of [-0.6, 0.6]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), lightMat);
    lamp.position.set(x, 0.7, bodyLen / 2 + 0.02);
    car.add(lamp);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const x of [-0.6, 0.6]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), tailMat);
    tail.position.set(x, 0.7, -bodyLen / 2 - 0.02);
    car.add(tail);
  }
  car.userData = { bodyMat, wheels, kind, bodyLen };
  return car;
}

/** A drivable car entity: mesh plus speed, heading and tuning. */
export function createCarEntity(mesh, tuning) {
  return {
    mesh,
    speed: 0,
    heading: 0,
    accel: tuning.accel,
    top: tuning.top,
    color: tuning.color,
    damaged: 0,
    spikeSlow: 0,
  };
}

/**
 * Arcade drive step. `drive` is {forward:-1..1, steer:-1..1, run} (run = handbrake).
 * Returns the distance travelled this step.
 */
export function updateCarPhysics(car, drive, dt) {
  const effTop = car.top * (car.spikeSlow > 0 ? 0.35 : 1);
  if (drive.forward !== 0) {
    car.speed += drive.forward * car.accel * dt * (car.speed < 0 && drive.forward > 0 ? 2.2 : 1);
  }
  // Drag + rolling resistance; handbrake cuts speed hard and lets the tail out.
  car.speed -= car.speed * CAR_DRAG * dt * 3;
  if (drive.run) car.speed -= car.speed * 2.4 * dt;
  if (Math.abs(car.speed) < 0.05 && drive.forward === 0) car.speed = 0;
  car.speed = Math.max(-12, Math.min(effTop, car.speed));
  const steerAuthority = CAR_STEER * (1 - Math.min(0.55, Math.abs(car.speed) / effTop * 0.55));
  car.heading += drive.steer * steerAuthority * (car.speed / Math.max(8, Math.abs(car.speed))) * dt * Math.sign(car.speed || 1) * (drive.run ? 1.6 : 1);
  const dx = Math.sin(car.heading) * car.speed * dt;
  const dz = Math.cos(car.heading) * car.speed * dt;
  car.mesh.position.x = THREE.MathUtils.clamp(car.mesh.position.x + dx, -CITY_HALF + 6, CITY_HALF - 6);
  car.mesh.position.z = THREE.MathUtils.clamp(car.mesh.position.z + dz, -CITY_HALF + 6, CITY_HALF - 6);
  car.mesh.rotation.y = car.heading;
  // Wheel spin + a little body roll for feel.
  const spin = car.speed * dt * 1.4;
  for (const w of car.mesh.userData.wheels) w.rotation.x += spin;
  car.mesh.rotation.z = -drive.steer * Math.min(0.06, Math.abs(car.speed) * 0.0015);
  if (car.spikeSlow > 0) car.spikeSlow = Math.max(0, car.spikeSlow - dt);
  return Math.abs(car.speed) * dt;
}

/** Speed in km/h for the HUD. */
export function kmh(car) {
  return Math.round(Math.abs(car.speed) * 3.6);
}
