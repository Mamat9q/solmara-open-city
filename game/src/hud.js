// HUD: cash, wanted stars, health, speed, mission objective, radio station,
// message feed, minimap (2D canvas, top-down), start screen and pause overlay.
// All DOM, no canvas text — readable at a glance when shrunk.
export class HUD {
  constructor() {
    this.el = {};
    for (const id of ['cash', 'stars', 'health', 'speed', 'objective', 'radio', 'district', 'day', 'messages', 'minimap', 'start', 'pause', 'mission-list', 'crosshair', 'wheel', 'shop', 'shop-list', 'hud']) {
      this.el[id] = document.getElementById(id);
    }
    this.msgCount = 0;
  }

  setText(id, text) {
    const el = this.el[id];
    if (el && el.textContent !== text) el.textContent = text;
  }

  message(text) {
    const box = this.el.messages;
    if (!box) return;
    const div = document.createElement('div');
    div.textContent = text;
    box.prepend(div);
    this.msgCount += 1;
    while (box.children.length > 4) box.removeChild(box.lastChild);
  }

  showStart(missions) {
    const list = this.el['mission-list'];
    if (list) {
      list.innerHTML = missions.map((m) =>
        `<div class="mission-row${m.done ? ' done' : ''}"><span class="m-name">${m.chapter}. ${m.name}</span><span class="m-payout">$${m.payout}</span><span class="m-brief">${m.brief}</span></div>`,
      ).join('');
    }
    if (this.el.start) this.el.start.style.display = 'flex';
    if (this.el.hud) this.el.hud.style.display = 'none';
  }

  hideStart() {
    if (this.el.start) this.el.start.style.display = 'none';
    if (this.el.hud) this.el.hud.style.display = 'block';
  }

  showPause(show) {
    if (this.el.pause) this.el.pause.style.display = show ? 'flex' : 'none';
  }

  showWheel(show, weapons, current) {
    const w = this.el.wheel;
    if (!w) return;
    if (show) {
      w.innerHTML = weapons.map((wp, i) =>
        `<div class="wheel-item${i === current ? ' active' : ''}">${wp.key}. ${wp.name}</div>`,
      ).join('');
      w.style.display = 'flex';
    } else {
      w.style.display = 'none';
    }
  }

  showShop(show) {
    if (this.el.shop) this.el.shop.style.display = show ? 'flex' : 'none';
  }

  update(state) {
    this.setText('cash', `$${Math.floor(state.cash).toLocaleString('en-US')}`);
    this.setText('stars', '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted));
    this.setText('health', `HP ${Math.max(0, Math.round(state.health))}`);
    this.setText('speed', state.inCar ? `${Math.round(state.speedKmh)} km/h` : 'ON FOOT');
    this.setText('district', state.district);
    this.setText('day', `Day ${state.day} / 7 — ${state.chapter}`);
    this.setText('radio', state.radio);
    this.setText('objective', state.objective);
    const healthEl = this.el.health;
    if (healthEl) healthEl.style.color = state.health < 30 ? '#ff5555' : '#ffffff';
  }

  // Top-down minimap: roads as lines, player as a white wedge, police red,
  // mission marker gold, traffic pale dots.
  drawMinimap(world, playerPos, policeUnits, trafficCars, missionTarget) {
    const canvas = this.el.minimap;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const S = canvas.width;
    const scale = S / 640;
    const toX = (x) => S / 2 + x * scale;
    const toZ = (z) => S / 2 + z * scale;
    ctx.fillStyle = 'rgba(10, 16, 26, 0.85)';
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = '#3a4556';
    ctx.lineWidth = 2;
    for (let v = -240; v <= 240; v += 60) {
      ctx.beginPath(); ctx.moveTo(toX(v), toZ(-300)); ctx.lineTo(toX(v), toZ(300)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(toX(-300), toZ(v)); ctx.lineTo(toX(300), toZ(v)); ctx.stroke();
    }
    ctx.fillStyle = '#e8c98a';
    ctx.fillRect(toX(-300), toZ(285), S, 8);
    if (missionTarget) {
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath();
      ctx.arc(toX(missionTarget.x), toZ(missionTarget.z), 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#9fb8d8';
    for (const c of trafficCars) ctx.fillRect(toX(c.x) - 1, toZ(c.z) - 1, 2, 2);
    ctx.fillStyle = '#ff4444';
    for (const u of policeUnits) {
      ctx.beginPath();
      ctx.arc(toX(u.x), toZ(u.z), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(toX(playerPos.x), toZ(playerPos.z));
    ctx.rotate(-playerPos.heading);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
