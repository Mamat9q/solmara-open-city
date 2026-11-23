// SOLMARA — shared tuning, world data and content tables.
// Every number here is original to this build; car tuning (accel 22, drag 0.15)
// was measured headless on SwiftShader and must not be lowered.
export const CFG = {
  cityHalf: 300,
  roadSpacing: 60,
  roadWidth: 14,
  car: { accel: 22, drag: 0.15, brake: 34, maxSpeed: 43, steerMax: 0.55, grip: 6.5 },
  player: { walkSpeed: 5.2, runSpeed: 8.5 },
  trafficCount: 14,
  pedCount: 24,
  wantedMax: 5,
  dayLengthSec: 240,
  startCash: 1200,
};

export const DISTRICTS = [
  { name: 'Downtown', x: 0, z: 0, r: 130, color: 0x8f9bb3, tall: true },
  { name: 'Beachfront', x: 0, z: 265, r: 95, color: 0xe8c98a, tall: false },
  { name: 'Portside', x: 265, z: 0, r: 95, color: 0x9a8f7a, tall: false },
  { name: 'Marisol', x: -265, z: 0, r: 95, color: 0xd98a7a, tall: false },
  { name: 'Northgate', x: 0, z: -265, r: 95, color: 0x7ab87a, tall: false },
  { name: 'University', x: -210, z: -210, r: 80, color: 0x7a9ad9, tall: false },
  { name: 'Dockworks', x: 210, z: 210, r: 80, color: 0xb3b3b3, tall: false },
];

export const CARS = [
  { id: 'comet', name: 'Comet Sedan', price: 0, top: 38, accel: 22, color: 0x2e6fd9, desc: 'Your starter sedan. Honest, quick enough, yours.' },
  { id: 'taxi', name: 'Island Taxi', price: 3200, top: 34, accel: 20, color: 0xf2c200, desc: 'Pays for itself: taxi fares pay double while you drive it.' },
  { id: 'vortex', name: 'Vortex GT', price: 8500, top: 46, accel: 27, color: 0xd92e4a, desc: 'The fastest thing on Solmara. Wins races, outruns helicopters.' },
];

export const WEAPONS = [
  { id: 'pistol', name: 'Pistol', key: '1', damage: 34, rate: 0.28, spread: 0.02, mag: 12, auto: false, range: 60 },
  { id: 'smg', name: 'SMG', key: '2', damage: 16, rate: 0.09, spread: 0.06, mag: 30, auto: true, range: 45 },
  { id: 'shotgun', name: 'Shotgun', key: '3', damage: 22, rate: 0.85, spread: 0.14, mag: 6, auto: false, range: 28, pellets: 6 },
];

export const STATIONS = [
  { id: 'neon', name: 'NEON 88.1', desc: 'Synthwave', bpm: 96, root: 55 },
  { id: 'tide', name: 'TIDE 104.3', desc: 'Chillwave', bpm: 76, root: 65.41 },
  { id: 'storm', name: 'STORM 99.9', desc: 'Dark electro', bpm: 122, root: 49 },
];

// 10 story missions across 7 chapters; the hurricane hits on day 7.
export const MISSIONS = [
  { id: 1, chapter: 1, name: 'First Light', type: 'drive', target: [120, 240], payout: 300, brief: 'Drive to the Beachfront pier. Solmara is yours now.' },
  { id: 2, chapter: 1, name: 'Taxi Nights', type: 'taxi', target: [0, 0], payout: 450, brief: 'Complete 2 taxi fares. Pick up the glowing passengers.' },
  { id: 3, chapter: 2, name: 'The Drop', type: 'deliver', target: [240, 60], payout: 600, brief: 'Deliver the package to Portside. No questions, no stops.' },
  { id: 4, chapter: 3, name: 'Street King', type: 'race', target: [0, 0], payout: 900, brief: 'Win the Downtown circuit. Three laps, no mercy.' },
  { id: 5, chapter: 3, name: 'Rain Run', type: 'deliver', target: [-240, 120], payout: 750, brief: 'Deliver to Marisol in the rain. Wet roads, same deadline.' },
  { id: 6, chapter: 4, name: 'Heat', type: 'escape', target: [0, -240], payout: 1200, brief: 'Lose a 3-star wanted level, then reach Northgate.' },
  { id: 7, chapter: 5, name: 'Midnight Cargo', type: 'deliver', target: [180, 240], payout: 1500, brief: 'Night delivery to Dockworks. The port never sleeps.' },
  { id: 8, chapter: 5, name: 'Grand Prix', type: 'race', target: [0, 0], payout: 1800, brief: 'Win the Grand Prix loop around the whole city.' },
  { id: 9, chapter: 6, name: 'Storm Surge', type: 'drive', target: [-120, -240], payout: 2200, brief: 'Reach the University shelter before the hurricane lands.' },
  { id: 10, chapter: 7, name: 'Eye of the Storm', type: 'escape', target: [0, 240], payout: 5000, brief: 'Final job: deliver to Beachfront and escape a 5-star wanted level.' },
];

export const RACE_A = [[-120, -120], [120, -120], [120, 120], [-120, 120]];
export const RACE_B = [[-240, -240], [240, -240], [240, 240], [-240, 240], [0, -240]];

export const PAINTS = [
  { name: 'Solmara Blue', color: 0x2e6fd9, price: 0 },
  { name: 'Sunset Red', color: 0xd92e4a, price: 400 },
  { name: 'Palm Green', color: 0x2ed97a, price: 400 },
  { name: 'Midnight Black', color: 0x15151a, price: 600 },
  { name: 'Gold Rush', color: 0xf2c200, price: 900 },
];

export const CHAPTERS = [
  'Arrival',
  'The Drop',
  'Street King',
  'Heat',
  'Midnight Cargo',
  'Storm Surge',
  'Eye of the Storm',
];
