// SOLMARA combat: the player's pistol — magazine, reserve, reload — and
// the damage the player takes, halved while Kevlar is owned.

import * as THREE from 'three';
import { PLAYER } from './config.js';

export class Combat {
  constructor(game) {
    this.game = game;
  }

  shoot() {
    const player = this.game.player;
    if (player.ammo <= 0) {
      this.game.toast('Magazine empty — press R to reload.');
      return;
    }
    player.ammo -= 1;
    this.game.audio.gunshot();
    this.game.pedestrians.scareAt(player.pos.x, player.pos.z, 18);
    const camera = this.game.camera;
    const aim = new THREE.Vector3();
    camera.getWorldDirection(aim);
    let bestEnemy = null;
    let bestScore = Infinity;
    for (const enemy of this.game.missions.enemies) {
      if (!enemy.alive) continue;
      const toEnemy = new THREE.Vector3(enemy.x - camera.position.x, 1.2 - camera.position.y, enemy.z - camera.position.z);
      const dist = toEnemy.length();
      if (dist > PLAYER.gunRange) continue;
      toEnemy.normalize();
      const alignment = toEnemy.dot(aim);
      if (alignment < 0.985) continue;
      const score = dist - alignment * 10;
      if (score < bestScore) {
        bestScore = score;
        bestEnemy = enemy;
      }
    }
    if (bestEnemy) {
      bestEnemy.damage(PLAYER.gunDamage);
      this.game.toast(bestEnemy.alive ? 'Hit the Syndicate crew.' : 'Syndicate crew down.');
      if (!bestEnemy.alive && this.game.wanted < 1) this.game.wanted = Math.min(4, this.game.wanted + 0);
    }
    this.game.muzzleFlash = 0.06;
  }

  reload() {
    const player = this.game.player;
    const needed = PLAYER.magazineSize - player.ammo;
    if (needed <= 0) return;
    if (player.reserve <= 0) {
      this.game.toast('No reserve ammo — buy more at Solmara Arms.');
      return;
    }
    const taken = Math.min(needed, player.reserve);
    player.reserve -= taken;
    player.ammo += taken;
    this.game.audio.blip(440, 0.07);
    this.game.toast(`Reloaded — ${player.ammo} in the magazine, ${player.reserve} in reserve.`);
  }

  hurtPlayer(amount, cause) {
    const player = this.game.player;
    if (this.game.screen !== 'playing') return;
    const reduced = this.game.shopOwned.includes('kevlar') ? amount / 2 : amount;
    player.health -= reduced;
    this.game.flashDamage();
    if (player.health <= 0) {
      player.health = 0;
      this.game.die(cause || 'taken down');
    }
  }
}
