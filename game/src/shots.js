// The screenshot scenes behind ?shot=start|drive|chase|mission. Each one
// stages the real game from a fresh world at a fixed seed, so the same query
// always gives the same frame. No scene cheats: every staged state is one the
// player can reach by playing (car on the avenue, wanted level earned,
// mission beacon live).
import { CHAPTERS } from './config.js';

/**
 * Stage the named scene on `game` (the Game from main.js) and return the
 * screen the HUD should show. `game` exposes reset(), placeOnFoot(),
 * placeInCar(), setWanted() and startMission().
 */
export function stageShot(name, game) {
  game.reset();
  if (name === 'drive') {
    // Mid-avenue run: the Vesper GT already rolling north up the main drag.
    game.placeInCar(0, 200, 0, 30);
    game.setWanted(0);
    game.startMission(0);
    game.cameraMode = 'chase';
    return { screen: 'play' };
  }
  if (name === 'chase') {
    // Four-star pursuit on the open road: cruisers ahead and behind, the
    // roadblocks visible up the avenue, neon strip glowing to the south.
    // Order matters: startMission sets the chapter's wanted level, so the
    // four-star override comes after it.
    game.placeInCar(0, 200, 0, 28);
    game.startMission(2);
    game.setWanted(4);
    game.police.stageChase(0, 200, 0);
    game.cameraMode = 'chase';
    return { screen: 'play' };
  }
  if (name === 'mission') {
    // Chapter one, waypoint beacon live: the pier run, green pillar ahead.
    game.placeInCar(140, 140, Math.PI * 0.75, 18);
    game.setWanted(0);
    game.startMission(0);
    game.cameraMode = 'chase';
    return { screen: 'play' };
  }
  // Default: start. Title screen over the city at sunset, the Vesper GT
  // parked at the plaza with the player beside it.
  game.placeOnFoot(6, 8, Math.PI);
  game.placeParkedCar(0, 0, Math.PI / 2);
  game.setWanted(0);
  game.startMission(0);
  game.cameraMode = 'orbit';
  return { screen: 'title' };
}

export { CHAPTERS };
