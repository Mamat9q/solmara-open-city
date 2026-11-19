// Shops: spend mission earnings on gear, cars and upgrades. Three shop
// fronts sit in the city (Solmara Arms, Rico's Motors, Doc's Clinic); walk
// up to one and press B. Purchases are saved with the game, so a bought car
// or upgrade survives a reload. Nothing here costs real money — only the
// cash Dario earns from missions and side jobs.
import { CAR_DEFS } from './vehicles.js';

export const SHOP_ITEMS = [
  { id: 'ammo', shop: 'arms', name: 'Ammo box', desc: '+48 pistol reserve', price: 150 },
  { id: 'health', shop: 'clinic', name: 'Med kit', desc: 'Restore 50 HP now', price: 100 },
  { id: 'armor', shop: 'clinic', name: 'Kevlar vest', desc: 'Half damage from gunfire', price: 300, once: true },
  { id: 'engine', shop: 'motors', name: 'Engine tuning', desc: '+15% top speed on every car you drive', price: 800, once: true },
  { id: 'plating', shop: 'motors', name: 'Armor plating', desc: 'Crashes barely slow you down', price: 600, once: true },
  { id: 'gt', shop: 'motors', name: 'Marina GT', desc: 'Your own Marina GT, delivered to the garage', price: 2000, car: 'Marina GT' },
  { id: 'interceptor', shop: 'motors', name: 'Interceptor', desc: 'Your own Interceptor, the fastest car in Solmara', price: 3500, car: 'Interceptor' },
];

export function createShop() {
  return {
    openShop: null, // shop id whose panel is open, or null
    nearestShop(state) {
      let best = null, bd = 14;
      for (const s of state.world.shops) {
        const d = Math.hypot(state.player.pos.x - s.x, state.player.pos.z - s.z);
        if (d < bd) { bd = d; best = s; }
      }
      return best;
    },
    itemsFor(shopId) { return SHOP_ITEMS.filter((i) => i.shop === shopId); },
    owned(state, id) { return (state.shopOwned || []).includes(id); },
    canBuy(state, item) {
      if (item.once && this.owned(state, item.id)) return false;
      if (item.car && this.owned(state, item.id)) return false;
      return state.cash >= item.price;
    },
    buy(state, itemId) {
      const item = SHOP_ITEMS.find((i) => i.id === itemId);
      if (!item) return 'No such item.';
      if (!this.canBuy(state, item)) {
        return this.owned(state, item.id) ? 'Already yours.' : `Need $${item.price} — you have $${state.cash}.`;
      }
      state.cash -= item.price;
      if (!state.shopOwned) state.shopOwned = [];
      state.shopOwned.push(item.id);
      if (item.id === 'ammo') state.player.reserve += 48;
      if (item.id === 'health') state.player.heal(50);
      if (item.id === 'armor') state.player.maxHealth = 150;
      if (item.car) {
        const def = CAR_DEFS.find((d) => d.name === item.car);
        const car = state.vehicles.spawnOwnedCar(def, state.player.pos.x + 6, state.player.pos.z + 6);
        if (car && state.shopOwned.includes('engine')) car.tuned = true;
        if (car && state.shopOwned.includes('plating')) car.plated = true;
        state.message(`${item.car} delivered — it is parked right beside you.`);
      }
      if (state.audio) state.audio.cash();
      try { state._save.saveGame(state); } catch { /* autosave best-effort */ }
      return `Bought ${item.name} for $${item.price}.`;
    },
  };
}
