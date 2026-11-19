[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Mamat9q/solmara-open-city/rank.svg)](https://make.fun/c/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Mamat9q/solmara-open-city/reward.svg)](https://make.fun/c/gta6-01)

# SOLMARA

An original open-world crime game that runs entirely in the browser: no build
step, no network requests, just static files under `game/`. You are Dario Venn,
a driver fresh out of lockup in the sun-soaked coastal city of Solmara. Fixer
Mara Kessler has work for you, the Hollow Point Syndicate owns the boardwalk,
and a hurricane makes landfall in seven days. Take the city back — one job at
a time — before the storm hits.

## Play

Serve `game/` with any static server, for example `node serve.ts`, then open
http://localhost:8080 in desktop Chrome.

| Key | Action |
| --- | ------ |
| W A S D | Walk / drive |
| Mouse | Look around, click to shoot |
| Shift | Sprint |
| E | Enter / exit a car |
| R | Reload |
| M | Start the next mission |
| B | Open the nearest shop |
| Q | Save the game |
| Esc | Pause |

## What is in the game

- A full coastal city to explore on foot and by car: streets, boardwalk,
  beach, neon signs, traffic and pedestrians.
- Cars to steal and drive, including the Marina GT and the Interceptor.
- A wanted level with police cruisers that chase you and roadblocks at
  three stars and above.
- A seven-chapter story with a seven-day hurricane countdown: the sky
  darkens toward storm purple, rain thickens and puddles spread as the
  days run out.
- Combat with reloading, health, med kits and Kevlar.
- Three shops: Solmara Arms, Rico's Motors and Doc's Clinic — ammo, armour,
  tuning and cars for sale.
- Saving and loading in the browser, with autosave after every mission
  and every purchase.
- A HUD with health, cash, wanted stars, the storm countdown and a live
  minimap showing shops, roadblocks and the mission target.

## Layout

- `game/index.html` — the page, HUD and menus.
- `game/src/` — the game's own code, one job per file: city, cars, people,
  police, missions, shops, combat, saving, sound and the HUD.
- `game/vendor/three/three.module.min.js` — three.js, vendored.
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json`.
- `screenshots/` — four renders of the game itself.

## License

MIT — see `LICENSE`.
