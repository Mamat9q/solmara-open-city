// The screenshot scenes behind ?shot=start|drive|chase|mission&seed=1. Each
// one plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot, so the frame is what a short game
// really looks like and the same seed always gives the same frame. Every
// driving scene runs NORTH or EAST through downtown — never south into the
// beach — so the frame shows towers, traffic and the skyline.
import { nearestRoadPoint } from './world.js';

const SAMPLE = 1 / 30;

/** Drive the player's car forward along the nearest road for `seconds`. */
function autopilotDrive(game, seconds) {
  const car = game.playerCar;
  for (let i = 0; i < seconds / SAMPLE; i++) {
    const ahead = { x: car.x + Math.sin(car.heading) * 30, z: car.z + Math.cos(car.heading) * 30 };
    const road = nearestRoadPoint(ahead.x, ahead.z);
    const ctrl = car.steerToward(road.x, road.z, 1);
    car.update(SAMPLE, ctrl, (x, z, r) => game.world.collide(x, z, r));
    game.traffic.update(SAMPLE, false);
  }
}

/**
 * Set the game to the named scene and return the camera framing to use.
 * start: title screen over downtown at sunset. drive: cruising north up the
 * downtown grid. chase: 3-star wanted, patrol cars behind, rain at sunset.
 * mission: the Portside delivery, marker gold on the minimap and in the world.
 */
export function stageShot(name, game) {
  const g = game;
  g.resetForShot();
  if (name === 'drive') {
    g.world.timeOfDay = 0.5;
    g.playerCar.place(0, 240, Math.PI);
    g.player.enterCar(g.playerCar);
    autopilotDrive(g, 8);
    g.shotDrive = 'road';
    g.hud.hideStart();
    return { screen: 'play', cam: 'chase' };
  }
  if (name === 'chase') {
    g.world.timeOfDay = 0.72;
    g.world.setRain(0.6);
    g.playerCar.place(0, 180, Math.PI);
    g.player.enterCar(g.playerCar);
    g.police.addWanted(3);
    const u1 = g.police.spawnUnit(0, 180);
    const u2 = g.police.spawnUnit(0, 180);
    const u3 = g.police.spawnUnit(0, 180);
    autopilotDrive(g, 6);
    // Place the units around the player's final spot: two chasing from
    // behind, one head-on ahead, so all three read in the frame.
    const p = g.playerCar;
    u1.place(p.x - 3, p.z + 35, Math.PI);
    u2.place(p.x + 3, p.z + 45, Math.PI);
    u3.place(p.x, p.z - 45, Math.PI);
    g.shotDrive = 'road';
    g.hud.hideStart();
    g.hud.message('WANTED — lose the cops!');
    return { screen: 'play', cam: 'chase' };
  }
  if (name === 'mission') {
    g.world.timeOfDay = 0.68;
    g.playerCar.place(-180, 60, Math.PI / 2);
    g.player.enterCar(g.playerCar);
    g.missions.start(3);
    autopilotDrive(g, 6);
    g.shotDrive = 'mission';
    g.hud.hideStart();
    return { screen: 'play', cam: 'chase' };
  }
  // start (default): title screen, car parked downtown at sunset.
  g.world.timeOfDay = 0.72;
  g.playerCar.place(0, 0, Math.PI * 0.15);
  g.player.enterCar(g.playerCar);
  g.hud.showStart(g.missions.list());
  return { screen: 'title', cam: 'orbit' };
}
