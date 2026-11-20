// The weapon shop: buy the SMG / shotgun, buy ammo for any owned weapon, buy a
// health kit. All prices come from config; all purchases check the cash first.

import { WEAPONS } from './config.js';

export function createShop(G) {
  function buyWeapon(id) {
    const w = WEAPONS[id];
    if (!w) return { ok: false, msg: 'No such weapon.' };
    if (G.state.ownedWeapons.includes(id)) return { ok: false, msg: `You already own the ${w.name}.` };
    if (G.state.cash < w.price) return { ok: false, msg: `Need $${w.price} for the ${w.name}.` };
    G.state.cash -= w.price;
    G.state.ownedWeapons.push(id);
    G.state.ammo += Math.floor(w.ammoMax / 2);
    return { ok: true, msg: `${w.name} bought — press ${w.key} to equip it.` };
  }

  function buyAmmo(id) {
    const w = WEAPONS[id];
    if (!w) return { ok: false, msg: 'No such weapon.' };
    if (!G.state.ownedWeapons.includes(id)) return { ok: false, msg: `Buy the ${w.name} first.` };
    if (G.state.cash < w.ammoPrice) return { ok: false, msg: `Need $${w.ammoPrice} for ammo.` };
    G.state.cash -= w.ammoPrice;
    G.state.ammo = Math.min(w.ammoMax * 2, G.state.ammo + 30);
    return { ok: true, msg: `+30 ${w.name} ammo.` };
  }

  function buyHealth() {
    if (G.state.cash < 150) return { ok: false, msg: 'Need $150 for a health kit.' };
    if (G.state.health >= 100) return { ok: false, msg: 'Health is already full.' };
    G.state.cash -= 150;
    G.state.health = Math.min(100, G.state.health + 50);
    return { ok: true, msg: 'Health +50.' };
  }

  return { buyWeapon, buyAmmo, buyHealth };
}
