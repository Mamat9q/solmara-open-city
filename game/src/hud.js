// HUD: cash, day, wanted stars, speed, mission line, toast messages and a
// live top-down minimap drawn on a 2D canvas.
import { WORLD } from './config.js';

export class HUD {
  constructor() {
    this.cash = document.getElementById('hud-cash');
    this.day = document.getElementById('hud-day');
    this.stars = document.getElementById('hud-stars');
    this.speed = document.getElementById('hud-speed');
    this.mission = document.getElementById('hud-mission');
    this.toast = document.getElementById('toast');
    this.map = document.getElementById('minimap');
    this.mapCtx = this.map ? this.map.getContext('2d') : null;
    this._toastTimer = null;
  }

  showToast(text) {
    if (!this.toast) return;
    this.toast.textContent = text;
    this.toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toast.classList.remove('show'), 3600);
  }

  update(state) {
    if (this.cash) this.cash.textContent = `$${state.cash}`;
    if (this.day) this.day.textContent = `Day ${state.hurricane.day} / 7`;
    if (this.stars) {
      this.stars.textContent = '★'.repeat(state.wanted) + '☆'.repeat(Math.max(0, 5 - state.wanted));
      this.stars.classList.toggle('hot', state.wanted > 0);
    }
    if (this.speed) {
      const s = state.currentCar ? Math.abs(state.currentCar.speed) * 3.6 : 0;
      this.speed.textContent = state.currentCar ? `${Math.round(s)} km/h` : 'on foot';
    }
    if (this.mission) {
      this.mission.textContent = state.missions.active
        ? `Chapter ${state.missions.active.id}: ${state.missions.active.title}`
        : state.missionIndex >= 7
          ? 'Story complete — Solmara is yours'
          : 'Press M for the next mission';
    }
    this.drawMap(state);
  }

  drawMap(state) {
    const ctx = this.mapCtx;
    if (!ctx) return;
    const S = 168;
    const scale = S / WORLD.size;
    const px = (v) => (v + WORLD.size / 2) * scale;
    ctx.fillStyle = '#10131c';
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = '#2c3345';
    ctx.lineWidth = 1;
    for (let k = 0; k <= WORLD.size / WORLD.block; k++) {
      const c = px(-WORLD.size / 2 + k * WORLD.block);
      ctx.beginPath();
      ctx.moveTo(c, 0);
      ctx.lineTo(c, S);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, c);
      ctx.lineTo(S, c);
      ctx.stroke();
    }
    // Ocean.
    ctx.fillStyle = '#0e2a44';
    ctx.fillRect(0, 0, 8, S);
    // Mission target.
    if (state.missions.active) {
      const t = state.missions.active.target;
      ctx.fillStyle = '#37e07a';
      ctx.beginPath();
      ctx.arc(px(t.x), px(t.z), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#37e07a';
      ctx.beginPath();
      ctx.arc(px(t.x), px(t.z), 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Parked cars.
    ctx.fillStyle = '#e8b73a';
    for (const c of state.vehicles.cars) {
      ctx.fillRect(px(c.x) - 1.5, px(c.z) - 1.5, 3, 3);
    }
    // Cops.
    ctx.fillStyle = '#ff3b30';
    for (const cop of state.police.copCars) {
      if (!cop.active) continue;
      ctx.beginPath();
      ctx.arc(px(cop.x), px(cop.z), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Player.
    const p = state.currentCar
      ? { x: state.currentCar.x, z: state.currentCar.z }
      : { x: state.player.pos.x, z: state.player.pos.z };
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px(p.x), px(p.z), 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
