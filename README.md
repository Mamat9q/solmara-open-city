# solmara-open-city
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Mamat9q/solmara-open-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Mamat9q/solmara-open-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

SOLMARA is an original open-world crime game in the spirit of GTA 6, built with three.js and plain ES modules — no build step, no network requests at runtime, everything procedural. You play Dario Venn, a driver fresh out of lockup in the sun-soaked coastal city of Solmara. Fixer Mara Kessler has work for you; the Hollow Point Syndicate owns the boardwalk. Take it back — one job at a time — before the hurricane makes landfall in 7 days.

## What is in the game

- **A 7-day hurricane countdown:** the story is 7 chapters, one per day until landfall. Each mission completed (and every 7 minutes of play) moves the storm a day closer: the neon sunset darkens toward a purple-grey storm sky, rain thickens, puddles spread on the slick streets, thunder rolls, and by Day 7 the final mission plays in the hurricane itself, with wind gusts shoving your car sideways.
- **Faster police chases:** cruisers accelerate hard and top out near 187 km/h at 5 stars — faster than any stock street car — and at 3+ stars the PD throws striped roadblocks across the road ahead of you. Only a tuned car, a bought Interceptor, or a clever route shakes them.
- **Neon sunset + wet roads:** glowing neon signs along the avenue, a golden-orange sunset sky, glossy rain-slick roads and puddles that grow as the storm escalates.
- **Shops:** three storefronts in the city — Solmara Arms (ammo), Rico's Motors (engine tuning, armor plating, and cars of your own: a Marina GT or an Interceptor, delivered on the spot), Doc's Clinic (med kits, Kevlar vest). Walk up and press B; everything is bought with mission cash.
- **Save / load:** autosave after each mission and each purchase, manual save (Q), and Continue from the start screen, via localStorage — cash, mission progress, hurricane day, shop purchases and owned cars all survive a reload.
- **A living city:** a street grid with sidewalks, procedural buildings, palm trees, streetlights, a beach and marina district, day/night sky and fog.
- **On foot and behind the wheel:** WASD third-person movement, sprint, jump, mouse-look; steal parked and traffic cars (E), drive with W/S steering, braking and handbrake, collisions with buildings and cars.
- **Traffic and pedestrians:** AI cars follow the road grid and turn at intersections; pedestrians stroll the sidewalks and flee when scared — and hurry for cover when the rain gets heavy.
- **Wanted system:** 0–5 stars. Stealing, hitting pedestrians and shooting raise your heat; police cars chase and ram, foot cops pursue at 3+ stars; stars decay when you evade. Get busted or wasted and you respawn at the boardwalk with a fine.
- **Story missions:** 7 missions for Mara Kessler across the 7 days — a marina pickup, a dock shootout, a taxi run for a nervous witness, stealing the syndicate's gold Cortez Coupe, a boardwalk showdown, holding Mara's garage in the storm surge, and the final landfall battle — each with dialogue, a waypoint, and a cash reward. Plus repeatable side jobs: taxi fares (T) and car delivery (G).
- **Combat:** fists and a pistol (click to shoot, R reload), enemies who shoot back, health packs, muzzle flash and particles.
- **HUD and minimap:** health, cash, wanted stars, ammo, speed, clock, hurricane countdown, objective banner, message feed, and a live top-down minimap with player arrow, waypoint, police dots, shops and roadblocks.
- **Sound:** fully synthesized WebAudio effects (engine hum, siren, gunshots, pickup chime, thunder, UI clicks) and a synth music loop — no audio files.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Keyboard + mouse required. The game runs fully offline — no network requests, no accounts, no downloads.

## Controls

WASD move · Mouse look · Shift sprint · Space jump / handbrake · E enter / steal car · Click shoot · R reload · F fists / pistol · M start mission · T taxi fare · G car delivery · B shops · Q save · Esc pause

## Tech

- three.js (vendored under `game/vendor/three/`), plain ES modules, static files only
- `game/src/main.js` boot + loop, `world.js` city, `player.js` on-foot, `vehicles.js` cars, `traffic.js` AI, `police.js` wanted, `missions.js` story, `combat.js` weapons, `hud.js` HUD + minimap, `audio.js` synth sound, `save.js` saves, `input.js` input, `effects.js` particles, `hurricane.js` 7-day storm, `shop.js` shops
- `main.ts` (Node 22 stdlib only) copies `game/` + `screenshots/` to the output dir and writes `dossier.json`
