// SOLMARA tuning and story data. All numbers are game units: 1 unit = 1 metre,
// speeds in units per second. The car keeps accel 22 / drag 0.15 so the
// headless drive test (SwiftShader, ~1 fps) still reaches cruising speed.
export const WORLD = {
  size: 640, // city is size x size, centred on (0, 0)
  roadSpacing: 80, // distance between avenues
  roadWidth: 14,
  blockSize: 66,
  seaLevel: -0.4,
};

export const CAR = {
  accel: 22, // units / s^2
  drag: 0.15, // exponential drag coefficient
  brake: 34,
  reverseAccel: 12,
  maxSpeed: 40, // ~144 km/h
  maxReverse: 12,
  steer: 1.9, // rad/s at full lock, scaled down with speed
  grip: 6.0,
  nitroBoost: 14, // extra top speed while nitro lasts
  nitroSeconds: 6,
};

export const PLAYER = {
  walkSpeed: 7,
  runSpeed: 11,
  health: 100,
  startAmmo: 24,
  maxAmmo: 240,
};

export const WANTED = {
  maxStars: 5,
  decaySeconds: 20, // seconds of clean driving to lose one star
  copsPerStar: 2,
  maxCops: 10,
  copTopSpeed: 48.8, // 36 + 3.2 per star at 4 stars
  ramDamage: 6,
};

// Seven chapters, one per day of the hurricane countdown. Each job is a
// drive-to-waypoint run; `wanted` is the heat the job starts with.
export const CHAPTERS = [
  { day: 1, title: 'First Light', job: 'Reach the pier before dawn patrol.', target: [220, 220], reward: 200, wanted: 0 },
  { day: 2, title: 'Supply Run', job: 'Pick up the crew supplies at the market.', target: [-220, 180], reward: 300, wanted: 0 },
  { day: 3, title: 'The Leak', job: 'The cops made you. Lose the heat, then reach the shelter.', target: [180, -220], reward: 400, wanted: 2 },
  { day: 4, title: 'Storm Watch', job: 'Reach the weather station before the outer bands hit.', target: [-200, -200], reward: 500, wanted: 1 },
  { day: 5, title: 'Blackout', job: 'Restore power at the east substation.', target: [260, -60], reward: 600, wanted: 1 },
  { day: 6, title: 'The Vault', job: 'Lift the crew cut from the marina vault.', target: [-260, 40], reward: 800, wanted: 2 },
  { day: 7, title: 'Landfall', job: 'Outrun the storm. Reach the causeway and get out of Solmara.', target: [0, 280], reward: 1000, wanted: 3 },
];

export const SHOP_ITEMS = [
  { id: 'ammo', name: 'Ammo Box', desc: '+48 rounds', price: 150 },
  { id: 'armor', name: 'Body Armor', desc: '+50 armor', price: 250 },
  { id: 'repair', name: 'Repair Kit', desc: 'Car back to full health', price: 200 },
  { id: 'nitro', name: 'Nitro Tank', desc: '+14 top speed for 6s', price: 300 },
];

export const SAVE_KEY = 'solmara-save-v2';
export const SAVE_VERSION = 2;

export const SHOT_NAMES = ['start', 'drive', 'chase', 'mission'];
export const STEP = 1 / 60;
