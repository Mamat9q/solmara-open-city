// The player on foot: a simple walker who can steal any parked car with E.
import * as THREE from '../vendor/three.module.min.js';
import { PLAYER, WORLD, CAR } from './config.js';

function makePlayerMesh() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0xd84a2a, roughness: 0.7 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a077, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.95, 10), jacket);
  body.position.y = 1.05;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), skin);
  head.position.y = 1.78;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.12, 12), pants);
  cap.position.y = 1.98;
  g.add(cap);
  for (const x of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.62, 8), pants);
    leg.position.set(x, 0.31, 0);
    g.add(leg);
  }
  return g;
}

export class Player {
  constructor(scene) {
    this.group = makePlayerMesh();
    scene.add(this.group);
    this.pos = new THREE.Vector3(2, 0, 6);
    this.group.position.copy(this.pos);
    this.heading = 0;
    this.reserve = 24; // spare rounds
    this.ammo = 12; // rounds in the magazine
    this.health = 100;
    this.walkBob = 0;
  }

  update(dt, input, state) {
    if (state.currentCar) return; // driving is the car's job
    const fwd = (input.isDown('KeyW') ? 1 : 0) - (input.isDown('KeyS') ? 1 : 0);
    const strafe = (input.isDown('KeyD') ? 1 : 0) - (input.isDown('KeyA') ? 1 : 0);
    if (fwd === 0 && strafe === 0) return;
    const run = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const yaw = state.cameraYaw;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    let dx = (sin * fwd + cos * strafe) * speed * dt;
    let dz = (cos * fwd - sin * strafe) * speed * dt;
    const len = Math.hypot(dx, dz);
    if (len > speed * dt) {
      dx = (dx / len) * speed * dt;
      dz = (dz / len) * speed * dt;
    }
    this.pos.x += dx;
    this.pos.z += dz;
    const b = WORLD.size / 2 - 4;
    this.pos.x = Math.max(-b, Math.min(b, this.pos.x));
    this.pos.z = Math.max(-b, Math.min(b, this.pos.z));
    this.heading = Math.atan2(dx, dz);
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.heading;
    this.walkBob += dt * 9;
    this.group.position.y = Math.abs(Math.sin(this.walkBob)) * 0.06;
  }

  // E near a parked car: steal it. Returns the car or null.
  tryEnterCar(state) {
    const car = state.vehicles.nearestCar(this.pos.x, this.pos.z, CAR.enterRadius);
    if (!car) return null;
    if (!car.stolen) {
      car.stolen = true;
      if (state.wanted < 1) state.wanted = 1; // grand theft auto
      state.toast(`Stole a ${car.def.name} — the law noticed`);
    }
    state.currentCar = car;
    car.heading = this.heading;
    return car;
  }

  exitCar(state) {
    const car = state.currentCar;
    if (!car) return;
    state.currentCar = null;
    this.pos.set(car.x + 2.5, 0, car.z + 1.5);
    this.group.position.copy(this.pos);
  }
}
