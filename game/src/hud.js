// DOM HUD: top bar (cash / day / wanted / speed), mission banner, minimap,
// toasts, and the title / pause / shop / game-over screens. The layout is
// compact so the title screen fits a 720p frame.
export class Hud {
  constructor(callbacks) {
    this.cb = callbacks;
    this.root = document.getElementById('hud');
    this.cashEl = document.getElementById('hud-cash');
    this.dayEl = document.getElementById('hud-day');
    this.starsEl = document.getElementById('hud-stars');
    this.speedEl = document.getElementById('hud-speed');
    this.ammoEl = document.getElementById('hud-ammo');
    this.objectiveEl = document.getElementById('hud-objective');
    this.toastEl = document.getElementById('hud-toast');
    this.map = document.getElementById('minimap');
    this.mapCtx = this.map.getContext('2d');
    this.titleEl = document.getElementById('screen-title');
    this.pauseEl = document.getElementById('screen-pause');
    this.overEl = document.getElementById('screen-over');
    this.shopEl = document.getElementById('screen-shop');
    this.shopList = document.getElementById('shop-items');
    this.overTitle = document.getElementById('over-title');
    this.overText = document.getElementById('over-text');
    this._toastTimer = null;
    this._bindButtons();
  }

  _bindButtons() {
    const bind = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', (e) => { e.preventDefault(); fn(); });
    };
    bind('btn-new', () => this.cb.newGame());
    bind('btn-continue', () => this.cb.continueGame());
    bind('btn-resume', () => this.cb.resume());
    bind('btn-restart', () => this.cb.newGame());
    bind('btn-title', () => this.cb.toTitle());
    bind('btn-shop-close', () => this.cb.closeShop());
    bind('btn-save', () => this.cb.save());
  }

  show(screen) {
    this.titleEl.classList.toggle('hidden', screen !== 'title');
    this.pauseEl.classList.toggle('hidden', screen !== 'pause');
    this.overEl.classList.toggle('hidden', screen !== 'over');
    this.shopEl.classList.toggle('hidden', screen !== 'shop');
    this.root.classList.toggle('hidden', screen === 'title' || screen === 'over');
  }

  gameOver(won) {
    this.overTitle.textContent = won ? 'YOU MADE IT OUT' : 'BUSTED';
    this.overText.textContent = won
      ? 'The causeway is behind you. Solmara fades in the rear-view as the hurricane makes landfall.'
      : 'The law caught up with you on the streets of Solmara.';
    this.show('over');
  }

  toast(text, ms) {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('hidden');
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toastEl.classList.add('hidden'), ms || 2600);
  }

  update(s) {
    this.cashEl.textContent = `$${s.cash}`;
    this.dayEl.textContent = `Day ${s.day} / 7 — ${s.chapterTitle}`;
    this.starsEl.textContent = '★'.repeat(s.wanted) + '☆'.repeat(5 - s.wanted);
    this.starsEl.classList.toggle('hot', s.wanted > 0);
    this.speedEl.textContent = `${Math.round(s.speedKmh)} km/h`;
    this.ammoEl.textContent = `Ammo ${s.ammo} · Armor ${s.armor}`;
    this.objectiveEl.textContent = s.objective;
    this.drawMap(s);
  }

  drawMap(s) {
    const g = this.mapCtx;
    const W = this.map.width;
    const H = this.map.height;
    const scale = W / 640;
    const px = (x) => (x + 320) * scale;
    const pz = (z) => (z + 320) * scale;
    g.fillStyle = '#0c0a14';
    g.fillRect(0, 0, W, H);
    // Sea to the west.
    g.fillStyle = '#0e2a4a';
    g.fillRect(0, 0, px(-320) + 4, H);
    // Roads.
    g.strokeStyle = '#2c2838';
    g.lineWidth = 5;
    for (let a = -320; a <= 320; a += 80) {
      g.beginPath(); g.moveTo(px(a), 0); g.lineTo(px(a), H); g.stroke();
      g.beginPath(); g.moveTo(0, pz(a)); g.lineTo(W, pz(a)); g.stroke();
    }
    // Buildings.
    g.fillStyle = '#3a3350';
    for (const b of s.buildings) {
      const w = b.half * 2 * scale;
      g.fillRect(px(b.x) - w / 2, pz(b.z) - w / 2, w, w);
    }
    // Waypoint beacon.
    if (s.target) {
      g.fillStyle = '#39ff6a';
      g.beginPath();
      g.arc(px(s.target[0]), pz(s.target[1]), 5, 0, Math.PI * 2);
      g.fill();
    }
    // Cops.
    g.fillStyle = '#ff3040';
    for (const c of s.cops) {
      g.beginPath();
      g.arc(px(c.x), pz(c.z), 3.5, 0, Math.PI * 2);
      g.fill();
    }
    // Player.
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(px(s.x), pz(s.z), 4, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#ffffff';
    g.beginPath();
    g.moveTo(px(s.x), pz(s.z));
    g.lineTo(px(s.x) + Math.sin(s.heading) * 10, pz(s.z) - Math.cos(s.heading) * 10);
    g.stroke();
  }

  renderShop(items, cash, onBuy) {
    this.shopList.innerHTML = '';
    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'shop-row';
      const name = document.createElement('span');
      name.textContent = `${item.name} — ${item.desc}`;
      const btn = document.createElement('button');
      btn.textContent = `$${item.price}`;
      btn.disabled = cash < item.price;
      btn.addEventListener('click', () => onBuy(item.id));
      row.appendChild(name);
      row.appendChild(btn);
      this.shopList.appendChild(row);
    }
  }
}
