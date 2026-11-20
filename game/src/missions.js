// Story missions (10 across 7 chapters) plus the side jobs: taxi fares, 3 street
// races and delivery runs. A mission is a waypoint + an objective line + a payout;
// finishing one pays cash, grants respect and may advance the hurricane day.

import * as THREE from 'three';
import { MISSIONS, RACE_ROUTES, districtAt } from './config.js';

export function createMissions(G) {
  // Waypoint beacon: a glowing pillar the player drives toward.
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 42, 12, 1, true), beaconMat);
  beacon.visible = false;
  G.scene.add(beacon);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.8 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(3, 4.4, 24), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  ring.visible = false;
  G.scene.add(ring);

  const job = {
    kind: 'none', // 'mission' | 'taxi' | 'race' | 'delivery'
    target: null, // {x, z, label}
    fare: 0, timer: 0, raceRoute: null, racePoint: 0, raceTime: 0,
    mission: null,
  };

  function setTarget(x, z, label) {
    job.target = { x, z, label };
    beacon.position.set(x, 21, z);
    beacon.visible = true;
    ring.position.set(x, 0.15, z);
    ring.visible = true;
  }
  function clearTarget() {
    job.target = null;
    beacon.visible = false;
    ring.visible = false;
  }

  function currentMission() {
    return MISSIONS[G.state.missionIndex] || null;
  }

  function startMission() {
    const m = currentMission();
    if (!m) {
      G.hud.toast('All 10 story missions complete — Solmara is yours.');
      return;
    }
    job.kind = 'mission';
    job.mission = m;
    setTarget(m.x, m.z, m.name);
    G.hud.toast(`${m.name} — ${m.brief}`);
    G.hud.setObjective(`${m.name}: ${m.brief}  •  $${m.payout}`);
    if (m.id === 5) G.police.addWanted(2, 'The crew tipped off the cops');
  }

  function completeMission() {
    const m = job.mission;
    if (!m) return;
    G.state.cash += m.payout;
    G.state.respect += m.respect;
    G.state.missionsDone.push(m.id);
    G.state.missionIndex += 1;
    const next = currentMission();
    if (next && next.day > G.state.day) G.hurricane.advanceDay(next.day);
    G.hud.toast(`Mission complete: ${m.name}  +$${m.payout}  +${m.respect} respect`);
    G.audio.fanfare();
    G.save.saveGame();
    job.kind = 'none';
    job.mission = null;
    clearTarget();
    G.hud.setObjective(next ? `Next: ${next.name} — press M to start ($${next.payout})` : 'Story complete! Free roam, taxi (T), races (R), deliveries (Y).');
  }

  function startTaxi() {
    if (job.kind !== 'none') { G.hud.toast('Finish your current job first.'); return; }
    const p = G.world.randomRoadPoint();
    const d = G.world.randomRoadPoint();
    job.kind = 'taxi';
    job.fare = 0;
    job.taxiPickup = p;
    job.taxiDrop = d;
    setTarget(p.x, p.z, 'Passenger');
    G.hud.setObjective(`Taxi: pick up the passenger in ${districtAt(p.x, p.z)}.`);
    G.hud.toast('Taxi fare: pick up the passenger at the marker.');
  }

  function startRace(index) {
    if (job.kind !== 'none') { G.hud.toast('Finish your current job first.'); return; }
    const route = RACE_ROUTES[index % RACE_ROUTES.length];
    job.kind = 'race';
    job.raceRoute = route;
    job.racePoint = 0;
    job.raceTime = 0;
    const pt = route.points[0];
    setTarget(pt[0], pt[1], `${route.name} — checkpoint 1/${route.points.length}`);
    G.hud.setObjective(`${route.name}: hit all ${route.points.length} checkpoints. Pot $${route.payout}.`);
    G.hud.toast(`${route.name} started! Drive through the checkpoints.`);
  }

  function startDelivery() {
    if (job.kind !== 'none') { G.hud.toast('Finish your current job first.'); return; }
    const p = G.world.randomRoadPoint();
    const d = G.world.randomRoadPoint();
    job.kind = 'delivery';
    job.timer = 90;
    job.deliveryPickup = p;
    job.deliveryDrop = d;
    setTarget(p.x, p.z, 'Pickup');
    G.hud.setObjective(`Delivery: collect the package, then drop it off within 90 s.`);
    G.hud.toast('Delivery: grab the package at the marker.');
  }

  function playerPos() {
    return G.player.inCar ? { x: G.car.x, z: G.car.z } : { x: G.player.x, z: G.player.z };
  }

  function update(dt) {
    if (!job.target) return;
    const p = playerPos();
    const d = Math.hypot(p.x - job.target.x, p.z - job.target.z);
    beacon.rotation.y += dt * 1.5;
    ring.scale.setScalar(1 + Math.sin(G.time * 4) * 0.12);
    if (job.kind === 'delivery') {
      job.timer -= dt;
      if (job.timer <= 0) {
        G.hud.toast('Delivery failed — too slow.');
        job.kind = 'none';
        clearTarget();
        G.hud.setObjective('Press M for the next story mission.');
        return;
      }
    }
    if (job.kind === 'race') job.raceTime += dt;
    if (d > 9) return;
    // Arrived at the current target.
    if (job.kind === 'mission') { completeMission(); return; }
    if (job.kind === 'taxi') {
      if (!job.fare) {
        job.fare = Math.round(120 + Math.hypot(job.taxiDrop.x - job.taxiPickup.x, job.taxiDrop.z - job.taxiPickup.z) * 1.2);
        setTarget(job.taxiDrop.x, job.taxiDrop.z, 'Drop-off');
        G.hud.setObjective(`Taxi: drop the passenger in ${districtAt(job.taxiDrop.x, job.taxiDrop.z)} — fare $${job.fare}.`);
        G.hud.toast('Passenger aboard. Drive to the drop-off.');
      } else {
        G.state.cash += job.fare;
        G.state.respect += 3;
        G.hud.toast(`Fare complete: +$${job.fare}`);
        G.audio.fanfare();
        job.kind = 'none';
        job.fare = 0;
        clearTarget();
        G.hud.setObjective('Press M for the next story mission.');
      }
      return;
    }
    if (job.kind === 'race') {
      job.racePoint += 1;
      const route = job.raceRoute;
      if (job.racePoint >= route.points.length) {
        const bonus = Math.max(0, 600 - Math.floor(job.raceTime) * 5);
        const total = route.payout + bonus;
        G.state.cash += total;
        G.state.respect += 10;
        G.hud.toast(`Race won in ${job.raceTime.toFixed(1)} s! +$${total}`);
        G.audio.fanfare();
        job.kind = 'none';
        clearTarget();
        G.hud.setObjective('Press M for the next story mission.');
      } else {
        const pt = route.points[job.racePoint];
        setTarget(pt[0], pt[1], `${route.name} — checkpoint ${job.racePoint + 1}/${route.points.length}`);
      }
      return;
    }
    if (job.kind === 'delivery') {
      if (!job.pickedUp) {
        job.pickedUp = true;
        setTarget(job.deliveryDrop.x, job.deliveryDrop.z, 'Drop-off');
        G.hud.setObjective(`Delivery: drop the package in ${districtAt(job.deliveryDrop.x, job.deliveryDrop.z)} — ${Math.ceil(job.timer)} s left.`);
        G.hud.toast('Package collected. Go!');
      } else {
        const pay = 350 + Math.round(job.timer) * 5;
        G.state.cash += pay;
        G.state.respect += 4;
        G.hud.toast(`Delivered with ${Math.ceil(job.timer)} s to spare: +$${pay}`);
        G.audio.fanfare();
        job.kind = 'none';
        job.pickedUp = false;
        clearTarget();
        G.hud.setObjective('Press M for the next story mission.');
      }
    }
  }

  return {
    job, currentMission, startMission, startTaxi, startRace, startDelivery, update,
    objectiveText() {
      if (job.kind === 'mission' && job.mission) return `${job.mission.name}: ${job.mission.brief}`;
      if (job.kind === 'taxi') return job.fare ? 'Taxi: drop the passenger off.' : 'Taxi: pick up the passenger.';
      if (job.kind === 'race') return `${job.raceRoute.name}: checkpoint ${job.racePoint + 1}/${job.raceRoute.points.length} — ${job.raceTime.toFixed(1)} s`;
      if (job.kind === 'delivery') return `Delivery: ${job.pickedUp ? 'drop the package off' : 'collect the package'} — ${Math.max(0, Math.ceil(job.timer))} s`;
      const next = currentMission();
      return next ? `Next: ${next.name} — press M to start ($${next.payout})` : 'Story complete — free roam Solmara.';
    },
    targetDistance() {
      if (!job.target) return null;
      const p = playerPos();
      return Math.hypot(p.x - job.target.x, p.z - job.target.z);
    },
  };
}
