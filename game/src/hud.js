// The HUD: DOM overlays (cash, respect rank, wanted stars, weapon, radio, speed,
// mission objective, toasts, chapter banner) plus a 2D canvas minimap with roads,
// player, police, traffic and the waypoint. The start screen lists all 10
// missions and the controls, and fits 720p.

import { CARS, MISSIONS, PAINTS, RACE_ROUTES, WEAPONS, districtAt, rankFor } from './config.js';

export function createHud(G) {
  const root = document.getElementById('hud');
  root.innerHTML = `
    <div id="hud-tl">
      <div class="hud-line" id="hud-cash">$0</div>
      <div class="hud-line small" id="hud-rank">Rookie</div>
      <div class="hud-line small" id="hud-day">DAY 1/7 — Landfall</div>
      <div class="hud-bar"><div id="hud-respect"></div></div>
    </div>
    <div id="hud-tr">
      <div id="hud-stars"></div>
      <div class="hud-line small" id="hud-weapon">Pistol • 60</div>
      <div class="hud-line small" id="hud-radio">NEON FM</div>
      <div class="hud-line small" id="hud-health">♥ 100</div>
    </div>
    <div id="hud-bl"><canvas id="minimap" width="180" height="180"></canvas><div id="hud-district">Downtown</div></div>
    <div id="hud-bc"><div id="hud-objective"></div><div id="hud-sub"></div></div>
    <div id="hud-br"><div id="hud-speed">0 km/h</div><div id="hud-wheel"></div><div class="hud-line small" id="hud-hint">WASD drive • E enter car • M mission • T taxi • R race • Y delivery • G garage • B shop • C radio • 1/2/3 weapons</div></div>
    <div id="hud-toast"></div>
    <div id="hud-banner"><div id="hud-banner-title"></div><div id="hud-banner-sub"></div></div>
    <div id="hud-panel"></div>
    <div id="hud-start"></div>
  `;
  const el = (id) => document.getElementById(id);
  const mm = el('minimap').getContext('2d');
  let toastTimer = null;
  let bannerTimer = null;
  let lastObjective = '';

  function starsHtml(wanted) {
    let s = '';
    for (let i = 0; i < 5; i++) s += `<span class="star${i < wanted ? ' on' : ''}">★</span>`;
    return s;
  }

  function toast(msg) {
    const t = el('hud-toast');
    t.textContent = msg;
    t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  function banner(title, sub) {
    el('hud-banner-title').textContent = title;
    el('hud-banner-sub').textContent = sub || '';
    el('hud-banner').classList.add('show');
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el('hud-banner').classList.remove('show'), 4200);
  }

  function setObjective(text) { lastObjective = text; el('hud-objective').textContent = text; }

  /** Draw the minimap: roads, waypoint, police, traffic, player arrow. */
  function drawMinimap() {
    const S = 180;
    const scale = S / 640;
    const toM = (v) => (v + 320) * scale;
    mm.fillStyle = 'rgba(8,12,20,0.82)';
    mm.fillRect(0, 0, S, S);
    mm.strokeStyle = '#4a5058';
    mm.lineWidth = 3;
    for (let v = -280; v <= 280; v += 40) {
      mm.beginPath(); mm.moveTo(0, toM(v)); mm.lineTo(S, toM(v)); mm.stroke();
      mm.beginPath(); mm.moveTo(toM(v), 0); mm.lineTo(toM(v), S); mm.stroke();
    }
    mm.fillStyle = '#1d6f8e';
    mm.fillRect(0, toM(268), S, S - toM(268));
    // Waypoint.
    const job = G.missions.job;
    if (job.target) {
      mm.fillStyle = '#ffd23f';
      mm.beginPath();
      mm.arc(toM(job.target.x), toM(job.target.z), 6, 0, Math.PI * 2);
      mm.fill();
    }
    // Traffic (white) and police (red).
    mm.fillStyle = '#cfd3d8';
    for (const c of G.traffic.cars) mm.fillRect(toM(c.mesh.position.x) - 1, toM(c.mesh.position.z) - 1, 2, 2);
    mm.fillStyle = '#ff3344';
    for (const p of G.police.patrols) {
      mm.beginPath();
      mm.arc(toM(p.x), toM(p.z), 3.5, 0, Math.PI * 2);
      mm.fill();
    }
    if (G.police.heli) {
      mm.fillStyle = '#ff3344';
      mm.fillRect(toM(G.police.heli.position.x) - 3, toM(G.police.heli.position.z) - 3, 6, 6);
    }
    // Player arrow.
    const px = G.player.inCar ? G.car.x : G.player.x;
    const pz = G.player.inCar ? G.car.z : G.player.z;
    const heading = G.player.inCar ? G.car.heading : G.player.heading;
    mm.save();
    mm.translate(toM(px), toM(pz));
    mm.rotate(Math.atan2(Math.sin(heading), Math.cos(heading)) * -1 + Math.PI);
    mm.fillStyle = '#2fd95f';
    mm.beginPath();
    mm.moveTo(0, -7); mm.lineTo(5, 6); mm.lineTo(-5, 6); mm.closePath();
    mm.fill();
    mm.restore();
  }

  function update() {
    const s = G.state;
    el('hud-cash').textContent = `$${s.cash.toLocaleString('en-US')}`;
    el('hud-rank').textContent = `${rankFor(s.respect)}  •  ${s.respect} respect`;
    el('hud-day').textContent = `DAY ${s.day}/7 — Hurricane Mara ${Math.round(G.hurricane.stormLevel() * 100)}%`;
    el('hud-respect').style.width = `${Math.min(100, s.respect / 2.2)}%`;
    el('hud-stars').innerHTML = starsHtml(s.wanted);
    const w = WEAPONS[s.weapon];
    el('hud-weapon').textContent = `${w.name} • ${s.ammo} ammo`;
    el('hud-radio').textContent = `${G.audio.stationName()}  (C to switch)`;
    el('hud-health').textContent = `♥ ${Math.round(s.health)}${s.armor ? `  ⛨ ${s.armor}` : ''}`;
    const px = G.player.inCar ? G.car.x : G.player.x;
    const pz = G.player.inCar ? G.car.z : G.player.z;
    el('hud-district').textContent = districtAt(px, pz);
    el('hud-speed').textContent = G.player.inCar ? `${Math.round(Math.abs(G.car.speed) * 3.6)} km/h` : 'On foot';
    const dist = G.missions.targetDistance();
    el('hud-sub').textContent = dist !== null ? `${Math.round(dist)} m to waypoint` : (G.police.evading ? 'EVADING — stay out of sight' : '');
    el('hud-wheel').innerHTML = ['pistol', 'smg', 'shotgun'].map((id) =>
      `<span class="wslot${s.weapon === id ? ' on' : ''}">${WEAPONS[id].key} ${WEAPONS[id].name}</span>`).join('');
    drawMinimap();
  }

  function showStart() {
    const saved = G.save.hasSave();
    const list = MISSIONS.map((m) => `<div class="mrow"><b>${m.id}. ${m.name}</b> — Ch.${m.chapter} Day ${m.day} — $${m.payout}</div>`).join('');
    el('hud-start').innerHTML = `
      <div class="panel start">
        <h1>SOLMARA</h1>
        <div class="tag">Open-city crime • 7 districts • 10 story missions • Hurricane Mara, 7 days out</div>
        <div class="cols">
          <div>
            <h3>Story — 7 days to landfall</h3>
            <div class="mlist">${list}</div>
          </div>
          <div>
            <h3>How to play</h3>
            <div class="keys">WASD / arrows — drive &amp; walk<br>E — enter / steal car (near any car)<br>Mouse — look • Click — shoot<br>1 / 2 / 3 — pistol / SMG / shotgun<br>M — story mission • T — taxi fare<br>R — street race • Y — delivery<br>G — garage (3 cars, upgrades)<br>B — weapon shop • C — radio (3 stations)<br>K — save • P — pause</div>
            <h3>Garage &amp; radio</h3>
            <div class="keys">${CARS.map((c) => `${c.name} — $${c.price}`).join('<br>')}<br>Radio: NEON FM • HARBOR JAZZ • STORM ROCK</div>
          </div>
        </div>
        <div class="cta">${saved ? 'CLICK TO CONTINUE — or press Space for a new game' : 'CLICK OR PRESS SPACE TO PLAY'}</div>
        <div class="fine">Free roam after the story. Lose the cops to cool your wanted level. Rain wets the streets.</div>
      </div>`;
    el('hud-start').style.display = 'block';
  }

  function hideStart() { el('hud-start').style.display = 'none'; }

  function showPanel(html) {
    const p = el('hud-panel');
    p.innerHTML = `<div class="panel">${html}</div>`;
    p.style.display = 'block';
  }
  function hidePanel() { el('hud-panel').style.display = 'none'; el('hud-panel').innerHTML = ''; }

  function garagePanel() {
    const s = G.state;
    const rows = CARS.map((c, i) => {
      const owned = s.ownedCars.includes(c.id);
      const cur = s.carIndex === i;
      return `<div class="mrow"><b>${c.name}</b> — ${c.desc} — top ${Math.round(c.maxSpeed * 3.6)} km/h — ${owned ? (cur ? 'DRIVING' : `<button data-buy-car="${i}">Drive</button>`) : `<button data-buy-car="${i}">Buy $${c.price}</button>`}</div>`;
    }).join('');
    const up = s.upgrades;
    showPanel(`<h2>Garage — Solmara Motors</h2>
      <div class="keys">Cash: $${s.cash}</div>
      ${rows}
      <h3>Upgrades (${CARS[s.carIndex].name})</h3>
      <div class="mrow">Engine Lv ${up.engine || 0} — <button data-upgrade="engine">Upgrade</button> ($${[800, 1800, 3200][up.engine || 0] ?? 'MAX'})</div>
      <div class="mrow">Armor Lv ${up.armor || 0} — <button data-upgrade="armor">Upgrade</button> ($${[600, 1400, 2600][up.armor || 0] ?? 'MAX'})</div>
      <h3>Paint</h3>
      <div class="mrow">${PAINTS.map((p, i) => `<button data-paint="${i}">${p.name} $${p.price}</button>`).join(' ')}</div>
      <div class="cta">Press G or Esc to close</div>`);
  }

  function shopPanel() {
    const s = G.state;
    const wrows = Object.entries(WEAPONS).map(([id, w]) => {
      const owned = s.ownedWeapons.includes(id);
      return `<div class="mrow"><b>${w.key}. ${w.name}</b> — ${w.damage} dmg — ${owned ? `Ammo $${w.ammoPrice} <button data-ammo="${id}">Buy ammo</button>` : `<button data-buy-weapon="${id}">Buy $${w.price}</button>`}</div>`;
    }).join('');
    showPanel(`<h2>Weapon Shop — Ammo &amp; Iron</h2>
      <div class="keys">Cash: $${s.cash} • Health: ${Math.round(s.health)} • Ammo: ${s.ammo}</div>
      ${wrows}
      <div class="mrow">Health kit — <button data-heal="1">Buy $150 (+50 HP)</button></div>
      <div class="cta">Press B or Esc to close</div>`);
  }

  function racePanel() {
    showPanel(`<h2>Street Races</h2>
      ${RACE_ROUTES.map((r, i) => `<div class="mrow"><b>${r.name}</b> — ${r.points.length} checkpoints — pot $${r.payout} <button data-race="${i}">Race</button></div>`).join('')}
      <div class="cta">Press R or Esc to close</div>`);
  }

  // Panel buttons dispatch to the garage/shop/race actions.
  el('hud-panel').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.buyCar !== undefined) {
      const r = G.garage.buyCar(Number(b.dataset.buyCar));
      toast(r.msg);
      if (r.ok) garagePanel();
    } else if (b.dataset.upgrade) {
      const r = G.garage.buyUpgrade(b.dataset.upgrade);
      toast(r.msg);
      if (r.ok) garagePanel();
    } else if (b.dataset.paint !== undefined) {
      const r = G.garage.buyPaint(Number(b.dataset.paint));
      toast(r.msg);
    } else if (b.dataset.buyWeapon) {
      const r = G.shop.buyWeapon(b.dataset.buyWeapon);
      toast(r.msg);
      if (r.ok) shopPanel();
    } else if (b.dataset.ammo) {
      const r = G.shop.buyAmmo(b.dataset.ammo);
      toast(r.msg);
      if (r.ok) shopPanel();
    } else if (b.dataset.heal) {
      const r = G.shop.buyHealth();
      toast(r.msg);
      if (r.ok) shopPanel();
    } else if (b.dataset.race !== undefined) {
      hidePanel();
      G.missions.startRace(Number(b.dataset.race));
    }
  });

  return {
    toast, banner, setObjective, update, showStart, hideStart,
    showPanel, hidePanel, garagePanel, shopPanel, racePanel,
    panelOpen() { return el('hud-panel').style.display === 'block'; },
  };
}
