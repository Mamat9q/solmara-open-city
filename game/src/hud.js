// The HUD: DOM text for cash, respect, wanted stars, health, ammo, speed and
// the mission objective, plus a round 2D minimap drawn on a canvas — roads,
// water, the player arrow, police, traffic, the mission beacon and the taxi rider.
import { CITY_HALF, MISSIONS, WEAPONS, districtAt } from './config.js';
import { kmh } from './vehicles.js';

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const els = {
    wanted: $('wanted'), respect: $('respect'), dayline: $('dayline'),
    cash: $('cash'), clock: $('clock'), radio: $('radio'),
    objlabel: $('objlabel'), objtext: $('objtext'),
    weapon: $('weapon'), healthfill: $('healthfill'), armorline: $('armorline'),
    speed: $('speed'), carname: $('carname'), toast: $('toast'),
    crosshair: $('crosshair'), minimap: $('minimap'),
  };
  return { els, mm: els.minimap.getContext('2d') };
}

function stars(wanted) {
  let s = '';
  for (let i = 0; i < 5; i++) s += i < wanted ? '★' : '<span class="dim">★</span>';
  return s;
}

export function updateHud(hud, state) {
  const e = hud.els;
  e.wanted.innerHTML = stars(state.wanted);
  e.respect.textContent = `Respect ${state.respect} · ${districtAt(state.player.mesh.position.x, state.player.mesh.position.z)}`;
  e.dayline.textContent = `Day ${state.day}/7 — Hurricane Ilsa in ${7 - state.day + 1} day${7 - state.day + 1 === 1 ? '' : 's'}`;
  e.cash.textContent = `$${state.money.toLocaleString('en-US')}`;
  const hh = Math.floor(state.clock) % 24;
  const mm = Math.floor((state.clock % 1) * 60);
  e.clock.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
  e.radio.textContent = state.audio.stationName();
  e.objlabel.textContent = state.missions.active
    ? `CH ${MISSIONS[state.missions.index].ch} · ${MISSIONS[state.missions.index].title}`
    : state.gameWon ? 'SOLMARA — STORM OUTRUN' : 'SOLMARA — FREE ROAM';
  e.objtext.textContent = state.objective;
  const w = WEAPONS[state.weapon];
  e.weapon.textContent = `${w.name}  ·  ${state.ammo[state.weapon]} rounds  ·  [1/2/3]`;
  e.healthfill.style.width = `${Math.max(0, state.health)}%`;
  e.healthfill.style.background = state.health > 50 ? '#43e06a' : state.health > 25 ? '#ffb13c' : '#ff4040';
  e.armorline.textContent = state.armor ? 'Armour plating fitted' : '';
  if (state.playerCar) {
    e.speed.textContent = String(kmh(state.playerCar));
    e.carname.textContent = state.playerCar.name || 'Stolen car';
  } else {
    e.speed.textContent = String(Math.round(state.player.speed * 3.6));
    e.carname.textContent = 'On foot';
  }
  e.crosshair.style.display = state.player.onFoot && !state.playerCar ? 'block' : 'none';
  if (state.toastTimer > 0) {
    e.toast.textContent = state.toast;
    e.toast.style.opacity = String(Math.min(1, state.toastTimer));
  } else {
    e.toast.textContent = '';
  }
  drawMinimap(hud, state);
}

function toMap(v, size) {
  return ((v + CITY_HALF) / (CITY_HALF * 2)) * size;
}

function drawMinimap(hud, state) {
  const ctx = hud.mm;
  const S = 180;
  ctx.clearRect(0, 0, S, S);
  // Water + sand at the south edge.
  ctx.fillStyle = '#14506b';
  ctx.fillRect(0, toMap(296, S), S, S - toMap(296, S));
  ctx.fillStyle = '#8a744a';
  ctx.fillRect(0, toMap(240, S), S, toMap(296, S) - toMap(240, S));
  // Roads.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  for (let v = -240; v <= 240; v += 80) {
    ctx.beginPath(); ctx.moveTo(toMap(v, S), 0); ctx.lineTo(toMap(v, S), S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, toMap(v, S)); ctx.lineTo(S, toMap(v, S)); ctx.stroke();
  }
  // Mission beacon.
  if (state.beaconOn) {
    const bx = toMap(state.beaconX, S); const bz = toMap(state.beaconZ, S);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(bx, bz, 6 + Math.sin(state.time * 5) * 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bx, bz, 10, 0, Math.PI * 2); ctx.stroke();
  }
  // Taxi rider.
  if (state.taxiRider) {
    ctx.fillStyle = '#7dff9b';
    ctx.beginPath(); ctx.arc(toMap(state.taxiRider.x, S), toMap(state.taxiRider.z, S), 4, 0, Math.PI * 2); ctx.fill();
  }
  // Traffic dots.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const c of state.traffic.cars) {
    ctx.fillRect(toMap(c.mesh.position.x, S) - 1, toMap(c.mesh.position.z, S) - 1, 2, 2);
  }
  // Police dots.
  ctx.fillStyle = '#5a8cff';
  for (const c of state.police.cars) {
    ctx.beginPath(); ctx.arc(toMap(c.mesh.position.x, S), toMap(c.mesh.position.z, S), 3, 0, Math.PI * 2); ctx.fill();
  }
  // Player arrow.
  const p = state.playerCar ? state.playerCar.mesh.position : state.player.mesh.position;
  const heading = state.playerCar ? state.playerCar.heading : state.player.heading;
  const px = toMap(p.x, S); const pz = toMap(p.z, S);
  ctx.save();
  ctx.translate(px, pz);
  ctx.rotate(heading);
  ctx.fillStyle = '#ff5d7a';
  ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
  ctx.restore();
  // North tick.
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('N', S / 2 - 4, 12);
}
