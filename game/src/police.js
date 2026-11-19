// SOLMARA police: the wanted level, four cruisers that chase the player,
// and striped roadblocks that go up at three stars. A cruiser's top speed
// grows with the wanted level — 36 units/s plus 3.2 per star — so a four-star
// chase tops out near 176 km/h.

import * as THREE from 'three';
import { POLICE, CITY } from './config.js';
import { makeCarMesh } from './vehicles.js';

export class PoliceManager {
  constructor(scene, world) {
    this.world = world;
    this.copCars = [];
    for (let i = 0; i < POLICE.cruiserCount; i += 1) {
      const group = makeCarMesh({ name: 'Cruiser', topSpeed: 49, accel: 24, turn: 2.4, color: 0x1a1a22, length: 4.5, width: 2.0 });
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.22, 0.5),
        new THREE.MeshBasicMaterial({ color: 0x2244ff }),
      );
      bar.position.set(0, 1.75, 0);
      group.add(bar);
      group.visible = false;
      scene.add(group);
      this.copCars.push({
        group, x: 0, z: 0, heading: 0, speed: 0, active: false, ramCooldown: 0,
      });
    }
  }

  topSpeedFor(wanted) {
    return POLICE.baseTopSpeed + wanted * POLICE.topSpeedPerStar;
  }

  deployRoadblocks(playerPos) {
    const spots = [
      { x: playerPos.x + 26, z: playerPos.z },
      { x: playerPos.x - 26, z: playerPos.z },
      { x: playerPos.x, z: playerPos.z + 26 },
    ];
    this.world.roadblocks.forEach((block, i) => {
      const spot = spots[i % spots.length];
      const line = CITY.roadLines.reduce((best, lineValue) =>
        Math.abs(lineValue - spot.x) < Math.abs(best - spot.x) ? lineValue : best, 0);
      block.x = line;
      block.z = Math.max(-110, Math.min(110, spot.z));
      block.group.position.set(block.x, 0, block.z);
      block.group.visible = true;
      block.active = true;
    });
  }

  clearRoadblocks() {
    for (const block of this.world.roadblocks) {
      block.active = false;
      block.group.visible = false;
    }
  }

  update(dt, game, audio) {
    const wanted = game.wanted;
    const playerPos = game.player.pos;
    const needed = wanted > 0 ? Math.min(POLICE.cruiserCount, wanted + 1) : 0;
    let activeCount = 0;
    for (const cop of this.copCars) {
      if (activeCount < needed && !cop.active) {
        cop.active = true;
        const angle = Math.random() * Math.PI * 2;
        cop.x = playerPos.x + Math.sin(angle) * 42;
        cop.z = playerPos.z + Math.cos(angle) * 42;
        cop.speed = 0;
        cop.group.visible = true;
      }
      if (cop.active) activeCount += 1;
      if (wanted === 0 && cop.active) {
        cop.active = false;
        cop.group.visible = false;
        cop.speed = 0;
      }
    }
    if (wanted >= POLICE.roadblockStars) this.deployRoadblocks(playerPos);
    else if (wanted === 0) this.clearRoadblocks();

    const cap = this.topSpeedFor(wanted);
    for (const cop of this.copCars) {
      if (!cop.active) continue;
      const dx = playerPos.x - cop.x;
      const dz = playerPos.z - cop.z;
      const dist = Math.hypot(dx, dz) || 1;
      const wantHeading = Math.atan2(dx, dz);
      let turn = wantHeading - cop.heading;
      while (turn > Math.PI) turn -= Math.PI * 2;
      while (turn < -Math.PI) turn += Math.PI * 2;
      cop.heading += Math.max(-2.6 * dt, Math.min(2.6 * dt, turn));
      cop.speed += (cap - cop.speed) * Math.min(1, dt * 0.55);
      cop.x += Math.sin(cop.heading) * cop.speed * dt;
      cop.z += Math.cos(cop.heading) * cop.speed * dt;
      cop.group.position.set(cop.x, 0, cop.z);
      cop.group.rotation.y = cop.heading;
      cop.ramCooldown -= dt;
      if (dist < 3.2 && cop.ramCooldown <= 0) {
        cop.ramCooldown = 1.2;
        cop.speed *= 0.4;
        if (game.hurtPlayer) game.hurtPlayer(POLICE.ramDamage, 'rammed by a cruiser');
      }
    }
    if (audio) audio.setSiren(wanted > 0, game.elapsedTime || 0);
  }
}
