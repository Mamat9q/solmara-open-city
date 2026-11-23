// Story missions: 10 jobs across 7 chapters. Each mission is a small state
// machine — drive to a marker, run taxi fares, win a race route, deliver, or
// escape a wanted level — with a payout and respect on completion.
import * as THREE from 'three';
import { MISSIONS, RACE_A, RACE_B } from './config.js';

export class MissionSys {
  constructor(game) {
    this.game = game;
    this.current = null; // {def, step, fares, checkpoint, timer, ...}
    this.done = new Set();
    this.marker = null;
    this.markerRing = null;
    this.markerLight = null;
  }

  list() {
    return MISSIONS.map((m) => ({ ...m, done: this.done.has(m.id) }));
  }

  start(id) {
    const def = MISSIONS.find((m) => m.id === id);
    if (!def || this.done.has(id)) return false;
    this.current = {
      def,
      step: 0,
      fares: 0,
      checkpoint: 0,
      timer: 0,
      raceRoute: def.type === 'race' ? (def.id === 4 ? RACE_A : RACE_B) : null,
      laps: 0,
    };
    this.showMarker(def.target[0], def.target[1]);
    this.game.hud.message(`Mission: ${def.name} — ${def.brief}`);
    if (def.type === 'escape') this.game.police.addWanted(def.id === 6 ? 3 : 5);
    if (def.type === 'race') this.showMarker(this.current.raceRoute[0][0], this.current.raceRoute[0][1]);
    return true;
  }

  showMarker(x, z) {
    this.hideMarker();
    const geo = new THREE.CylinderGeometry(4, 4, 0.4, 24);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.7 });
    this.marker = new THREE.Mesh(geo, mat);
    this.marker.position.set(x, 0.3, z);
    this.game.scene.add(this.marker);
    const ringGeo = new THREE.TorusGeometry(4, 0.25, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd24a });
    this.markerRing = new THREE.Mesh(ringGeo, ringMat);
    this.markerRing.rotation.x = Math.PI / 2;
    this.markerRing.position.set(x, 0.5, z);
    this.game.scene.add(this.markerRing);
  }

  hideMarker() {
    if (this.marker) {
      this.game.scene.remove(this.marker);
      this.marker = null;
    }
    if (this.markerRing) {
      this.game.scene.remove(this.markerRing);
      this.markerRing = null;
    }
  }

  markerPos() {
    if (!this.current) return null;
    if (this.current.def.type === 'race') {
      const cp = this.current.raceRoute[this.current.checkpoint % this.current.raceRoute.length];
      return { x: cp[0], z: cp[1] };
    }
    return { x: this.current.def.target[0], z: this.current.def.target[1] };
  }

  complete() {
    const m = this.current;
    if (!m) return;
    this.done.add(m.def.id);
    this.game.state.cash += m.def.payout;
    this.game.state.respect += 10 + m.def.chapter * 2;
    this.game.hud.message(`Mission complete: ${m.def.name} — +$${m.def.payout}`);
    this.game.audio.pickup();
    this.game.saveGame();
    this.current = null;
    this.hideMarker();
  }

  fail(reason) {
    if (!this.current) return;
    this.game.hud.message(`Mission failed: ${reason}`);
    this.current = null;
    this.hideMarker();
  }

  // Called when a taxi fare finishes.
  fareDone() {
    if (!this.current || this.current.def.type !== 'taxi') return;
    this.current.fares += 1;
    this.game.state.cash += 60;
    this.game.hud.message(`Fare ${this.current.fares}/2 complete — +$60`);
    if (this.current.fares >= 2) this.complete();
  }

  update(dt, playerPos) {
    if (this.markerRing) this.markerRing.rotation.z += dt * 1.5;
    const m = this.current;
    if (!m) return;
    m.timer += dt;
    const target = this.markerPos();
    if (!target) return;
    const d2 = (playerPos.x - target.x) ** 2 + (playerPos.z - target.z) ** 2;
    const near = d2 < 8 * 8;
    switch (m.def.type) {
      case 'drive':
      case 'deliver':
        if (near) this.complete();
        break;
      case 'escape':
        if (near && this.game.police.wanted === 0) this.complete();
        else if (m.timer > 240) this.fail('took too long');
        break;
      case 'race': {
        if (near) {
          m.checkpoint += 1;
          this.game.audio.pickup();
          if (m.checkpoint >= m.raceRoute.length) {
            m.laps += 1;
            m.checkpoint = 0;
            this.game.hud.message(`Lap ${m.laps}/3`);
            if (m.laps >= 3) this.complete();
          }
          const next = this.markerPos();
          this.showMarker(next.x, next.z);
        }
        if (m.timer > 420) this.fail('race timed out');
        break;
      }
      case 'taxi':
        if (m.timer > 300) this.fail('the passengers gave up');
        break;
      default:
        break;
    }
  }
}
