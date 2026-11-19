// SOLMARA dev server: serves the static game/ folder on localhost so the
// game can be played and tested in a desktop browser. Usage:
//
//   node serve.ts            (serves on http://localhost:8080)
//   node serve.ts --port 9000
//
// Node 22, standard library only. It never serves anything outside game/.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(fileURLToPath(new URL('./game', import.meta.url)));

const cliArgs = process.argv.slice(2);
const portFlag = cliArgs.indexOf('--port');
const wantedPort = portFlag === -1 ? 8080 : Number(cliArgs[portFlag + 1]);
const listenPort =
  Number.isInteger(wantedPort) && wantedPort > 0 && wantedPort < 65536
    ? wantedPort
    : 8080;

const typesByExtension = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
};

createServer((req, res) => {
  const parsed = new URL(req.url ?? '/', 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(parsed.pathname);
  } catch {
    res.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const target = resolve(join(gameRoot, normalize(pathname)));
  if (target !== gameRoot && !target.startsWith(gameRoot + sep)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  let byteSize;
  try {
    const info = statSync(target);
    if (!info.isFile()) throw new Error('not a file');
    byteSize = info.size;
  } catch {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type':
      typesByExtension[extname(target).toLowerCase()] ?? 'application/octet-stream',
    'content-length': byteSize,
    'cache-control': 'no-store',
  });
  createReadStream(target).pipe(res);
}).listen(listenPort, '127.0.0.1', () => {
  console.log(`SOLMARA is on http://localhost:${listenPort}`);
});
