// Shadow Ledger — tiny dev server.
//
// Run with: node serve.ts
// Then open http://localhost:8080 to play the game.
//
// Serves only the files under game/ (index.html at /), with no
// dependencies beyond Node's own http module. Anything outside game/
// is refused, so a crafted URL can never read another file on disk.
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 8080;
const HOST = '127.0.0.1';

// The directory served: game/ beside this file.
const gameDir = resolve(fileURLToPath(new URL('./game', import.meta.url)));

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
};

function safePath(urlPath: string): string | null {
  const decoded = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  const rel = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const resolved = resolve(gameDir, normalize(rel));
  // Refuse anything that escapes game/ (e.g. /../main.ts).
  if (resolved !== gameDir && !resolved.startsWith(`${gameDir}/`)) return null;
  return resolved;
}

const server = createServer((req, res) => {
  const file = safePath(req.url ?? '/');
  if (file === null || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404 — not part of the game\n');
    return;
  }
  res.writeHead(200, {
    'content-type': MIME_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
  });
  createReadStream(file).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`Shadow Ledger: playing at http://${HOST}:${PORT}/`);
});
