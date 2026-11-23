// Combat: the weapon wheel (pistol / SMG / shotgun), raycast shooting with
// spread and pellets, rival gang members for the shootout missions, and health
// and ammo pickups scattered around the city.
import * as THREE from 'three';
import { WEAPONS, CITY_HALF } from './config.js';
import { range } from './random.js';
import { addWanted } from './police.js';

const RIVAL_COLOR = 0x3a2a4a;

export function createCombat(scene, random) {
  return {
    scene,
    random,
    rivals: [],
    pickups: [],
    muzzle: 0,
    tracer: null,
    shotCooldown: 0,
  };
}

function makeRival(scene, x, z) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.95, 0.35), new THREE.MeshStandardMaterial({ color: RIVAL_COLOR, roughness: 0.85 }));
  body.position.y = 1.0;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 8, 6), new THREE.MeshStandardMaterial({ color: 0xc9a184, roughness: 0.8 }));
  head.position.y = 1.68;
  g.add(head);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.7), new THREE.MeshStandardMaterial({ color: 0x111214 }));
  gun.position.set(0.3, 1.2, 0.4);
  g.add(gun);
  g.position.set(x, 0, z);
  scene.add(g);
  return { mesh: g, health: 100, shootTimer: 1 + Math.random() * 2, speed: 2.2, strafe: Math.random() * Math.PI * 2 };
}

export function spawnRivals(combat, x, z, count) {
  for (let i = 0; i < count; i++) {
    combat.rivals.push(makeRival(combat.scene, x + range(combat.random, -14, 14), z + range(combat.random, -14, 14)));
  }
}

function spawnPickups(combat) {
  const kinds = ['health', 'ammo', 'health', 'ammo', 'health', 'ammo', 'health', 'ammo'];
  for (const kind of kinds) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 0.9),
      new THREE.MeshBasicMaterial({ color: kind === 'health' ? 0x43e06a : 0xffd23f }),
    );
    const x = range(combat.random, -260, 260);
    const z = range(combat.random, -260, 220);
    mesh.position.set(x, 0.7, z);
    combat.scene.add(mesh);
    combat.pickups.push({ mesh, kind, bob: Math.random() * 6 });
  }
}

export function initPickups(combat) {
  if (combat.pickups.length === 0) spawnPickups(combat);
}

/**
 * Fire the current weapon from the camera. Raycasts against rivals first,
 * then traffic, police and pedestrians (hitting a pedestrian raises wanted).
 * Returns true when a shot was fired.
 */
export function shoot(state, camera) {
  const combat = state.combat;
  if (combat.shotCooldown > 0) return false;
  const weapon = WEAPONS[state.weapon];
  if (state.ammo[state.weapon] <= 0) {
    state.audio.sfx('empty');
    combat.shotCooldown = 0.25;
    return false;
  }
  combat.shotCooldown = weapon.rate;
  state.ammo[state.weapon] -= 1;
  state.shotsFired += 1;
  combat.muzzle = 0.07;
  state.audio.sfx('shot');
  const origin = camera.position.clone();
  const pellets = weapon.pellets ?? 1;
  let hitRival = false;
  for (let p = 0; p < pellets; p++) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.x += (Math.random() - 0.5) * weapon.spread * 2;
    dir.y += (Math.random() - 0.5) * weapon.spread * 2;
    dir.z += (Math.random() - 0.5) * weapon.spread * 2;
    dir.normalize();
    const ray = new THREE.Raycaster(origin, dir, 0.5, weapon.range);
    const targets = [];
    for (const r of combat.rivals) targets.push(...r.mesh.children);
    for (const c of state.traffic.cars) targets.push(c.mesh);
    for (const pc of state.police.cars) targets.push(pc.mesh);
    const hits = ray.intersectObjects(targets, true);
    if (hits.length > 0) {
      const hit = hits[0];
      let obj = hit.object;
      while (obj.parent && obj.parent !== state.scene) obj = obj.parent;
      const rival = combat.rivals.find((r) => r.mesh === obj || r.mesh.children.includes(hit.object));
      if (rival) {
        rival.health -= weapon.damage;
        state.effects.burst(hit.point, 0xff5040, 8);
        if (rival.health <= 0) {
          state.scene.remove(rival.mesh);
          combat.rivals = combat.rivals.filter((r) => r !== rival);
          state.missions.kills += 1;
          state.money += 50;
          state.effects.burst(hit.point, 0xffd23f, 16);
        }
        hitRival = true;
      } else {
        state.effects.burst(hit.point, 0xffc93c, 6);
      }
    }
  }
  // Firing in public draws the law.
  addWanted(state, 12);
  if (Math.random() < 0.35) {
    // A shot rings out: nearby peds flee.
    for (const ped of state.traffic.peds) {
      const d = Math.hypot(ped.mesh.position.x - state.player.mesh.position.x, ped.mesh.position.z - state.player.mesh.position.z);
      if (d < 30) ped.flee = 3;
    }
  }
  return hitRival;
}

/** Rivals advance on the player and shoot back; pickups bob and get collected. */
export function updateCombat(state, dt) {
  const combat = state.combat;
  if (combat.shotCooldown > 0) combat.shotCooldown -= dt;
  if (combat.muzzle > 0) combat.muzzle -= dt;
  const playerPos = state.player.mesh.position;
  for (const rival of [...combat.rivals]) {
    const dx = playerPos.x - rival.mesh.position.x;
    const dz = playerPos.z - rival.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    rival.mesh.rotation.y = Math.atan2(dx, dz);
    if (dist > 10) {
      rival.mesh.position.x += (dx / dist) * rival.speed * dt;
      rival.mesh.position.z += (dz / dist) * rival.speed * dt;
    } else {
      rival.strafe += dt;
      rival.mesh.position.x += Math.sin(rival.strafe) * 1.2 * dt;
      rival.mesh.position.z += Math.cos(rival.strafe) * 1.2 * dt;
    }
    rival.shootTimer -= dt;
    if (rival.shootTimer <= 0 && dist < 45) {
      rival.shootTimer = 1.2 + Math.random() * 1.4;
      if (Math.random() < 0.55) {
        state.health = Math.max(0, state.health - (state.armor ? 6 : 12));
        state.effects.burst(playerPos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xff4040, 5);
        state.audio.sfx('hit');
      }
    }
  }
  for (const pickup of [...combat.pickups]) {
    pickup.bob += dt;
    pickup.mesh.position.y = 0.7 + Math.sin(pickup.bob * 2.4) * 0.25;
    pickup.mesh.rotation.y += dt * 1.5;
    const d = Math.hypot(pickup.mesh.position.x - playerPos.x, pickup.mesh.position.z - playerPos.z);
    const inCar = state.playerCar && Math.hypot(pickup.mesh.position.x - state.playerCar.mesh.position.x, pickup.mesh.position.z - state.playerCar.mesh.position.z) < 3;
    if (d < 2.2 || inCar) {
      if (pickup.kind === 'health') {
        state.health = Math.min(100, state.health + 35);
        state.toast = 'Health +35';
      } else {
        state.ammo[state.weapon] += WEAPONS[state.weapon].mag;
        state.toast = `Ammo +${WEAPONS[state.weapon].mag}`;
      }
      state.toastTimer = 2;
      state.audio.sfx('pickup');
      state.scene.remove(pickup.mesh);
      combat.pickups = combat.pickups.filter((p) => p !== pickup);
    }
  }
}
