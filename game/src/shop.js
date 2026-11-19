// Shops: walk up to a storefront, press B, buy with cash. The first item in
// every shop is the ammo box ($150, +48 reserve) — the playtest buys it.

import { SHOPS } from './config.js';

export function nearestShop(state) {
  let best = null;
  let bestD = 8;
  for (const shop of SHOPS) {
    const d = Math.hypot(state.player.pos.x - shop.x, state.player.pos.z - shop.z);
    if (d < bestD) {
      bestD = d;
      best = shop;
    }
  }
  return best;
}

export function renderShopItems(state, shop) {
  const list = document.getElementById('shop-items');
  const title = document.getElementById('shop-title');
  if (!list || !title) return;
  title.textContent = shop.name;
  list.innerHTML = '';
  for (const item of shop.items) {
    const row = document.createElement('div');
    row.className = 'shop-item';
    const name = document.createElement('span');
    name.className = 'shop-item-name';
    name.textContent = item.name;
    const desc = document.createElement('span');
    desc.className = 'shop-item-desc';
    desc.textContent = item.desc;
    const price = document.createElement('span');
    price.className = 'shop-item-price';
    price.textContent = `$${item.price}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Buy';
    btn.disabled = state.cash < item.price;
    btn.addEventListener('click', () => {
      if (buyItem(state, item)) {
        if (state.audio) state.audio.cash();
        renderShopItems(state, shop);
        if (state.onHud) state.onHud();
      }
    });
    row.append(name, desc, price, btn);
    list.appendChild(row);
  }
}

export function buyItem(state, item) {
  if (state.cash < item.price) return false;
  state.cash -= item.price;
  try {
    item.apply(state);
  } catch {
    return false;
  }
  if (!state.shopOwned.includes(item.id)) state.shopOwned.push(item.id);
  return true;
}
