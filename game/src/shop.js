// Garage / shop: buy the two other cars, engine and armor upgrades, and
// paint jobs, all with earned cash. Rendered as a DOM overlay; the game
// pauses while it is open.
import { CARS, PAINTS } from './config.js';

export class Shop {
  constructor(game) {
    this.game = game;
    this.open = false;
  }

  toggle() {
    this.open = !this.open;
    this.render();
    this.game.hud.showShop(this.open);
    this.game.paused = this.open;
  }

  render() {
    const list = document.getElementById('shop-list');
    if (!list) return;
    const s = this.game.state;
    const rows = [];
    for (const car of CARS) {
      const owned = s.carsOwned.includes(car.id);
      const active = s.carsOwned[s.carIndex] === car.id;
      rows.push(`<div class="shop-row"><b>${car.name}</b> — ${car.desc}<br>
        ${owned ? (active ? '<i>Driving now</i>' : `<button data-buy-car="${car.id}">Drive this car</button>`) : `<button data-buy-car="${car.id}">Buy $${car.price.toLocaleString('en-US')}</button>`}</div>`);
    }
    rows.push(`<div class="shop-row"><b>Engine tuning</b> — level ${s.engineLevel}/3 — top speed +12% per level<br>
      ${s.engineLevel >= 3 ? '<i>Maxed</i>' : `<button data-buy="engine">Upgrade $${(1500 * (s.engineLevel + 1)).toLocaleString('en-US')}</button>`}</div>`);
    rows.push(`<div class="shop-row"><b>Armor plating</b> — level ${s.armorLevel}/3 — shrugs off crashes and bullets<br>
      ${s.armorLevel >= 3 ? '<i>Maxed</i>' : `<button data-buy="armor">Upgrade $${(1200 * (s.armorLevel + 1)).toLocaleString('en-US')}</button>`}</div>`);
    for (const paint of PAINTS) {
      rows.push(`<div class="shop-row"><b>Paint: ${paint.name}</b><br>
        ${s.paint === paint.color ? '<i>Applied</i>' : `<button data-buy-paint="${paint.color}">Apply $${paint.price.toLocaleString('en-US')}</button>`}</div>`);
    }
    list.innerHTML = rows.join('') + `<p>Cash: $${Math.floor(s.cash).toLocaleString('en-US')} — press G to close.</p>`;
    list.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => this.buy(btn));
    });
  }

  buy(btn) {
    const s = this.game.state;
    if (btn.dataset.buyCar) {
      const car = CARS.find((c) => c.id === btn.dataset.buyCar);
      if (!car) return;
      if (!s.carsOwned.includes(car.id)) {
        if (s.cash < car.price) {
          this.game.hud.message('Not enough cash for that car.');
          return;
        }
        s.cash -= car.price;
        s.carsOwned.push(car.id);
        this.game.hud.message(`Bought the ${car.name}!`);
      }
      s.carIndex = s.carsOwned.indexOf(car.id);
      this.game.switchPlayerCar();
      this.game.saveGame();
      this.render();
      return;
    }
    if (btn.dataset.buy === 'engine') {
      const price = 1500 * (s.engineLevel + 1);
      if (s.engineLevel >= 3 || s.cash < price) return;
      s.cash -= price;
      s.engineLevel += 1;
      this.game.applyUpgrades();
      this.game.saveGame();
      this.render();
      return;
    }
    if (btn.dataset.buy === 'armor') {
      const price = 1200 * (s.armorLevel + 1);
      if (s.armorLevel >= 3 || s.cash < price) return;
      s.cash -= price;
      s.armorLevel += 1;
      this.game.applyUpgrades();
      this.game.saveGame();
      this.render();
      return;
    }
    if (btn.dataset.buyPaint) {
      const paint = PAINTS.find((p) => String(p.color) === btn.dataset.buyPaint);
      if (!paint || s.cash < paint.price) return;
      s.cash -= paint.price;
      s.paint = paint.color;
      this.game.applyUpgrades();
      this.game.saveGame();
      this.render();
    }
  }
}
