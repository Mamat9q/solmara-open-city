[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Mamat9q/solmara-open-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Mamat9q/solmara-open-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# SOLMARA — Open City

A complete 3D open-world crime game in the browser, built for make.fun's
[gta6-01](https://make.fun/bounty/gta6-01) bounty. No build step, no network
requests: open `game/index.html` from any static server and play.

## The city

Solmara is a sun-soaked island city with seven named districts — Downtown
towers, the Beachfront, the Portside container yard, Marisol, Northgate,
the University and Dockworks. Drive the grid streets, walk the sidewalks,
steal cars, and watch a hurricane close in over seven days.

## Systems

- **Driving** — arcade car physics (accel 22, drag 0.15), three cars in the
  garage (Comet Sedan, Island Taxi, Vortex GT), engine/armor/paint upgrades.
- **On foot** — third-person walking, mouse look, enter/exit any car with E.
- **Wanted level** — 0–5 stars. Patrol cars at 1–2, roadblocks at 3, the
  AIR-1 helicopter and spike strips at 4–5. Lay low to lose them.
- **Missions** — 10 story jobs across 7 chapters: drives, deliveries, taxi
  fares, street races (two routes, three laps), and escapes.
- **Combat** — weapon wheel (1 pistol, 2 SMG, 3 shotgun), ammo and health
  pickups scattered through the city.
- **World life** — 14 traffic cars, 24 pedestrians, day/night cycle, rain
  with wet-street reflections, three procedural synth radio stations.
- **HUD** — cash, wanted stars, health, speed, minimap, mission objective,
  district and hurricane countdown.
- **Save** — progress persists in localStorage (cash, cars, missions, day).

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Drive / walk |
| Mouse | Look (click the game to lock the pointer) |
| Click | Shoot |
| E | Enter / exit car (steal traffic cars) |
| M | Start the next mission |
| G | Garage (buy cars, upgrades, paint) |
| R | Cycle radio station |
| 1 / 2 / 3 | Pistol / SMG / shotgun |
| Tab | Weapon wheel |
| Esc / P | Pause |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

## Tech

three.js r187 vendored under `game/vendor/`, ES modules, static files only.
The dossier program is `main.ts` (Node 22, standard library only):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
