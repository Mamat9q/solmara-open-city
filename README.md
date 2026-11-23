[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Mamat9q/solmara-open-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Mamat9q/solmara-open-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# SOLMARA — Open City

SOLMARA is an original 3D open-world crime game that runs offline in a desktop
browser from static files. No network requests, no build step: open `game/index.html`
through any static server and play. Built for make.fun competition **gta6-01**
("Make GTA 6", $1,666, top 100 paid).

You are Mara Voss, a wheelwoman back in the sun-soaked coastal city of Solmara
with seven days before Hurricane Ilsa makes landfall. Work the streets, outrun
the Solmara Police Department, and finish the ten-story missions across seven
chapters before the storm hits.

## What is in the game

- **Open city, on foot and by car** — 7 named districts (Downtown towers,
  Beachfront, Port, Marina, Old Town, Suburbs, Industrial), a drivable street
  grid, beach and harbour, day/night cycle and rain with wet-street reflections.
- **Driving** — arcade car physics (top speed ~155 km/h), 3 ownable cars in the
  garage with engine, armour and paint upgrades; steal any traffic car.
- **Traffic and pedestrians** — 14 traffic cars on road loops with headlights at
  night, 24 pedestrians who flee from speeding cars and gunfire.
- **Wanted system and police** — 0–5 stars. Patrol cars at 1–2 stars, roadblocks
  at 3, the AIR-1 helicopter and spike strips at 4–5, plus a "Lose the cops"
  evade state when you break line of sight.
- **Missions and story** — 10 story missions across 7 chapters on a 7-day
  hurricane countdown, with waypoint beacons, objectives and payouts.
- **Activities** — taxi fares, 3 street-race routes with checkpoints, delivery
  runs, shops for weapons and health, ammo and health pickups.
- **Combat** — weapon wheel (pistol / SMG / shotgun), rival gang shootouts,
  muzzle flash and hit particles.
- **HUD and minimap** — cash, respect rank, wanted stars, health, ammo, speed,
  radio station, mission objective, day/clock and hurricane countdown, plus a
  live minimap with police, traffic and mission blips.
- **Audio** — 3 synth radio stations, engine hum, sirens, gunshots and pickup
  sounds, all synthesised live with WebAudio. No audio files.
- **Save / load** — progress, cash, cars, upgrades and mission state persist in
  the browser (localStorage), with Continue on the start screen.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Drive / walk |
| Shift | Run / handbrake |
| Space | Jump (on foot) / brake |
| E | Enter / exit car (steal nearest car) |
| Mouse | Look (click the game to lock the pointer) |
| Click | Shoot |
| 1 / 2 / 3 | Pistol / SMG / Shotgun |
| R | Cycle radio station |
| M | Toggle mission list |
| P / Esc | Pause |
| F | Start nearest activity (taxi / race / delivery) |
| H | Horn |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Or serve `game/` with any static file server and open `game/index.html`.

## Screenshots

`?shot=start`, `?shot=drive`, `?shot=chase` and `?shot=mission` (with
`&seed=1`) stage the four screenshot scenes deterministically.

## Tech

- three.js r187, vendored under `game/vendor/` (ES modules, no network)
- Node 22 program `main.ts` hands the game in with the kit's
  `vendor/makefun-game.ts` dossier builder
- MIT licensed — see `LICENSE`

## Entry

Repository: https://github.com/Mamat9q/solmara-open-city — competition
[gta6-01](https://make.fun/bounty/gta6-01). Entries close 24 Nov 2026 15:00 UTC.
