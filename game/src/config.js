// SOLMARA tuning constants. The car numbers are load-bearing for the headless
// playtest: at ~1 fps on SwiftShader each frame simulates dt = 0.1 s, so ten
// real seconds of holding W is one simulated second; accel 22 with drag 0.15
// reaches ~20 u/s in that second. Do not lower accel or raise drag.
export const WORLD = {
  size: 420, // city spans -210..210 on x and z
  block: 42, // street spacing
  roadWidth: 12,
};

export const CAR = {
  accel: 22, // u/s^2
  drag: 0.15, // exponential drag coefficient
  reverseAccel: 12,
  turnRate: 1.9, // rad/s at full lock
  maxSpeed: 58,
  enterRadius: 4.5,
};

export const PLAYER = {
  walkSpeed: 6.5,
  runSpeed: 9,
};

export const POLICE = {
  baseCap: 36, // u/s at wanted 0
  perStar: 3.2, // extra cap per wanted star; 4 stars -> 48.8 u/s
  accel: 30, // u/s^2
  countByWanted: [0, 2, 3, 4, 6],
  roadblockAt: 3, // wanted level that deploys roadblocks
  sirenRange: 90,
};

export const SHOP_POS = { x: -58, z: -46 }; // Solmara Arms
export const SHOP_RADIUS = 9;
export const START_CASH = 500;
export const SAVE_KEY = 'solmara-save-v2';
export const MISSION_RADIUS = 7;
export const DT_MAX = 0.1; // seconds of simulation per rendered frame, at most
