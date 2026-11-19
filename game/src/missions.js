// The seven-chapter hurricane story. A mission is a drive-to-waypoint job:
// reach the green beacon to finish it, earn the reward, and roll into the
// next day. The beacon is a tall green pillar plus a minimap marker.
import * as THREE from 'three';
import { CHAPTERS } from './config.js';
import { dist2 } from './random.js';

export class Missions {
  constructor(scene) {
    this.scene = scene;
    this.index = 0;
    this.done = false;
    this.beacon = null;
    this.ring = null;
    this.beaconLight = null;
  }

  get chapter() {
    return CHAPTERS[this.index];
  }

  get target() {
    return this.chapter.target;
  }

  start(index) {
    this.index = index;
    this.done = false;
    this.clearBeacon();
    const [tx, tz] = this.target;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, 90, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x39ff6a, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
    );
    pillar.position.set(tx, 45, tz);
    this.scene.add(pillar);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(6, 9, 32),
      new THREE.MeshBasicMaterial({ color: 0x39ff6a, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(tx, 0.08, tz);
    this.scene.add(ring);
    const light = new THREE.PointLight(0x39ff6a, 80, 60, 1.6);
    light.position.set(tx, 8, tz);
    this.scene.add(light);
    this.beacon = pillar;
    this.ring = ring;
    this.beaconLight = light;
  }

  clearBeacon() {
    for (const m of [this.beacon, this.ring]) if (m) this.scene.remove(m);
    if (this.beaconLight) this.scene.remove(this.beaconLight);
    this.beacon = null;
    this.ring = null;
    this.beaconLight = null;
  }

  // Returns the reward when the target is reached, else 0.
  step(x, z) {
    if (this.done) return 0;
    const [tx, tz] = this.target;
    if (dist2(x, z, tx, tz) < 100) {
      this.done = true;
      this.clearBeacon();
      return this.chapter.reward;
    }
    return 0;
  }

  advance() {
    if (this.index < CHAPTERS.length - 1) {
      this.start(this.index + 1);
      return true;
    }
    return false;
  }

  stepBeacon(dt, t) {
    if (this.beacon) {
      this.beacon.material.opacity = 0.2 + 0.12 * Math.sin(t * 3);
      this.ring.scale.setScalar(1 + 0.12 * Math.sin(t * 3));
    }
  }
}
