// SOLMARA — every tuning number, district, mission, car, weapon and radio station in one place.
// Car tuning is proven: accel 22, drag 0.15. Do not lower it (headless runs at ~1 fps).

export const STEP = 1 / 60;
export const SAVE_KEY = 'solmara.r7.save';

/** Proven arcade car tuning: top speed comes from the per-car maxSpeed cap. */
export const CAR_TUNING = { accel: 22, drag: 0.15, brake: 36, reverseAccel: 12, turn: 1.9 };

/** The city is a 640-unit grid; roads every 40 units, 12 wide. */
export const CITY = { size: 640, roadGap: 40, roadWidth: 12, bound: 300, beachZ: 268 };

export const DISTRICTS = [
  { name: 'Downtown', x: 0, z: -20, r: 95 },
  { name: 'Old Town', x: -180, z: -140, r: 85 },
  { name: 'Eastside', x: 200, z: -160, r: 85 },
  { name: 'North Hills', x: -60, z: -230, r: 80 },
  { name: 'Port Solmara', x: 230, z: 60, r: 80 },
  { name: 'Marina Bay', x: -200, z: 180, r: 90 },
  { name: 'Sunset Beach', x: 0, z: 280, r: 90 },
];

export function districtAt(x, z) {
  let best = DISTRICTS[0];
  let bestD = Infinity;
  for (const d of DISTRICTS) {
    const dd = (x - d.x) * (x - d.x) + (z - d.z) * (z - d.z);
    if (dd < bestD) { bestD = dd; best = d; }
  }
  return best.name;
}

/** 7 chapters across 7 hurricane days; 10 story missions. x/z are road coordinates. */
export const CHAPTERS = [
  'Chapter 1 — Landfall',
  'Chapter 2 — Rising Water',
  'Chapter 3 — The Getaway',
  'Chapter 4 — Street Kings',
  'Chapter 5 — Storm Runners',
  'Chapter 6 — The Last Ferry',
  'Chapter 7 — Eye of the Storm',
];

export const MISSIONS = [
  { id: 1, chapter: 1, day: 1, name: 'First Wheels', brief: 'Steal the Dune Runner parked in Downtown and bring it to the garage.', x: 40, z: -40, payout: 400, respect: 12 },
  { id: 2, chapter: 1, day: 1, name: 'Beach Run', brief: 'Drive the package down to Sunset Beach before the tide turns.', x: 0, z: 280, payout: 600, respect: 14 },
  { id: 3, chapter: 2, day: 2, name: 'Port Heist', brief: 'Lift the cargo from Port Solmara and lose the dock guards.', x: 240, z: 80, payout: 900, respect: 18 },
  { id: 4, chapter: 2, day: 3, name: 'Old Town Pickup', brief: 'Pick up the crew in Old Town. No cops, no noise.', x: -200, z: -120, payout: 1100, respect: 18 },
  { id: 5, chapter: 3, day: 3, name: 'Marina Getaway', brief: 'The cops are on you. Break the chase and reach Marina Bay.', x: -200, z: 200, payout: 1400, respect: 22 },
  { id: 6, chapter: 4, day: 4, name: 'Eastside Race', brief: 'Beat the Eastside crew through 3 checkpoints. Winner takes the pot.', x: 200, z: -200, payout: 1800, respect: 26 },
  { id: 7, chapter: 4, day: 5, name: 'North Hills Drop', brief: 'Deliver the drop to the North Hills safehouse.', x: -40, z: -240, payout: 2200, respect: 26 },
  { id: 8, chapter: 5, day: 5, name: 'Storm Runners', brief: 'Race the hurricane surge across the city to the marina.', x: -160, z: 200, payout: 2600, respect: 30 },
  { id: 9, chapter: 6, day: 6, name: 'The Last Ferry', brief: 'Get the witness to the last ferry out of Port Solmara.', x: 240, z: 40, payout: 3200, respect: 34 },
  { id: 10, chapter: 7, day: 7, name: 'Eye of the Storm', brief: 'Final job: drive into the eye and take the Downtown vault.', x: 0, z: 0, payout: 5000, respect: 50 },
];

export const CARS = [
  { id: 'dune', name: 'Dune Runner', price: 0, color: 0xd97b2f, maxSpeed: 40, accel: 20, desc: 'Scrappy coupe. Yours from day one.' },
  { id: 'falcon', name: 'Street Falcon', price: 2500, color: 0x2f7fd9, maxSpeed: 46, accel: 23, desc: 'Fast sedan, tight handling.' },
  { id: 'harbor', name: 'Harbor GT', price: 6000, color: 0x14161c, maxSpeed: 52, accel: 26, desc: 'Black GT. 155+ km/h, armored shell.' },
];

export const UPGRADE_PRICES = { engine: [0, 800, 1800, 3200], armor: [0, 600, 1400, 2600] };
export const PAINTS = [
  { name: 'Sunset Orange', color: 0xd97b2f, price: 0 },
  { name: 'Ocean Blue', color: 0x2f7fd9, price: 250 },
  { name: 'Neon Pink', color: 0xe33f8f, price: 400 },
  { name: 'Midnight Black', color: 0x14161c, price: 500 },
  { name: 'Lime Rush', color: 0x7fd92f, price: 650 },
];

export const WEAPONS = {
  pistol: { name: 'Pistol', key: '1', damage: 34, rate: 0.28, range: 70, ammoMax: 60, price: 0, ammoPrice: 40 },
  smg: { name: 'SMG', key: '2', damage: 14, rate: 0.09, range: 55, ammoMax: 180, price: 900, ammoPrice: 90 },
  shotgun: { name: 'Shotgun', key: '3', damage: 12, pellets: 6, rate: 0.7, range: 32, ammoMax: 40, price: 1500, ammoPrice: 120 },
};

export const RANKS = ['Rookie', 'Street', 'Hustler', 'Boss', 'Kingpin', 'Legend'];
export function rankFor(respect) {
  if (respect >= 220) return 'Legend';
  if (respect >= 160) return 'Kingpin';
  if (respect >= 110) return 'Boss';
  if (respect >= 60) return 'Hustler';
  if (respect >= 25) return 'Street';
  return 'Rookie';
}

export const RADIO = [
  { name: 'NEON FM', tag: 'synthwave', bpm: 104, root: 55, scale: [0, 3, 5, 7, 10], wave: 'sawtooth' },
  { name: 'HARBOR JAZZ', tag: 'late-night jazz', bpm: 84, root: 65.41, scale: [0, 3, 5, 6, 10], wave: 'triangle' },
  { name: 'STORM ROCK', tag: 'storm rock', bpm: 128, root: 49, scale: [0, 2, 3, 7, 8], wave: 'square' },
];

export const RACE_ROUTES = [
  { name: 'Downtown Loop', points: [[0, -80], [120, -80], [120, 80], [0, 80]], payout: 1200 },
  { name: 'Beach Sprint', points: [[-160, 200], [0, 280], [160, 200], [160, 40]], payout: 1500 },
  { name: 'Port Rush', points: [[200, -120], [240, 80], [80, 120], [80, -120]], payout: 2000 },
];

export const PALETTE = {
  skyDay: 0x87b5d9, skySunset: 0xff7a3c, skyNight: 0x0b1026,
  fogDay: 0x9db8c9, fogSunset: 0xd96a4a, fogNight: 0x0b1026,
  sunDay: 0xfff2d9, sunSunset: 0xff9a4d, sunNight: 0x8fa3ff,
  road: 0x2b2f36, ground: 0x3a3f35,
};
