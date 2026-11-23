// The story: 10 missions across 7 chapters on the hurricane countdown.
// A mission is a list of steps — goto, steal, kill, race, taxi, evade — each
// with a beacon, an objective line and a payout at the end. Finishing one pays
// cash, adds respect and advances the day; finishing all ten beats the game.
import { MISSIONS, RACES, GARAGE_POS } from './config.js';
import { addWanted } from './police.js';
import { spawnRivals } from './combat.js';

export function createMissions() {
  return {
    index: 0,
    step: 0,
    active: false,
    done: 0,
    race: null,
    kills: 0,
    taxiDone: false,
    completed: new Set(),
  };
}

export function missionTitle(missions) {
  const m = MISSIONS[missions.index];
  return m ? m.title : 'All missions complete';
}

export function currentStep(missions) {
  const m = MISSIONS[missions.index];
  if (!m) return null;
  return m.steps[missions.step] ?? null;
}

export function startMission(missions, index, state) {
  const m = MISSIONS[index];
  if (!m) return false;
  missions.index = index;
  missions.step = 0;
  missions.active = true;
  missions.race = null;
  missions.kills = 0;
  missions.taxiDone = false;
  state.day = Math.max(state.day, m.day);
  const step = currentStep(missions);
  if (step && step.type === 'kill') {
    spawnRivals(state.combat, step.x, step.z, step.count);
  }
  if (step && step.type === 'evade' && step.wanted) {
    state.wantedHeat = 55;
    addWanted(state, 0);
    state.wanted = 3;
  }
  return true;
}

function advance(missions, state) {
  missions.step += 1;
  const m = MISSIONS[missions.index];
  const step = currentStep(missions);
  if (!step) {
    completeMission(missions, state);
    return;
  }
  if (step.type === 'kill') spawnRivals(state.combat, step.x, step.z, step.count);
  if (step.type === 'evade' && step.wanted) {
    state.wantedHeat = 55;
    state.wanted = 3;
  }
}

function completeMission(missions, state) {
  const m = MISSIONS[missions.index];
  missions.active = false;
  missions.completed.add(missions.index);
  missions.done += 1;
  state.money += m.payout;
  state.respect = Math.min(100, state.respect + 8);
  state.day = Math.min(7, m.day + 1);
  state.toast = `Mission complete: ${m.title} — $${m.payout}`;
  state.toastTimer = 4;
  state.audio.sfx('mission');
  state.save();
  if (missions.index + 1 < MISSIONS.length) {
    missions.index += 1;
  } else {
    state.gameWon = true;
  }
}

/**
 * Mission step checks, run every frame. `pos` is the player's position.
 * Returns nothing; completing a step advances or pays out.
 */
export function updateMissions(missions, state, dt) {
  if (!missions.active) return;
  const step = currentStep(missions);
  if (!step) return;
  const pos = state.playerCar ? state.playerCar.mesh.position : state.player.mesh.position;
  const distTo = (x, z) => Math.hypot(pos.x - x, pos.z - z);

  if (step.type === 'goto' || step.type === 'pickup') {
    state.world.setBeacon(step.x, step.z, true);
    state.objective = step.text;
    if (distTo(step.x, step.z) < 7) {
      state.audio.sfx('pickup');
      advance(missions, state);
    }
    return;
  }
  if (step.type === 'steal') {
    state.world.setBeacon(GARAGE_POS.x, GARAGE_POS.z, false);
    state.objective = step.text;
    if (state.playerCar && state.playerCar.stolen) advance(missions, state);
    return;
  }
  if (step.type === 'kill') {
    state.world.setBeacon(step.x, step.z, true);
    state.objective = `${step.text} — ${missions.kills}/${step.count} down`;
    if (missions.kills >= step.count) advance(missions, state);
    return;
  }
  if (step.type === 'race') {
    const race = RACES[step.route];
    if (!missions.race) {
      missions.race = { route: step.route, cp: 0, started: false };
      state.race = missions.race;
    }
    const cp = race.points[missions.race.cp];
    state.world.setBeacon(cp[0], cp[1], true);
    state.objective = `${step.text} — checkpoint ${missions.race.cp + 1}/${race.points.length}`;
    if (distTo(cp[0], cp[1]) < 9) {
      missions.race.cp += 1;
      state.audio.sfx('pickup');
      if (missions.race.cp >= race.points.length) {
        state.race = null;
        advance(missions, state);
      }
    }
    return;
  }
  if (step.type === 'taxi') {
    state.world.setBeacon(state.taxiRider ? state.taxiRider.x : 80, state.taxiRider ? state.taxiRider.z : 80, true);
    state.objective = step.text;
    if (missions.taxiDone) advance(missions, state);
    return;
  }
  if (step.type === 'evade') {
    state.world.setBeacon(0, 0, false);
    if (step.wanted && state.wanted >= step.wanted && !missions.evadeSeen) {
      missions.evadeSeen = true;
    }
    state.objective = state.wanted > 0 ? 'Lose the cops — break line of sight' : step.text;
    if (state.wanted === 0 && (missions.evadeSeen || !step.wanted)) {
      missions.evadeSeen = false;
      advance(missions, state);
    }
    return;
  }
  state.world.setBeacon(0, 0, false);
}

/** Start the next uncompleted mission, or resume the active one. */
export function startNextMission(missions, state) {
  if (missions.active) return true;
  if (missions.index >= MISSIONS.length) return false;
  return startMission(missions, missions.index, state);
}
