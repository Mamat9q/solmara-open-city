// The shop: four items, cash-checked purchases, immediate effects on the
// run state. The shop pauses the action while it is open.
import { SHOP_ITEMS } from './config.js';

export class Shop {
  constructor(hud, audio) {
    this.hud = hud;
    this.audio = audio;
    this.open = false;
  }

  get items() {
    return SHOP_ITEMS;
  }

  openShop(state) {
    this.open = true;
    this.hud.renderShop(SHOP_ITEMS, state.cash, (id) => this.buy(id, state));
    this.hud.show('shop');
  }

  closeShop() {
    this.open = false;
  }

  // Applies a purchase to `state` (the game's run state). Returns a message.
  buy(id, state) {
    const item = SHOP_ITEMS.find((i) => i.id === id);
    if (!item) return 'No such item.';
    if (state.cash < item.price) return 'Not enough cash.';
    state.cash -= item.price;
    if (id === 'ammo') state.ammo = Math.min(240, state.ammo + 48);
    if (id === 'armor') state.armor = Math.min(100, state.armor + 50);
    if (id === 'repair') state.carHealth = 100;
    if (id === 'nitro') {
      state.owned.push('nitro');
      state.nitroTanks = (state.nitroTanks || 0) + 1;
    }
    this.audio.cash();
    this.hud.renderShop(SHOP_ITEMS, state.cash, (next) => this.buy(next, state));
    return `${item.name} bought.`;
  }
}
