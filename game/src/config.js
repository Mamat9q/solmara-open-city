// SOLMARA tuning: every number the game balances on lives here, named so a
// playtest can point at one value and change it. Speeds are world units per
// second; 1 unit is about 1 metre, so km/h is speed x 3.6.

export const CITY = {
  halfSize: 130,
  roadLines: [-80, -40, 0, 40, 80],
  roadWidth: 10,
  blockCentres: [-60, -20, 20, 60],
  beachZ: 104,
  oceanZ: 118,
};

export const PLAYER = {
  walkSpeed: 6,
  sprintSpeed: 9.5,
  maxHealth: 150,
  radius: 0.9,
  magazineSize: 12,
  startReserveAmmo: 48,
  startCash: 400,
  gunDamage: 25,
  gunRange: 70,
};

export const CAR_DEFS = {
  sedan: { name: 'Coral Sedan', topSpeed: 30, accel: 13, turn: 1.9, color: 0x8a94a6, length: 4.4, width: 2.0 },
  coupe: { name: 'Palma Coupe', topSpeed: 36, accel: 16, turn: 2.1, color: 0xc23b4e, length: 4.2, width: 1.9 },
  marina: { name: 'Marina GT', topSpeed: 48, accel: 22, turn: 2.4, color: 0x2e9e8f, length: 4.5, width: 2.0 },
  interceptor: { name: 'Interceptor', topSpeed: 52, accel: 26, turn: 2.6, color: 0x1c2733, length: 4.6, width: 2.0 },
  taxi: { name: 'Solmara Cab', topSpeed: 32, accel: 14, turn: 2.0, color: 0xe8b93b, length: 4.4, width: 2.0 },
  van: { name: 'Harbor Van', topSpeed: 26, accel: 11, turn: 1.7, color: 0x5b7fa6, length: 5.0, width: 2.1 },
};

export const POLICE = {
  cruiserCount: 4,
  baseTopSpeed: 36,
  topSpeedPerStar: 3.2,
  ramDamage: 6,
  roadblockStars: 3,
};

export const HURRICANE = {
  totalDays: 7,
  secondsPerDay: 420,
};

export const SHOPS = [
  {
    id: 'arms',
    name: "Solmara Arms",
    blurb: 'Guns, ammo and armour — no questions asked.',
    x: -58,
    z: -46,
    items: [
      { id: 'ammo', name: 'Ammo box', detail: '+48 reserve rounds', price: 150 },
      { id: 'medkit', name: 'Med kit', detail: 'Restore 60 health', price: 100 },
      { id: 'kevlar', name: 'Kevlar vest', detail: 'Enemy bullets hurt half as much', price: 300 },
    ],
  },
  {
    id: 'motors',
    name: "Rico's Motors",
    blurb: 'Tuning and fast cars, cash only.',
    x: 58,
    z: 46,
    items: [
      { id: 'tuning', name: 'Engine tuning', detail: '+15% top speed on every car you drive', price: 800 },
      { id: 'plating', name: 'Armour plating', detail: 'Your cars shrug off rams and bullets', price: 600 },
      { id: 'marina', name: 'Marina GT', detail: 'Top speed 173 km/h — delivered beside you', price: 2000 },
      { id: 'interceptor', name: 'Interceptor', detail: 'Top speed 187 km/h — delivered beside you', price: 3500 },
    ],
  },
  {
    id: 'clinic',
    name: "Doc's Clinic",
    blurb: 'Patch-ups for people who ask no questions.',
    x: 44,
    z: -58,
    items: [
      { id: 'medkit', name: 'Med kit', detail: 'Restore 60 health', price: 100 },
      { id: 'kevlar', name: 'Kevlar vest', detail: 'Enemy bullets hurt half as much', price: 300 },
      { id: 'ammo', name: 'Ammo box', detail: '+48 reserve rounds', price: 150 },
    ],
  },
];

export const MISSIONS = [
  {
    id: 1, chapter: 'Chapter 1 — First Shift', title: 'First Shift',
    giver: 'Mara Kessler',
    brief: 'Mara needs a driver she can trust. Get to her garage on Coral Row and pick up the keys.',
    target: { x: 0, z: -60 }, payout: 250, enemies: 0,
  },
  {
    id: 2, chapter: 'Chapter 2 — Hot Wheels', title: 'Hot Wheels',
    giver: 'Mara Kessler',
    brief: 'A Marina GT is sitting in the boardwalk lot with the keys in it. Lift it — and deal with the lookout.',
    target: { x: 40, z: 0 }, payout: 500, enemies: 1,
  },
  {
    id: 3, chapter: 'Chapter 3 — Boardwalk Tax', title: 'Boardwalk Tax',
    giver: 'Mara Kessler',
    brief: 'The Hollow Point crew is shaking down the boardwalk stalls. Run them off, then collect what they took.',
    target: { x: -40, z: 40 }, payout: 900, enemies: 2,
  },
  {
    id: 4, chapter: 'Chapter 4 — The Drop', title: 'The Drop',
    giver: 'Mara Kessler',
    brief: 'A courier is bringing Syndicate cash through the marina. Intercept the drop and keep the money.',
    target: { x: 80, z: -40 }, payout: 1200, enemies: 3,
  },
  {
    id: 5, chapter: 'Chapter 5 — Syndicate Hit', title: 'Syndicate Hit',
    giver: 'Mara Kessler',
    brief: 'Three Hollow Point enforcers are waiting at the old depot. Take the fight to them.',
    target: { x: -80, z: -80 }, payout: 1500, enemies: 3,
  },
  {
    id: 6, chapter: 'Chapter 6 — Storm Surge', title: 'Storm Surge',
    giver: 'Mara Kessler',
    brief: 'The storm is one day out and the Syndicate is moving its stash. Hit the convoy before the rain does.',
    target: { x: 0, z: 80 }, payout: 1800, enemies: 4,
  },
  {
    id: 7, chapter: 'Chapter 7 — Landfall', title: 'Landfall',
    giver: 'Mara Kessler',
    brief: 'The hurricane makes landfall tonight. Six of the Syndicate’s best guard the boardwalk vault. Take it back.',
    target: { x: 40, z: -80 }, payout: 4000, enemies: 6,
  },
];

export const SHOP_RADIUS = 14;
export const MISSION_ARRIVE_RADIUS = 7;
export const CAR_ENTER_RADIUS = 6;
export const WANTED_DECAY_SECONDS = 20;
