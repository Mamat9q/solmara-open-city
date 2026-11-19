// Screenshot scenes behind ?shot=start|drive|chase|mission. Each one stages a
// real game state (never a mock render) and lets the main loop draw it; the main
// loop sets window.__shotReady once a few frames have rendered.
import { DT_MAX } from './config.js';

const fakeDriveInput = {
  isDown: (code) => code === 'KeyW',
};

function resetForShot(state) {
  state.cash = 500;
  state.wanted = 0;
  state.missionIndex = 0;
  state.hurricane.day = 1;
  state.shopOwned = [];
  state.currentCar = null;
  state.missions.active = null;
  state.player.pos.set(2, 0, 6);
  state.player.group.position.copy(state.player.pos);
  state.player.group.visible = true;
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
}

function putPlayerInCar(state, index) {
  const car = state.vehicles.cars[index];
  state.currentCar = car;
  car.stolen = true;
  state.player.group.visible = false;
  return car;
}

function simulateDrive(state, car, seconds) {
  const steps = Math.round(seconds / DT_MAX);
  for (let i = 0; i < steps; i++) {
    state.vehicles.drive(car, fakeDriveInput, DT_MAX);
  }
}

export function stageShot(name, state) {
  resetForShot(state);
  state.cameraYaw = Math.PI;
  if (name === 'drive') {
    state.screen = 'playing';
    const car = putPlayerInCar(state, 0);
    car.heading = Math.PI / 2;
    car.x = -40;
    car.z = 0;
    simulateDrive(state, car, 3);
    state.cameraYaw = car.heading + Math.PI;
    state.toast('');
  } else if (name === 'chase') {
    state.screen = 'playing';
    const car = putPlayerInCar(state, 0);
    car.heading = Math.PI / 2;
    car.x = -20;
    car.z = 42;
    simulateDrive(state, car, 2);
    state.wanted = 4;
    for (let i = 0; i < 4; i++) state.police.update(0.5, state, state.audio);
    // Stage two cruisers where the chase camera can see them: ahead of the
    // player's car, one each side, light bars flashing.
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    const rx = Math.cos(car.heading);
    const rz = -Math.sin(car.heading);
    const spots = [
      [car.x + fx * 24 + rx * -8, car.z + fz * 24 + rz * -8],
      [car.x + fx * 28 + rx * 8, car.z + fz * 28 + rz * 8],
    ];
    spots.forEach(([x, z], i) => {
      const cop = state.police.copCars[i];
      cop.x = x;
      cop.z = z;
      cop.heading = car.heading;
      cop.speed = 30;
      cop.active = true;
      cop.group.visible = true;
      cop.group.position.set(x, 0, z);
      cop.group.rotation.y = car.heading;
    });
    state.cameraYaw = car.heading + Math.PI;
    state.toast('');
  } else if (name === 'mission') {
    state.screen = 'playing';
    state.missions.start(state);
    const car = putPlayerInCar(state, 0);
    const t = state.missions.active.target;
    car.x = t.x;
    car.z = t.z - 46;
    car.heading = 0;
    car.group.position.set(car.x, 0, car.z);
    car.group.rotation.y = car.heading;
    state.cameraYaw = Math.PI;
    state.toast('');
  } else {
    // start: the title screen over the city at sunset.
    state.screen = 'start';
    state.cameraYaw = Math.PI * 0.78;
  }
  return name;
}
