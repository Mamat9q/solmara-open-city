// The player on foot: a simple third-person walker with a run, a jump-less arcade
// feel, and enter/exit car. The player mesh is built from boxes — no assets.

import * as THREE from 'three';

export function createPlayer(G) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98a5f, roughness: 0.8 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0x2f7fd9, roughness: 0.85 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.36), shirt);
  body.position.y = 1.15;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
  head.position.y = 1.82;
  g.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.26), pants);
  legL.position.set(-0.17, 0.38, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.17;
  g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.2), shirt);
  armL.position.set(-0.42, 1.15, 0);
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.42;
  g.add(armR);
  // A visible weapon in hand when armed.
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.4, metalness: 0.7 }));
  gun.position.set(0.42, 1.05, 0.3);
  gun.visible = false;
  g.add(gun);
  G.scene.add(g);

  const player = {
    mesh: g, gun,
    x: 0, z: 40, heading: 0, speed: 0,
    inCar: false, walkPhase: 0,
    teleport(x, z, heading) {
      this.x = x;
      this.z = z;
      this.heading = heading;
      this.sync();
    },
    sync() {
      g.position.set(this.x, 0, this.z);
      g.rotation.y = this.heading;
    },
    /** On-foot step: move relative to camera yaw. Returns speed. */
    walk(dt, fwd, strafe, sprint, camYaw) {
      const sp = sprint ? 9 : 5;
      const mx = Math.sin(camYaw) * fwd + Math.cos(camYaw) * strafe;
      const mz = Math.cos(camYaw) * fwd - Math.sin(camYaw) * strafe;
      const len = Math.hypot(mx, mz) || 1;
      const moving = fwd !== 0 || strafe !== 0;
      if (moving) {
        this.x += (mx / len) * sp * dt;
        this.z += (mz / len) * sp * dt;
        this.heading = Math.atan2(mx, mz);
        this.walkPhase += dt * sp * 1.6;
        const s = Math.sin(this.walkPhase) * 0.35;
        legL.rotation.x = s;
        legR.rotation.x = -s;
        armL.rotation.x = -s * 0.7;
        armR.rotation.x = s * 0.7;
      } else {
        legL.rotation.x = 0;
        legR.rotation.x = 0;
        armL.rotation.x = 0;
        armR.rotation.x = 0;
      }
      const hit = G.world.collideCircle(this.x, this.z, 0.6);
      if (hit.hit) { this.x = hit.x; this.z = hit.z; }
      this.x = Math.max(-305, Math.min(305, this.x));
      this.z = Math.max(-305, Math.min(305, this.z));
      this.speed = moving ? sp : 0;
      this.sync();
      return this.speed;
    },
    setArmed(armed) { gun.visible = armed; },
  };
  return player;
}
