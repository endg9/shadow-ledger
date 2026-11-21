# Shadow Ledger — BUILD-LOG

## 2026-11-22 ~01:07–02:00 WIB — fresh in-window build (wallet 7HmGLtQLsEyxXr2SCdEmCreb9JJcwyisyuErt8wUftxV)

**What it is:** top-down stealth for make.fun `best-stealth-game-20261121-1759`
($50, top 10 share, closes 22 Nov 12:59 WIB). Wren slips through a guarded
archive at night: 5 floors, patrolling guards with vision cones, sweeping
security cameras (floors 4–5), bushes to hide in, shadow pools that halve
detection, a detection meter, running (loud) vs sneaking (quiet), throwable
noisemakers that pull patrols away, relics to steal, and an exit that stays
locked until every relic on the floor is taken. Clear a floor without ever
raising the alarm for the Ghost bonus; steal THE LEDGER on floor 5 to win.
Static files under `game/`, all sound synthesized live, no network.

**Freshness:** this session started inside the competition window (window
opened 22 Nov 00:59 WIB). Every game file was written fresh in this session
from the BUILD-LOG design spec only — the previous build's game code, tests,
scripts, README and screenshots were never read. Only kit plumbing was
copied by `cp` without reading (main.ts, serve.ts, vendor/makefun-game.ts,
shots.json). Root commit is the drand anchor only (`.makefun/freshness.json`,
quicknet round 34160325), then LICENSE, then this build.

**Files:** `game/index.html` + `game/src/{config,random,world,render,input,
audio,shots,main}.js`, `main.ts`, `serve.ts`, `shots.json`, `vendor/
makefun-game.ts`, `README.md`, `LICENSE`, `kit.json`, `verify-stealth.mjs`
(headless Node verification + autopilot, not shipped in `game/`),
`screenshots/` (real renders via the bundled headless Chromium).

**Verification (measured):**
- `node --check` on all 8 game modules + the verify script: pass.
- `node verify-stealth.mjs`: **135/135 checks pass** — geometry/LOS,
  vision cones (front seen / behind blind / beyond range blind / wall
  blocks / bush hides at 160px but not at 40px), detection rises while seen
  / decays while hidden / sneaking fills it slower than walking / running
  fills it faster / shadow pool halves the rate, guard patrol movement and
  waypoint pauses, suspicion at 50, alarm at 100 with every guard chasing,
  chase gives up after 2.5 s unseen, catch on contact (never through a
  wall), noisemaker pull, relic pickup +500 (never through a wall), exit
  locked with relics left and open when all are taken (never through a
  wall), next-floor score carry + Ghost bonus, run+sneak exclusivity, and
  the screenshot autopilot finishing every floor ghost. Full campaign:
  **autopilot wins all 5 floors, score 16,255, 149.7 s of game time,
  0 alarms.**
- Headless Chromium (bundled headless_shell) + local `serve.ts`: all 4 shot
  scenes render with no console errors; screenshots are real renders of the
  game's own code at `?shot=start|play|stealth|win&seed=7` — visually
  inspected: title screen, floor-3 play with cones (HUD CLEAR), floor-4
  stealth (Wren in a bush, guard cone sweeping past, HUD HIDDEN), win
  screen ("THE LEDGER IS YOURS — GHOST, score 16255, Time 2:29, Alarms 0").
- `MAKEFUN_OUTPUT_DIR=out node main.ts`: dossier builds, exit 0
  (`dossier.json` 268,284 B + `game/` + `screenshots/`). `out/` is NOT
  committed (see `.gitignore`).
- `makefun check` (CSV kit CLI as structural proxy — no stealth kit exists
  locally): **5 passed, 0 failed, 15 skipped, 5 checked at submission**
  (snapshot 38 files / 784,491 bytes within caps; LICENSE MIT
  OSI-approved; entrypoint main.ts node22; entry_size within the 1 MiB
  repository cap; competition_open passes on the proxy kit's window).
  The 5 at-submission checks (repo public / owner / created-after-open /
  commit pushed / duplicate snapshot) can only pass from the public GitHub
  repo at submit time.

**Bugs found and fixed during verification (all caught by the tests, not by hand):**
- `moveToward` wedged actors on wall corners: the direct step slides along
  a padded edge but never closes the distance, and a diagonal fan step
  creeps into the pad and oscillates. Fixed with axis-aligned slides in a
  fixed order per dominant axis (a sign-dependent "toward the target"
  choice flip-flops once aligned and ping-pongs in place) plus the angled
  fan as fallback — the corner test now reaches its target exactly (d 0.0).
- Autopilot waited in the open on patrol lines while a guard walked into
  it (15 alarms on floor 1). Fixed with shelter mode: when the road ahead
  is watched the pilot ducks into the nearest bush on the way to the target
  and waits there, plus a patrol-line cost penalty in A* so routes cross
  patrols perpendicularly instead of walking along them.
- Floor 4 autopilot thrashed (shelter → 30px progress → shelter) because
  the nearest bush was behind the player. Fixed by choosing the bush that
  minimises player→bush→target distance.
- Test setups: the seen-setup player stood inside a shadow pool (halved
  rate), the "open" shadow comparison sat behind a shelf (blocked LOS),
  and the parked guard had speed 0 so it could never walk to investigate
  (suspicion/alarm tests went quiet). Fixed with a zero-length patrol at
  real speed and a clear-aisle player position.

**Screenshots**
- `screenshots/1-start.jpg` (44,185 B), `2-play.jpg` (38,794 B),
  `3-stealth.jpg` (39,376 B), `4-win.jpg` (40,800 B) — real renders, each
  under 256 KiB, via headless Chromium; the play shot was restaged
  statically (explicit guard poses, no idle ticks) after the first version
  showed every guard suspicious from a sighting during staging.

**Submission status**
- NOT SUBMITTED — the coordinator submits after this build. No accounts
  created, nothing paid.

**Repo:** https://github.com/endg9/shadow-ledger
**Game commit:** b329326601bf4b4096f6346ab104fcafc5a9ede6
**HEAD sha:** cf70100406811de68a84423891997be7a29a1923 (this log's commit; pushed to master)
