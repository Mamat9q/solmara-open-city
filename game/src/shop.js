// Solmara Arms: the shop near (-58, -46). The ammo box is first and cheapest
// to buy, so the first enabled button is always the ammo box.
export const SHOP_ITEMS = [
  { id: 'ammo', name: 'Ammo Box', price: 150, desc: '+48 reserve rounds', apply: (s) => { s.player.reserve += 48; } },
  { id: 'armor', name: 'Kevlar Vest', price: 200, desc: '+50 health, stops one bust', apply: (s) => { s.player.health = Math.min(100, s.player.health + 50); } },
  { id: 'repair', name: 'Repair Kit', price: 100, desc: 'Fixes your ride, -1 wanted star', apply: (s) => { s.wanted = Math.max(0, s.wanted - 1); } },
  { id: 'snack', name: 'Street Tacos', price: 25, desc: '+10 health, tastes like victory', apply: (s) => { s.player.health = Math.min(100, s.player.health + 10); } },
];

export class Shop {
  constructor(state) {
    this.state = state;
  }

  open() {
    const s = this.state;
    s.screen = 'shop';
    document.getElementById('screen-shop').classList.add('show');
    this.render();
  }

  close() {
    const s = this.state;
    s.screen = 'playing';
    document.getElementById('screen-shop').classList.remove('show');
  }

  render() {
    const s = this.state;
    const list = document.getElementById('shop-items');
    list.innerHTML = '';
    document.getElementById('shop-title').textContent = 'Solmara Arms — open all night';
    for (const item of SHOP_ITEMS) {
      const owned = s.shopOwned.includes(item.id);
      const row = document.createElement('div');
      row.className = 'shop-item';
      const afford = s.cash >= item.price;
      row.innerHTML = `<b>${item.name}</b><span>${item.desc}</span><span class="price">$${item.price}</span>`;
      const btn = document.createElement('button');
      btn.textContent = owned ? 'Owned' : 'Buy';
      btn.disabled = owned || !afford;
      btn.addEventListener('click', () => this.buy(item));
      row.appendChild(btn);
      list.appendChild(row);
    }
  }

  buy(item) {
    const s = this.state;
    if (s.cash < item.price || s.shopOwned.includes(item.id)) return;
    s.cash -= item.price;
    item.apply(s);
    s.shopOwned.push(item.id);
    s.audio.cash();
    s.toast(`Bought ${item.name} for $${item.price}`);
    this.render();
  }
}
