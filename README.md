# SOLMARA

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Mamat9q/solmara-open-city/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Mamat9q/solmara-open-city/reward.svg)](https://make.fun/bounty/gta6-01)

SOLMARA is an open-world crime game in the spirit of GTA 6, built for make.fun's
[Make GTA 6 bounty](https://make.fun/bounty/gta6-01). One sun-soaked city, driving,
a wanted level, missions, shops and saves — with a hurricane coming.

## The game

Solmara Bay has seven days until the hurricane makes landfall. Dario Venn, a
wheelman who owes the Hollow Point Syndicate, has seven chapters to work off the
debt: steal cars, outrun the law, take jobs from Mara Kessler, and get out before
the storm closes the causeway.

- **Open city** — a neon grid of streets, shops, parked cars and pedestrians, all
  loaded offline from static files. No network requests.
- **Driving** — steal any parked car (E), drive with W/A/S/D, chase speeds over
  150 km/h on the open road.
- **Wanted level** — the law escalates from one star to four: cruisers pursue,
  roadblocks deploy, and the top pursuit speed climbs with every star.
- **Missions** — seven chapters across seven hurricane days. Finish a chapter and
  the storm moves one day closer.
- **Shops and saves** — buy ammo and gear at Solmara Arms and the other shops,
  save with Q, continue later from the title screen.

## Play

```sh
node serve.ts
```

Then open http://localhost:8080.

| Key | Action |
| --- | --- |
| W A S D | Walk / drive |
| E | Enter or exit a car |
| M | Start the next mission |
| B | Open a shop (near one) |
| Q | Save |
| Esc | Pause |

## Build

The game is plain static files under `game/` (three.js vendored). The dossier the
judge reads is built with Node's standard library only:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT. See [LICENSE](LICENSE).
