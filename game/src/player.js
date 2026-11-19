// The player on foot: a simple capsule figure, WASD movement relative to the
// camera heading, with a third-person camera rig in main.js.

import * as THREE from 'three';
import { PLAYER } from './config.js';

export function createPlayer(scene) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a6fd4, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.9, 4, 10), bodyMat);
  body.position.y = 1.05;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xd9a986, roughness: 0.7 }),
  );
  head.position.y = 1.95;
  group.add(head);
  const jacket = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.5, 0.45),
    new THREE.MeshStandardMaterial({ color: 0x1a1a20, roughness: 0.6 }),
  );
  jacket.position.y = 1.35;
  group.add(jacket);
  scene.add(group);

  const pos = new THREE.Vector3(0, 0, 8);
  group.position.copy(pos);

  const player = {
    group,
    pos,
    heading: 0,
    health: 100,
    armor: 0,
    reserve: 0,
    moving: false,
    update(dt, input, cameraHeading) {
      let mx = 0;
      let mz = 0;
      if (input.isHeld('KeyW')) mz -= 1;
      if (input.isHeld('KeyS')) mz += 1;
      if (input.isHeld('KeyA')) mx -= 1;
      if (input.isHeld('KeyD')) mx += 1;
      this.moving = mx !== 0 || mz !== 0;
      if (!this.moving) return;
      const len = Math.hypot(mx, mz);
      mx /= len;
      mz /= len;
      // Movement is relative to where the camera looks: forward is -mz, right is +mx.
      const sin = Math.sin(cameraHeading);
      const cos = Math.cos(cameraHeading);
      const wx = mx * cos - mz * sin;
      const wz = -mx * sin - mz * cos;
      const speed = input.isHeld('ShiftLeft') || input.isHeld('ShiftRight') ? PLAYER.runSpeed : PLAYER.walkSpeed;
      pos.x += wx * speed * dt;
      pos.z += wz * speed * dt;
      pos.x = Math.max(-158, Math.min(158, pos.x));
      pos.z = Math.max(-158, Math.min(158, pos.z));
      this.heading = Math.atan2(wx, wz);
      group.position.copy(pos);
      group.rotation.y = this.heading;
      group.position.y = Math.abs(Math.sin(performance.now() / 130)) * 0.05;
    },
  };
  return player;
}
