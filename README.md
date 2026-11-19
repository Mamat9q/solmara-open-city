# SOLMARA

An original 3D open-world crime game, built for the "Make GTA 6" bounty: a sun-soaked
neon city on the edge of a hurricane. Drive, steal cars, outrun the police, run
missions and shape the story across seven days until landfall.

## Play

Open `game/index.html` in a desktop browser (or run `node serve.ts` and open
http://localhost:8080). No network, no install, no build step.

- **W A S D** — walk / drive
- **E** — enter / exit a car
- **M** — start the next mission
- **B** — open the shop near Solmara Arms
- **Q** — save the game
- **Esc** — pause
- **Mouse** — look around (click to lock the pointer)

## The game

- A living city: traffic, pedestrians, shops, a wanted system and police chases
- Seven story chapters, one per day, as Hurricane Solmara closes in
- Combat, a HUD with a minimap, saves, and a synth soundtrack
- Runs offline from static files; three.js is vendored under `game/vendor/`

## Build

`node main.ts` copies `game/` and `screenshots/` to the output directory and writes
`dossier.json` (set `MAKEFUN_OUTPUT_DIR` to choose where).

## License

MIT — see `LICENSE`.
