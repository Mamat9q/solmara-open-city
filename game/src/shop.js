// Shops: the garage (buy the 3 cars, fit engine/armour/paint upgrades) and the
// gun shop (buy weapons and ammo). Walk or drive into the marked zone and press
// F; a DOM panel opens over the game with buttons. Buying is free of network and
// writes straight into the save.
import { CARS, UPGRADES, WEAPONS, GARAGE_POS, GUNSHOP_POS } from './config.js';

function panel(title, rows, onClose) {
  const screen = document.getElementById('screen');
  screen.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'panel';
  const h = document.createElement('h2');
  h.textContent = title;
  h.style.fontSize = '26px';
  h.style.color = '#ffd23f';
  div.appendChild(h);
  for (const row of rows) {
    const line = document.createElement('div');
    line.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 2px;border-bottom:1px solid rgba(255,255,255,.1);font-size:15px;';
    const label = document.createElement('span');
    label.innerHTML = row.label;
    line.appendChild(label);
    const btn = document.createElement('button');
    btn.textContent = row.button;
    btn.disabled = !!row.disabled;
    btn.style.opacity = row.disabled ? '0.45' : '1';
    btn.onclick = () => { row.buy(); };
    line.appendChild(btn);
    div.appendChild(line);
  }
  const close = document.createElement('button');
  close.textContent = 'Close (Esc)';
  close.className = 'ghost';
  close.onclick = onClose;
  const wrap = document.createElement('div');
  wrap.className = 'btnrow';
  wrap.appendChild(close);
  div.appendChild(wrap);
  screen.appendChild(div);
}

export function openGarage(state) {
  state.paused = true;
  const rows = CARS.map((car) => {
    const owned = state.ownedCars.includes(car.id);
    const current = state.carId === car.id;
    return {
      label: `<b>${car.name}</b> — accel ${car.accel}, top ${Math.round(car.top * 3.6)} km/h${current ? ' · <span style="color:#7dff9b">DRIVING</span>' : ''}`,
      button: owned ? (current ? 'Current car' : 'Drive it') : `$${car.price.toLocaleString('en-US')}`,
      disabled: owned && current,
      buy: () => {
        if (owned) {
          state.carId = car.id;
          state.applyCar();
          state.toast = `${car.name} ready`;
        } else if (state.money >= car.price) {
          state.money -= car.price;
          state.ownedCars.push(car.id);
          state.carId = car.id;
          state.applyCar();
          state.toast = `Bought the ${car.name}`;
          state.audio.sfx('pickup');
        } else {
          state.toast = 'Not enough cash';
        }
        state.toastTimer = 2.5;
        state.save();
        openGarage(state);
      },
    };
  });
  for (const up of UPGRADES) {
    const owned = state.upgrades.includes(up.id) || (up.id === 'paint' && state.upgrades.filter((u) => u === 'paint').length >= 5);
    rows.push({
      label: `<b>${up.name}</b> — ${up.desc}`,
      button: up.id === 'paint' ? `$${up.price}` : owned ? 'Fitted' : `$${up.price}`,
      disabled: up.id !== 'paint' && owned,
      buy: () => {
        if (state.money < up.price) { state.toast = 'Not enough cash'; state.toastTimer = 2; openGarage(state); return; }
        state.money -= up.price;
        if (up.id === 'engine') { state.engineLevel = Math.min(3, (state.engineLevel || 0) + 1); state.applyCar(); }
        else if (up.id === 'armor') { state.armor = true; }
        else if (up.id === 'paint') { state.paintIndex = (state.paintIndex + 1) % 6; state.applyCar(); }
        state.upgrades.push(up.id);
        state.toast = `${up.name} fitted`;
        state.toastTimer = 2;
        state.audio.sfx('pickup');
        state.save();
        openGarage(state);
      },
    });
  }
  panel('SOLMARA GARAGE', rows, () => { state.paused = false; document.getElementById('screen').innerHTML = ''; });
}

export function openGunshop(state) {
  state.paused = true;
  const rows = Object.entries(WEAPONS).map(([id, w]) => {
    const owned = state.ownedWeapons.includes(id);
    return {
      label: `<b>${w.name}</b> — damage ${w.damage}, ${w.mag}-round mag${owned ? ` · <span style="color:#7dff9b">${state.ammo[id]} rounds</span>` : ''}`,
      button: owned ? `Ammo $${w.ammoPrice}` : `Buy $${w.price}`,
      disabled: false,
      buy: () => {
        if (owned) {
          if (state.money < w.ammoPrice) { state.toast = 'Not enough cash'; state.toastTimer = 2; openGunshop(state); return; }
          state.money -= w.ammoPrice;
          state.ammo[id] += w.mag * 2;
          state.toast = `${w.name} ammo +${w.mag * 2}`;
        } else {
          if (state.money < w.price) { state.toast = 'Not enough cash'; state.toastTimer = 2; openGunshop(state); return; }
          state.money -= w.price;
          state.ownedWeapons.push(id);
          state.ammo[id] = w.mag * 2;
          state.weapon = id;
          state.toast = `Bought the ${w.name}`;
        }
        state.toastTimer = 2;
        state.audio.sfx('pickup');
        state.save();
        openGunshop(state);
      },
    };
  });
  panel('SOLMARA GUN SHOP', rows, () => { state.paused = false; document.getElementById('screen').innerHTML = ''; });
}

/** Which shop zone the player is standing in, if any. */
export function shopNear(state) {
  const p = state.playerCar ? state.playerCar.mesh.position : state.player.mesh.position;
  if (Math.hypot(p.x - GARAGE_POS.x, p.z - GARAGE_POS.z) < 10) return 'garage';
  if (Math.hypot(p.x - GUNSHOP_POS.x, p.z - GUNSHOP_POS.z) < 10) return 'gunshop';
  return null;
}
