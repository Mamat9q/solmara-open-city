// HUD: cash, hurricane day, wanted stars, speed, mission line, ammo, health,
// toasts, and a 2D minimap of the city.

import { CITY } from './config.js';

export function createHud(state) {
  const el = (id) => document.getElementById(id);
  const canvas = el('minimap');
  const mctx = canvas ? canvas.getContext('2d') : null;

  function fmtCash(n) {
    return `$${Math.floor(n).toLocaleString('en-US')}`;
  }

  function update() {
    const cashEl = el('hud-cash');
    if (cashEl) cashEl.textContent = fmtCash(state.cash);
    const dayEl = el('hud-day');
    if (dayEl) dayEl.textContent = `Day ${state.hurricane.day} / 7 — Hurricane in ${7 - state.hurricane.day + 1} day${7 - state.hurricane.day + 1 === 1 ? '' : 's'}`;
    const wantedEl = el('hud-wanted');
    if (wantedEl) {
      wantedEl.textContent = '★'.repeat(state.wanted) + '☆'.repeat(Math.max(0, 4 - state.wanted));
      wantedEl.classList.toggle('hot', state.wanted > 0);
    }
    const speedEl = el('hud-speed');
    if (speedEl) {
      const s = state.currentCar ? Math.abs(state.currentCar.speed) : 0;
      speedEl.textContent = `${Math.round(s * 3.6)} km/h`;
    }
    const ammoEl = el('hud-ammo');
    if (ammoEl) ammoEl.textContent = `Ammo ${state.player.reserve}`;
    const healthEl = el('hud-health');
    if (healthEl) healthEl.textContent = `HP ${Math.round(state.player.health ?? 100)}`;
    const missionEl = el('hud-mission');
    if (missionEl) {
      missionEl.textContent = state.missions.active
        ? `${state.missions.active.title} — reach the yellow marker`
        : state.missionIndex >= 7
          ? 'All chapters done — the boat is waiting.'
          : 'Press M for the next job';
    }
    const carEl = el('hud-car');
    if (carEl) carEl.textContent = state.currentCar ? state.currentCar.def.name : 'On foot';
    drawMinimap();
  }

  function drawMinimap() {
    if (!mctx || !canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    const scale = W / (CITY.half * 2 + 20);
    const toMap = (x, z) => [W / 2 + x * scale, H / 2 + z * scale];
    mctx.fillStyle = 'rgba(10, 10, 18, 0.85)';
    mctx.fillRect(0, 0, W, H);
    // Streets.
    mctx.strokeStyle = 'rgba(140, 140, 170, 0.7)';
    mctx.lineWidth = 2;
    for (let k = -4; k <= 4; k++) {
      const [x1, y1] = toMap(k * 40, -CITY.half);
      const [x2, y2] = toMap(k * 40, CITY.half);
      mctx.beginPath();
      mctx.moveTo(x1, y1);
      mctx.lineTo(x2, y2);
      mctx.stroke();
      const [x3, y3] = toMap(-CITY.half, k * 40);
      const [x4, y4] = toMap(CITY.half, k * 40);
      mctx.beginPath();
      mctx.moveTo(x3, y3);
      mctx.lineTo(x4, y4);
      mctx.stroke();
    }
    // Shops.
    mctx.fillStyle = '#ffe14d';
    for (const shop of state.world.shops) {
      const [x, y] = toMap(shop.x, shop.z);
      mctx.fillRect(x - 3, y - 3, 6, 6);
    }
    // Mission beacon.
    if (state.missions.active) {
      const [x, y] = toMap(state.missions.active.target.x, state.missions.active.target.z);
      mctx.fillStyle = '#ffe14d';
      mctx.beginPath();
      mctx.arc(x, y, 6, 0, Math.PI * 2);
      mctx.fill();
      mctx.strokeStyle = '#ffe14d';
      mctx.beginPath();
      mctx.arc(x, y, 10, 0, Math.PI * 2);
      mctx.stroke();
    }
    // Cops.
    mctx.fillStyle = '#ff2d55';
    for (const cop of state.police.copCars) {
      if (!cop.active) continue;
      const [x, y] = toMap(cop.x, cop.z);
      mctx.beginPath();
      mctx.arc(x, y, 3, 0, Math.PI * 2);
      mctx.fill();
    }
    // Player arrow.
    const [px, py] = toMap(state.player.pos.x, state.player.pos.z);
    mctx.save();
    mctx.translate(px, py);
    mctx.rotate(state.player.heading);
    mctx.fillStyle = '#ffffff';
    mctx.beginPath();
    mctx.moveTo(0, -6);
    mctx.lineTo(4, 5);
    mctx.lineTo(-4, 5);
    mctx.closePath();
    mctx.fill();
    mctx.restore();
  }

  let toastTimer = null;
  function toast(msg, ms = 3500) {
    const t = el('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => t.classList.remove('show'), ms);
  }

  return { update, toast };
}
