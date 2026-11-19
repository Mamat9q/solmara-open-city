// Story missions + side jobs for Solmara. Arc: Dario Venn, a driver fresh out of
// the Solmara county lockup, works for fixer Mara Kessler against the Hollow
// Point Syndicate — one chapter a day as a hurricane closes on the city.
// 7 story missions + taxi fares + car delivery, all original.
import { CHAPTERS } from './hurricane.js';
export const STORY = [
  { id: 1, chapter: 1, title: 'Back on the Boardwalk', giver: 'Mara Kessler', pay: 400,
    brief: 'Mara needs a driver she can trust. Drive to the marina and pick up her package.',
    lines: ['Mara: "Dario. You are out. Good. I need a driver, not a hero."', 'Dario: "I drive. That is all I do anymore."'],
    target: { x: -120, z: 230, label: 'Marina pier' }, enemies: 0 },
  { id: 2, chapter: 2, title: 'The Hollow Point Welcome', giver: 'Mara Kessler', pay: 650,
    brief: 'Syndicate gunmen are waiting at the docks. Clear them out, then grab the ledger.',
    lines: ['Mara: "Hollow Point boys are at the docks. Make them leave."', 'Dario: "Loud or quiet?"', 'Mara: "Loud. They need to hear it."'],
    target: { x: -120, z: 230, label: 'Docks' }, enemies: 3 },
  { id: 3, chapter: 3, title: 'Taxi for the Judge', giver: 'Mara Kessler', pay: 800,
    brief: 'A nervous witness needs a ride across town — fast, no police, no questions.',
    lines: ['Witness: "If they find me, I am done. Drive like my life depends on it."', 'Dario: "It does. Hold on."'],
    target: { x: 150, z: -150, label: 'Safe house' }, enemies: 0, taxi: true },
  { id: 4, chapter: 4, title: 'The Cortez Job', giver: 'Mara Kessler', pay: 1200,
    brief: 'Steal the syndicate\'s gold Cortez Coupe from the north lot and deliver it to Mara\'s garage.',
    lines: ['Mara: "The Coupe is theirs. Tonight it is ours."', 'Dario: "A car job. Finally something honest."'],
    target: { x: 170, z: 170, label: 'Mara\'s garage' }, enemies: 2, stealCar: true },
  { id: 5, chapter: 5, title: 'King of the Boardwalk', giver: 'Mara Kessler', pay: 2500,
    brief: 'End it. Take down the Syndicate crew holding the boardwalk and claim Solmara.',
    lines: ['Mara: "No more running, Dario. Finish this."', 'Dario: "Then Solmara is ours."'],
    target: { x: 0, z: 240, label: 'Boardwalk' }, enemies: 5 },
  { id: 6, chapter: 6, title: 'Storm Surge', giver: 'Mara Kessler', pay: 1800,
    brief: 'The surge is flooding the garage district. Hold Mara\'s garage against the Syndicate crew looting it in the storm.',
    lines: ['Mara: "The water is coming in and Hollow Point is looting my garage. Hold the line."', 'Dario: "In a hurricane? You owe me double."', 'Mara: "You will get it. Stay alive first."'],
    target: { x: 170, z: 170, label: 'Mara\'s garage' }, enemies: 4 },
  { id: 7, chapter: 7, title: 'Landfall', giver: 'Mara Kessler', pay: 4000,
    brief: 'The hurricane makes landfall at dawn. Finish the Syndicate on the boardwalk in the middle of the storm and take Solmara for good.',
    lines: ['Mara: "Landfall is here, Dario. The whole city is watching the sky — and us."', 'Dario: "Then we finish this in the rain."'],
    target: { x: 0, z: 240, label: 'Boardwalk' }, enemies: 6 },
];
export function createMissions() {
  let active = null, stage = 'idle'; // idle | go | fight | done
  let side = null; // {kind:'taxi'|'delivery', ...}
  const api = {
    get active() { return active; },
    get stage() { return stage; },
    get side() { return side; },
    list() { return STORY.map((m, i) => ({ ...m, done: false, index: i })); },
    current(state) { return STORY[state.missionIndex] || null; },
    start(state) {
      const m = STORY[state.missionIndex];
      if (!m) { state.message('All story missions complete — free roam, Dario.'); return false; }
      active = m; stage = m.enemies > 0 ? 'fight' : 'go';
      state.message(`Mission ${m.id}/7 — ${CHAPTERS[m.chapter - 1]}: ${m.title} — ${m.brief}`);
      for (const l of m.lines) state.say(l);
      if (m.enemies > 0) state.combat.spawnEnemies(m.enemies, m.target.x, m.target.z, 'Hollow Point gunman');
      state.objective = m.brief;
      return true;
    },
    onEnemyDown(state) {
      if (!active || stage !== 'fight') return;
      const alive = state.combat.enemies.filter((e) => e.alive).length;
      if (alive === 0) {
        stage = 'go'; state.message('Area clear — get to the waypoint.');
        state.say('Mara: "Clear. Move."');
      }
    },
    update(state) {
      if (active && stage === 'go') {
        const t = active.target;
        const d = Math.hypot(state.player.pos.x - t.x, state.player.pos.z - t.z);
        if (d < 10) api.complete(state);
      }
      if (side) {
        const d = Math.hypot(state.player.pos.x - side.tx, state.player.pos.z - side.tz);
        if (d < 9) {
          state.cash += side.pay; state.message(`${side.label} complete — +$${side.pay}.`);
          if (state.audio) state.audio.cash();
          side = null; state.objective = active ? active.brief : 'Free roam — press M for missions.';
        }
      }
    },
    complete(state) {
      if (!active) return;
      state.cash += active.pay;
      state.completedMissions.push(active.id);
      state.message(`Mission complete: ${active.title} — +$${active.pay}.`);
      if (state.audio) state.audio.missionDone();
      state.missionIndex = Math.min(STORY.length, state.missionIndex + 1);
      state.combat.clearEnemies();
      active = null; stage = 'idle';
      // The story moves a day closer to landfall with every mission done.
      if (state.hurricane) {
        const d = state.hurricane.advanceDay();
        if (d) state.message(`${CHAPTERS[d - 1]} — landfall in ${7 - d} day${7 - d === 1 ? '' : 's'}.`);
        else state.message('Landfall is here. The storm is on Solmara.');
      }
      state.objective = state.missionIndex < STORY.length ? 'Press M to start the next mission.' : 'All missions complete!';
      try { state._save.saveGame(state); } catch { /* autosave best-effort */ }
    },
    startTaxi(state) {
      if (side) { state.message('Finish the current side job first.'); return; }
      const dests = [{ x: 150, z: -150 }, { x: -180, z: 60 }, { x: 60, z: 200 }];
      const d = dests[Math.floor(Math.random() * dests.length)];
      side = { kind: 'taxi', tx: d.x, tz: d.z, pay: 150, label: 'Taxi fare' };
      state.objective = 'Taxi fare: drive the passenger to the yellow marker.';
      state.message('Taxi fare accepted — drive to the yellow marker. Keep it smooth.');
    },
    startDelivery(state) {
      if (side) { state.message('Finish the current side job first.'); return; }
      const car = state.vehicles.nearestCar(state.player.pos.x, state.player.pos.z, 999);
      side = { kind: 'delivery', tx: 170, tz: 170, pay: 300, label: 'Car delivery', car };
      state.objective = 'Car delivery: steal any car and deliver it to Mara\'s garage.';
      state.message('Car delivery: bring any car to the garage at the north-east corner.');
    },
    waypoint(state) {
      if (side) return { x: side.tx, z: side.tz, color: '#ffd94d' };
      if (active) return { x: active.target.x, z: active.target.z, color: '#ff5a5a' };
      return null;
    },
  };
  return api;
}
