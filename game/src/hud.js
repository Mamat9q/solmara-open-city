// HUD + minimap for Solmara: health, cash, wanted stars, ammo, speed, clock,
// objective banner, message feed, dialogue lines, live 2D top-down minimap.
export function createHud() {
  const $ = (id) => document.getElementById(id);
  const feed = $('feed');
  function setText(id, v) { const el = $(id); if (el) el.textContent = v; }
  return {
    message(text) {
      if (!feed) return;
      const d = document.createElement('div'); d.textContent = text; feed.prepend(d);
      while (feed.children.length > 5) feed.removeChild(feed.lastChild);
    },
    say(line) { const el = $('dialogue'); if (el) { el.textContent = line; el.style.opacity = 1; clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = 0; }, 4200); } },
    update(state) {
      setText('health-value', Math.ceil(state.player.health) + '');
      const hb = $('health-fill'); if (hb) hb.style.width = Math.max(0, state.player.health) + '%';
      setText('cash-value', '$' + state.cash.toLocaleString('en-US'));
      setText('stars-value', '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted));
      setText('ammo-value', state.player.weapon === 'fists' ? 'FISTS' : `${state.player.ammo} / ${state.player.reserve}`);
      setText('weapon-value', state.player.weapon === 'fists' ? 'Fists' : 'Pistol');
      const speedEl = $('speed-box');
      if (speedEl) {
        if (state.currentCar) { speedEl.style.display = 'block'; setText('speed-value', Math.round(Math.abs(state.currentCar.speed) * 3.6) + ''); }
        else speedEl.style.display = 'none';
      }
      setText('objective-text', state.objective || '');
      const h = Math.floor(state.clock) % 24, m = Math.floor((state.clock % 1) * 60);
      setText('clock-value', `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      setText('mission-value', state.missionIndex >= 5 ? 'All done' : `Mission ${state.missionIndex + 1}/5`);
      const vig = $('vignette');
      if (vig) vig.style.opacity = state.player.health < 40 ? String((40 - state.player.health) / 40 * 0.85) : '0';
      const hint = $('hint');
      if (hint) {
        if (state.nearCar && !state.currentCar) hint.textContent = `Press E to steal the ${state.nearCar.def.name}`;
        else if (state.currentCar) hint.textContent = 'Press E to exit · Space = handbrake';
        else hint.textContent = 'WASD move · E enter car · M missions · Esc pause';
      }
      this.drawMinimap(state);
    },
    drawMinimap(state) {
      const c = $('minimap'); if (!c) return;
      const g = c.getContext('2d'); const W = c.width, H = c.height;
      const scale = W / 560;
      const toX = (x) => (x + 280) * scale, toY = (z) => (z + 280) * scale;
      g.fillStyle = '#0e1a24'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#2c4a63'; g.fillRect(0, toY(260), W, H - toY(260)); // sea
      g.fillStyle = '#e8d49a'; g.fillRect(0, toY(250), W, 12); // beach
      g.strokeStyle = '#5a6a78'; g.lineWidth = 5;
      for (const v of state.world.roadLines) {
        g.beginPath(); g.moveTo(toX(-280), toY(v)); g.lineTo(toX(280), toY(v)); g.stroke();
        g.beginPath(); g.moveTo(toX(v), toY(-280)); g.lineTo(toX(v), toY(280)); g.stroke();
      }
      // Waypoint.
      const wp = state.missions.waypoint(state);
      if (wp) {
        g.fillStyle = wp.color; g.beginPath(); g.arc(toX(wp.x), toY(wp.z), 7, 0, Math.PI * 2); g.fill();
        g.strokeStyle = wp.color; g.beginPath(); g.arc(toX(wp.x), toY(wp.z), 11 + Math.sin(performance.now() / 200) * 2, 0, Math.PI * 2); g.stroke();
      }
      // Police dots.
      g.fillStyle = '#3a8cff';
      for (const pc of state.police.copCars) if (pc.active) { g.beginPath(); g.arc(toX(pc.x), toY(pc.z), 4, 0, Math.PI * 2); g.fill(); }
      // Cars.
      g.fillStyle = '#c8c8c8';
      for (const car of state.vehicles.cars) { g.fillRect(toX(car.x) - 2, toY(car.z) - 2, 4, 4); }
      // Player arrow.
      const px = toX(state.player.pos.x), py = toY(state.player.pos.z);
      const yaw = state.currentCar ? state.currentCar.yaw : state.player.yaw;
      g.save(); g.translate(px, py); g.rotate(Math.atan2(Math.sin(yaw), Math.cos(yaw)) + Math.PI);
      g.fillStyle = '#ffd94d'; g.beginPath(); g.moveTo(0, -8); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath(); g.fill(); g.restore();
    },
    show(screen) {
      const xh = $('crosshair'); if (xh) xh.style.display = screen === 'playing' ? 'block' : 'none';
      for (const id of ['start-screen', 'pause-screen', 'busted-screen']) { const el = $(id); if (el) el.style.display = 'none'; }
      const hudEl = $('hud'); if (hudEl) hudEl.style.display = screen === 'playing' ? 'block' : 'none';
      if (screen === 'start') { const el = $('start-screen'); if (el) el.style.display = 'flex'; }
      if (screen === 'paused') { const el = $('pause-screen'); if (el) el.style.display = 'flex'; }
      if (screen === 'busted') { const el = $('busted-screen'); if (el) el.style.display = 'flex'; }
    },
  };
}
