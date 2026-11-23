// SOLMARA — bootstrap, game loop, camera, state machine, self-test.
// A 3D open-world crime game: drive, steal cars, outrun the police, run
// missions across seven chapters while a hurricane closes in on the city.
import * as THREE from 'three';
import { CFG, CARS, WEAPONS, STATIONS } from './config.js';
import { createWorld, nearestRoadPoint } from './world.js';
import { input, driveControls } from './input.js';
import { Player } from './player.js';
import { Car } from './vehicles.js';
import { Traffic } from './traffic.js';
import { Police } from './police.js';
import { MissionSys } from './missions.js';
import { Combat } from './combat.js';
import { HUD } from './hud.js';
import { AudioSys } from './audio.js';
import { Effects } from './effects.js';
import { Hurricane } from './hurricane.js';
import { Shop } from './shop.js';
import { loadSave, saveGame } from './save.js';
import { stageShot } from './shots.js';
import { clamp, makeRng } from './random.js';

const params = new URLSearchParams(window.location.search);
const SHOT = params.get('shot');
const SELFTEST = params.get('selftest') === '1';

export const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.message || e.error)));
window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));

class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    document.getElementById('app').appendChild(this.renderer.domElement);
    this.clock = new THREE.Clock();
    this.rng = makeRng(1);

    this.world = createWorld(this.scene, 1);
    this.player = new Player(this.scene);
    this.player.place(0, 12, 0);
    this.traffic = new Traffic(this.scene, this.world, 7);
    this.police = new Police(this.scene, this.world, 21);
    this.missions = new MissionSys(this);
    this.combat = new Combat(this);
    this.hud = new HUD();
    this.audio = new AudioSys();
    this.effects = new Effects(this.scene);
    this.hurricane = new Hurricane();
    this.shop = new Shop(this);

    this.state = {
      cash: CFG.startCash,
      respect: 0,
      missionsDone: new Set(),
      carsOwned: ['comet'],
      carIndex: 0,
      engineLevel: 0,
      armorLevel: 0,
      paint: CARS[0].color,
      day: 1,
    };
    const saved = loadSave();
    if (saved) {
      this.state.cash = saved.cash ?? CFG.startCash;
      this.state.respect = saved.respect ?? 0;
      this.state.missionsDone = new Set(saved.missionsDone || []);
      this.state.carsOwned = saved.carsOwned || ['comet'];
      this.state.carIndex = saved.carIndex || 0;
      this.state.engineLevel = saved.engineLevel || 0;
      this.state.armorLevel = saved.armorLevel || 0;
      this.state.paint = saved.paint ?? CARS[0].color;
      this.hurricane.setDay(saved.day || 1);
      for (const id of this.state.missionsDone) this.missions.done.add(id);
    }

    this.playerCar = null;
    this.switchPlayerCar(true);
    this.player.place(0, 12, 0);

    this.screen = 'title'; // title | play | over
    this.paused = false;
    this.camYaw = 0;
    this.camPitch = 0.32;
    this.camDist = 10;
    this.shotCam = null;
    this.fare = null; // active taxi fare {pickup:{x,z}, drop:{x,z}, stage}
    this.mouseDown = false;
    this.lastE = 0;
    this.deathTimer = 0;

    input.attach(this.renderer.domElement);
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDown = true;
      this.audio.init();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });
    window.addEventListener('keydown', (e) => this.onKey(e));
    this.hud.showStart(this.missions.list());
    this.hud.message('Welcome to Solmara. Press Enter to start.');
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  switchPlayerCar(first = false) {
    const id = this.state.carsOwned[this.state.carIndex];
    const def = CARS.find((c) => c.id === id) || CARS[0];
    if (this.playerCar) {
      this.scene.remove(this.playerCar.mesh);
      if (this.player.inCar === this.playerCar) this.player.inCar = null;
    }
    const car = new Car(this.scene, def, this.state.paint, { taxi: def.id === 'taxi' });
    car.engineLevel = this.state.engineLevel;
    car.armor = this.state.armorLevel;
    const px = this.player.inCar ? this.playerCar.x : this.player.x;
    const pz = this.player.inCar ? this.playerCar.z : this.player.z;
    car.place(px + 4, pz, this.player.heading);
    this.playerCar = car;
    if (!first && !this.player.inCar) {
      this.player.place(car.x - 4, car.z, car.heading);
    }
  }

  applyUpgrades() {
    if (!this.playerCar) return;
    this.playerCar.engineLevel = this.state.engineLevel;
    this.playerCar.armor = this.state.armorLevel;
    const paint = this.playerCar.mesh.children[0].material;
    if (paint) paint.color.setHex(this.state.paint);
    const def = CARS.find((c) => c.id === this.state.carsOwned[this.state.carIndex]);
    if (def) this.playerCar.top = def.top;
  }

  saveGame() {
    this.state.day = this.hurricane.day;
    saveGame(this.state);
  }

  onKey(e) {
    this.audio.init();
    if (e.code === 'Enter' && this.screen === 'title') {
      this.screen = 'play';
      this.hud.hideStart();
      this.hud.message('Chapter 1 — drive to the gold marker, or open the mission list with M.');
      return;
    }
    if (e.code === 'KeyM' && this.screen === 'play') {
      // Start the next un-done mission from the list.
      const next = this.missions.list().find((m) => !m.done);
      if (next && !this.missions.current) this.missions.start(next.id);
      return;
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (this.screen === 'play') {
        this.paused = !this.paused;
        this.hud.showPause(this.paused);
      }
      return;
    }
    if (e.code === 'KeyG' && this.screen === 'play') {
      this.shop.toggle();
      return;
    }
    if (e.code === 'KeyR') {
      const st = this.audio.cycleStation();
      this.hud.message(`Radio: ${st.name} — ${st.desc}`);
      return;
    }
    if (e.code === 'Tab') {
      this.hud.showWheel(true, WEAPONS, this.combat.weaponIndex);
      setTimeout(() => this.hud.showWheel(false), 1400);
      return;
    }
    if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') {
      this.combat.select(Number(e.code.slice(-1)) - 1);
      return;
    }
    if (e.code === 'KeyE') {
      const now = performance.now();
      if (now - this.lastE < 250) return;
      this.lastE = now;
      this.tryEnterExitCar();
    }
  }

  tryEnterExitCar() {
    if (this.screen !== 'play' || this.paused) return;
    if (this.player.inCar) {
      this.player.exitCar();
      this.hud.message('On foot. Press E near a car to get in.');
      return;
    }
    const p = this.player;
    const dCar = Math.hypot(this.playerCar.x - p.x, this.playerCar.z - p.z);
    if (dCar < 5) {
      p.enterCar(this.playerCar);
      this.hud.message(`Driving the ${CARS.find((c) => c.id === this.state.carsOwned[this.state.carIndex]).name}.`);
      return;
    }
    const stolen = this.traffic.nearestCar(p.x, p.z, 5);
    if (stolen) {
      this.traffic.cars.splice(this.traffic.cars.indexOf(stolen), 1);
      p.enterCar(stolen);
      this.police.addWanted(1);
      this.hud.message('Car stolen! The police noticed.');
      this.audio.crash();
    }
  }

  resetForShot() {
    this.police.clearWanted();
    this.missions.current = null;
    this.missions.hideMarker();
    this.fare = null;
    this.shotDrive = null;
    this.player.health = 100;
    this.screen = 'play';
    this.paused = false;
    if (this.hud.el.messages) this.hud.el.messages.innerHTML = '';
    this.player.exitCar();
  }

  // Autopilot controls for staged screenshots: keep the car driving (the
  // live loop has no keyboard input, so without this the car coasts to a stop
  // before the screenshot is taken).
  shotControls() {
    const car = this.playerCar;
    if (this.shotDrive === 'mission') {
      const target = this.missions.markerPos();
      if (target) return car.steerToward(target.x, target.z, 1);
    }
    const ahead = { x: car.x + Math.sin(car.heading) * 30, z: car.z + Math.cos(car.heading) * 30 };
    const road = nearestRoadPoint(ahead.x, ahead.z);
    return car.steerToward(road.x, road.z, 1);
  }

  updateTaxi(dt, pos) {
    const m = this.missions.current;
    if (!m || m.def.type !== 'taxi') return;
    if (!this.fare) {
      // A passenger waits at a random road point.
      const a = this.rng.next() * Math.PI * 2;
      const d = 60 + this.rng.next() * 120;
      const px = clamp(pos.x + Math.sin(a) * d, -280, 280);
      const pz = clamp(pos.z + Math.cos(a) * d, -280, 280);
      const rp = nearestRoadPoint(px, pz);
      this.fare = { pickup: rp, drop: null, stage: 'pickup' };
      this.missions.showMarker(rp.x, rp.z);
      this.hud.message('Taxi fare: pick up the passenger at the gold marker.');
      return;
    }
    const target = this.fare.stage === 'pickup' ? this.fare.pickup : this.fare.drop;
    const d2 = (pos.x - target.x) ** 2 + (pos.z - target.z) ** 2;
    if (d2 > 8 * 8) return;
    if (this.fare.stage === 'pickup') {
      const a = this.rng.next() * Math.PI * 2;
      const d = 80 + this.rng.next() * 140;
      const dx = clamp(pos.x + Math.sin(a) * d, -280, 280);
      const dz = clamp(pos.z + Math.cos(a) * d, -280, 280);
      const rp = nearestRoadPoint(dx, dz);
      this.fare.drop = rp;
      this.fare.stage = 'drop';
      this.missions.showMarker(rp.x, rp.z);
      this.hud.message('Passenger aboard — drive to the drop-off.');
    } else {
      this.fare = null;
      this.missions.fareDone();
    }
  }

  update(dt) {
    const stormNote = this.hurricane.update(dt, this.world);
    if (stormNote) this.hud.message(stormNote);
    this.world.timeOfDay = (this.world.timeOfDay + dt / 600) % 1;
    const pos = this.player.pos();
    this.world.update(dt, pos);
    this.effects.update(dt);

    if (this.screen === 'play' && !this.paused) {
      const { dx, dy } = input.consumeMouse();
      this.camYaw -= dx * 0.0028;
      this.camPitch = clamp(this.camPitch + dy * 0.002, 0.08, 1.1);
      if (this.player.inCar) {
        const ctrl = this.shotDrive ? this.shotControls() : driveControls();
        this.playerCar.update(dt, ctrl, (x, z, r) => this.world.collide(x, z, r));
        this.audio.setEngine(this.playerCar.kmh(), ctrl.throttle);
      } else {
        const move = {
          x: (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0) - (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0),
          z: (input.down('KeyW') || input.down('ArrowUp') ? 1 : 0) - (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0),
        };
        this.player.update(dt, move, dx, (x, z, r) => this.world.collide(x, z, r));
        this.audio.setEngine(0, 0);
        if (this.mouseDown && input.locked) this.fireWeapon();
      }
      if (this.player.inCar && this.mouseDown && input.locked) this.fireWeapon();
      this.traffic.update(dt, this.world.timeOfDay > 0.62 || this.world.timeOfDay < 0.38);
      this.police.update(dt, pos, this.player.inCar ? this.playerCar.speed : this.player.speed, !this.player.inCar);
      this.audio.setSiren(this.police.sirenOn, this.police.wanted);
      this.missions.update(dt, pos);
      this.updateTaxi(dt, pos);
      this.combat.update(dt, pos);
      // Spike strips slow the player's car.
      if (this.player.inCar) {
        for (const s of this.police.spikes) {
          const d2 = (this.playerCar.x - s.position.x) ** 2 + (this.playerCar.z - s.position.z) ** 2;
          if (d2 < 4 * 4 && Math.abs(this.playerCar.speed) > 6) {
            this.playerCar.speed *= 0.45;
            this.effects.sparks(this.playerCar.x, 0.6, this.playerCar.z);
            this.audio.crash();
            this.scene.remove(s);
            this.police.spikes.splice(this.police.spikes.indexOf(s), 1);
            break;
          }
        }
      }
      if (this.player.health <= 0) {
        this.screen = 'over';
        this.deathTimer = 0;
        this.state.cash = Math.max(0, this.state.cash - 200);
        this.hud.message('Wasted! The hospital patched you up — $200.');
        this.player.health = 100;
        this.police.clearWanted();
        this.player.exitCar();
        this.player.place(0, -240, 0);
        this.screen = 'play';
      }
    }
    this.audio.update(dt);

    const st = this.state;
    const mission = this.missions.current;
    this.hud.update({
      cash: st.cash,
      wanted: this.police.wanted,
      health: this.player.health,
      speedKmh: this.player.inCar ? this.playerCar.kmh() : 0,
      inCar: !!this.player.inCar,
      district: this.world.districtAt(pos.x, pos.z),
      day: this.hurricane.day,
      chapter: this.hurricane.chapter,
      radio: this.audio.currentStation().name,
      objective: mission ? `${mission.def.name}: ${mission.def.brief}` : 'Press M for the next mission — or explore Solmara.',
    });
    this.hud.drawMinimap(this.world, pos, this.police.units, this.traffic.cars, this.missions.markerPos());
  }

  fireWeapon() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const origin = this.camera.position.clone();
    this.combat.shoot(origin, dir);
    this.effects.shake(0.12);
  }

  updateCamera(dt) {
    const pos = this.player.pos();
    if (this.shotCam === 'orbit') {
      const t = performance.now() / 9000;
      this.camera.position.set(pos.x + Math.sin(t) * 26, 12, pos.z + Math.cos(t) * 26);
      this.camera.lookAt(pos.x, 2, pos.z);
      return;
    }
    const heading = pos.heading + this.camYaw;
    const dist = this.player.inCar ? this.camDist + 2 : 7;
    const height = this.player.inCar ? 4.2 : 3.2;
    const tx = pos.x - Math.sin(heading) * dist;
    const tz = pos.z - Math.cos(heading) * dist;
    const k = 1 - Math.pow(0.0001, dt);
    this.camera.position.x += (tx - this.camera.position.x) * k;
    this.camera.position.y += (height - this.camera.position.y) * k;
    this.camera.position.z += (tz - this.camera.position.z) * k;
    const shake = this.effects.shakeOffset();
    this.camera.lookAt(pos.x + shake.x, 1.6 + shake.y, pos.z);
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt);
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  run() {
    const loop = () => {
      requestAnimationFrame(loop);
      this.frame();
    };
    loop();
  }

  // Headless self-test (?selftest=1): exercise every system with fixed steps
  // and report pass/fail as JSON in #selftest and the document title.
  selftest() {
    const checks = [];
    const check = (name, fn) => {
      try {
        const ok = fn();
        checks.push({ name, pass: ok !== false });
      } catch (err) {
        checks.push({ name, pass: false, error: String(err && err.message ? err.message : err) });
      }
    };
    check('world-built', () => this.world.buildings.length > 100 && this.world.colliders.length > 100);
    check('missions-10', () => this.missions.list().length === 10);
    check('cars-3', () => CARS.length === 3);
    check('stations-3', () => STATIONS.length === 3);
    check('weapons-3', () => WEAPONS.length === 3);
    check('districts-7', () => this.world.districtAt(0, 0) === 'Downtown');
    check('mission-start', () => this.missions.start(1) && !!this.missions.current);
    check('drive-10s', () => {
      this.screen = 'play';
      this.hud.hideStart();
      this.player.enterCar(this.playerCar);
      for (let i = 0; i < 300; i++) {
        const ctrl = this.playerCar.steerToward(0, 200, 1);
        this.playerCar.update(1 / 30, ctrl, (x, z, r) => this.world.collide(x, z, r));
        this.traffic.update(1 / 30, false);
        this.world.update(1 / 30, this.player.pos());
      }
      return Math.abs(this.playerCar.speed) > 1;
    });
    check('police-spawn', () => {
      this.police.addWanted(3);
      this.police.update(0.1, this.player.pos(), 10, false);
      return this.police.units.length > 0;
    });
    check('police-heli', () => {
      this.police.addWanted(2);
      this.police.update(0.1, this.player.pos(), 10, false);
      return this.police.heli !== null;
    });
    check('combat-shoot', () => {
      const origin = new THREE.Vector3(0, 2, 0);
      const dir = new THREE.Vector3(0, 0, 1);
      this.combat.shoot(origin, dir);
      return this.combat.ammo[0] === WEAPONS[0].mag - 1;
    });
    check('save-roundtrip', () => {
      const before = this.state.cash;
      this.state.cash = 4242;
      this.saveGame();
      const back = loadSave();
      // Restore the real state: a test must not leave dirty data behind.
      this.state.cash = before;
      this.saveGame();
      return back && back.cash === 4242;
    });
    check('hud-minimap', () => {
      this.hud.drawMinimap(this.world, this.player.pos(), [], [], { x: 0, z: 0 });
      return true;
    });
    check('shots-all', () => {
      for (const name of ['start', 'drive', 'chase', 'mission']) stageShot(name, this);
      return true;
    });
    check('no-page-errors', () => errors.length === 0);
    const passed = checks.filter((c) => c.pass).length;
    const result = { passed, total: checks.length, checks, errors };
    const el = document.getElementById('selftest');
    if (el) el.textContent = JSON.stringify(result);
    document.title = `SELFTEST ${passed}/${checks.length}`;
    return result;
  }
}

const game = new Game();
window.__solmara = game;

if (SELFTEST) {
  game.selftest();
  // Keep rendering so the page is a real frame, then stop after a moment.
  game.run();
} else if (SHOT) {
  const staged = stageShot(SHOT, game);
  game.shotCam = staged.cam;
  game.screen = staged.screen;
  game.run();
} else {
  game.run();
}
