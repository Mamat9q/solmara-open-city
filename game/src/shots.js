// Screenshot staging: ?shot=start|drive|chase|mission&seed=1 puts the game in a
// photogenic state and raises window.__shotReady once a few frames have
// rendered. The mission shot is staged on an open road with the beacon in view.

export function stageShot(state, shot) {
  const s = state;
  if (shot === 'start') {
    s.setScreen('start');
    s.camera.position.set(70, 42, 110);
    s.camera.lookAt(0, 12, 0);
    s.shotCamera = { x: 70, y: 42, z: 110 };
    return true;
  }
  if (shot === 'drive' || shot === 'chase' || shot === 'mission') {
    s.newGame();
    // Put the player in the first parked car, on the long north avenue.
    const car = s.vehicles.cars[0];
    s.player.pos.set(car.x + 2, 0, car.z);
    s.player.group.position.copy(s.player.pos);
    s.enterCar();
    if (shot === 'drive') {
      car.heading = 0;
      car.x = 0;
      car.z = -100;
      car.speed = 24;
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
      s.player.pos.set(car.x, 0, car.z);
      s.player.group.position.copy(s.player.pos);
    } else if (shot === 'chase') {
      car.heading = 0;
      car.x = 0;
      car.z = -60;
      car.speed = 22;
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
      s.player.pos.set(car.x, 0, car.z);
      s.player.group.position.copy(s.player.pos);
      s.wanted = 4;
      for (let i = 0; i < 4; i++) s.police.update(0.5, s, s.audio);
    } else if (shot === 'mission') {
      const m = s.missions.start(s);
      if (m) {
        // Stage on the open road west of the target, looking at the beacon.
        car.heading = Math.PI / 2;
        car.x = m.target.x - 26;
        car.z = m.target.z;
        car.speed = 0;
        car.mesh.position.set(car.x, 0, car.z);
        car.mesh.rotation.y = car.heading;
        s.player.pos.set(car.x, 0, car.z);
        s.player.group.position.copy(s.player.pos);
      }
    }
    return true;
  }
  return false;
}

export function createShotWatcher() {
  let stagedAt = 0;
  let frames = 0;
  return {
    markStaged() {
      stagedAt = performance.now();
      frames = 0;
    },
    tick() {
      frames++;
      if (stagedAt > 0 && frames >= 3 && performance.now() - stagedAt > 1200) {
        window.__shotReady = true;
        stagedAt = 0;
        return true;
      }
      return window.__shotReady === true;
    },
  };
}
