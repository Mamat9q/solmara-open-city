// SOLMARA screenshot scenes: each one stages the real game from a fresh
// world with the same seed, so the four pictures are honest renders of play
// — the start screen, driving, a police chase, and a mission in progress.

import { Vehicle } from './vehicles.js';

function freshGame(game) {
  game.newGame();
  game.screen = 'playing';
  game.showScreen('playing');
}

function putPlayerInCar(game, defKey, x, z, heading, speed) {
  const car = new Vehicle(defKey, x, z, heading, false);
  car.speed = speed;
  game.scene.add(car.group);
  game.vehicles.cars.push(car);
  game.player.pos.set(x, 0, z);
  game.player.heading = heading;
  game.enterCar(car);
  game.currentCar.speed = speed;
  game.cameraYaw = heading;
  game.updateCamera(0);
  return car;
}

export function stageShot(name, game) {
  const lower = (name || 'start').toLowerCase();
  if (lower === 'drive') {
    freshGame(game);
    putPlayerInCar(game, 'marina', 0, 46, Math.PI, 26);
    game.toast('Marina GT — 173 km/h on Coral Row.');
    game.shotReady();
    return;
  }
  if (lower === 'chase') {
    freshGame(game);
    game.hurricane.day = 4;
    putPlayerInCar(game, 'interceptor', 0, 30, Math.PI, 34);
    game.wanted = 4;
    game.police.update(0.5, game, game.audio);
    game.police.update(0.5, game, game.audio);
    game.toast('Four stars — lose the cruisers before the roadblock.');
    game.shotReady();
    return;
  }
  if (lower === 'mission') {
    freshGame(game);
    game.hurricane.day = 2;
    game.missions.start(0);
    game.player.pos.set(0, 0, -34);
    game.player.group.position.copy(game.player.pos);
    game.player.heading = Math.PI;
    game.cameraYaw = Math.PI;
    game.updateCamera(0);
    game.toast('Chapter 1 — First Shift: reach Mara’s garage.');
    game.shotReady();
    return;
  }
  // Start scene: the title over a live city at sunset.
  game.newGame();
  game.screen = 'start';
  game.showScreen('start');
  game.camera.position.set(38, 26, 96);
  game.camera.lookAt(0, 6, -20);
  game.shotReady();
}
