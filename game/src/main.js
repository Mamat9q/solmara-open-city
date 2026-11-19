// SOLMARA — the game itself: state, the frame loop, the camera, movement,
// screens and menus. One Game object is exposed as window.__solmara so the
// playtest driver and the screenshot stager can drive it directly.

import * as THREE from 'three';
import { AudioEngine } from './audio.js';
import { Combat } from './combat.js';
import { CAR_DEFS, CITY, HURRICANE, MISSIONS, PLAYER, SHOP_RADIUS, CAR_ENTER_RADIUS, WANTED_DECAY_SECONDS } from './config.js';
import { drawMinimap, refreshHud } from './hud.js';
import { Input } from './input.js';
import { MissionManager } from './missions.js';
import { PedestrianManager } from './people.js';
import { PoliceManager } from './police.js';
import { makeRng } from './random.js';
import { hasSave, readSave, writeSave } from './save.js';
import { renderShopList, ShopManager } from './shops.js';
import { stageShot } from './shots.js';
import { TrafficManager, Vehicle } from './vehicles.js';
import { collideWithBuildings, createWorld, updateStorm } from './world.js';

const PARKED_CARS = [
  { defKey: 'sedan', x: 2, z: 34, heading: 0 },
  { defKey: 'coupe', x: 42, z: -18, heading: Math.PI / 2 },
  { defKey: 'taxi', x: -38, z: 62, heading: Math.PI },
  { defKey: 'sedan', x: 82, z: 22, heading: -Math.PI / 2 },
  { defKey: 'van', x: -78, z: -22, heading: Math.PI / 2 },
  { defKey: 'marina', x: 38, z: -62, heading: 0 },
  { defKey: 'coupe', x: -42, z: -78, heading: Math.PI },
  { defKey: 'sedan', x: 78, z: -62, heading: -Math.PI / 2 },
];

function makePlayerMesh() {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: 0x2e9e8f });
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98f6a });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2e3440 });
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.05, 8), shirt);
  torso.position.y = 0.95;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skin);
  head.position.y = 1.72;
  group.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.3), pants);
  legs.position.y = 0.28;
  group.add(legs);
  return group;
}

export class Game {
  constructor() {
    const params = new URLSearchParams(window.location.search);
    this.seed = Number(params.get('seed')) || 1;
    this.rng = makeRng(this.seed);
    this.shotName = params.get('shot') || null;

    this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game'), antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 600);
    this.camera.position.set(38, 26, 96);
    this.camera.lookAt(0, 6, -20);

    this.audio = new AudioEngine();
    this.input = new Input(document.getElementById('game'), () => this.audio.unlock());
    this.input.attach();

    this.world = createWorld(this.scene, this.rng);
    this.police = new PoliceManager(this.scene, this.world);
    this.missions = new MissionManager(this.scene);
    this.shopManager = new ShopManager(this.scene);
    this.pedestrians = new PedestrianManager(this.scene, this.rng);
    this.traffic = new TrafficManager(this.scene, this.rng, this.world);
    this.combat = new Combat(this);

    this.player = {
      pos: new THREE.Vector3(0, 0, 20),
      group: makePlayerMesh(),
      heading: 0,
      health: PLAYER.maxHealth,
      maxHealth: PLAYER.maxHealth,
      ammo: PLAYER.magazineSize,
      reserve: PLAYER.startReserveAmmo,
    };
    this.scene.add(this.player.group);

    // A tall amber beacon marks the active mission target in the world, so
    // the objective is visible down the street, not only on the minimap.
    this.missionBeacon = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, 26, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.missionBeacon.visible = false;
    this.scene.add(this.missionBeacon);
    this.missionBeaconRing = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 3.4, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
    );
    this.missionBeaconRing.rotation.x = -Math.PI / 2;
    this.missionBeaconRing.position.y = 0.08;
    this.missionBeaconRing.visible = false;
    this.scene.add(this.missionBeaconRing);

    this.vehicles = { cars: [] };
    for (const spot of PARKED_CARS) {
      const car = new Vehicle(spot.defKey, spot.x, spot.z, spot.heading, false);
      this.scene.add(car.group);
      this.vehicles.cars.push(car);
    }

    this.screen = 'start';
    this.cash = PLAYER.startCash;
    this.missionIndex = 0;
    this.wanted = 0;
    this.hurricane = { day: 1, playSeconds: 0 };
    this.shopOwned = [];
    this.currentCar = null;
    this.elapsedTime = 0;
    this.cameraYaw = 0;
    this.cameraPitch = 0.32;
    this.muzzleFlash = 0;
    this.wantedTimer = 0;
    this.debug = { x: 0, z: 0, car: null };
    this.toastTimer = null;
    this.lastFrame = performance.now();

    window.__solmara = this;
    window.__shotReady = false;

    this.wireButtons();
    this.renderChapterList();
    this.bindActionKeys();
    this.showScreen('start');
    window.addEventListener('resize', () => this.onResize());
  }

  wireButtons() {
    document.getElementById('btn-new').addEventListener('click', () => {
      this.audio.unlock();
      this.newGame();
    });
    document.getElementById('btn-continue').addEventListener('click', () => {
      this.audio.unlock();
      if (!this.loadSave()) this.newGame();
    });
    document.getElementById('btn-resume').addEventListener('click', () => this.setScreen('playing'));
    document.getElementById('btn-restart').addEventListener('click', () => this.newGame());
    document.getElementById('btn-save-pause').addEventListener('click', () => {
      this.saveNow();
      this.toast('Game saved.');
    });
    document.getElementById('btn-shop-close').addEventListener('click', () => this.setScreen('playing'));
    document.getElementById('btn-respawn').addEventListener('click', () => this.respawn());
  }

  renderChapterList() {
    const list = document.getElementById('chapter-list');
    if (!list) return;
    list.innerHTML = '';
    for (const mission of MISSIONS) {
      const row = document.createElement('div');
      row.className = 'chapter-row';
      row.innerHTML =
        `<span class="chapter-num">${mission.id}</span>` +
        `<span class="chapter-name">${mission.chapter}</span>` +
        `<span class="chapter-pay">$${mission.payout}</span>`;
      list.appendChild(row);
    }
  }

  bindActionKeys() {
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      const code = event.code;
      if (code === 'Space') event.preventDefault();
      if (code === 'Escape') {
        if (this.screen === 'playing') this.setScreen('paused');
        else if (this.screen === 'paused') this.setScreen('playing');
        else if (this.screen === 'shop') this.setScreen('playing');
        return;
      }
      if (this.screen !== 'playing') return;
      if (code === 'KeyE') this.toggleCar();
      else if (code === 'KeyM') this.startMission();
      else if (code === 'KeyB') this.toggleShop();
      else if (code === 'KeyQ') {
        this.saveNow();
        this.toast('Game saved.');
      } else if (code === 'KeyR') this.combat.reload();
      else if (code === 'Space') this.combat.shoot();
    });
  }

  setScreen(name) {
    this.screen = name;
    this.showScreen(name);
    if (name !== 'playing') this.input.releaseLock();
  }

  showScreen(name) {
    const screens = { start: 'screen-start', shop: 'screen-shop', paused: 'screen-pause', dead: 'screen-dead' };
    for (const [key, id] of Object.entries(screens)) {
      const element = document.getElementById(id);
      if (element) element.classList.toggle('hidden', key !== name);
    }
    const hud = document.getElementById('hud');
    if (hud) hud.classList.toggle('hidden', name === 'start');
    const continueButton = document.getElementById('btn-continue');
    if (continueButton && name === 'start') {
      continueButton.style.display = hasSave() ? '' : 'none';
    }
  }

  newGame() {
    this.missions.cancel();
    this.police.clearRoadblocks();
    for (const cop of this.police.copCars) {
      cop.active = false;
      cop.group.visible = false;
      cop.speed = 0;
    }
    this.player.pos.set(0, 0, 20);
    this.player.heading = 0;
    this.player.health = PLAYER.maxHealth;
    this.player.ammo = PLAYER.magazineSize;
    this.player.reserve = PLAYER.startReserveAmmo;
    this.player.group.visible = true;
    this.currentCar = null;
    this.cash = PLAYER.startCash;
    this.missionIndex = 0;
    this.wanted = 0;
    this.hurricane = { day: 1, playSeconds: 0 };
    this.shopOwned = [];
    this.cameraYaw = 0;
    this.cameraPitch = 0.32;
    for (const car of this.vehicles.cars) {
      if (car.owned) {
        this.scene.remove(car.group);
      }
    }
    this.vehicles.cars = this.vehicles.cars.filter((car) => !car.owned);
    this.setScreen('playing');
    this.toast('Welcome back to Solmara, Dario. Press M for your first job.');
    this.refreshHud();
  }

  loadSave() {
    const found = readSave();
    if (!found) return false;
    const data = found.data;
    this.newGame();
    this.cash = typeof data.cash === 'number' ? data.cash : this.cash;
    this.missionIndex = typeof data.missionIndex === 'number' ? data.missionIndex : 0;
    this.hurricane.day = typeof data.hurricaneDay === 'number' ? data.hurricaneDay : 1;
    this.shopOwned = Array.isArray(data.shopOwned) ? [...data.shopOwned] : [];
    if (data.player) {
      this.player.pos.set(data.player.x || 0, 0, data.player.z || 0);
      this.player.heading = data.player.heading || 0;
      this.player.health = data.player.health ?? PLAYER.maxHealth;
      this.player.ammo = data.player.ammo ?? PLAYER.magazineSize;
      this.player.reserve = data.player.reserve ?? PLAYER.startReserveAmmo;
    }
    if (Array.isArray(data.ownedCars)) {
      for (const saved of data.ownedCars) {
        if (!CAR_DEFS[saved.defKey]) continue;
        const car = new Vehicle(saved.defKey, saved.x, saved.z, saved.heading || 0, true);
        this.scene.add(car.group);
        this.vehicles.cars.push(car);
        if (!this.shopOwned.includes(saved.defKey === 'marina' ? 'marina' : 'interceptor')) {
          this.shopOwned.push(saved.defKey === 'marina' ? 'marina' : 'interceptor');
        }
      }
    }
    this.setScreen('playing');
    this.toast(`Save loaded — Day ${this.hurricane.day}, $${this.cash}.`);
    this.refreshHud();
    return true;
  }

  saveNow() {
    return writeSave(this);
  }

  advanceDay() {
    if (this.hurricane.day < HURRICANE.totalDays) {
      this.hurricane.day += 1;
      const daysLeft = HURRICANE.totalDays - this.hurricane.day + 1;
      this.toast(`Day ${this.hurricane.day} — the hurricane is ${daysLeft} day${daysLeft === 1 ? '' : 's'} out.`);
    }
  }

  startMission() {
    if (this.missions.active) {
      this.toast('A job is already running — follow the yellow marker.');
      return;
    }
    if (this.missionIndex >= MISSIONS.length) {
      this.toast('Every chapter is done. Solmara is yours.');
      return;
    }
    const mission = this.missions.start(this.missionIndex);
    if (mission) {
      this.toast(`${mission.chapter}: ${mission.brief}`);
      this.audio.pickup();
    }
  }

  toggleCar() {
    if (this.currentCar) {
      const car = this.currentCar;
      this.currentCar = null;
      this.player.pos.set(car.x + 2.5, 0, car.z);
      this.player.group.visible = true;
      this.audio.setEngine(0);
      return;
    }
    let best = null;
    let bestDist = Infinity;
    for (const car of this.vehicles.cars) {
      const dist = Math.hypot(car.x - this.player.pos.x, car.z - this.player.pos.z);
      if (dist < bestDist) {
        bestDist = dist;
        best = car;
      }
    }
    if (best && bestDist <= CAR_ENTER_RADIUS) this.enterCar(best);
    else this.toast('No car close enough — walk up to one and press E.');
  }

  enterCar(car) {
    this.currentCar = car;
    this.player.group.visible = false;
    this.player.pos.set(car.x, 0, car.z);
    if (!car.owned) {
      this.wanted = Math.min(4, this.wanted + 1);
      this.wantedTimer = 0;
      this.toast(`You took the ${car.def.name}. The heat is on — wanted level ${this.wanted}.`);
    } else {
      this.toast(`Driving your ${car.def.name}.`);
    }
    this.audio.setEngine(0.1);
  }

  toggleShop() {
    const shop = this.shopManager.nearestShop(this.player.pos.x, this.player.pos.z);
    if (!shop) {
      this.toast('No shop here — look for the green markers on the minimap.');
      return;
    }
    this.shopManager.openShop = shop;
    renderShopList(this, shop);
    this.setScreen('shop');
  }

  hurtPlayer(amount, cause) {
    this.combat.hurtPlayer(amount, cause);
  }

  flashDamage() {
    const flash = document.getElementById('damage-flash');
    if (!flash) return;
    flash.style.opacity = '0.45';
    setTimeout(() => { flash.style.opacity = '0'; }, 140);
  }

  die(cause) {
    this.screen = 'dead';
    this.showScreen('dead');
    this.input.releaseLock();
    this.audio.setEngine(0);
    const causeLine = document.getElementById('dead-cause');
    if (causeLine) causeLine.textContent = `Dario was ${cause}. Mara is not happy — but the city still needs a driver.`;
  }

  respawn() {
    this.player.health = PLAYER.maxHealth;
    this.player.pos.set(0, 0, 20);
    this.player.heading = 0;
    this.wanted = 0;
    this.missions.cancel();
    this.police.clearRoadblocks();
    this.currentCar = null;
    this.player.group.visible = true;
    this.cash = Math.floor(this.cash / 2);
    this.setScreen('playing');
    this.toast('Doc patched you up. Half your cash went to the clinic.');
  }

  toast(message) {
    const element = document.getElementById('toast');
    if (!element) return;
    element.textContent = message;
    element.classList.remove('hidden');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => element.classList.add('hidden'), 3600);
  }

  refreshHud() {
    refreshHud(this);
    drawMinimap(this);
  }

  updateCamera(dt) {
    const target = this.currentCar
      ? { x: this.currentCar.x, z: this.currentCar.z, y: 1.2 }
      : { x: this.player.pos.x, z: this.player.pos.z, y: 1.6 };
    if (this.currentCar) {
      // The chase camera sits behind the car, so it eases toward the car's
      // own heading — never toward the opposite direction, which would put
      // the camera in front of the bonnet looking back at the headlights.
      const targetYaw = this.currentCar.heading;
      let diff = targetYaw - this.cameraYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.cameraYaw += diff * Math.min(1, dt * 3 + 0.02);
    }
    const distance = this.currentCar ? 11 : 7.5;
    const height = this.currentCar ? 4.2 : 3.2;
    const cx = target.x - Math.sin(this.cameraYaw) * distance;
    const cz = target.z - Math.cos(this.cameraYaw) * distance;
    this.camera.position.set(cx, target.y + height * this.cameraPitch + 1.2, cz);
    this.camera.lookAt(target.x, target.y, target.z);
  }

  updatePlayer(dt) {
    const look = this.input.consumeLook();
    this.cameraYaw -= look.dx * 0.0028;
    this.cameraPitch = Math.max(0.12, Math.min(0.9, this.cameraPitch + look.dy * 0.0016));
    if (this.input.consumeClick() && this.screen === 'playing') this.combat.shoot();

    if (this.currentCar) {
      const car = this.currentCar;
      const forward = (this.input.isDown('KeyW') ? 1 : 0) + (this.input.isDown('KeyS') ? -1 : 0);
      const steering = (this.input.isDown('KeyA') ? 1 : 0) + (this.input.isDown('KeyD') ? -1 : 0);
      car.drive(
        forward, steering, dt,
        this.shopOwned.includes('tuning'),
        this.shopOwned.includes('plating'),
        this.world,
      );
      this.player.pos.set(car.x, 0, car.z);
      this.player.heading = car.heading;
      this.audio.setEngine(Math.abs(car.speed) / car.topSpeed(true));
      return;
    }

    const sprint = this.input.isDown('ShiftLeft') || this.input.isDown('ShiftRight');
    const speed = sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    let forward = (this.input.isDown('KeyW') ? 1 : 0) + (this.input.isDown('KeyS') ? -1 : 0);
    let strafe = (this.input.isDown('KeyD') ? 1 : 0) + (this.input.isDown('KeyA') ? -1 : 0);
    if (forward !== 0 || strafe !== 0) {
      const length = Math.hypot(forward, strafe);
      forward /= length;
      strafe /= length;
      const sin = Math.sin(this.cameraYaw);
      const cos = Math.cos(this.cameraYaw);
      const dx = (sin * forward + cos * strafe) * speed * dt;
      const dz = (cos * forward - sin * strafe) * speed * dt;
      const fixed = collideWithBuildings(this.world, this.player.pos.x + dx, this.player.pos.z + dz, PLAYER.radius);
      this.player.pos.x = fixed.x;
      this.player.pos.z = fixed.z;
      this.player.heading = Math.atan2(dx, dz);
    }
    this.player.group.position.copy(this.player.pos);
    this.player.group.rotation.y = this.player.heading;
    this.audio.setEngine(0);
  }

  update(dt) {
    if (this.screen !== 'playing') return;
    this.elapsedTime += dt;
    this.hurricane.playSeconds += dt;
    if (this.hurricane.playSeconds >= HURRICANE.secondsPerDay) {
      this.hurricane.playSeconds = 0;
      this.advanceDay();
    }
    if (this.wanted > 0) {
      this.wantedTimer += dt;
      if (this.wantedTimer >= WANTED_DECAY_SECONDS) {
        this.wantedTimer = 0;
        this.wanted = Math.max(0, this.wanted - 1);
        if (this.wanted === 0) this.police.clearRoadblocks();
      }
    }
    this.updatePlayer(dt);
    this.traffic.update(dt, this.player.pos);
    this.pedestrians.update(dt);
    this.police.update(dt, this, this.audio);
    const missionEvent = this.missions.update(dt, this);
    if (missionEvent) {
      if (missionEvent.event === 'fight') this.toast('Syndicate crew ahead — take them down!');
      if (missionEvent.event === 'complete') {
        this.toast(`Job done — $${missionEvent.mission.payout} paid. Day ${this.hurricane.day} of 7.`);
      }
    }
    const beaconOn = !!this.missions.active;
    this.missionBeacon.visible = beaconOn;
    this.missionBeaconRing.visible = beaconOn;
    if (beaconOn) {
      const target = this.missions.active.target;
      this.missionBeacon.position.set(target.x, 13, target.z);
      this.missionBeaconRing.position.set(target.x, 0.08, target.z);
      const pulse = 1 + Math.sin(this.elapsedTime * 3) * 0.15;
      this.missionBeaconRing.scale.set(pulse, pulse, 1);
      this.missionBeacon.material.opacity = 0.22 + Math.sin(this.elapsedTime * 3) * 0.08;
    }
    updateStorm(this.world, this.hurricane.day, dt, this.elapsedTime, this.camera.position, this.audio);
    this.debug.x = this.player.pos.x;
    this.debug.z = this.player.pos.z;
    this.debug.car = this.currentCar ? this.currentCar.def.name : null;
    this.refreshHud();
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  shotReady() {
    setTimeout(() => {
      window.__shotReady = true;
    }, 800);
  }

  start() {
    const frame = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrame) / 1000));
      this.lastFrame = now;
      if (this.screen === 'start' || this.screen === 'paused' || this.screen === 'dead' || this.screen === 'shop') {
        if (this.screen === 'start') {
          updateStorm(this.world, 1, dt, this.elapsedTime, this.camera.position, null);
        }
        this.renderer.render(this.scene, this.camera);
      } else {
        this.update(dt);
        this.updateCamera(dt);
        this.renderer.render(this.scene, this.camera);
      }
      if (this.muzzleFlash > 0) this.muzzleFlash -= dt;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}

const game = new Game();
if (game.shotName) {
  stageShot(game.shotName, game);
  game.refreshHud();
}
game.start();
