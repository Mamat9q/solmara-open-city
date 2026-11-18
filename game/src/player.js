// Dario Venn on foot: WASD movement relative to camera yaw, sprint, jump with
// gravity, third-person camera, simple capsule mesh + aim pose, health.
import * as THREE from 'three';
export function createPlayer(scene, world) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2a6fd8 });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xd8a070 });
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x222831 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.0, 10), bodyMat); body.position.y = 1.05; group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), skinMat); head.position.y = 1.78; group.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.1, 12), new THREE.MeshLambertMaterial({ color: 0xd84a4a })); cap.position.y = 1.98; group.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), pantsMat); legL.position.set(-0.16, 0.28, 0); group.add(legL);
  const legR = legL.clone(); legR.position.x = 0.16; group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.16), bodyMat); armL.position.set(-0.46, 1.15, 0); group.add(armL);
  const armR = armL.clone(); armR.position.x = 0.46; group.add(armR);
  scene.add(group);
  const p = {
    group, pos: new THREE.Vector3(0, 0, 20), yaw: Math.PI, camPitch: 0.25, vy: 0, grounded: true,
    health: 100, maxHealth: 100, speed: 0, weapon: 'pistol', ammo: 12, reserve: 48,
    // Walk/run animation phase, driven by speed.
    anim: 0,
    reset(x, z) { p.pos.set(x, 0, z); p.yaw = Math.PI; p.vy = 0; p.health = 100; p.ammo = 12; p.reserve = 48; },
    update(dt, input, camYaw) {
      const look = input.consumeLook();
      p.yaw -= look.dx * 0.0028;
      p.camPitch = Math.max(-0.5, Math.min(0.9, p.camPitch + look.dy * 0.0022));
      let fx = 0, fz = 0;
      if (input.down) fz += 1; if (input.back) fz -= 1;
      if (input.left) fx -= 1; if (input.right) fx += 1;
      const len = Math.hypot(fx, fz) || 1; fx /= len; fz /= len;
      const sprint = input.sprint ? 1.65 : 1;
      const sp = 6.5 * sprint;
      // Movement is relative to the camera yaw: W walks away from the camera
      // (forward = sin/cos of camYaw), A/D strafe perpendicular to it.
      const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
      const mx = (fx * cos + fz * sin) * sp, mz = (-fx * sin + fz * cos) * sp;
      const tx = p.pos.x + mx * dt, tz = p.pos.z + mz * dt;
      const hit = world.collide(tx, tz, 0.5);
      p.pos.x = hit.x; p.pos.z = hit.z;
      p.speed = Math.hypot(mx, mz) * (fx || fz ? 1 : 0);
      if (input.jump && p.grounded) { p.vy = 7.5; p.grounded = false; }
      p.vy -= 22 * dt; p.pos.y += p.vy * dt;
      if (p.pos.y <= 0) { p.pos.y = 0; p.vy = 0; p.grounded = true; }
      // Face movement direction when moving, else face camera direction.
      if (p.speed > 0.5) p.yaw = Math.atan2(mx, mz);
      p.anim += dt * p.speed * 1.6;
      const sw = Math.sin(p.anim) * Math.min(0.6, p.speed * 0.09);
      legL.rotation.x = sw; legR.rotation.x = -sw; armL.rotation.x = -sw; armR.rotation.x = sw;
      group.position.copy(p.pos); group.rotation.y = p.yaw;
      return p.speed;
    },
    heal(v) { p.health = Math.min(p.maxHealth, p.health + v); },
    damage(v) { p.health = Math.max(0, p.health - v); return p.health <= 0; },
  };
  p.reset(0, 20);
  return p;
}
// Third-person camera: orbits behind the player, or behind the car when driving.
export function updateCamera(camera, targetPos, yaw, pitch, dist, dt, shake) {
  const cx = targetPos.x - Math.sin(yaw) * Math.cos(pitch) * dist;
  const cz = targetPos.z - Math.cos(yaw) * Math.cos(pitch) * dist;
  const cy = targetPos.y + 1.8 + Math.sin(pitch) * dist;
  camera.position.set(cx, Math.max(0.6, cy), cz);
  if (shake > 0.01) camera.position.x += (Math.random() - 0.5) * shake * 0.5, camera.position.y += (Math.random() - 0.5) * shake * 0.4;
  camera.lookAt(targetPos.x, targetPos.y + 1.4, targetPos.z);
}
