// SOLMARA — the game itself: renderer, loop, state machine, camera, and the
// glue between the world, the car, the police, the missions and the HUD.
// Static files only; three.js is vendored under game/vendor/.
import * as THREE from 'three';
import { CAR, CHAPTERS, STEP, WORLD } from './config.js';
import { World } from './world.js';
import { Car, Traffic } from './vehicles.js';
import { Player } from './player.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { Combat } from './combat.js';
import { Hud } from './hud.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { Shop } from './shop.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { stageShot } from './shots.js';
import { mulberry32, clamp } from './random.js';

const SHOT_PARAM = new URLSearchParams(window.location.search).get('shot');

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(1280, 720, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 1280 / 720, 0.1, 1200);
    this.camera.position.set(30, 18, 40);
    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.audio = new AudioEngine();
    this.input = new Input(canvas, () => this.audio.ensure());
    this.world = new World(this.scene);
    this.player = new Player(this.scene);
    this.playerCar = new Car(this.scene, 0xc22a3a, {});
    this.traffic = new Traffic(this.scene, this.world, mulberry32(7));
    this.police = new Police(this.scene, this.world, this.audio);
    this.missions = new Missions(this.scene);
    this.combat = new Combat(this.scene, this.audio);
    this.hud = new Hud({
      newGame: () => this.newGame(),
      continueGame: () => this.continueGame(),
      resume: () => this.setScreen('play'),
      toTitle: () => this.setScreen('title'),
      closeShop: () => this.closeShop(),
      save: () => this.save(),
    });
    this.shop = new Shop(this.hud, this.audio);
    this.cameraMode = 'orbit';
    this.screen = 'title';
    this.cash = 500;
    this.day = 1;
    this.chapterIndex = 0;
    this.owned = [];
    this.nitroTanks = 0;
    this.won = false;
    this.over = false;
    this.message = '';
    this.shot = SHOT_PARAM;
    canvas.addEventListener('mousedown', () => this.onShoot());
    this.reset();
    if (this.shot) {
      const staged = stageShot(this.shot, this);
      this.setScreen(staged.screen);
    } else {
      this.setScreen('title');
    }
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // ---- placement helpers (also the shot stager's API) ----
  reset() {
    this.cash = 500;
    this.day = 1;
    this.chapterIndex = 0;
    this.owned = [];
    this.nitroTanks = 0;
    this.won = false;
    this.over = false;
    this.player.health = 100;
    this.player.armor = 0;
    this.player.ammo = 24;
    this.player.inCar = false;
    this.player.car = null;
    this.playerCar.health = 100;
    this.playerCar.nitroLeft = 0;
    this.playerCar.speed = 0;
    this.police.setWanted(0, 0, 0);
    this.missions.start(0);
    this.placeOnFoot(6, 8, Math.PI);
    this.placeParkedCar(0, 0, Math.PI / 2);
  }

  placeOnFoot(x, z, heading) {
    this.player.place(x, z, heading);
  }

  placeParkedCar(x, z, heading) {
    this.playerCar.place(x, z, heading, 0);
  }

  placeInCar(x, z, heading, speed) {
    this.playerCar.place(x, z, heading, speed || 0);
    this.player.enterCar(this.playerCar);
  }

  setWanted(stars) {
    const p = this.playerPosition();
    this.police.setWanted(stars, p.x, p.z);
  }

  startMission(index) {
    this.chapterIndex = index;
    this.day = CHAPTERS[index].day;
    this.missions.start(index);
    const p = this.playerPosition();
    this.police.setWanted(CHAPTERS[index].wanted, p.x, p.z);
  }

  playerPosition() {
    if (this.player.inCar) return { x: this.playerCar.x, z: this.playerCar.z, heading: this.playerCar.heading, speed: this.playerCar.speed };
    return { x: this.player.x, z: this.player.z, heading: this.player.heading, speed: 0 };
  }

  // ---- screens ----
  setScreen(screen) {
    this.screen = screen;
    if (screen === 'shop') {
      this.shop.openShop(this.shopState());
    } else if (this.shop.open) {
      this.shop.closeShop();
    }
    this.hud.show(screen);
    if (screen === 'title') this.cameraMode = 'orbit';
    else if (screen === 'play') this.cameraMode = 'chase';
  }

  newGame() {
    this.reset();
    this.setScreen('play');
    this.audio.ensure();
    this.hud.toast('Day 1 — First Light: reach the pier.', 3600);
  }

  continueGame() {
    const data = loadGame();
    if (!data) {
      this.newGame();
      return;
    }
    this.reset();
    this.cash = data.cash;
    this.day = data.day;
    this.chapterIndex = data.chapter;
    this.owned = data.owned || [];
    this.player.ammo = data.ammo;
    this.player.armor = data.armor;
    this.player.place(data.player.x, data.player.z, data.player.heading);
    this.playerCar.place(data.car.x, data.car.z, data.car.heading, 0);
    this.playerCar.health = data.carHealth;
    this.missions.start(data.missionIndex);
    const p = this.playerPosition();
    this.police.setWanted(CHAPTERS[data.chapter].wanted, p.x, p.z);
    this.setScreen('play');
    this.hud.toast('Save loaded.', 2000);
  }

  save() {
    const p = this.playerPosition();
    const ok = saveGame({
      cash: this.cash,
      day: this.day,
      chapterIndex: this.chapterIndex,
      missionIndex: this.missions.index,
      ammo: this.player.ammo,
      armor: this.player.armor,
      owned: this.owned,
      playerX: this.player.x,
      playerZ: this.player.z,
      playerHeading: this.player.heading,
      carX: this.playerCar.x,
      carZ: this.playerCar.z,
      carHeading: this.playerCar.heading,
      carHealth: this.playerCar.health,
    });
    this.hud.toast(ok ? 'Game saved.' : 'Save failed.', 2000);
  }

  closeShop() {
    this.shop.closeShop();
    this.setScreen('play');
  }

  shopState() {
    const g = this;
    return {
      get cash() { return g.cash; },
      set cash(v) { g.cash = v; },
      get ammo() { return g.player.ammo; },
      set ammo(v) { g.player.ammo = v; },
      get armor() { return g.player.armor; },
      set armor(v) { g.player.armor = v; },
      get carHealth() { return g.playerCar.health; },
      set carHealth(v) { g.playerCar.health = v; },
      owned: g.owned,
      get nitroTanks() { return g.nitroTanks; },
      set nitroTanks(v) { g.nitroTanks = v; },
    };
  }

  onShoot() {
    if (this.screen !== 'play' || this.player.inCar) return;
    const res = this.combat.shoot(
      { x: this.player.x, z: this.player.z },
      this.player.heading,
      this.player.ammo,
      this.police,
      this.traffic,
    );
    if (res.fired) {
      this.player.ammo = res.ammo;
      if (this.police.wanted < 5) this.police.addHeat(1, this.player.x, this.player.z);
    }
  }

  // ---- per-frame ----
  loop() {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.elapsed += dt;
    if (this.screen === 'play') this.updatePlay(dt);
    else if (this.screen === 'title') this.updateTitle(dt);
    this.traffic.step(dt);
    this.combat.step(dt);
    this.missions.stepBeacon(dt, this.elapsed);
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  updatePlay(dt) {
    const input = this.input;
    // One-shot keys.
    if (input.pressed('KeyE')) this.toggleCar();
    if (input.pressed('KeyB')) this.setScreen('shop');
    if (input.pressed('KeyQ')) this.save();
    if (input.pressed('Escape')) this.setScreen('pause');
    if (input.pressed('KeyF')) this.onShoot();
    if (input.pressed('ShiftLeft') || input.pressed('ShiftRight')) this.useNitro();

    if (this.player.inCar) {
      const throttle = input.throttle - input.brake;
      this.playerCar.step(throttle, input.steer, dt, this.world);
      this.audio.setEngine(Math.abs(this.playerCar.speed) / CAR.maxSpeed, true);
      // Hitting traffic raises heat.
      for (const t of this.traffic.cars) {
        const dx = t.x - this.playerCar.x;
        const dz = t.z - this.playerCar.z;
        if (dx * dx + dz * dz < 9 && Math.abs(this.playerCar.speed) > 12) {
          this.police.addHeat(1, this.playerCar.x, this.playerCar.z);
          this.playerCar.speed *= 0.5;
          t.speed = 2;
        }
      }
    } else {
      this.player.step(input, dt, this.world);
      this.audio.setEngine(0, false);
    }

    const pos = this.playerPosition();
    this.police.step(dt, pos, this.player.inCar ? this.playerCar : null);

    // Mission progress.
    const reward = this.missions.step(pos.x, pos.z);
    if (reward > 0) {
      this.cash += reward;
      this.audio.cash();
      this.audio.sting();
      this.hud.toast(`Job done — +$${reward}.`, 3200);
      if (!this.missions.advance()) {
        this.won = true;
        this.over = true;
        this.hud.gameOver(true);
        return;
      }
      this.chapterIndex = this.missions.index;
      this.day = CHAPTERS[this.chapterIndex].day;
      const p = this.playerPosition();
      this.police.setWanted(CHAPTERS[this.chapterIndex].wanted, p.x, p.z);
      this.hud.toast(`Day ${this.day} — ${CHAPTERS[this.chapterIndex].title}: ${CHAPTERS[this.chapterIndex].job}`, 4200);
    }

    // Wrecked car / dead player ends the run.
    if (this.playerCar.health <= 0 || this.player.health <= 0) {
      this.over = true;
      this.hud.gameOver(false);
      return;
    }

    this.hud.update(this.snapshot());
  }

  updateTitle(dt) {
    // Slow orbit over the plaza; traffic keeps cruising behind the title.
    const t = this.elapsed * 0.05;
    this.camera.position.set(Math.cos(t) * 46, 20, Math.sin(t) * 46);
    this.camera.lookAt(0, 6, 0);
  }

  updateCamera(dt) {
    if (this.screen === 'title') return; // updateTitle drives the camera
    const pos = this.playerPosition();
    const fx = Math.sin(pos.heading);
    const fz = -Math.cos(pos.heading);
    const dist = this.player.inCar ? 11 : 6.5;
    const height = this.player.inCar ? 4.6 : 3.2;
    const tx = pos.x - fx * dist;
    const tz = pos.z - fz * dist;
    const lerpK = Math.min(1, dt * 6);
    this.camera.position.x += (tx - this.camera.position.x) * lerpK;
    this.camera.position.y += (height - this.camera.position.y) * lerpK;
    this.camera.position.z += (tz - this.camera.position.z) * lerpK;
    this.camera.lookAt(pos.x + fx * 9, 1.6, pos.z + fz * 9);
  }

  toggleCar() {
    if (this.player.inCar) {
      this.player.exitCar();
      this.hud.toast('On foot.', 1400);
      return;
    }
    const dx = this.playerCar.x - this.player.x;
    const dz = this.playerCar.z - this.player.z;
    if (dx * dx + dz * dz < 16) {
      this.player.enterCar(this.playerCar);
      this.audio.ensure();
      this.hud.toast('Behind the wheel.', 1400);
    } else {
      this.hud.toast('No car nearby — walk closer.', 1600);
    }
  }

  useNitro() {
    if (!this.player.inCar || this.nitroTanks <= 0 || this.playerCar.nitroLeft > 0) return;
    this.nitroTanks -= 1;
    this.playerCar.nitroLeft = 6;
    this.audio.blip(1200, 0.3, 'sawtooth', 0.12);
  }

  snapshot() {
    const pos = this.playerPosition();
    return {
      cash: this.cash,
      day: this.day,
      chapterTitle: CHAPTERS[this.chapterIndex].title,
      wanted: this.police.wanted,
      speedKmh: this.player.inCar ? this.playerCar.speedKmh : 0,
      ammo: this.player.ammo,
      armor: this.player.armor,
      objective: `${CHAPTERS[this.chapterIndex].title}: ${CHAPTERS[this.chapterIndex].job}`,
      target: this.missions.target,
      buildings: this.world.buildings,
      cops: this.police.cruisers.map((c) => ({ x: c.x, z: c.z })),
      x: pos.x,
      z: pos.z,
      heading: pos.heading,
      inCar: this.player.inCar,
      speed: pos.speed,
      health: this.player.health,
      carHealth: this.playerCar.health,
      missionIndex: this.missions.index,
      screen: this.screen,
      paused: this.screen === 'pause',
      shopOpen: this.shop.open,
    };
  }
}

// Boot. The canvas is 1280x720 in the page; the driver reads window.SOLMARA.
const canvas = document.getElementById('game');
const game = new Game(canvas);
window.SOLMARA = game;
window.SOLMARA_STATE = () => game.snapshot();
window.SOLMARA_HAS_SAVE = () => hasSave();
