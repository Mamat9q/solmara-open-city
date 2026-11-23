// Mara Voss on foot: a simple third-person walker with a chase camera that
// also frames the car. Camera pitch comes from the mouse when the pointer is
// locked; arrow keys nudge it otherwise. Entering a car hides the walker.
import * as THREE from 'three';
import { PLAYER_WALK, PLAYER_RUN, CITY_HALF } from './config.js';

export function createPlayer(scene) {
  const g = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0xff5d7a, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.35), jacket);
  body.position.y = 1.0;
  g.add(body);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.9 }));
  legs.position.y = 0.35;
  g.add(legs);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd9a986, roughness: 0.8 }));
  head.position.y = 1.7;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.5), new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 1 }));
  hair.position.y = 1.88;
  g.add(hair);
  g.position.set(0, 0, 40);
  scene.add(g);
  return {
    mesh: g,
    heading: 0,
    camYaw: 0,
    camPitch: 0.32,
    onFoot: true,
    speed: 0,
    vy: 0,
    grounded: true,
  };
}

/**
 * On-foot step. `drive` is the input direction, `look` the mouse delta,
 * `cam` the camera to place. Returns nothing; the walker moves relative to the
 * camera yaw so W always runs away from the camera.
 */
export function updatePlayerOnFoot(player, drive, look, dt, camera) {
  player.camYaw -= look.x * 0.0032;
  player.camPitch = THREE.MathUtils.clamp(player.camPitch + look.y * 0.0024, 0.08, 1.1);
  const speed = drive.run ? PLAYER_RUN : PLAYER_WALK;
  const sin = Math.sin(player.camYaw);
  const cos = Math.cos(player.camYaw);
  let mx = 0; let mz = 0;
  if (drive.forward !== 0) { mx += -sin * drive.forward; mz += -cos * drive.forward; }
  if (drive.steer !== 0) { mx += -cos * drive.steer; mz += sin * drive.steer; }
  const len = Math.hypot(mx, mz);
  if (len > 0) {
    mx /= len; mz /= len;
    player.mesh.position.x += mx * speed * dt;
    player.mesh.position.z += mz * speed * dt;
    player.heading = Math.atan2(mx, mz);
    player.mesh.rotation.y = player.heading;
    player.speed = speed;
    // Walk bob.
    player.mesh.children[0].position.y = 1.0 + Math.abs(Math.sin(performance.now() * 0.014)) * 0.05;
  } else {
    player.speed = 0;
  }
  player.mesh.position.x = THREE.MathUtils.clamp(player.mesh.position.x, -CITY_HALF + 4, CITY_HALF - 4);
  player.mesh.position.z = THREE.MathUtils.clamp(player.mesh.position.z, -CITY_HALF + 4, CITY_HALF - 4);
  // Simple jump.
  if (player.grounded && drive.jump) { player.vy = 6.5; player.grounded = false; }
  if (!player.grounded) {
    player.vy -= 18 * dt;
    player.mesh.position.y += player.vy * dt;
    if (player.mesh.position.y <= 0) { player.mesh.position.y = 0; player.vy = 0; player.grounded = true; }
  }
  placeCamera(camera, player.mesh.position, player.camYaw, player.camPitch, 7, 2.2);
}

export function placeCamera(camera, target, yaw, pitch, dist, height) {
  const cx = target.x + Math.sin(yaw) * Math.cos(pitch) * dist;
  const cz = target.z + Math.cos(yaw) * Math.cos(pitch) * dist;
  const cy = target.y + height + Math.sin(pitch) * dist;
  camera.position.set(cx, Math.max(1.2, cy), cz);
  camera.lookAt(target.x, target.y + 1.4, target.z);
}

/** Chase camera behind the car, smoothing toward the car's heading. */
export function updateCarCamera(camera, car, dt) {
  const back = car.heading + Math.PI;
  const dist = 9.5;
  const tx = car.mesh.position.x + Math.sin(back) * dist;
  const tz = car.mesh.position.z + Math.cos(back) * dist;
  const k = Math.min(1, dt * 5);
  camera.position.x += (tx - camera.position.x) * k;
  camera.position.y += (3.4 - camera.position.y) * k;
  camera.position.z += (tz - camera.position.z) * k;
  camera.lookAt(car.mesh.position.x, 1.4, car.mesh.position.z);
}
