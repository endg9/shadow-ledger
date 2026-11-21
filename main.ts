// Shadow Ledger — entrypoint.
// Copies the playable game and its screenshots into the output folder,
// then writes the entry dossier there. Run with Node 22, no flags:
//   MAKEFUN_OUTPUT_DIR=/output node main.ts
// With the variable unset, the dossier lands in ./out next to this file.

import { chmodSync, cpSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDossier } from './vendor/makefun-game.ts';

// Where this file lives on disk. Every input path hangs off here, so the
// program works no matter which directory it is launched from.
const here = dirname(fileURLToPath(import.meta.url));

// The grader hands us a fresh, pre-made output folder it owns; fall back
// to a local ./out when nothing was handed over.
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? join(here, 'out');

// Empty the destination without ever deleting the destination itself.
// Deleting the folder would need write permission on its parent, which
// the runner may not have — so only the things inside it go away.
// Staged copies keep the read-only modes of the repo they came from, so
// each entry is made writable first, or a second run could not clear it.
const makeWritable = (path: string): void => {
  const info = lstatSync(path);
  chmodSync(path, info.isDirectory() ? 0o755 : 0o644);
  if (info.isDirectory()) {
    for (const entry of readdirSync(path)) makeWritable(join(path, entry));
  }
};
if (existsSync(outDir)) {
  for (const entry of readdirSync(outDir)) {
    const target = join(outDir, entry);
    makeWritable(target);
    rmSync(target, { force: true, recursive: true });
  }
}
mkdirSync(outDir, { recursive: true });

// Stage the game and its screenshots beside the dossier they describe.
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

// The dossier is built from what was just staged, with the bounty gate's
// own limits: at most 163840 bytes of source text, at most 4 screenshots
// of 256 KiB each, at most 993 game entries totalling 48 MiB.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});

writeFileSync(join(outDir, 'dossier.json'), dossier);
