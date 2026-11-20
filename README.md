# SOLMARA — Open-City Crime

An original 3D open-world crime game that runs offline in a desktop browser from
static files. Built for the make.fun competition **gta6-01 — "Make GTA 6"**.
Everything is original: the city of Solmara, its characters, vehicles, story,
art and music. No Rockstar names, maps or assets.

## The game

Hurricane Mara makes landfall in 7 days. You are a driver for hire in Solmara —
steal cars, outrun the police, and finish **10 story missions across 7 chapters**
before the storm hits. Then keep playing: taxi fares, street races and delivery
runs pay for garage upgrades and better weapons.

- **City** — 7 named districts (Downtown, Old Town, Eastside, North Hills, Port
  Solmara, Marina Bay, Sunset Beach), a beachfront, a working port, 190+
  buildings, traffic (14 cars) and pedestrians (24) with headlights at night.
- **Driving** — arcade handling (accel 22, drag 0.15), carjacking (E), top speed
  up to 155+ km/h in the Harbor GT.
- **Wanted system** — 1–2 stars: patrol cars; 3 stars: roadblocks; 4–5 stars:
  the AIR-1 helicopter and spike strips. Lay low to cool the heat ("EVADING").
- **Missions** — 10 story missions with waypoint beacons, objectives and
  payouts, plus taxi fares (T), 3 race routes (R) and timed deliveries (Y).
- **Garage (G)** — own 3 cars, buy engine/armor upgrades and 5 paints with
  mission cash. **Weapon shop (B)** — pistol, SMG, shotgun, ammo, health kits.
- **Combat** — weapon wheel on keys 1/2/3, hitscan shooting, ammo + health
  pickups around the city.
- **Radio (C)** — 3 synth stations (NEON FM, HARBOR JAZZ, STORM ROCK), all
  synthesized live with WebAudio — no audio files.
- **Day/night + rain** — a full day cycle, sunset, and rain that wets the
  streets (glossy sheen, darker sky, heavier storm as the 7 days pass).
- **HUD + minimap** — cash, respect rank, wanted stars, weapon/ammo, health,
  radio, speed, mission objective with waypoint distance, and a live minimap
  showing roads, traffic, police and the waypoint.
- **Save (K)** — progress autosaves after every mission and loads on start.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Drive / walk |
| Mouse | Look (drag, or pointer lock on click) |
| E | Enter car / steal a nearby car / exit car |
| Click | Shoot |
| 1 / 2 / 3 | Pistol / SMG / shotgun |
| M | Start next story mission |
| T / R / Y | Taxi fare / street race / delivery run |
| G | Garage — cars, upgrades, paint |
| B | Weapon shop |
| C | Switch radio station |
| K | Save game |
| P / Esc | Pause |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests, no install. three.js r187 is vendored under
`game/vendor/`. The game is ES modules under `game/src/`, one file per system:
`world`, `player`, `vehicles`, `traffic`, `police`, `missions`, `combat`, `hud`,
`audio`, `save`, `input`, `effects`, `main`, `shop`, `hurricane`, `shots`.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# prints "SOLMARA handed in" and writes out/dossier.json
```

## License

MIT — see `LICENSE`.
