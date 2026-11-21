// Shadow Ledger — dossier entrypoint.
//
// Run with: MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Copies the playable game and its screenshots into the output directory,
// then asks the make.fun kit library to build the dossier (dossier.json)
// from exactly what was copied, so the dossier always matches the entry.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the directory holding this file.
const repoRoot = dirname(fileURLToPath(import.meta.url));

// Where the entry goes: the environment's choice, or ./out beside the repo.
const outputDir = resolve(repoRoot, process.env.MAKEFUN_OUTPUT_DIR ?? 'out');

// The caps the stealth bounty scores against: text budget, at most four
// screenshots of at most 256 KiB each, and the game-tree limits.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
} as const;

function copyTree(source: string, target: string): void {
  if (!existsSync(source)) {
    throw new Error(`Shadow Ledger: missing ${source} — cannot build an entry without it`);
  }
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
}

// Start from a clean output directory so a stale game/ or screenshots/
// from an earlier run can never leak into this dossier.
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

copyTree(join(repoRoot, 'game'), join(outputDir, 'game'));
copyTree(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));

const dossier = buildDossier(outputDir, DOSSIER_CAPS);
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`Shadow Ledger: dossier written to ${join(outputDir, 'dossier.json')} (${dossier.length} bytes)`);
