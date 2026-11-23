// The player on foot: a simple articulated figure (capsule body, head, arms,
// legs that swing while walking), third-person camera, enter/exit cars with E.
import * as THREE from 'three';
import { CFG } from './config.js';
import { clamp } from './random.js';

export function makePersonMesh(shirt = 0x3a6fd9, pants = 0x222630) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.8 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.7, 4, 8), shirtMat);
  body.position.y = 1.05;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), skin);
  head.position.y = 1.78;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 1 }));
  hair.position.y = 1.82;
  g.add(hair);
  const limbs = [];
  for (const [x, y, len, mat] of [[-0.42, 1.35, 0.62, skin], [0.42, 1.35, 0.62, skin], [-0.18, 0.62, 0.6, pantsMat], [0.18, 0.62, 0.6, pantsMat]]) {
    const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, len, 6), mat);
    limb.position.set(x, y, 0);
    limb.geometry.translate(0, -len / 2, 0);
    g.add(limb);
    limbs.push(limb);
  }
  g.userData.limbs = limbs;
  return g;
}

export class Player {
  constructor(scene) {
    this.mesh = makePersonMesh();
    scene.add(this.mesh);
    this.x = 0;
    this.z = 0;
    this.heading = 0;
    this.speed = 0;
    this.inCar = null;
    this.health = 100;
    this.walkPhase = 0;
    this.visible = true;
  }

  place(x, z, heading) {
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = heading;
  }

  // move: {x: -1..1 strafe, z: -1..1 forward} in camera space; yaw from mouse.
  update(dt, move, yawDelta, collide) {
    if (this.inCar) return;
    this.heading -= yawDelta * 0.0022;
    const want = Math.hypot(move.x, move.z);
    const target = want > 0.1 ? (move.z > 0.5 ? CFG.player.runSpeed : CFG.player.walkSpeed) : 0;
    this.speed += (target - this.speed) * Math.min(1, dt * 10);
    if (this.speed > 0.05) {
      const a = this.heading + Math.atan2(move.x, move.z);
      this.x += Math.sin(a) * this.speed * dt;
      this.z += Math.cos(a) * this.speed * dt;
      this.walkPhase += dt * this.speed * 1.9;
    }
    if (collide) {
      const p = collide(this.x, this.z, 0.55);
      this.x = p.x;
      this.z = p.z;
    }
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    const swing = Math.sin(this.walkPhase) * clamp(this.speed / CFG.player.runSpeed, 0, 1) * 0.7;
    const limbs = this.mesh.userData.limbs;
    limbs[0].rotation.x = swing;
    limbs[1].rotation.x = -swing;
    limbs[2].rotation.x = -swing;
    limbs[3].rotation.x = swing;
  }

  enterCar(car) {
    this.inCar = car;
    this.mesh.visible = false;
  }

  exitCar() {
    if (!this.inCar) return null;
    const car = this.inCar;
    this.inCar = null;
    this.x = car.x - Math.sin(car.heading + Math.PI / 2) * 2.4;
    this.z = car.z - Math.cos(car.heading + Math.PI / 2) * 2.4;
    this.heading = car.heading;
    this.mesh.visible = true;
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    return car;
  }

  pos() {
    if (this.inCar) return { x: this.inCar.x, z: this.inCar.z, heading: this.inCar.heading, speed: this.inCar.speed };
    return { x: this.x, z: this.z, heading: this.heading, speed: this.speed };
  }
}
