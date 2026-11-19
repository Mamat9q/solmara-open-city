// SOLMARA HUD: cash, health, wanted stars, ammo, the storm countdown and
// the mission line, plus a live minimap — shops green, roadblocks orange,
// the mission target yellow, police flashing blue.

import { CITY, HURRICANE, MISSIONS, SHOPS } from './config.js';

export function drawMinimap(game) {
  const canvas = document.getElementById('minimap');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const scale = size / (CITY.halfSize * 2 + 20);
  const toMap = (x, z) => [(x + CITY.halfSize + 10) * scale, (z + CITY.halfSize + 10) * scale];
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#101018';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#3d3d4a';
  ctx.lineWidth = 5;
  for (const line of CITY.roadLines) {
    const [x1, y1] = toMap(line, -CITY.halfSize);
    const [x2, y2] = toMap(line, CITY.halfSize);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const [hx1, hy1] = toMap(-CITY.halfSize, line);
    const [hx2, hy2] = toMap(CITY.halfSize, line);
    ctx.beginPath();
    ctx.moveTo(hx1, hy1);
    ctx.lineTo(hx2, hy2);
    ctx.stroke();
  }
  ctx.fillStyle = '#2f6fb5';
  const [, oceanY] = toMap(0, CITY.beachZ + 6);
  ctx.fillRect(0, oceanY, size, size - oceanY);
  ctx.fillStyle = '#2ecc71';
  for (const shop of SHOPS) {
    const [sx, sy] = toMap(shop.x, shop.z);
    ctx.fillRect(sx - 3, sy - 3, 6, 6);
  }
  ctx.fillStyle = '#ff7a1a';
  for (const block of game.world.roadblocks) {
    if (!block.active) continue;
    const [bx, by] = toMap(block.x, block.z);
    ctx.fillRect(bx - 3, by - 3, 6, 6);
  }
  if (game.missions.active) {
    const [tx, ty] = toMap(game.missions.active.target.x, game.missions.active.target.z);
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath();
    ctx.moveTo(tx, ty - 6);
    ctx.lineTo(tx + 5, ty);
    ctx.lineTo(tx, ty + 6);
    ctx.lineTo(tx - 5, ty);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#e8c93a';
  for (const car of game.vehicles.cars) {
    const [cx, cy] = toMap(car.x, car.z);
    ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
  }
  const flashing = Math.floor(game.elapsedTime * 4) % 2 === 0;
  ctx.fillStyle = flashing ? '#3a6cff' : '#ff3a3a';
  for (const cop of game.police.copCars) {
    if (!cop.active) continue;
    const [px, py] = toMap(cop.x, cop.z);
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const [px, py] = toMap(game.player.pos.x, game.player.pos.z);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(px, py - 6);
  ctx.lineTo(px + 5, py + 5);
  ctx.lineTo(px - 5, py + 5);
  ctx.closePath();
  ctx.fill();
}

export function refreshHud(game) {
  const cash = document.getElementById('hud-cash');
  if (cash) cash.textContent = `$${game.cash}`;
  const healthFill = document.getElementById('hud-health-fill');
  if (healthFill) {
    healthFill.style.width = `${Math.max(0, (game.player.health / game.player.maxHealth) * 100)}%`;
  }
  const healthText = document.getElementById('hud-health-text');
  if (healthText) healthText.textContent = `${Math.ceil(game.player.health)} / ${game.player.maxHealth}`;
  const stars = document.getElementById('hud-stars');
  if (stars) {
    stars.textContent = '★'.repeat(game.wanted) + '☆'.repeat(4 - game.wanted);
    stars.classList.toggle('hot', game.wanted > 0);
  }
  const ammo = document.getElementById('hud-ammo');
  if (ammo) ammo.textContent = `${game.player.ammo} / ${game.player.reserve}`;
  const storm = document.getElementById('hud-storm');
  if (storm) {
    const daysLeft = HURRICANE.totalDays - game.hurricane.day + 1;
    storm.textContent = `HURRICANE LANDFALL IN ${daysLeft} DAY${daysLeft === 1 ? '' : 'S'} — DAY ${game.hurricane.day}/7`;
  }
  const missionLine = document.getElementById('hud-mission');
  if (missionLine) {
    missionLine.textContent = game.missions.objectiveText(game.missionIndex);
  }
  const missionCount = document.getElementById('hud-mission-count');
  if (missionCount) {
    missionCount.textContent = `MISSION ${Math.min(game.missionIndex + 1, 7)}/7`;
  }
  const carLine = document.getElementById('hud-car');
  if (carLine) {
    carLine.textContent = game.currentCar
      ? `${game.currentCar.def.name} — ${Math.round(Math.abs(game.currentCar.speed) * 3.6)} km/h`
      : 'On foot — press E near a car to drive';
  }
}
