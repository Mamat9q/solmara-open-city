// SOLMARA — boot and the one loop. The game moves between title, play, paused,
// busted and won. Fixed 1/60 s steps; third-person chase camera on foot and in
// the car; mouse orbit on foot when the pointer is locked.
//
// ?seed=N fixes the city. ?shot=start|drive|chase|mission (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot. window.__solmara exposes the live game
// for headless playtests: { S, mode, startGame, enterCar, ... }.

import * as THREE from 'three';
import {
  CARS, MISSIONS, WEAPONS, STEP, GARAGE_POS, GUNSHOP_POS, SAFEHOUSE_POS,
  TAXI_RIDER_POS, START_CASH, START_HEALTH,
} from './config.js';
import { createRandom } from './random.js';
import {
  createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER, ACTION_RADIO,
  ACTION_ACTIVITY, ACTION_HORN, ACTION_MISSIONS,
} from './input.js';
import { createWorld, snapToRoad } from './world.js';
import { createCarMesh, createCarEntity, updateCarPhysics, kmh } from './vehicles.js';
import { createPlayer, updatePlayerOnFoot, updateCarCamera } from './player.js';
import { createTraffic, updateTraffic, nearestTrafficCar } from './traffic.js';
import { createPolice, updatePolice, addWanted } from './police.js';
import { createMissions, startNextMission, startMission, updateMissions } from './missions.js';
import { createCombat, initPickups, shoot, updateCombat } from './combat.js';
import { createHud, updateHud } from './hud.js';
import { createAudio } from './audio.js';
import { createHurricane, updateHurricane } from './hurricane.js';
import { createEffects } from './effects.js';
import { defaultSave, loadSave, writeSave, clearSave } from './save.js';
import { openGarage, openGunshop, shopNear } from './shop.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const TIME_RATE = 1 / 45; // one game hour per 45 real seconds
const PAINTS = [0xffc93c, 0xc22e3d, 0x2fb7ff, 0x7dff9b, 0xe8e8e8, 0x222222];

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261121;

const canvas = document.getElementById('game');
const screenEl = document.getElementById('screen');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5d9);
scene.fog = new THREE.Fog(0x9db8cc, 120, 520);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(0, 40, 80);

const sun = new THREE.DirectionalLight(0xfff2d8, 2.0);
sun.position.set(120, 160, 90);
scene.add(sun);
const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x3a2f22, 0.9);
scene.add(hemi);

const random = createRandom(seed);
const input = createInput(canvas);
const world = createWorld(scene, random);
const player = createPlayer(scene);
const traffic = createTraffic(scene, random);
const police = createPolice(scene, random);
const missions = createMissions();
const combat = createCombat(scene, random);
const hud = createHud();
const audio = createAudio();
const hurricane = createHurricane(scene, sun, hemi);
const effects = createEffects(scene);
initPickups(combat);

// ---- shared game state: every module reads and writes this one object ----
const S = {
  scene, camera, world, player, traffic, police, combat, missions, audio, effects,
  time: 0, clock: 9, day: 1, rain: 0,
  money: START_CASH, respect: 0, health: START_HEALTH, armor: false,
  wanted: 0, wantedHeat: 0, evading: false,
  weapon: 'pistol', ammo: { pistol: 60, smg: 0, shotgun: 0 },
  ownedWeapons: ['pistol'],
  ownedCars: ['dune'], carId: 'dune', upgrades: [], engineLevel: 0, paintIndex: 0,
  playerCar: null, parkedCar: null,
  objective: 'Welcome to Solmara — press Start',
  toast: '', toastTimer: 0,
  beaconOn: false, beaconX: 0, beaconZ: 0,
  taxiRider: { ...TAXI_RIDER_POS }, taxiFare: null,
  race: null, gameWon: false, paused: false,
  shotsFired: 0,
  save() { writeSave(S); },
  applyCar,
};

let mode = 'title'; // title | play | paused | busted | won
let shopOpen = false;
let missionOpen = false;
let nextMissionTimer = 0;
let saveTimer = 0;
let crashCooldown = 0;
let pedCooldown = 0;
let prevMouseDown = false;

function carDef(id) {
  return CARS.find((c) => c.id === id) || CARS[0];
}

/** (Re)build the player's current car from carId + engine + paint. */
function applyCar() {
  const def = carDef(S.carId);
  const color = S.paintIndex > 0 ? PAINTS[S.paintIndex % PAINTS.length] : def.color;
  const tuning = {
    accel: def.accel + (S.engineLevel || 0) * 4,
    top: def.top + (S.engineLevel || 0) * 4,
    color,
  };
  const old = S.playerCar || S.parkedCar;
  const px = old ? old.mesh.position.x : 6;
  const pz = old ? old.mesh.position.z : 44;
  const heading = old ? old.heading : 0;
  if (old) scene.remove(old.mesh);
  const mesh = createCarMesh(color, 'sedan');
  mesh.position.set(px, 0, pz);
  scene.add(mesh);
  const car = createCarEntity(mesh, tuning);
  car.heading = heading;
  car.name = def.name;
  car.carId = def.id;
  car.stolen = false;
  mesh.rotation.y = heading;
  if (S.playerCar) S.playerCar = car;
  else S.parkedCar = car;
  return car;
}

/** Put the player in the driver's seat of `car`. */
function getInCar(car) {
  S.playerCar = car;
  S.parkedCar = null;
  player.onFoot = false;
  player.mesh.visible = false;
  audio.sfx('pickup');
}

/** Step out of the car; it stays parked where it is. */
function getOutCar() {
  if (!S.playerCar) return;
  const car = S.playerCar;
  const side = { x: car.mesh.position.x + Math.cos(car.heading) * 3, z: car.mesh.position.z - Math.sin(car.heading) * 3 };
  player.mesh.position.set(side.x, 0, side.z);
  player.mesh.visible = true;
  player.onFoot = true;
  player.heading = car.heading;
  S.parkedCar = car;
  S.playerCar = null;
}

/** E key: enter the nearest car — your own parked car, or steal a traffic car. */
function tryEnterCar() {
  if (S.playerCar) { getOutCar(); return; }
  const p = player.mesh.position;
  if (S.parkedCar && Math.hypot(S.parkedCar.mesh.position.x - p.x, S.parkedCar.mesh.position.z - p.z) < 6) {
    getInCar(S.parkedCar);
    return;
  }
  const near = nearestTrafficCar(traffic, p.x, p.z, 6);
  if (near) {
    traffic.cars = traffic.cars.filter((c) => c !== near);
    const car = createCarEntity(near.mesh, { accel: 22, top: 43, color: 0xd8d8d8 });
    car.heading = near.mesh.rotation.y;
    car.name = 'Stolen car';
    car.stolen = true;
    getInCar(car);
    addWanted(S, 12);
    S.toast = 'Car stolen — the law noticed';
    S.toastTimer = 3;
  }
}

/** F key: open a nearby shop, or pick up / drop off a taxi rider. */
function tryActivity() {
  const shop = shopNear(S);
  if (shop === 'garage') { shopOpen = true; openGarage(S); return; }
  if (shop === 'gunshop') { shopOpen = true; openGunshop(S); return; }
  const p = S.playerCar ? S.playerCar.mesh.position : player.mesh.position;
  if (!S.taxiFare && S.taxiRider && Math.hypot(S.taxiRider.x - p.x, S.taxiRider.z - p.z) < 8) {
    const dest = snapToRoad((random() - 0.5) * 480, (random() - 0.5) * 440);
    const pay = 150 + Math.floor(random() * 150);
    S.taxiFare = { x: dest.x, z: dest.z, pay };
    S.toast = `Fare accepted — drop them off for $${pay}`;
    S.toastTimer = 3;
    audio.sfx('pickup');
  }
}

/** One fixed step of the whole game. `drive` overrides keyboard input. */
function stepWorld(dt, drive) {
  S.time += dt;
  S.clock += dt * TIME_RATE;
  if (S.clock >= 24) { S.clock -= 24; S.day = Math.min(7, S.day + 1); }
  const { night, rain } = updateHurricane(hurricane, S, dt);
  const d = drive || {
    forward: input.drive().forward,
    steer: input.drive().steer,
    run: input.drive().run,
    jump: input.has('Space'),
  };
  if (S.playerCar) {
    const carDrive = { ...d };
    if (input.has('Space') && S.playerCar.speed > 0) carDrive.forward = -1; // Space = brake
    updateCarPhysics(S.playerCar, carDrive, dt);
    updateCarCamera(camera, S.playerCar, dt);
  } else {
    updatePlayerOnFoot(player, d, input.takeLook(), dt, camera);
  }
  updateTraffic(S, dt, night);
  const events = updatePolice(police, S, dt);
  if (events.busted && mode === 'play') showBusted('BUSTED — the Solmara PD caught you on foot');
  updateMissions(missions, S, dt);
  updateCombat(S, dt);
  effects.setRain(rain, camera.position, dt);
  effects.update(dt);
  audio.updateRadio(dt);
  audio.updateEngine(S.playerCar ? kmh(S.playerCar) : 0, !!S.playerCar);
  audio.updateSiren(S.wanted);

  // Taxi fare: beacon + payout on arrival.
  if (S.taxiFare) {
    const p = S.playerCar ? S.playerCar.mesh.position : player.mesh.position;
    world.setBeacon(S.taxiFare.x, S.taxiFare.z, true);
    S.objective = `Taxi fare — drop the rider off ($${S.taxiFare.pay})`;
    if (Math.hypot(p.x - S.taxiFare.x, p.z - S.taxiFare.z) < 9) {
      S.money += S.taxiFare.pay;
      S.toast = `Fare complete — $${S.taxiFare.pay}`;
      S.toastTimer = 3;
      missions.taxiDone = true;
      const r = snapToRoad((random() - 0.5) * 480, (random() - 0.5) * 440);
      S.taxiRider = { x: r.x, z: r.z };
      S.taxiFare = null;
      audio.sfx('mission');
      S.save();
    }
  } else if (!missions.active) {
    S.objective = 'Free roam — press M for the next mission, F for a taxi fare';
  }

  // Crash into traffic / police at speed: damage + wanted.
  // Not while staging a screenshot: the autopilot is allowed to clip a
  // pedestrian or a bumper, and a staged drive shot must stay clean.
  if (crashCooldown > 0) crashCooldown -= dt;
  if (pedCooldown > 0) pedCooldown -= dt;
  if (!S.staging && S.playerCar && Math.abs(S.playerCar.speed) > 8 && crashCooldown <= 0) {
    const cp = S.playerCar.mesh.position;
    const hit = [...traffic.cars, ...police.cars].some((c) => {
      const m = c.mesh || c;
      return Math.hypot(m.position.x - cp.x, m.position.z - cp.z) < 3.4;
    });
    if (hit) {
      S.playerCar.speed *= 0.45;
      S.playerCar.damaged = Math.min(100, S.playerCar.damaged + 8);
      addWanted(S, 4);
      audio.sfx('crash');
      crashCooldown = 1.5;
    }
  }
  if (!S.staging && S.playerCar && Math.abs(S.playerCar.speed) > 6 && pedCooldown <= 0) {
    const cp = S.playerCar.mesh.position;
    const hitPed = traffic.peds.some((ped) => Math.hypot(ped.mesh.position.x - cp.x, ped.mesh.position.z - cp.z) < 2.2);
    if (hitPed) {
      addWanted(S, 8);
      S.toast = 'You hit a pedestrian — witnesses called it in';
      S.toastTimer = 3;
      pedCooldown = 2;
    }
  }

  // Beacon state for the minimap.
  S.beaconOn = world.beacon.visible;
  S.beaconX = world.beacon.position.x;
  S.beaconZ = world.beacon.position.z;

  if (S.toastTimer > 0) S.toastTimer -= dt;
  if (S.health <= 0 && mode === 'play') showBusted('WASTED — Mara is down');
  if (S.gameWon && mode === 'play') showWon();

  // Auto-start the next story mission a few seconds after one ends.
  if (!missions.active && !S.gameWon && mode === 'play') {
    nextMissionTimer += dt;
    if (nextMissionTimer > 3) {
      nextMissionTimer = 0;
      startNextMission(missions, S);
    }
  } else {
    nextMissionTimer = 0;
  }
  saveTimer += dt;
  if (saveTimer > 15) { saveTimer = 0; S.save(); }
  updateHud(hud, S);
  if (!S.skipRender) renderer.render(scene, camera);
}

// ---- screens (DOM panels over the canvas) ----
function missionListHtml() {
  return MISSIONS.map((m, i) => {
    const done = missions.completed.has(i);
    const cur = missions.index === i && missions.active;
    return `<div><span>${done ? '✓ ' : cur ? '▶ ' : ''}Ch ${m.ch} · ${m.title}${done ? ' — done' : ''}</span><span class="pay">$${m.payout}</span></div>`;
  }).join('');
}

function showTitle() {
  mode = 'title';
  S.paused = false;
  const saved = loadSave();
  screenEl.innerHTML = `<div class="panel"><h1>SOL<span>MARA</span></h1>
    <h2>OPEN CITY · SEVEN DAYS BEFORE HURRICANE ILSA</h2>
    <p>You are Mara Voss, a wheelwoman back in the sun-soaked coastal city of Solmara.
    Work the streets, outrun the Solmara Police Department, and finish ten story
    missions before the storm hits.</p>
    <div class="missions">${missionListHtml()}</div>
    <div class="btnrow">
      <button id="btn-start">New game</button>
      ${saved ? '<button id="btn-continue" class="ghost">Continue — Day ' + saved.day + ', $' + saved.money.toLocaleString('en-US') + '</button>' : ''}
    </div>
    <p class="keys">WASD drive / walk · Shift run / handbrake · Space jump / brake · E enter &amp; steal car ·
    Mouse shoot · 1/2/3 weapons · F taxi &amp; shops · R radio · M missions · P pause</p></div>`;
  document.getElementById('btn-start').onclick = () => { clearSave(); startGame(null); };
  const cont = document.getElementById('btn-continue');
  if (cont) cont.onclick = () => startGame(loadSave());
}

function showPaused() {
  mode = 'paused';
  S.paused = true;
  S.save();
  screenEl.innerHTML = `<div class="panel"><h1>PAUSED</h1>
    <p>Day ${S.day}/7 · $${S.money.toLocaleString('en-US')} · ${missions.done} of 10 missions done.</p>
    <div class="btnrow"><button id="btn-resume">Resume</button>
    <button id="btn-quit" class="ghost">Save &amp; quit to title</button></div></div>`;
  document.getElementById('btn-resume').onclick = () => { screenEl.innerHTML = ''; mode = 'play'; S.paused = false; };
  document.getElementById('btn-quit').onclick = () => { S.save(); showTitle(); };
}

function showBusted(title) {
  mode = 'busted';
  S.paused = true;
  const bail = Math.min(200, S.money);
  screenEl.innerHTML = `<div class="panel"><h1>BUSTED</h1><h2>${title}</h2>
    <p>Bail is $${bail}. Mara walks out of the precinct and back to the safehouse.</p>
    <div class="btnrow"><button id="btn-bail">Pay bail &amp; continue</button></div></div>`;
  document.getElementById('btn-bail').onclick = () => {
    S.money -= bail;
    S.health = START_HEALTH;
    S.wanted = 0; S.wantedHeat = 0;
    if (S.playerCar) getOutCar();
    player.mesh.position.set(SAFEHOUSE_POS.x, 0, SAFEHOUSE_POS.z);
    player.mesh.visible = true;
    player.onFoot = true;
    screenEl.innerHTML = '';
    mode = 'play'; S.paused = false;
    S.toast = 'Back on the streets';
    S.toastTimer = 3;
    S.save();
  };
}

function showWon() {
  mode = 'won';
  S.paused = true;
  S.save();
  screenEl.innerHTML = `<div class="panel"><h1>STORM OUTRUN</h1>
    <h2>MARA BEAT HURRICANE ILSA — ALL 10 MISSIONS DONE</h2>
    <p>Final take: $${S.money.toLocaleString('en-US')} · Respect ${S.respect} · Solmara is yours.</p>
    <div class="btnrow"><button id="btn-roam">Keep playing — free roam</button>
    <button id="btn-again" class="ghost">New game</button></div></div>`;
  document.getElementById('btn-roam').onclick = () => { screenEl.innerHTML = ''; mode = 'play'; S.paused = false; };
  document.getElementById('btn-again').onclick = () => { clearSave(); startGame(null); };
}

function showMissions() {
  missionOpen = true;
  S.paused = true;
  screenEl.innerHTML = `<div class="panel"><h1 style="font-size:34px">MISSIONS</h1>
    <div class="missions">${missionListHtml()}</div>
    <div class="btnrow"><button id="btn-missions-close">Close (M)</button></div></div>`;
  document.getElementById('btn-missions-close').onclick = closeOverlay;
}

function closeOverlay() {
  missionOpen = false;
  shopOpen = false;
  screenEl.innerHTML = '';
  if (mode === 'paused') { mode = 'play'; }
  S.paused = false;
}

/** Start (or resume) a game: apply a save, place Mara and her car, open the story. */
function startGame(saved) {
  const data = saved || defaultSave();
  S.money = data.money;
  S.respect = data.respect;
  S.day = data.day;
  S.carId = data.carId;
  S.ownedCars = [...data.ownedCars];
  S.upgrades = [...data.upgrades];
  S.engineLevel = data.engineLevel || 0;
  S.armor = !!data.armor;
  S.paintIndex = data.paintIndex || 0;
  S.ownedWeapons = [...data.ownedWeapons];
  S.ammo = { ...data.ammo };
  S.weapon = data.weapon;
  S.health = data.health;
  S.wanted = 0; S.wantedHeat = 0;
  S.gameWon = false;
  missions.index = data.missionIndex || 0;
  missions.step = 0;
  missions.active = false;
  missions.done = (data.missionsDone || []).length;
  missions.completed = new Set(data.missionsDone || []);
  missions.race = null;
  missions.kills = 0;
  missions.taxiDone = false;
  player.mesh.position.set(data.px ?? 0, 0, data.pz ?? 40);
  player.mesh.visible = true;
  player.onFoot = true;
  if (S.playerCar) { scene.remove(S.playerCar.mesh); S.playerCar = null; }
  if (S.parkedCar) { scene.remove(S.parkedCar.mesh); S.parkedCar = null; }
  const car = applyCar();
  car.mesh.position.set((data.px ?? 0) + 6, 0, (data.pz ?? 40) + 4);
  S.parkedCar = car;
  S.clock = 9;
  S.objective = 'Welcome back to Solmara';
  screenEl.innerHTML = '';
  mode = 'play';
  S.paused = false;
  audio.start();
  startNextMission(missions, S);
  S.save();
}

// ---- per-frame input handling while playing ----
function handleActions() {
  const actions = input.takeActions();
  if (actions & ACTION_PAUSE) {
    if (shopOpen || missionOpen) closeOverlay();
    else if (mode === 'play') showPaused();
    else if (mode === 'paused') { screenEl.innerHTML = ''; mode = 'play'; S.paused = false; }
    return;
  }
  if (mode !== 'play') return;
  if (actions & ACTION_ENTER) tryEnterCar();
  if (actions & ACTION_ACTIVITY) tryActivity();
  if (actions & ACTION_RADIO) { audio.cycleRadio(); S.toast = audio.stationName(); S.toastTimer = 2; }
  if (actions & ACTION_HORN) audio.sfx('horn');
  if (actions & ACTION_MISSIONS) { if (missionOpen) closeOverlay(); else showMissions(); }
  if (input.has('Digit1') && S.ownedWeapons.includes('pistol')) S.weapon = 'pistol';
  if (input.has('Digit2') && S.ownedWeapons.includes('smg')) S.weapon = 'smg';
  if (input.has('Digit3') && S.ownedWeapons.includes('shotgun')) S.weapon = 'shotgun';
  // Mouse click (edge) fires the current weapon on foot.
  const md = input.isMouseDown();
  if (md && !prevMouseDown && !S.playerCar && player.onFoot) shoot(S, camera);
  prevMouseDown = md;
}

let last = performance.now();
let acc = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(MAX_FRAME, (now - last) / 1000);
  last = now;
  if (mode === 'title') {
    // Living backdrop behind the title: orbit the city, traffic rolls on.
    S.time += dt;
    const a = S.time * 0.05;
    camera.position.set(Math.sin(a) * 110, 46, Math.cos(a) * 110 - 20);
    camera.lookAt(0, 8, -20);
    updateHurricane(hurricane, S, dt);
    updateTraffic(S, dt, false);
    effects.update(dt);
    renderer.render(scene, camera);
    handleActions();
    return;
  }
  if (mode !== 'play') { handleActions(); renderer.render(scene, camera); return; }
  handleActions();
  acc += dt;
  while (acc >= STEP) { stepWorld(STEP); acc -= STEP; }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Test handle: state, mode, and the controls a headless playtest needs.
const G = {
  S, missions, traffic, police, combat, world, player,
  get mode() { return mode; },
  startGame, tryEnterCar, tryActivity, stepWorld, applyCar,
  get playerCar() { return S.playerCar; },
};
window.__solmara = G;

// ---- boot ----
if (shot) {
  // Screenshot staging: build a live scene, run it forward, paint twice.
  // Staging suppresses crash/pedestrian wanted so a clean shot stays clean.
  S.staging = true;
  startGame(null);
  stageShot(shot, G);
  S.staging = false;
  renderer.render(scene, camera);
  renderer.render(scene, camera);
  window.__shotReady = true;
} else {
  showTitle();
  requestAnimationFrame(loop);
}
