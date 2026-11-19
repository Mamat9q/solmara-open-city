// SOLMARA missions: seven chapters from Mara Kessler, each a drive to an
// open-road target, then a fight with the Hollow Point crew waiting there.
// Finishing one pays out, advances the hurricane day and autosaves.

import { MISSIONS, MISSION_ARRIVE_RADIUS } from './config.js';
import { Enemy } from './people.js';

export class MissionManager {
  constructor(scene) {
    this.scene = scene;
    this.active = null;
    this.enemies = [];
  }

  currentDef(missionIndex) {
    return MISSIONS[Math.min(missionIndex, MISSIONS.length - 1)];
  }

  start(missionIndex) {
    const def = this.currentDef(missionIndex);
    if (!def) return null;
    this.clearEnemies();
    this.active = {
      id: def.id,
      title: def.title,
      chapter: def.chapter,
      giver: def.giver,
      brief: def.brief,
      target: { x: def.target.x, z: def.target.z },
      payout: def.payout,
      enemiesTotal: def.enemies,
      stage: 'goto',
    };
    return this.active;
  }

  clearEnemies() {
    for (const enemy of this.enemies) enemy.remove(this.scene);
    this.enemies = [];
  }

  spawnEnemies() {
    const def = this.active;
    if (!def) return;
    const count = def.enemiesTotal;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / Math.max(1, count)) * Math.PI * 2 + 0.6;
      const enemy = new Enemy(
        this.scene,
        def.target.x + Math.sin(angle) * 11,
        def.target.z + Math.cos(angle) * 11,
      );
      this.enemies.push(enemy);
    }
    if (count > 0) def.stage = 'fight';
  }

  update(dt, game) {
    if (!this.active) return null;
    const playerPos = game.player.pos;
    const target = this.active.target;
    const dist = Math.hypot(playerPos.x - target.x, playerPos.z - target.z);
    if (this.active.stage === 'goto' && dist < MISSION_ARRIVE_RADIUS) {
      if (this.active.enemiesTotal > 0) {
        this.spawnEnemies();
        return { event: 'fight', mission: this.active };
      }
      return this.complete(game);
    }
    if (this.active.stage === 'fight') {
      const alive = this.enemies.filter((e) => e.alive);
      for (const enemy of alive) {
        enemy.update(dt, playerPos, (damage) => {
          if (game.hurtPlayer) game.hurtPlayer(damage, 'shot by the Syndicate');
        });
      }
      if (alive.length === 0) return this.complete(game);
    }
    return null;
  }

  complete(game) {
    const finished = this.active;
    this.clearEnemies();
    this.active = null;
    game.cash += finished.payout;
    game.missionIndex = Math.min(game.missionIndex + 1, MISSIONS.length);
    game.advanceDay();
    if (game.audio) game.audio.cash();
    if (game.saveNow) game.saveNow();
    return { event: 'complete', mission: finished };
  }

  cancel() {
    this.clearEnemies();
    this.active = null;
  }

  objectiveText(missionIndex) {
    if (this.active) {
      if (this.active.stage === 'fight') {
        const left = this.enemies.filter((e) => e.alive).length;
        return `${this.active.title}: take out the Syndicate crew (${left} left)`;
      }
      return `${this.active.title}: reach the marker`;
    }
    if (missionIndex >= MISSIONS.length) return 'All seven chapters complete — Solmara is yours.';
    const next = MISSIONS[missionIndex];
    return `Press M to start ${next.chapter}: ${next.title} ($${next.payout})`;
  }
}
