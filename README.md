# SOLMARA

An open-world crime game set in Solmara, a neon coastal city counting down
seven days to a category-five hurricane. Drive the avenues, outrun the
police, run jobs for the crew, and stock up before the storm makes landfall.

## Play

- Open `game/index.html` in a desktop browser (or run `node serve.ts` and
  visit http://localhost:8080). No build step, no network requests.
- **W A S D / arrows** — drive or walk. **E** — get in / out of a car.
  **F / click** — shoot on foot. **B** — shop. **Q** — save. **Esc** — pause.
- Seven chapters, one per day: reach the green waypoint beacon to finish a
  job and earn cash. Wanted stars bring police cruisers; lose them by laying
  low. Buy ammo, armor, repairs and nitro at the shop.

## Shots

`screenshots/` holds four renders taken in the browser at 1280x720:
`1-start.jpg` (title over the city at sunset), `2-drive.jpg` (avenue run),
`3-chase.jpg` (four-star pursuit), `4-mission.jpg` (waypoint beacon).
The scenes are staged by `game/src/shots.js` from `?shot=` queries in
`shots.json`, playing the real rules forward from a fixed seed.

## Build

`node main.ts` (with `MAKEFUN_OUTPUT_DIR` set) copies `game/` and
`screenshots/` to the output directory and writes `dossier.json`.

Three.js r187 is vendored under `game/vendor/`; the make.fun game library
lives in `vendor/makefun-game.ts`. MIT licensed.
