// SOLMARA — boot, game loop, state machine (menu / playing / paused / busted).
// ?shot=start|drive|chase|mission&seed=N stages a scene and sets __shotReady.
// All original: city, characters, story and art are invented for this game.
import * as THREE from 'three';
import { createWorld } from './world.js';
import { createPlayer, updateCamera } from './player.js';
import { createVehicles } from './vehicles.js';
import { createTraffic } from './traffic.js';
import { createPolice } from './police.js';
import { createCombat } from './combat.js';
import { createMissions, STORY } from './missions.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { createEffects } from './effects.js';
import { createInput } from './input.js';
import { saveGame, loadGame, applySave, hasSave } from './save.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261118;

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(0, 8, 30);

const world = createWorld(scene, seed);
const player = createPlayer(scene, world);
const vehicles = createVehicles(scene, world);
const traffic = createTraffic(scene, world);
const police = createPolice(scene, world);
const combat = createCombat(scene, world);
const missions = createMissions();
const hud = createHud();
const audio = createAudio();
const effects = createEffects(scene);
const input = createInput(canvas);

const state = {
  screen: 'start', cash: 250, wanted: 0, missionIndex: 0, completedMissions: [],
  player, world, vehicles, traffic, police, combat, missions, audio, effects, camera,
  currentCar: null, nearCar: null, objective: 'Press M to start your first mission.',
  // Test hook (harmless in normal play): lets a headless playtest read positions.
  get debug() { return { x: player.pos.x, z: player.pos.z, car: state.currentCar ? state.currentCar.def.name : null, wanted: state.wanted, cash: state.cash }; },
  clock: 10.5, gunfireAt: null, _save: { saveGame },
  message(t) { hud.message(t); },
  say(l) { hud.say(l); },
};
window.__solmara = state;

function setScreen(s) { state.screen = s; hud.show(s); if (s !== 'playing') input.unlockPointer(); }
function startGame(fresh) {
  if (fresh) { state.cash = 250; state.missionIndex = 0; state.completedMissions = []; state.wanted = 0; player.reset(0, 20); combat.clearEnemies(); }
  audio.unlock(); audio.startMusic();
  setScreen('playing'); input.lockPointer();
  hud.message('Welcome to Solmara, Dario. Press M for missions, E to steal a car.');
  hud.update(state);
}
function bustOrWaste(kind) {
  const fine = police.handleDown(state);
  const el = document.getElementById('busted-title');
  if (el) el.textContent = kind === 'busted' ? 'BUSTED' : 'WASTED';
  const sub = document.getElementById('busted-sub');
  if (sub) sub.textContent = `${kind === 'busted' ? 'The Solmara PD caught you' : 'You are out cold'} — fine $${fine}. You wake up at the boardwalk.`;
  audio.busted(); audio.stopEngine(); setScreen('busted');
}
function tryEnterExit() {
  if (state.currentCar) {
    const c = state.currentCar; c.occupied = false; state.currentCar = null;
    player.pos.set(c.x + Math.sin(c.yaw + Math.PI / 2) * 3, 0, c.z + Math.cos(c.yaw + Math.PI / 2) * 3);
    player.group.position.copy(player.pos); audio.stopEngine();
    state.message('You left the car.');
    return;
  }
  const car = vehicles.nearestCar(player.pos.x, player.pos.z, 4.5);
  if (car) {
    state.currentCar = car; car.occupied = true; car.parked = false;
    player.group.visible = false;
    if (car.traffic) { police.addWanted(state, 1, 'Grand theft auto'); }
    else if (!car.parked) { /* re-entering own car */ }
    else if (Math.random() < 0.6) police.addWanted(state, 1, 'Car stolen');
    audio.click();
    state.message(`You are driving the ${car.def.name}.`);
  }
}
function updatePlaying(dt) {
  state.clock = (state.clock + dt * 0.02) % 24;
  // Day/night tint: sun angle + sky colour follow the clock.
  const dayF = Math.max(0, Math.sin((state.clock - 6) / 12 * Math.PI));
  world.sun.intensity = 0.5 + dayF * 1.9;
  scene.background.setHSL(0.58, 0.55, 0.25 + dayF * 0.4);
  scene.fog.color.copy(scene.background);
  if (input.pulse('KeyE')) tryEnterExit();
  if (input.pulse('KeyR')) combat.reload(state, audio);
  if (input.pulse('KeyF')) { player.weapon = player.weapon === 'fists' ? 'pistol' : 'fists'; state.message(player.weapon === 'fists' ? 'Fists out.' : 'Pistol out.'); }
  if (input.pulse('KeyM')) { if (missions.start(state)) hud.update(state); }
  if (input.pulse('KeyT')) missions.startTaxi(state);
  if (input.pulse('KeyG')) missions.startDelivery(state);
  if (input.keys.has('KeyQ')) { saveGame(state); state.message('Game saved.'); input.keys.delete('KeyQ'); }
  // Mouse click fires; hold to keep firing at a slow rate.
  state._fireT = (state._fireT || 0) - dt;
  if (input.mouseDown && state._fireT <= 0 && !state.currentCar) { combat.shoot(state, effects, audio); state._fireT = 0.45; state.gunfireAt = { x: player.pos.x, z: player.pos.z }; }
  else if (!input.mouseDown) state.gunfireAt = null;
  if (state.currentCar) {
    const car = state.currentCar;
    const before = car.speed;
    vehicles.drive(car, dt, input, world, effects, audio, (sp) => { effects.sparks(car.x, 0.8, car.z); effects.addShake(0.5); audio.crash(); if (sp > 14) police.addWanted(state, 1, 'Reckless driving'); });
    player.pos.set(car.x, 0, car.z); player.yaw = car.yaw;
    input.consumeLook(); // mouse-look is discarded while driving; the camera follows the car
    const hitPed = traffic.hitPed(car.x + Math.sin(car.yaw) * 2, car.z + Math.cos(car.yaw) * 2, 2.0);
    if (hitPed) { police.addWanted(state, 2, 'Pedestrian hit'); effects.burst(car.x, 1, car.z, 12, 0xd84a4a, 5, 0.5); audio.crash(); }
    // Camera behind the car: updateCamera puts the camera at -sin/-cos of the
    // yaw passed, so pass the car's own yaw (its forward is sin/cos of yaw).
    updateCamera(camera, new THREE.Vector3(car.x, 0, car.z), car.yaw, 0.32, 13, dt, effects.shake);
    if (Math.abs(before - car.speed) > 12) effects.addShake(0.3);
  } else {
    player.update(dt, input, player.yaw);
    updateCamera(camera, player.pos, player.yaw, player.camPitch, 8.5, dt, effects.shake);
    state.nearCar = vehicles.nearestCar(player.pos.x, player.pos.z, 4.5);
  }
  traffic.update(dt, player.pos, state.currentCar ? Math.abs(state.currentCar.speed) : player.speed, state.gunfireAt);
  police.update(dt, state, audio);
  combat.update(dt, state, audio);
  missions.update(state);
  effects.update(dt);
  if (player.health <= 0) { bustOrWaste('wasted'); return; }
  // Busted: a cop car is right on top of you on foot with 3+ stars.
  if (!state.currentCar && state.wanted >= 3) {
    const close = police.copCars.some((c) => c.active && Math.hypot(c.x - player.pos.x, c.z - player.pos.z) < 3);
    if (close) bustOrWaste('busted');
  }
  hud.update(state);
}
function stageShot(name) {
  audio.unlock();
  if (name === 'start') { camera.position.set(0, 14, 90); camera.lookAt(0, 4, 0); setScreen('start'); }
  else {
    setScreen('playing');
    if (name === 'drive') {
      const car = vehicles.cars[1];
      state.currentCar = car; car.occupied = true; player.group.visible = false;
      car.x = -20; car.z = 58; car.yaw = Math.PI / 2; car.speed = 18;
      player.pos.set(car.x, 0, car.z);
      state.objective = 'Drive to the marina — Mara is waiting.';
      state.cash = 1250;
    } else if (name === 'chase') {
      state.wanted = 4; state.cash = 3400;
      const car = vehicles.cars[2];
      state.currentCar = car; car.occupied = true; player.group.visible = false;
      car.x = 0; car.z = 0; car.yaw = 0; car.speed = 24;
      player.pos.set(0, 0, 0);
      state.objective = 'Lose the cops — get out of sight!';
      state.message('Wanted 4★ — lose the Solmara PD!');
      police.update(0.5, state, audio);
      // Stage one cruiser ahead on the road so the chase reads in the frame:
      // the camera looks forward from behind the player's car.
      const lead = police.copCars.find((c) => c.active);
      if (lead) { lead.x = 7; lead.z = 42; lead.yaw = 0; lead.mesh.position.set(7, 0, 42); lead.mesh.rotation.y = 0; }
    } else if (name === 'mission') {
      state.missionIndex = 1; state.cash = 650;
      missions.start(state);
      player.pos.set(-100, 0, 200);
      player.yaw = Math.PI; // face -Z: the gunmen stage ahead of the camera
      state.objective = STORY[1].brief;
      state.message('Mission: The Hollow Point Welcome');
      combat.spawnEnemies(2, -102, 182, 'Hollow Point gunman');
    }
    // Let traffic/police settle one frame before the screenshot.
    traffic.update(0.4, player.pos, 10, null);
    hud.update(state);
  }
  renderer.render(scene, camera);
  window.__shotReady = true;
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
document.getElementById('btn-new')?.addEventListener('click', () => startGame(true));
document.getElementById('btn-continue')?.addEventListener('click', () => {
  const d = loadGame();
  if (d) { applySave(state, d); startGame(false); hud.message('Save loaded — welcome back, Dario.'); }
  else startGame(true);
});
document.getElementById('btn-resume')?.addEventListener('click', () => { setScreen('playing'); input.lockPointer(); });
document.getElementById('btn-save')?.addEventListener('click', () => { saveGame(state); state.message('Game saved.'); });
document.getElementById('btn-quit')?.addEventListener('click', () => { saveGame(state); setScreen('start'); });
document.getElementById('btn-busted')?.addEventListener('click', () => setScreen('playing'));
document.getElementById('btn-missions')?.addEventListener('click', () => { missions.start(state); setScreen('playing'); input.lockPointer(); });
document.getElementById('btn-mute')?.addEventListener('click', (e) => { audio.stopMusic(); e.target.textContent = 'Music: off'; });
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && state.screen === 'playing') setScreen('paused');
  else if (e.code === 'Escape' && state.screen === 'paused') { setScreen('playing'); input.lockPointer(); }
});
canvas.addEventListener('click', () => { if (state.screen === 'playing') input.lockPointer(); });

// Mission list on the start screen.
const ml = document.getElementById('mission-list');
if (ml) ml.innerHTML = STORY.map((m) => `<li><b>${m.id}. ${m.title}</b> — ${m.giver} · $${m.pay}<br><span>${m.brief}</span></li>`).join('');
const cont = document.getElementById('btn-continue');
if (cont && !hasSave()) cont.style.opacity = '0.45';

if (shot) {
  // Deterministic staged scene: render a few frames, then flag ready.
  stageShot(shot);
  let n = 0;
  const tick = () => { if (shot !== 'start') updatePlaying(1 / 30); renderer.render(scene, camera); if (++n < 4) requestAnimationFrame(tick); else window.__shotReady = true; };
  requestAnimationFrame(tick);
} else {
  setScreen('start');
  let last = performance.now(), acc = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (state.screen === 'playing') { acc += dt; while (acc > 1 / 60) { updatePlaying(1 / 60); acc -= 1 / 60; } }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);
}
