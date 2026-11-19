// SOLMARA configuration: the city, the cars, the shops, the storm.
// Solmara Bay is a 320 x 320 unit grid city. Streets run every 40 units; the
// causeway bridge crosses the bay to the east. Units are metres; 1 u/s is 3.6 km/h.

export const CITY = {
  half: 160,
  block: 40,
  roadWidth: 12,
  sidewalkWidth: 3,
};

export const PLAYER = {
  walkSpeed: 6.5,
  runSpeed: 9.5,
  radius: 0.6,
  eyeHeight: 1.7,
};

export const CAR = {
  accel: 22, // u/s^2 — headless runs at ~1 fps, so the car must reach 10 u/s in ~1 s of game time
  brake: 22,
  reverseAccel: 8,
  topSpeed: 43, // ~155 km/h
  reverseTopSpeed: 12,
  turnRate: 1.9, // rad/s at full lock, scaled by speed
  drag: 0.15, // per-second proportional drag
  enterRadius: 4.5,
};

export const POLICE = {
  maxCops: 6,
  baseTopSpeed: 36,
  topSpeedPerStar: 3.2, // cap at 4 stars: 48.8 u/s
  accel: 14,
  roadblockStars: 2, // roadblocks deploy at 2+ stars
  chaseRadius: 260,
  ramDamage: 0,
};

export const MISSIONS = [
  {
    id: 1,
    title: 'Chapter 1 — The Pickup',
    brief: 'Mara wants the ledger from the docks. Drive to the marker and bring it back — no noise, no witnesses.',
    target: { x: 96, z: -84 },
    reward: 500,
  },
  {
    id: 2,
    title: 'Chapter 2 — The Causeway Run',
    brief: 'A courier is crossing the causeway at dusk. Intercept the drop before the Syndicate does.',
    target: { x: -120, z: 120 },
    reward: 650,
  },
  {
    id: 3,
    title: 'Chapter 3 — Neon Static',
    brief: 'The radio tower on Meridian Row is broadcasting the Syndicate ledger. Shut it down.',
    target: { x: 40, z: 120 },
    reward: 800,
  },
  {
    id: 4,
    title: 'Chapter 4 — The Long Con',
    brief: 'Pose as a buyer at the marina. The exchange happens at the far pier — be on time.',
    target: { x: 128, z: 40 },
    reward: 950,
  },
  {
    id: 5,
    title: 'Chapter 5 — Smoke Over Solmara',
    brief: 'The storm surge is flooding the underpass. Get the crew out through the north gate.',
    target: { x: -40, z: -120 },
    reward: 1200,
  },
  {
    id: 6,
    title: 'Chapter 6 — Hollow Point',
    brief: 'The Syndicate enforcer is holed up at the old casino. End the debt, one way or another.',
    target: { x: -128, z: -40 },
    reward: 1500,
  },
  {
    id: 7,
    title: 'Chapter 7 — The Last Boat',
    brief: 'The hurricane makes landfall at dawn. One boat leaves the harbour. Be on it.',
    target: { x: 128, z: 128 },
    reward: 2500,
  },
];

export const SHOPS = [
  {
    id: 'arms',
    name: 'Solmara Arms',
    x: -58,
    z: -46,
    items: [
      { id: 'ammo', name: 'Ammo Box', desc: '+48 rounds', price: 150, apply: (s) => { s.player.reserve += 48; } },
      { id: 'vest', name: 'Kevlar Vest', desc: 'Survive one more hit', price: 300, apply: (s) => { s.player.armor = Math.min(100, (s.player.armor ?? 0) + 50); } },
      { id: 'repair', name: 'Full Repair', desc: 'Fix your ride up', price: 100, apply: (s) => { if (s.currentCar) s.currentCar.health = 100; } },
    ],
  },
  {
    id: 'marina',
    name: 'Marina General Store',
    x: 84,
    z: 96,
    items: [
      { id: 'ammo', name: 'Ammo Box', desc: '+48 rounds', price: 150, apply: (s) => { s.player.reserve += 48; } },
      { id: 'snacks', name: 'Street Snacks', desc: 'Patch yourself up', price: 60, apply: (s) => { s.player.health = Math.min(100, (s.player.health ?? 100) + 30); } },
      { id: 'repair', name: 'Full Repair', desc: 'Fix your ride up', price: 100, apply: (s) => { if (s.currentCar) s.currentCar.health = 100; } },
    ],
  },
];

export const CARS = [
  { name: 'Vesper', color: 0xd43d2a, topSpeed: 43 },
  { name: 'Comet GT', color: 0x2a6fd4, topSpeed: 45 },
  { name: 'Solano', color: 0xe8c33a, topSpeed: 40 },
  { name: 'Marauder', color: 0x222226, topSpeed: 44 },
  { name: 'Palmetto', color: 0x3aa655, topSpeed: 39 },
  { name: 'Interceptor', color: 0x11131a, topSpeed: 48 },
];

export const HURRICANE = {
  totalDays: 7,
  startDay: 1,
};

export const SAVE_KEY = 'solmara-save-v2';
export const START_CASH = 250;
