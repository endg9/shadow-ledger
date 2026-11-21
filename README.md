[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/endg9/shadow-ledger/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/endg9/shadow-ledger/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# Shadow Ledger — a stealth game

A complete top-down stealth game: Wren slips through a guarded archive at
night, stealing relics across 5 floors. Patrolling guards with vision cones,
sweeping security cameras (floors 4–5), bushes to hide in, shadow pools that
halve detection, a detection meter, running (loud) vs sneaking (quiet),
throwable noisemakers that pull patrols away, and an exit that stays locked
until every relic on the floor is taken. Clear a floor without ever raising
the alarm for the Ghost bonus; steal THE LEDGER on floor 5 to win. Static
files, all sound synthesized live, no network.

Built for the [make.fun best-stealth-game-20261121-1759 bounty](https://make.fun/bounty/best-stealth-game-20261121-1759).

## How to play

Steal every relic, then slip out the exit. The detection meter fills while
any guard or camera has eyes on you — faster up close, faster while running,
slower while sneaking, halved in a shadow pool. At 50 a guard comes to look;
at 100 the alarm sounds and every guard hunts you. Bushes hide you unless a
guard is right on top of you. A noisemaker (E) throws a ping that pulls
nearby patrols away from your route.

- **WASD / Arrows:** move. **Shift:** run (loud — nearby guards hear it).
  **C:** sneak (quiet, slow). **E:** throw a noisemaker.
- **P:** pause. **M:** mute. **R:** retry the floor. **Enter:** start / next.
- **Relic:** +500. **THE LEDGER:** +1000. **Ghost floor:** +1000. Win
  bonus for fast, quiet nights.

Run it with any static server, e.g. `node serve.ts`, then open
http://localhost:8080 — or open `game/index.html` directly.

## Verification (all measured in this repo)

- `node --check` on all 8 game modules + the verify script: pass.
- `node verify-stealth.mjs` — **135/135 pass**: level geometry (every
  patrol leg, relic, bush, shadow and camera clear of walls), line of
  sight, vision cones (front seen / behind blind / beyond range blind /
  wall blocks / bush hides at 160px but not at 40px), detection (rises
  while seen / decays while hidden / sneak slower / run faster / shadow
  halves), patrol movement and waypoint pauses, suspicion at 50, alarm at
  100 with every guard chasing, chase give-up after 2.5 s unseen, catch on
  contact (never through a wall), noisemaker pull, relic pickup (+500,
  never through a wall), exit locked until all relics are taken (never
  through a wall), next-floor score carry and Ghost bonus, run+sneak
  exclusivity, and a headless autopilot that plays the whole campaign.
- Autopilot full campaign: **all 5 floors clear, score 16,255, 149.7 s of
  game time, 0 alarms** — a Ghost run, using grid A* with patrol-aware
  routing and bush shelter waits.
- 4 real screenshots via headless Chromium + local `serve.ts`
  (`?shot=start|play|stealth|win&seed=7`): title, floor-3 play with cones,
  floor-4 stealth (Wren hidden in a bush, HUD HIDDEN), win screen
  ("THE LEDGER IS YOURS — GHOST, score 16255, Time 2:29, Alarms 0").
  Each under 256 KiB.
- `MAKEFUN_OUTPUT_DIR=out node main.ts` — builds the dossier (exit 0).

## Files

- `game/index.html`, `game/src/*.js` — the game (config, random, world,
  render, input, audio, shots, main).
- `main.ts`, `serve.ts`, `vendor/makefun-game.ts`, `shots.json`,
  `LICENSE` — kit starter plumbing.
- `verify-stealth.mjs` — headless Node verification + autopilot (not
  shipped in `game/`).
- `screenshots/` — real renders of the game's own code.
