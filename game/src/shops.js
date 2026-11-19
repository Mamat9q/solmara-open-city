// SOLMARA shops: three storefronts on the grid. Walk up, press B, buy.
// Cars bought at Rico's are delivered beside the player and, being owned,
// never raise the wanted level when driven.

import { SHOPS, SHOP_RADIUS } from './config.js';
import { Vehicle } from './vehicles.js';

export class ShopManager {
  constructor(scene) {
    this.scene = scene;
    this.openShop = null;
  }

  nearestShop(x, z) {
    let best = null;
    let bestDist = Infinity;
    for (const shop of SHOPS) {
      const dist = Math.hypot(shop.x - x, shop.z - z);
      if (dist < bestDist) {
        bestDist = dist;
        best = shop;
      }
    }
    return bestDist <= SHOP_RADIUS ? best : null;
  }

  buy(game, shop, item) {
    if (game.cash < item.price) return { ok: false, reason: 'Not enough cash.' };
    game.cash -= item.price;
    if (!game.shopOwned.includes(item.id)) game.shopOwned.push(item.id);
    if (item.id === 'ammo') {
      game.player.reserve += 48;
    } else if (item.id === 'medkit') {
      game.player.health = Math.min(game.player.maxHealth, game.player.health + 60);
    } else if (item.id === 'marina' || item.id === 'interceptor') {
      const defKey = item.id === 'marina' ? 'marina' : 'interceptor';
      const car = new Vehicle(
        defKey,
        game.player.pos.x + 4,
        game.player.pos.z + 2,
        game.player.heading,
        true,
      );
      game.scene.add(car.group);
      game.vehicles.cars.push(car);
      game.toast(`${car.def.name} delivered beside you. It is yours — no heat for driving it.`);
    }
    if (game.audio) game.audio.pickup();
    if (game.saveNow) game.saveNow();
    return { ok: true };
  }
}

export function renderShopList(game, shop) {
  const list = document.getElementById('shop-items');
  const title = document.getElementById('shop-title');
  title.textContent = shop.name;
  document.getElementById('shop-blurb').textContent = shop.blurb;
  list.innerHTML = '';
  for (const item of shop.items) {
    const row = document.createElement('div');
    row.className = 'shop-item';
    const ownedNote = item.id === 'kevlar' && game.shopOwned.includes('kevlar')
      ? ' (owned)'
      : item.id === 'tuning' && game.shopOwned.includes('tuning')
        ? ' (installed)'
        : item.id === 'plating' && game.shopOwned.includes('plating')
          ? ' (installed)'
          : item.id === 'marina' && game.shopOwned.includes('marina')
            ? ' (owned)'
            : item.id === 'interceptor' && game.shopOwned.includes('interceptor')
              ? ' (owned)'
              : '';
    const affordable = game.cash >= item.price;
    const alreadyOwnedCar =
      (item.id === 'marina' && game.shopOwned.includes('marina')) ||
      (item.id === 'interceptor' && game.shopOwned.includes('interceptor'));
    row.innerHTML =
      `<span class="shop-name">${item.name}${ownedNote}</span>` +
      `<span class="shop-detail">${item.detail}</span>` +
      `<span class="shop-price">$${item.price}</span>`;
    const button = document.createElement('button');
    button.textContent = alreadyOwnedCar ? 'Owned' : 'Buy';
    button.disabled = !affordable || alreadyOwnedCar;
    button.addEventListener('click', () => {
      const result = game.shopManager.buy(game, shop, item);
      if (result.ok) {
        game.toast(`${item.name} bought for $${item.price}.`);
        renderShopList(game, shop);
        game.refreshHud();
      } else {
        game.toast(result.reason);
      }
    });
    row.appendChild(button);
    list.appendChild(row);
  }
  document.getElementById('shop-cash').textContent = `$${game.cash}`;
}
