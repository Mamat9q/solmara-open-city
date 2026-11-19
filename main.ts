// SOLMARA — hand-in program for the gta6-01 competition (Node 22, stdlib only).
//
// It gathers the playable game and its screenshots from this repository and
// lays them out in the output directory, then asks the vendored make.fun
// library to write the dossier the judge reads. Run it locally with:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// and it prints SOLMARA handed in when the dossier is written. The grader
// runs the same file with /output as the destination instead.

import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const destination = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(fromDir, toDir) {
  mkdirSync(toDir, { recursive: true });
  cpSync(fromDir, toDir, { recursive: true });
}

copyTree(join(repoRoot, 'game'), join(destination, 'game'));
if (existsSync(join(repoRoot, 'screenshots'))) {
  copyTree(join(repoRoot, 'screenshots'), join(destination, 'screenshots'));
} else {
  mkdirSync(join(destination, 'screenshots'), { recursive: true });
}

const dossierText = buildDossier(destination, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(destination, 'dossier.json'), dossierText);
console.log('SOLMARA handed in');
