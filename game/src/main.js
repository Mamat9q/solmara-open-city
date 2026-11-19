// SOLMARA: a 3D open-world crime game. Boots the renderer, owns the shared
// state object, runs the loop, and exposes window.__solmara for the playtest.
import * as THREE from '../vendor/three.module.min.js';
import { WORLD, SHOP_POS, SHOP_RADIUS, START_CASH, DT_MAX } from './config.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { buildWorld } from './world.js';
import { Vehicles } from './vehicles.js';
import { Player } from './player.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { HUD } from './hud.js';
import { Shop } from './shop.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);

// Headlights: one spotlight that follows the player's car and lights the road.
const headlight = new THREE.SpotLight(0xffe8b0, 0, 55, 0.55, 0.5, 1.0);
scene.add(headlight);
scene.add(headlight.target);

// Mission waypoint beacon: a green light pillar over the active target.
const beacon = new THREE.Mesh(
  new THREE.CylinderGeometry(2.4, 2.4, 46, 12, 1, true),
  new THREE.MeshBasicMaterial({ color: 0x37e07a, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false }),
);
beacon.visible = false;
scene.add(beacon);
const beaconRing = new THREE.Mesh(
  new THREE.RingGeometry(2.6, 3.4, 24),
  new THREE.MeshBasicMaterial({ color: 0x37e07a, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
);
beaconRing.rotation.x = -Math.PI / 2;
beaconRing.visible = false;
scene.add(beaconRing);

const input = new Input();
const audio = new AudioEngine();
const world = buildWorld(scene);
const vehicles = new Vehicles(scene);
const player = new Player(scene);
const police = new Police(scene);
const missions = new Missions();
const hud = new HUD();

const state = {
  screen: 'start',
  cash: START_CASH,
  wanted: 0,
  missionIndex: 0,
  hurricane: { day: 1 },
  shopOwned: [],
  player,
  vehicles,
  police,
  world,
  missions,
  audio,
  hud,
  currentCar: null,
  cameraYaw: Math.PI,
  cameraPitch: 0.32,
  debug: { x: 0, z: 0, car: null },
  toast: (msg) => hud.showToast(msg),
};
const shop = new Shop(state);
state.shop = shop;

window.__solmara = state;
window.__shotReady = false;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotMode = shotName !== null;

function showOverlay(id) {
  for (const el of document.querySelectorAll('.overlay')) el.classList.remove('show');
  if (id) document.getElementById(id).classList.add('show');
}

function newGame() {
  state.cash = START_CASH;
  state.wanted = 0;
  state.missionIndex = 0;
  state.hurricane.day = 1;
  state.shopOwned = [];
  state.currentCar = null;
  state.missions.active = null;
  state.player.pos.set(2, 0, 6);
  state.player.group.position.copy(state.player.pos);
  state.player.group.visible = true;
  state.player.reserve = 24;
  state.player.ammo = 12;
  state.player.health = 100;
  for (const car of state.vehicles.cars) {
    car.stolen = false;
    car.speed = 0;
  }
  for (const cop of state.police.copCars) {
    cop.active = false;
    cop.speed = 0;
    cop.group.visible = false;
  }
  for (const rb of state.world.roadblocks) {
    rb.active = false;
    rb.group.visible = false;
  }
  state.screen = 'playing';
  showOverlay(null);
  audio.resume();
  audio.click();
}

function continueGame() {
  const data = loadGame();
  if (!data) return;
  state.cash = data.cash ?? START_CASH;
  state.hurricane.day = data.hurricaneDay ?? 1;
  state.missionIndex = data.missionIndex ?? 0;
  state.shopOwned = Array.isArray(data.shopOwned) ? data.shopOwned : [];
  state.wanted = data.wanted ?? 0;
  if (data.player) {
    state.player.pos.set(data.player.x, 0, data.player.z);
    state.player.group.position.copy(state.player.pos);
  }
  state.player.reserve = 24 + (state.shopOwned.includes('ammo') ? 48 : 0);
  state.currentCar = null;
  state.missions.active = null;
  state.screen = 'playing';
  showOverlay(null);
  audio.resume();
  hud.showToast(`Welcome back — Day ${state.hurricane.day}`);
}

function togglePause() {
  if (state.screen === 'playing') {
    state.screen = 'paused';
    showOverlay('screen-pause');
  } else if (state.screen === 'paused') {
    state.screen = 'playing';
    showOverlay(null);
  }
}

document.getElementById('btn-new').addEventListener('click', newGame);
document.getElementById('btn-continue').addEventListener('click', continueGame);
document.getElementById('btn-resume').addEventListener('click', togglePause);
document.getElementById('btn-shop-close').addEventListener('click', () => shop.close());
document.getElementById('btn-start-help').addEventListener('click', () => {
  document.getElementById('help').classList.toggle('show');
});
canvas.addEventListener('click', () => {
  audio.resume();
  if (state.screen === 'playing') input.lockPointer(canvas);
});

function refreshContinueButton() {
  const btn = document.getElementById('btn-continue');
  const save = hasSave();
  btn.disabled = !save;
  if (save) {
    const data = loadGame();
    btn.textContent = data ? `Continue — Day ${data.hurricaneDay ?? 1}` : 'Continue';
  } else {
    btn.textContent = 'Continue';
  }
}

function nearShop() {
  return Math.hypot(state.player.pos.x - SHOP_POS.x, state.player.pos.z - SHOP_POS.z) < SHOP_RADIUS;
}

function handleKeys() {
  if (input.wasPressed('Escape')) togglePause();
  if (state.screen !== 'playing') return;
  if (input.wasPressed('KeyE')) {
    if (state.currentCar) {
      state.player.exitCar(state);
      audio.click();
    } else {
      const car = state.player.tryEnterCar(state);
      if (car) {
        state.cameraYaw = car.heading + Math.PI;
        audio.click();
      }
    }
  }
  if (input.wasPressed('KeyM')) {
    state.missions.start(state);
    audio.click();
  }
  if (input.wasPressed('KeyB') && nearShop()) {
    shop.open();
    audio.click();
  }
  if (input.wasPressed('KeyQ')) {
    const saved = saveGame(state);
    if (saved) {
      hud.showToast(`Saved — Day ${saved.hurricaneDay}, $${saved.cash}`);
      refreshContinueButton();
    }
  }
  if (input.wasPressed('KeyR')) {
    // Reload a fresh magazine from the reserve.
    if (state.player.ammo < 12 && state.player.reserve > 0) {
      const take = Math.min(12 - state.player.ammo, state.player.reserve);
      state.player.ammo += take;
      state.player.reserve -= take;
      audio.click();
    }
  }
}

function updateCamera(dt) {
  const target = state.currentCar
    ? { x: state.currentCar.x, z: state.currentCar.z, heading: state.currentCar.heading }
    : { x: state.player.pos.x, z: state.player.pos.z, heading: state.player.heading };
  if (input.locked) {
    state.cameraYaw -= input.mouseDX * 0.0028;
    state.cameraPitch = Math.max(0.08, Math.min(0.9, state.cameraPitch + input.mouseDY * 0.002));
  } else {
    // Ease behind the direction of travel.
    let want = target.heading + Math.PI;
    let d = want - state.cameraYaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    state.cameraYaw += d * Math.min(1, dt * 2.2);
  }
  const dist = state.currentCar ? 12 : 9;
  const height = state.currentCar ? 4.6 : 4.0;
  const cx = target.x + Math.sin(state.cameraYaw) * dist;
  const cz = target.z + Math.cos(state.cameraYaw) * dist;
  camera.position.set(cx, height, cz);
  camera.lookAt(target.x, 1.6, target.z);
}

let last = performance.now();
let frames = 0;

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min((now - last) / 1000, DT_MAX);
  last = now;
  frames++;

  if (state.screen === 'playing') {
    handleKeys();
    if (state.currentCar) {
      vehicles.drive(state.currentCar, input, dt);
      audio.setEngine(Math.min(1, Math.abs(state.currentCar.speed) / 40));
    } else {
      player.update(dt, input, state);
      audio.setEngine(0);
    }
    vehicles.updateTraffic(dt, now / 1000);
    police.update(dt, state, audio);
    missions.update(state);
    world.clouds.rotation.y += dt * 0.004;
  } else if (state.screen === 'start') {
    // Slow orbit over the city behind the title screen.
    const t = now / 1000;
    camera.position.set(Math.sin(t * 0.05) * 120, 55, Math.cos(t * 0.05) * 120);
    camera.lookAt(0, 8, 0);
    vehicles.updateTraffic(dt, t);
    world.clouds.rotation.y += dt * 0.004;
  }
  if (state.screen !== 'start') updateCamera(dt);

  // Live debug values for the playtest.
  const px = state.currentCar ? state.currentCar.x : state.player.pos.x;
  const pz = state.currentCar ? state.currentCar.z : state.player.pos.z;
  state.debug.x = px;
  state.debug.z = pz;
  state.debug.car = state.currentCar ? state.currentCar.def.name : null;
  state.player.group.visible = !state.currentCar;

  // Headlight follows the car; beacon marks the mission target.
  if (state.currentCar) {
    const car = state.currentCar;
    headlight.intensity = 90;
    headlight.position.set(car.x, 1.5, car.z);
    headlight.target.position.set(car.x + Math.sin(car.heading) * 22, 0.4, car.z + Math.cos(car.heading) * 22);
  } else {
    headlight.intensity = 0;
  }
  if (state.missions.active) {
    const t = state.missions.active.target;
    beacon.visible = true;
    beacon.position.set(t.x, 23, t.z);
    beaconRing.visible = true;
    beaconRing.position.set(t.x, 0.15, t.z);
  } else {
    beacon.visible = false;
    beaconRing.visible = false;
  }

  hud.update(state);
  renderer.render(scene, camera);
  input.endFrame();

  if (shotMode && frames >= 3) window.__shotReady = true;
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('error', (e) => {
  // Surface boot errors loudly in the console; the playtest counts them.
  console.error('SOLMARA error:', e.message);
});

refreshContinueButton();
if (shotMode) {
  stageShot(shotName, state);
  if (state.screen === 'start') showOverlay('screen-start');
  else showOverlay(null);
} else {
  showOverlay('screen-start');
}
requestAnimationFrame(loop);
