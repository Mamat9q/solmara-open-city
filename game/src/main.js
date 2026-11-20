// SOLMARA — boot and the one loop. The game moves between title, play, paused
// and busted. Fixed 1/60 s steps; the camera is a third-person chase cam with a
// mouse orbit (pointer lock is best-effort, drag always works).
//
// ?seed=N fixes the city. ?shot=start|drive|chase|mission (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import * as THREE from 'three';
import { CARS, PAINTS, STEP } from './config.js';
import { createRandom } from './random.js';
import { createInput } from './input.js';
import { createWorld } from './world.js';
import { createCar, createGarage } from './vehicles.js';
import { createPlayer } from './player.js';
import { createTraffic } from './traffic.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createCombat } from './combat.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { createSave } from './save.js';
import { createShop } from './shop.js';
import { createHurricane } from './hurricane.js';
import { createEffects } from './effects.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const TIME_RATE = 1 / 45; // one game hour per 45 real seconds

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261121;

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5d9);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(0, 40, 80);

function defaultState() {
  return {
    cash: 150, respect: 0, day: 1, missionIndex: 0, missionsDone: [],
    ownedCars: ['dune'], carIndex: 0, upgrades: { engine: 0, armor: 0 }, paint: 0,
    ownedWeapons: ['pistol'], weapon: 'pistol', ammo: 60, health: 100, armor: 0, wanted: 0,
  };
}

const G = {
  scene, camera, renderer,
  rng: createRandom(seed),
  time: 0, timeOfDay: 17.4, nightFactor: 0,
  weather: { rain: 0, rainTarget: 0 },
  state: defaultState(),
  mode: 'title',
  camYaw: 0, camPitch: 0.32, playerHeading: 0,
  lastMouseAt: 0,
};

G.input = createInput(canvas);
G.world = createWorld(G);
G.player = createPlayer(G);
G.car = createCar(G, CARS[G.state.carIndex]);
G.car.applyUpgrades(G.state.upgrades);
G.traffic = createTraffic(G);
G.police = createPolice(G);
G.missions = createMissions(G);
G.combat = createCombat(G);
G.hud = createHud(G);
G.audio = createAudio(G);
G.save = createSave(G);
G.shop = createShop(G);
G.garage = createGarage(G);
G.hurricane = createHurricane(G);
G.effects = createEffects(G);

G.car.teleport(0, 40, 0);
G.player.teleport(4, 40, 0);

G.switchCar = function switchCar(index) {
  const def = CARS[index];
  if (!def) return;
  const old = G.car;
  const { x, z, heading } = old;
  scene.remove(old.mesh);
  G.state.carIndex = index;
  G.car = createCar(G, def);
  G.car.applyUpgrades(G.state.upgrades);
  G.car.setPaint(PAINTS[G.state.paint].color);
  G.car.teleport(x, z, heading);
  if (G.player.inCar) G.player.mesh.visible = false;
};

G.updateCamera = function updateCamera(dt) {
  const inCar = G.player.inCar;
  const tx = inCar ? G.car.x : G.player.x;
  const tz = inCar ? G.car.z : G.player.z;
  G.playerHeading = inCar ? G.car.heading : G.player.heading;
  if (G.mode === 'title') {
    const a = G.time * 0.05;
    camera.position.set(Math.sin(a) * 90, 42, Math.cos(a) * 90 - 20);
    camera.lookAt(0, 8, -20);
    return;
  }
  // Ease the chase cam behind the car when the mouse has been idle.
  if (inCar && G.time - G.lastMouseAt > 1.5 && Math.abs(G.car.speed) > 3) {
    let dh = G.car.heading - G.camYaw;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    G.camYaw += dh * Math.min(1, dt * 1.6);
  }
  const dist = inCar ? 12 : 9;
  const height = 3.2 + G.camPitch * 7;
  const cx = tx - Math.sin(G.camYaw) * dist;
  const cz = tz - Math.cos(G.camYaw) * dist;
  camera.position.set(cx, height, cz);
  camera.lookAt(tx + Math.sin(G.camYaw) * 6, 2.2, tz + Math.cos(G.camYaw) * 6);
};

window.__errors = [];
window.addEventListener('error', (e) => { window.__errors.push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { window.__errors.push(`rejection: ${e.reason}`); });

function resetGame() {
  G.state = defaultState();
  G.timeOfDay = 17.4;
  G.weather.rain = 0;
  G.weather.rainTarget = 0;
  G.state.wanted = 0;
  G.switchCar(0);
  G.car.teleport(0, 40, 0);
  G.player.inCar = false;
  G.player.mesh.visible = true;
  G.player.teleport(4, 40, 0);
  G.camYaw = 0;
  G.hud.setObjective('Press M for the first story mission.');
}

function startGame() {
  const saved = G.save.loadGame();
  if (saved) {
    G.save.applySave(saved);
    G.switchCar(G.state.carIndex);
    G.hud.toast('Save loaded — welcome back to Solmara.');
  }
  G.audio.unlock();
  G.hud.hideStart();
  G.hud.hidePanel();
  G.mode = 'play';
  const next = G.missions.currentMission();
  G.hud.setObjective(next ? `Next: ${next.name} — press M to start ($${next.payout})` : 'Free roam — taxi (T), races (R), deliveries (Y).');
  G.hud.banner('SOLMARA', 'Hurricane Mara makes landfall in 7 days. Make your money before it does.');
}

function enterOrExitCar() {
  if (G.player.inCar) {
    G.player.inCar = false;
    G.car.speed = 0;
    G.player.mesh.visible = true;
    G.player.teleport(G.car.x + Math.cos(G.car.heading) * 3.5, G.car.z - Math.sin(G.car.heading) * 3.5, G.car.heading);
    return;
  }
  const dc = Math.hypot(G.player.x - G.car.x, G.player.z - G.car.z);
  if (dc < 5) {
    G.player.inCar = true;
    G.player.mesh.visible = false;
    G.audio.unlock();
    return;
  }
  const victim = G.traffic.nearestCar(G.player.x, G.player.z, 5);
  if (victim) {
    G.traffic.stealCar(victim);
    G.car.teleport(victim.mesh.position.x, victim.mesh.position.z, victim.mesh.rotation.y);
    G.player.inCar = true;
    G.player.mesh.visible = false;
    G.police.addWanted(1, 'Car jacked');
    G.audio.unlock();
  }
}

function handleActions(actions) {
  for (const a of actions) {
    if (a === 'confirm') {
      G.audio.unlock();
      if (G.mode === 'title') startGame();
      else if (G.mode === 'gameover') { resetGame(); G.mode = 'play'; }
      else if (G.mode === 'pause') { G.mode = 'play'; G.hud.hidePanel(); }
    } else if (a === 'fire') {
      if (G.mode === 'play') G.combat.fire();
    } else if (a === 'pause') {
      if (G.mode === 'play') {
        G.mode = 'pause';
        G.hud.showPanel('<h2>Paused</h2><div class="keys">Progress autosaves after every mission.<br>Press P or Space to resume.</div>');
      } else if (G.mode === 'pause') {
        G.mode = 'play';
        G.hud.hidePanel();
      }
    } else if (G.mode !== 'play') {
      continue;
    } else if (a === 'enterCar') enterOrExitCar();
    else if (a === 'mission') G.missions.startMission();
    else if (a === 'taxi') G.missions.startTaxi();
    else if (a === 'race') G.hud.racePanel();
    else if (a === 'delivery') G.missions.startDelivery();
    else if (a === 'garage') { if (G.hud.panelOpen()) G.hud.hidePanel(); else G.hud.garagePanel(); }
    else if (a === 'shop') { if (G.hud.panelOpen()) G.hud.hidePanel(); else G.hud.shopPanel(); }
    else if (a === 'save') {
      if (G.save.saveGame()) G.hud.toast('Game saved.');
      else G.hud.toast('Save failed — storage unavailable.');
    } else if (a === 'radio') G.audio.cycleStation();
    else if (a === 'horn') G.audio.click();
  }
}

const weaponKeys = { Digit1: 'pistol', Digit2: 'smg', Digit3: 'shotgun' };
let prevWeaponKey = {};

function step(dt) {
  G.time += dt;
  G.timeOfDay = (G.timeOfDay + dt * TIME_RATE) % 24;
  const tod = G.world.setTimeOfDay(G.timeOfDay);
  G.nightFactor = tod.night;

  const mouse = G.input.takeMouse();
  if (mouse.dx || mouse.dy) {
    G.lastMouseAt = G.time;
    G.camYaw -= mouse.dx * 0.004;
    G.camPitch = Math.max(0.05, Math.min(0.9, G.camPitch + mouse.dy * 0.002));
  }
  for (const [code, id] of Object.entries(weaponKeys)) {
    if (G.input.keys[code] && !prevWeaponKey[code]) G.combat.selectWeapon(id);
    prevWeaponKey[code] = !!G.input.keys[code];
  }

  handleActions(G.input.takeActions());

  if (G.mode === 'title') {
    G.world.update(dt, { x: 0, z: 0 });
    G.traffic.update(dt);
    G.updateCamera(dt);
    return;
  }
  if (G.mode !== 'play') return;

  // Driving / walking.
  if (G.player.inCar) {
    const res = G.car.drive(dt, G.input.throttle(), G.input.steer());
    if (res.crashed) {
      G.effects.shake(0.35);
      G.audio.thud();
    }
    G.audio.engine(Math.min(1, Math.abs(G.car.speed) / G.car.maxSpeed), true);
  } else {
    const fwd = (G.input.keys.KeyW || G.input.keys.ArrowUp ? 1 : 0) - (G.input.keys.KeyS || G.input.keys.ArrowDown ? 1 : 0);
    const strafe = (G.input.keys.KeyD || G.input.keys.ArrowRight ? 1 : 0) - (G.input.keys.KeyA || G.input.keys.ArrowLeft ? 1 : 0);
    G.player.walk(dt, fwd, strafe, G.input.sprint(), G.camYaw);
    G.audio.engine(0, false);
  }

  // Busted: a patrol car catches the player on foot.
  if (!G.player.inCar && G.state.wanted > 0) {
    for (const p of G.police.patrols) {
      if (Math.hypot(p.x - G.player.x, p.z - G.player.z) < 3.2) {
        G.state.health -= 22 * dt;
      }
    }
  }
  if (G.state.wanted === 0 && G.state.health < 100) G.state.health = Math.min(100, G.state.health + 2 * dt);
  if (G.state.health <= 0) {
    G.state.health = 0;
    G.mode = 'gameover';
    G.audio.siren(false);
    G.hud.showPanel('<h2>BUSTED</h2><div class="keys">The Solmara PD caught up with you.<br>Press Space to start over.</div>');
  }

  G.traffic.update(dt);
  G.police.update(dt);
  G.missions.update(dt);
  G.combat.update(dt);
  G.hurricane.update(dt);
  G.world.update(dt, { x: G.player.inCar ? G.car.x : G.player.x, z: G.player.inCar ? G.car.z : G.player.z });
  G.effects.update(dt);
  G.updateCamera(dt);
  G.hud.update();
}

function runShot(name) {
  stageShot(name, G);
  G.hud.update();
  let painted = 0;
  function paint() {
    renderer.render(scene, camera);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  G.hud.showStart();
  G.hud.setObjective('Press M for the first story mission.');
  let accumulator = 0;
  let last = performance.now();
  let frames = 0;
  let fpsAt = last;
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    while (accumulator >= STEP) {
      step(STEP);
      accumulator -= STEP;
    }
    renderer.render(scene, camera);
    frames += 1;
    if (now - fpsAt > 2000) {
      window.__solmara.fps = Math.round((frames * 1000) / (now - fpsAt));
      frames = 0;
      fpsAt = now;
    }
    window.__solmara.mode = G.mode;
    window.__solmara.speedKmh = Math.round(Math.abs(G.car.speed) * 3.6);
    window.__solmara.wanted = G.state.wanted;
    window.__solmara.cash = G.state.cash;
    window.__solmara.day = G.state.day;
    window.__solmara.health = Math.round(G.state.health);
    window.__solmara.mission = G.missions.currentMission() ? G.missions.currentMission().name : 'done';
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.mode === 'play') {
      G.mode = 'pause';
      G.hud.showPanel('<h2>Paused</h2><div class="keys">Press P or Space to resume.</div>');
    }
  });
  requestAnimationFrame(frame);
}

window.__solmara = { mode: 'title', speedKmh: 0, wanted: 0, cash: 150, day: 1, health: 100, mission: 'First Wheels', fps: 0 };

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

if (shot) runShot(shot);
else runGame();
