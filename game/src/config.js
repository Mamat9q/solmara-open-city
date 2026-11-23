// SOLMARA tuning, districts, cars, weapons, radio and the 10-mission story.
// Every number the game balances on lives here so the other modules stay small.
import * as THREE from 'three';

export const STEP = 1 / 60;
/** The city is a square, half-size in metres; roads run every ROAD_STEP. */
export const CITY_HALF = 320;
export const ROAD_STEP = 80;
export const ROAD_WIDTH = 14;
/** Proven car tuning: do not lower it — headless runs at ~1 fps on SwiftShader. */
export const CAR_ACCEL = 22;
export const CAR_DRAG = 0.15;
export const CAR_TOP_SPEED = 43; // ~155 km/h
export const CAR_STEER = 0.55;
export const PLAYER_WALK = 7;
export const PLAYER_RUN = 12;

export const SAVE_KEY = 'solmara.save.v1';
export const START_CASH = 350;
export const START_HEALTH = 100;

export const DISTRICTS = [
  { name: 'Downtown', x0: -80, z0: -80, x1: 80, z1: 80, tall: true },
  { name: 'Beachfront', x0: -80, z0: 240, x1: 320, z1: 320, tall: false },
  { name: 'Port', x0: -320, z0: -80, x1: -240, z1: 240, tall: false },
  { name: 'Marina', x0: 160, z0: 160, x1: 320, z1: 240, tall: false },
  { name: 'Old Town', x0: -320, z0: -320, x1: -80, z1: -80, tall: false },
  { name: 'Suburbs', x0: 160, z0: -320, x1: 320, z1: -80, tall: false },
  { name: 'Industrial', x0: -320, z0: 80, x1: -80, z1: 240, tall: false },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d.name;
  return 'Solmara';
}

/** Garage cars: id, name, price, accel, top speed (m/s), colour. */
export const CARS = [
  { id: 'dune', name: 'Dune Runner', price: 0, accel: 22, top: 43, color: 0xffc93c },
  { id: 'vulture', name: 'Vulture GT', price: 2500, accel: 26, top: 50, color: 0xc22e3d },
  { id: 'aero', name: 'Aero S', price: 6000, accel: 30, top: 56, color: 0x2fb7ff },
];

export const UPGRADES = [
  { id: 'engine', name: 'Engine tune', price: 900, desc: '+4 accel, +4 m/s top speed' },
  { id: 'armor', name: 'Armour plating', price: 700, desc: 'Half damage to you and your car' },
  { id: 'paint', name: 'Fresh paint', price: 150, desc: 'A new colour for your ride' },
];

export const WEAPONS = {
  pistol: { name: 'Pistol', key: '1', price: 0, ammoPrice: 40, damage: 34, rate: 0.28, spread: 0.012, range: 70, mag: 12, auto: false },
  smg: { name: 'SMG', key: '2', price: 800, ammoPrice: 90, damage: 18, rate: 0.09, spread: 0.045, range: 55, mag: 30, auto: true },
  shotgun: { name: 'Shotgun', key: '3', price: 1200, ammoPrice: 70, damage: 26, rate: 0.7, spread: 0.09, range: 30, mag: 6, auto: false, pellets: 6 },
};

export const RADIO = [
  { name: 'NEON FM', desc: 'synthwave', bpm: 112, root: 55, minor: true },
  { name: 'BASSLINE', desc: 'low-end drive', bpm: 96, root: 41.2, minor: true },
  { name: 'STORM FM', desc: 'ambient rain', bpm: 72, root: 65.4, minor: false },
];

/** 10 story missions across 7 chapters; Hurricane Ilsa lands at the end of day 7. */
export const MISSIONS = [
  { ch: 1, day: 1, title: 'First Light', objective: 'Pick up the package at the Marina, deliver it Downtown', payout: 400,
    steps: [{ type: 'goto', x: 240, z: 200, text: 'Pick up the package at the Marina' }, { type: 'goto', x: 20, z: 20, text: 'Deliver the package Downtown' }] },
  { ch: 1, day: 1, title: 'Taxi Hustle', objective: 'Run one taxi fare — pick up the rider, drop them off', payout: 250,
    steps: [{ type: 'taxi', text: 'Press F near a taxi rider and finish the fare' }] },
  { ch: 2, day: 2, title: 'Hot Wheels', objective: 'Steal a Vulture GT from the Suburbs and bring it to the garage', payout: 600,
    steps: [{ type: 'goto', x: 240, z: -200, text: 'Find the Vulture GT in the Suburbs' }, { type: 'steal', text: 'Steal the car (press E) and drive it to the garage' }, { type: 'goto', x: -200, z: 160, text: 'Deliver it to the garage' }] },
  { ch: 2, day: 2, title: 'Port Authority', objective: 'Collect 3 crates around the Port', payout: 700,
    steps: [{ type: 'goto', x: -280, z: 0, text: 'Crate 1 of 3 — Port west dock' }, { type: 'goto', x: -280, z: 120, text: 'Crate 2 of 3 — Port south dock' }, { type: 'goto', x: -260, z: -60, text: 'Crate 3 of 3 — Port north dock' }] },
  { ch: 3, day: 3, title: 'Beach Run', objective: 'Win the Beachfront street race — hit every checkpoint', payout: 800,
    steps: [{ type: 'race', route: 'beach', text: 'Race the Beachfront route — checkpoints in order' }] },
  { ch: 3, day: 3, title: 'Payback', objective: 'Clear 4 rivals out of Old Town', payout: 900,
    steps: [{ type: 'kill', x: -200, z: -200, count: 4, text: 'Take down 4 rivals in Old Town' }] },
  { ch: 4, day: 4, title: 'Storm Chaser', objective: 'Three drops across the city while the rain closes in', payout: 1000,
    steps: [{ type: 'goto', x: 200, z: -240, text: 'Drop 1 of 3 — Suburbs north' }, { type: 'goto', x: -40, z: 280, text: 'Drop 2 of 3 — Beachfront' }, { type: 'goto', x: -280, z: 200, text: 'Drop 3 of 3 — Industrial' }] },
  { ch: 5, day: 5, title: 'Grand Theft Marina', objective: 'Lift the Aero S from the Marina and lose the heat', payout: 1200,
    steps: [{ type: 'goto', x: 260, z: 180, text: 'Find the Aero S at the Marina' }, { type: 'steal', text: 'Steal the Aero S (press E)' }, { type: 'evade', text: 'Lose the cops, then reach the garage' }, { type: 'goto', x: -200, z: 160, text: 'Park it at the garage' }] },
  { ch: 6, day: 6, title: 'The Long Way Home', objective: 'Shake a 3-star wanted level and reach the safehouse', payout: 1500,
    steps: [{ type: 'evade', wanted: 3, text: 'Lose a 3-star wanted level' }, { type: 'goto', x: 0, z: -280, text: 'Reach the safehouse, north edge' }] },
  { ch: 7, day: 7, title: 'Outrun Ilsa', objective: 'Win the final race, then reach the evacuation point before the storm', payout: 3000,
    steps: [{ type: 'race', route: 'storm', text: 'Final race — the Storm route' }, { type: 'goto', x: 280, z: 280, text: 'Reach the evacuation point, Beachfront east' }] },
];

/** Street-race routes: named checkpoint loops. */
export const RACES = {
  beach: { name: 'Beachfront Sprint', points: [[0, 280], [200, 280], [280, 200], [280, 0], [200, -80], [0, -80]] },
  downtown: { name: 'Downtown Loop', points: [[-40, -40], [40, -40], [40, 40], [-40, 40], [-40, -40]] },
  storm: { name: 'Storm Route', points: [[-240, -240], [240, -240], [240, 240], [-240, 240], [-240, -240]] },
};

export const PALETTE = {
  skyDay: new THREE.Color(0x87b5e0),
  skySunset: new THREE.Color(0xff7e47),
  skyNight: new THREE.Color(0x0b1026),
  fogDay: new THREE.Color(0x9db8cc),
  fogNight: new THREE.Color(0x0b1026),
  sunDay: new THREE.Color(0xfff2d8),
  sunSunset: new THREE.Color(0xff9a4d),
  road: 0x2b2f36,
  sidewalk: 0x555a63,
  ground: 0x3a4a2f,
  sand: 0xd9c08a,
  water: 0x14506b,
};

export const GARAGE_POS = { x: -200, z: 160 };
export const GUNSHOP_POS = { x: 120, z: -160 };
export const SAFEHOUSE_POS = { x: 0, z: -280 };
export const TAXI_RIDER_POS = { x: 80, z: 80 };
