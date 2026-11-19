// SOLMARA main: boots the renderer, owns the game state, runs the loop.
// Exposes window.__solmara — the object the playtest drives.

import * as THREE from 'three';
import { CITY, HURRICANE, START_CASH } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorld } from './world.js';
import { createVehicles } from './vehicles.js';
import { createPlayer } from './player.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { nearestShop, renderShopItems } from './shop.js';
import { saveGame, loadSave, applySave, hasSave } from './save.js';
import { createHud } from './hud.js';
import { stageShot, createShotWatcher } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seed = Number.parseInt(params.get('seed') || '1', 10) || 1;
const shot = params.get('shot');

// --- renderer / scene -------------------------------------------------------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x2b1a3d, 70, 380);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(70, 42, 110);
camera.lookAt(0, 12, 0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- modules ----------------------------------------------------------------
const audio = createAudio();
const input = createInput();
const world = createWorld(scene, seed, renderer);
const vehicles = createVehicles(scene, world.carSpots, seed);
const player = createPlayer(scene);
const police = createPolice(scene);
const missions = createMissions(world);

const state = {
  screen: 'start',
  cash: START_CASH,
  wanted: 0,
  missionIndex: 0,
  hurricane: { day: HURRICANE.startDay },
  shopOwned: [],
  player,
  vehicles,
  police,
  world,
  missions,
  audio,
  input,
  camera,
  shotDrive: false,
  currentShop: null,
  onHud: null,
  get currentCar() {
    return vehicles.currentCar;
  },
  get debug() {
    return {
      x: player.pos.x,
      z: player.pos.z,
      car: vehicles.currentCar ? vehicles.currentCar.def.name : null,
    };
  },
};

const hud = createHud(state);
state.onHud = () => hud.update();

// --- screens ----------------------------------------------------------------
const overlays = {
  start: document.getElementById('screen-start'),
  pause: document.getElementById('screen-pause'),
  shop: document.getElementById('screen-shop'),
};
const hudEl = document.getElementById('hud');
const minimapEl = document.getElementById('minimap');

function setScreen(name) {
  state.screen = name;
  for (const [key, el] of Object.entries(overlays)) {
    if (el) el.classList.toggle('hidden', key !== name);
  }
  if (hudEl) hudEl.classList.toggle('hidden', name === 'start');
  if (minimapEl) minimapEl.classList.toggle('hidden', name === 'start');
  if (name === 'shop' && state.currentShop) renderShopItems(state, state.currentShop);
  hud.update();
}
state.setScreen = setScreen;

// --- game flow --------------------------------------------------------------
function resetRun() {
  state.cash = START_CASH;
  state.wanted = 0;
  state.missionIndex = 0;
  state.hurricane.day = HURRICANE.startDay;
  state.shopOwned = [];
  state.currentShop = null;
  state.shotDrive = false;
  player.reserve = 0;
  player.health = 100;
  player.armor = 0;
  player.pos.set(0, 0, 8);
  player.heading = 0;
  player.group.position.copy(player.pos);
  player.group.visible = true;
  vehicles.exitCar();
  world.carSpots.forEach((spot, i) => {
    const car = vehicles.cars[i];
    if (!car) return;
    car.x = spot.x;
    car.z = spot.z;
    car.heading = spot.heading;
    car.speed = 0;
    car.health = 100;
    car.parked = true;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
  });
  for (const cop of police.copCars) {
    cop.active = false;
    cop.speed = 0;
    cop.health = 100;
    cop.mesh.visible = false;
  }
  missions.active = null;
  world.setBeacon(0, 0, false);
  world.setRoadblocks(0);
  audio.setSiren(false);
  audio.setEngine(0, false);
}

function newGame() {
  resetRun();
  setScreen('playing');
  hud.toast('Day 1 — the hurricane is seven days out. Make your money and get out.');
}
state.newGame = newGame;

function enterCar() {
  const car = vehicles.nearestCar(player.pos.x, player.pos.z);
  if (!car) {
    hud.toast('No car close enough.');
    return;
  }
  vehicles.enterCar(car);
  player.group.visible = false;
  player.pos.set(car.x, 0, car.z);
  player.group.position.copy(player.pos);
  audio.blip();
}

function exitCar() {
  const car = vehicles.exitCar();
  if (!car) return;
  const px = car.x - Math.sin(car.heading) * 3;
  const pz = car.z - Math.cos(car.heading) * 3;
  player.pos.set(px, 0, pz);
  player.group.position.copy(player.pos);
  player.group.visible = true;
  player.heading = car.heading;
}
state.enterCar = enterCar;
state.exitCar = exitCar;

// --- shooting ---------------------------------------------------------------
const raycaster = new THREE.Raycaster();
let tracer = null;
let tracerUntil = 0;

function shoot() {
  if (player.reserve <= 0) {
    audio.error();
    hud.toast('No ammo — buy an ammo box at Solmara Arms.');
    return;
  }
  player.reserve -= 1;
  audio.shot();
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  raycaster.set(camera.position, dir);
  raycaster.far = 70;
  const meshes = police.copCars.filter((c) => c.active).map((c) => c.mesh);
  const hits = raycaster.intersectObjects(meshes, true);
  let end = camera.position.clone().add(dir.clone().multiplyScalar(60));
  if (hits.length > 0) {
    const hit = hits[0];
    end = hit.point.clone();
    // The ray hits a child mesh of the cop's group (body, cabin, wheels...).
    const cop = police.copCars.find((c) => c.active && (hit.object === c.mesh || hit.object.parent === c.mesh));
    if (cop) {
      cop.health -= 34;
      if (cop.health <= 0) {
        cop.active = false;
        cop.speed = 0;
        cop.mesh.visible = false;
        hud.toast('Cruiser disabled.');
      }
      state.wanted = Math.min(4, state.wanted + 1);
    }
  }
  if (tracer) scene.remove(tracer);
  const start = camera.position.clone().add(dir.clone().multiplyScalar(1.2)).add(new THREE.Vector3(0, -0.3, 0));
  const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
  tracer = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.9 }));
  scene.add(tracer);
  tracerUntil = performance.now() + 90;
  hud.update();
}

// --- buttons ----------------------------------------------------------------
function wireButton(id, fn) {
  const b = document.getElementById(id);
  if (b) b.addEventListener('click', () => { audio.unlock(); fn(); });
}
wireButton('btn-new', () => newGame());
wireButton('btn-continue', () => {
  const data = loadSave();
  if (!data) return;
  resetRun();
  applySave(state, data);
  for (const cop of police.copCars) {
    cop.active = false;
    cop.speed = 0;
    cop.mesh.visible = false;
  }
  world.setRoadblocks(0);
  missions.active = null;
  world.setBeacon(0, 0, false);
  setScreen('playing');
  hud.toast(`Welcome back — Day ${state.hurricane.day}.`);
});
wireButton('btn-resume', () => setScreen('playing'));
wireButton('btn-pause-new', () => newGame());
wireButton('btn-shop-close', () => setScreen('playing'));
wireButton('btn-mute', () => {
  const b = document.getElementById('btn-mute');
  const muted = b.textContent.includes('Sound: On');
  audio.setMuted(!muted);
  if (b) b.textContent = muted ? 'Sound: Off' : 'Sound: On';
});
const continueBtn = document.getElementById('btn-continue');
if (continueBtn) continueBtn.disabled = !hasSave();

// --- camera rig ---------------------------------------------------------------
let camYaw = 0;
let camYawOffset = 0;
let dragging = false;
let lastPointerX = 0;
canvas.addEventListener('pointerdown', (e) => {
  dragging = true;
  lastPointerX = e.clientX;
});
window.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  camYawOffset += (e.clientX - lastPointerX) * 0.005;
  lastPointerX = e.clientX;
});
window.addEventListener('pointerup', () => { dragging = false; });

const camTarget = new THREE.Vector3();
function snapCamera() {
  // Put the camera exactly on the chase rig (used once when a shot is staged,
  // so the first rendered frames are already framed — headless runs at ~2 fps
  // and the lerp would otherwise need seconds to converge).
  const inCar = !!vehicles.currentCar;
  const fx = inCar ? Math.sin(vehicles.currentCar.heading) : Math.sin(player.heading);
  const fz = inCar ? Math.cos(vehicles.currentCar.heading) : Math.cos(player.heading);
  camYaw = Math.atan2(fx, fz);
  camYawOffset = 0;
  const tx = inCar ? vehicles.currentCar.x : player.pos.x;
  const tz = inCar ? vehicles.currentCar.z : player.pos.z;
  const dist = inCar ? 11 : 8;
  const height = inCar ? 4.6 : 3.6;
  camera.position.set(tx - Math.sin(camYaw) * dist, height, tz - Math.cos(camYaw) * dist);
  camera.lookAt(tx + Math.sin(camYaw) * 5, 1.6, tz + Math.cos(camYaw) * 5);
}
function updateCamera(dt) {
  const inCar = !!vehicles.currentCar;
  const focus = inCar ? vehicles.currentCar : player;
  const fx = inCar ? Math.sin(vehicles.currentCar.heading) : Math.sin(player.heading);
  const fz = inCar ? Math.cos(vehicles.currentCar.heading) : Math.cos(player.heading);
  const targetYaw = Math.atan2(fx, fz) + camYawOffset;
  let dy = targetYaw - camYaw;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  camYaw += dy * Math.min(1, dt * 5);
  camTarget.set(focus.x ?? focus.pos.x, 0, focus.z ?? focus.pos.z);
  const dist = inCar ? 11 : 8;
  const height = inCar ? 4.6 : 3.6;
  const desired = new THREE.Vector3(
    camTarget.x - Math.sin(camYaw) * dist,
    height,
    camTarget.z - Math.cos(camYaw) * dist,
  );
  const k = 1 - Math.exp(-dt * 7);
  camera.position.lerp(desired, k);
  camera.lookAt(camTarget.x + Math.sin(camYaw) * 5, 1.6, camTarget.z + Math.cos(camYaw) * 5);
}

// --- main loop ----------------------------------------------------------------
const shotWatcher = createShotWatcher();
window.__solmara = state;
window.__shotReady = false;

let last = performance.now();
let startOrbitT = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  if (state.screen === 'start') {
    startOrbitT += dt;
    const a = startOrbitT * 0.06;
    camera.position.set(Math.cos(a) * 95, 46, Math.sin(a) * 95);
    camera.lookAt(0, 14, 0);
    world.update(dt);
  } else if (state.screen === 'playing') {
    // Edge-triggered keys.
    if (input.wasPressed('Escape')) setScreen('paused');
    else if (input.wasPressed('KeyE')) {
      if (vehicles.currentCar) exitCar();
      else enterCar();
    } else if (input.wasPressed('KeyM')) {
      const m = missions.start(state);
      if (m) hud.toast(`${m.title} — ${m.brief}`);
      else if (state.missionIndex >= 7) hud.toast('All chapters done — the boat is waiting.');
      else hud.toast('Finish the current job first.');
    } else if (input.wasPressed('KeyB')) {
      const shop = nearestShop(state);
      if (shop) {
        state.currentShop = shop;
        setScreen('shop');
      } else {
        hud.toast('No shop nearby.');
      }
    } else if (input.wasPressed('KeyQ')) {
      if (saveGame(state)) hud.toast('Game saved.');
      else hud.toast('Save failed.');
    } else if (input.wasPressed('Space')) {
      shoot();
    }

    if (vehicles.currentCar) {
      const driveInput = state.shotDrive
        ? { isHeld: (code) => code === 'KeyW' || input.isHeld(code) }
        : input;
      vehicles.update(dt, driveInput, state);
      player.pos.set(vehicles.currentCar.x, 0, vehicles.currentCar.z);
      player.group.position.copy(player.pos);
      audio.setEngine(Math.abs(vehicles.currentCar.speed) / 43, true);
    } else {
      player.update(dt, input, camYaw);
      player.group.position.copy(player.pos);
      audio.setEngine(0, false);
    }
    police.update(dt, state, audio);
    const done = missions.update(dt, state);
    if (done) {
      hud.toast(`${done.title} complete — $${done.reward} banked. Day ${state.hurricane.day} of 7.`);
      hud.update();
    }
    world.update(dt);
    updateCamera(dt);
    hud.update();
  } else if (state.screen === 'paused' || state.screen === 'shop') {
    if (input.wasPressed('Escape')) setScreen('playing');
    world.update(dt);
  }

  if (tracer && now > tracerUntil) {
    scene.remove(tracer);
    tracer = null;
  }
  input.clearPressed();
  renderer.render(scene, camera);
  shotWatcher.tick();
}

// --- boot ---------------------------------------------------------------------
if (shot) {
  const staged = stageShot(state, shot);
  if (staged) {
    if (shot === 'drive' || shot === 'chase') state.shotDrive = true;
    if (shot !== 'start') snapCamera();
    shotWatcher.markStaged();
  }
} else {
  setScreen('start');
}
if (shot === 'start') setScreen('start');

requestAnimationFrame(frame);
