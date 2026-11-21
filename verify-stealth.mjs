// Shadow Ledger — headless verification (Node, no DOM).
// Tests the world simulation directly plus a full-campaign autopilot that
// plays all 5 floors ghost using grid A* and cone-aware waiting.
import {
  createGame,
  startFloor,
  update,
  resetFloor,
  nextFloor,
  guardSees,
  cameraSees,
  losClear,
  pointInWall,
  segmentHitsWall,
  inBush,
  dist,
  moveToward,
  tryStep,
  throwNoisemaker,
  exitOpen,
  relicsLeft,
} from './game/src/world.js';
import { LEVELS, TUNING, SCORE, W, H } from './game/src/config.js';

let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`  ok  ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`FAIL  ${name} ${extra}`);
  }
}

function fresh(floor = 0, seed = 7) {
  const s = createGame(seed);
  startFloor(s, floor);
  s.status = 'play';
  return s;
}

function step(s, input, n) {
  const inp = { mx: 0, my: 0, run: false, sneak: false, throwNoise: false, ...input };
  for (let i = 0; i < n; i++) update(s, inp, 1 / 60);
  return s;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

console.log('== geometry ==');
check('5 levels defined', LEVELS.length === 5);
for (let i = 0; i < LEVELS.length; i++) {
  const L = LEVELS[i];
  check(`floor ${i + 1}: start clear of walls`, !pointInWall(L, L.start.x, L.start.y, 20));
  check(`floor ${i + 1}: exit clear of walls`, !pointInWall(L, L.exit.x, L.exit.y, 20));
  L.relics.forEach((r, j) => {
    check(`floor ${i + 1}: relic ${j} clear of walls`, !pointInWall(L, r.x, r.y, 22));
  });
  L.bushes.forEach((b, j) => {
    let clear = true;
    for (const w of L.walls) {
      const cx = Math.max(w.x, Math.min(b.x, w.x + w.w));
      const cy = Math.max(w.y, Math.min(b.y, w.y + w.h));
      if (dist(b.x, b.y, cx, cy) < b.r + 4) clear = false;
    }
    check(`floor ${i + 1}: bush ${j} clear of walls`, clear);
  });
  L.shadows.forEach((s, j) => {
    const pts = [
      [s.x + 2, s.y + 2],
      [s.x + s.w - 2, s.y + 2],
      [s.x + 2, s.y + s.h - 2],
      [s.x + s.w - 2, s.y + s.h - 2],
      [s.x + s.w / 2, s.y + s.h / 2],
    ];
    check(
      `floor ${i + 1}: shadow ${j} clear of walls`,
      pts.every(([x, y]) => !pointInWall(L, x, y, 0)),
    );
  });
  L.guards.forEach((g, j) => {
    let clear = true;
    for (let k = 0; k < g.path.length - 1; k++) {
      const a = g.path[k];
      const b = g.path[k + 1];
      const len = dist(a.x, a.y, b.x, b.y);
      const steps = Math.ceil(len / 8);
      for (let t = 0; t <= steps; t++) {
        const x = a.x + ((b.x - a.x) * t) / steps;
        const y = a.y + ((b.y - a.y) * t) / steps;
        if (pointInWall(L, x, y, 18)) clear = false;
      }
    }
    check(`floor ${i + 1}: guard ${j} patrol legs clear of walls`, clear);
  });
  L.cameras.forEach((c, j) => {
    check(`floor ${i + 1}: camera ${j} clear of walls`, !pointInWall(L, c.x, c.y, 10));
  });
}

console.log('== line of sight ==');
{
  const s = fresh(0);
  check('wall blocks LOS (across shelf A)', !losClear(s.level, 300, 100, 300, 250));
  check('clear aisle LOS passes', losClear(s.level, 450, 100, 450, 250));
  check('segmentHitsWall true on shelf', segmentHitsWall(s.level, 300, 100, 300, 250));
  check('segmentHitsWall false in aisle', !segmentHitsWall(s.level, 450, 100, 450, 250));
}

console.log('== vision cones ==');
{
  const s = fresh(0);
  const g = s.guards[0];
  g.speed = 0;
  g.pauseT = 999;
  g.x = 450;
  g.y = 100;
  g.facing = Math.PI / 2; // looking down the aisle
  s.player.x = 450;
  s.player.y = 200;
  check('guard sees player straight ahead', guardSees(s, g));
  g.facing = -Math.PI / 2; // looking away
  check('guard blind behind', !guardSees(s, g));
  g.facing = Math.PI / 2;
  s.player.y = 320; // 220px away, beyond range
  check('guard blind beyond range', !guardSees(s, g));
  s.player.y = 200;
  g.x = 300; // line crosses shelf A
  g.y = 100;
  s.player.x = 300;
  s.player.y = 250;
  check('wall blocks guard vision', !guardSees(s, g));
  // bush hides at 160px but not at 40px
  g.x = 480;
  g.y = 300;
  g.facing = -Math.PI / 2;
  s.player.x = 480;
  s.player.y = 140; // inside the (480,140) bush, 160px away
  check('bush hides player at 160px', !guardSees(s, g) && !!inBush(s.level, 480, 140));
  g.y = 180;
  check('bush does not hide at 40px', guardSees(s, g));
}

console.log('== cameras ==');
{
  const s = fresh(3);
  const cam = s.cameras[0];
  s.player.x = 480;
  s.player.y = 200;
  cam.angle = Math.PI / 2;
  check('camera sees player in its cone', cameraSees(s, cam));
  cam.angle = 0;
  check('camera blind outside its sweep', !cameraSees(s, cam));
}

console.log('== detection ==');
function seenSetup() {
  const s = fresh(0);
  const g = s.guards[0];
  // Park the guard in place (a zero-length patrol) but keep a real speed,
  // so suspicious/chase movement still works.
  g.path = [
    { x: 450, y: 100 },
    { x: 450, y: 100 },
  ];
  g.pathIdx = 1;
  g.speed = 70;
  g.pauseT = 0;
  g.x = 450;
  g.y = 100;
  g.facing = Math.PI / 2;
  // (450,280): straight down the open aisle, 180px away, clear of the
  // shadow pool (which ends at y=260) — sight rate ~43/s.
  s.player.x = 450;
  s.player.y = 280;
  return s;
}
{
  const s = seenSetup();
  step(s, {}, 30);
  check('detection rises while seen', s.detection > 15, `det=${s.detection.toFixed(1)}`);
  const mid = s.detection;
  s.player.x = 90; // step out of the cone, behind the guard's back
  s.player.y = 520;
  step(s, {}, 60);
  check('detection decays while hidden', s.detection < mid, `det=${s.detection.toFixed(1)}`);
}
{
  const walk = seenSetup();
  step(walk, {}, 60);
  const sneak = seenSetup();
  step(sneak, { sneak: true }, 60);
  const run = seenSetup();
  step(run, { run: true }, 60);
  check('sneaking fills detection slower than walking', sneak.detection < walk.detection * 0.7,
    `sneak=${sneak.detection.toFixed(1)} walk=${walk.detection.toFixed(1)}`);
  check('running fills detection faster than walking', run.detection > walk.detection * 1.2,
    `run=${run.detection.toFixed(1)} walk=${walk.detection.toFixed(1)}`);
}
{
  // shadow halves the rate: same geometry, one player in a shadow pool.
  const a = fresh(0);
  const g = a.guards[0];
  g.speed = 0;
  g.pauseT = 999;
  g.x = 450;
  g.y = 100;
  g.facing = Math.PI / 2;
  a.player.x = 450;
  a.player.y = 230; // inside shadow (400,200,160,60)
  step(a, {}, 60);
  const b = fresh(0);
  const g2 = b.guards[0];
  g2.speed = 0;
  g2.pauseT = 999;
  g2.x = 480;
  g2.y = 100;
  g2.facing = Math.PI / 2;
  b.player.x = 480;
  b.player.y = 280; // same distance, open aisle, no shadow
  step(b, {}, 60);
  check('shadow pool halves detection rate', a.detection < b.detection * 0.65,
    `shadow=${a.detection.toFixed(1)} open=${b.detection.toFixed(1)}`);
}

console.log('== patrol, suspicion, alarm ==');
{
  const s = fresh(0);
  const g0 = s.guards[0];
  const x0 = g0.x;
  step(s, {}, 60);
  check('guard advances along its patrol', g0.x > x0 + 20 && Math.abs(g0.y - 250) < 2,
    `x ${x0} -> ${g0.x.toFixed(0)}`);
}
{
  const s = fresh(0);
  const g = s.guards[0];
  g.x = 868;
  g.y = 250;
  g.pathIdx = 1;
  step(s, {}, 20);
  check('guard pauses at waypoint then turns', g.pauseT > 0 && g.dir === -1, `pauseT=${g.pauseT.toFixed(2)} dir=${g.dir}`);
  step(s, {}, 150);
  check('guard heads back after the pause', g.x < 860, `x=${g.x.toFixed(0)}`);
}
{
  // moveToward slides around a wall corner and still closes the distance.
  const s = fresh(0);
  const ent = { x: 390, y: 100 };
  let d0 = dist(ent.x, ent.y, 390, 250);
  for (let i = 0; i < 800; i++) moveToward(s.level, ent, 390, 250, 70, 1 / 60);
  const d1 = dist(ent.x, ent.y, 390, 250);
  check('moveToward rounds a shelf corner to its target', d1 < 12, `d ${d0} -> ${d1.toFixed(1)}`);
}
{
  const s = fresh(0);
  const p = s.player;
  p.x = 390;
  p.y = 100;
  const moved = tryStep(s.level, p, 0, 30, TUNING.playerRadius);
  check('player cannot step through a wall', !moved && p.y === 100);
}
{
  // run + sneak together: sneak wins (exclusive, not run speed).
  const s = fresh(0);
  const x0 = s.player.x;
  step(s, { mx: 1, run: true, sneak: true }, 60);
  const dx = s.player.x - x0;
  check('run+sneak moves at sneak speed', Math.abs(dx - TUNING.sneakSpeed) < 4, `dx=${dx.toFixed(1)}`);
}
{
  const s = seenSetup();
  step(s, {}, 75);
  const sus = s.guards.some((g) => g.mode === 'suspicious');
  check('detection past 50 makes a guard investigate', s.detection >= 50 && sus,
    `det=${s.detection.toFixed(1)}`);
}
{
  const s = seenSetup();
  let n = 0;
  while (!s.alarm && n < 300) {
    step(s, {}, 1);
    n++;
  }
  check('sustained sight trips the alarm', s.alarm && s.detection >= 100, `ticks=${n}`);
  check('alarm puts every guard in chase', s.guards.every((g) => g.mode === 'chase'));
  // hide far away; the hunt must cool off after 2.5 s unseen.
  s.player.x = 480;
  s.player.y = 520; // in a bush, far from the last seen spot
  step(s, {}, 200);
  check('chase gives up after 2.5 s unseen', !s.alarm, `unseenT=${s.unseenT.toFixed(2)}`);
}
{
  // running loudly near a guard turns it suspicious.
  const s = fresh(0);
  s.guards[0].x = 300;
  s.guards[0].y = 250;
  s.player.x = 300;
  s.player.y = 300;
  step(s, { mx: 1, run: true }, 5);
  check('running near a guard draws investigation', s.guards[0].mode === 'suspicious');
}

console.log('== catch ==');
{
  const s = fresh(0);
  s.alarm = true;
  const g = s.guards[0];
  g.mode = 'chase';
  g.x = 300;
  g.y = 250;
  g.facing = 0;
  s.player.x = 315;
  s.player.y = 250;
  s.lastSeen = { x: 315, y: 250 };
  step(s, {}, 1);
  check('chasing guard catches on contact', s.caught && s.status === 'caught');
}
{
  // same contact distance, but a shelf sits between guard and player.
  const s = fresh(0);
  s.alarm = true;
  const g = s.guards[0];
  g.mode = 'chase';
  g.speed = 0;
  g.x = 390;
  g.y = 112;
  s.player.x = 390;
  s.player.y = 128;
  s.lastSeen = { x: 390, y: 128 };
  step(s, {}, 1);
  check('no catch through a wall', !s.caught, `los=${losClear(s.level, 390, 112, 390, 128)}`);
}

console.log('== noisemakers ==');
{
  const s = fresh(0);
  s.player.x = 480;
  s.player.y = 300;
  s.player.fx = 1;
  s.player.fy = 0;
  const before = s.noiseLeft;
  const ok = throwNoisemaker(s);
  check('throw consumes one noisemaker', ok && s.noiseLeft === before - 1);
  const ping = s.pings[0];
  const near = s.guards[1]; // (870,470): ~306px from the ping
  const far = s.guards[0]; // (90,250): ~527px away
  check('nearby guard is pulled to the ping', near.mode === 'suspicious' &&
    Math.abs(near.target.x - ping.x) < 1 && Math.abs(near.target.y - ping.y) < 1,
    `near mode=${near.mode}`);
  check('far guard ignores the ping', far.mode === 'patrol', `far mode=${far.mode}`);
  s.noiseCooldown = 0;
  throwNoisemaker(s);
  s.noiseCooldown = 0;
  throwNoisemaker(s);
  check('throw with none left fails', s.noiseLeft === 0 && !throwNoisemaker(s));
}

console.log('== relics and exit ==');
{
  const s = fresh(0);
  const r = s.relics[0];
  s.player.x = r.x;
  s.player.y = r.y;
  step(s, {}, 1);
  check('relic pickup scores 500', r.taken && s.score === SCORE.relic, `score=${s.score}`);
}
{
  const s = fresh(0);
  s.relics[0].x = 390;
  s.relics[0].y = 140; // inside shelf A
  s.player.x = 390;
  s.player.y = 118; // 22px away, wall between
  step(s, {}, 1);
  check('no relic pickup through a wall', !s.relics[0].taken);
}
{
  const s = fresh(0);
  s.player.x = s.level.exit.x;
  s.player.y = s.level.exit.y;
  step(s, {}, 1);
  check('exit locked while relics remain', !s.floorClear && !exitOpen(s) && relicsLeft(s) === 3);
}
{
  const s = fresh(0);
  s.relics.forEach((r) => {
    r.taken = true;
  });
  s.player.x = s.level.exit.x;
  s.player.y = s.level.exit.y;
  step(s, {}, 1);
  check('exit opens when all relics are taken', s.floorClear && s.status === 'clear');
}
{
  const s = fresh(0);
  s.relics.forEach((r) => {
    r.taken = true;
  });
  s.level.exit = { x: 390, y: 140 }; // inside shelf A
  s.player.x = 390;
  s.player.y = 118;
  step(s, {}, 1);
  check('no exit through a wall', !s.floorClear);
  s.level.exit = { x: 390, y: 96 };
  step(s, {}, 1);
  check('exit works with clear line of sight', s.floorClear);
}
{
  const s = fresh(0);
  s.relics.forEach((r) => {
    r.taken = true;
  });
  s.player.x = s.level.exit.x;
  s.player.y = s.level.exit.y;
  step(s, {}, 1);
  const ok = nextFloor(s);
  check('next level carries the score + ghost bonus', ok && s.floorIndex === 1 &&
    s.score === SCORE.ghostFloor && s.status === 'play', `score=${s.score}`);
  check('nextFloor without a clear floor is a no-op', !nextFloor(fresh(0)));
  const w = fresh(4);
  w.floorClear = true;
  w.won = true;
  check('nextFloor past the last floor is a no-op', !nextFloor(w) && w.floorIndex === 4);
}
{
  // startFloor must not mutate the shared level definitions.
  const s = fresh(0);
  const n = LEVELS[0].walls.length;
  s.level.walls.push({ x: 0, y: 0, w: 1, h: 1 });
  check('level data is a deep copy (shared LEVELS untouched)', LEVELS[0].walls.length === n);
}
{
  const a = createGame(7);
  const b = createGame(7);
  check('same seed gives the same starting layout',
    a.guards[0].x === b.guards[0].x && a.player.x === b.player.x);
}

// ===========================================================================
// Autopilot: grid A* + cone-aware waiting, plays the whole campaign ghost.
// ===========================================================================

const CELL = 24;
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function buildGrid(state) {
  const cols = Math.ceil(W / CELL);
  const rows = Math.ceil(H / CELL);
  const blocked = new Uint8Array(cols * rows);
  const pen = new Float32Array(cols * rows);
  // Patrol legs: cells near a guard's beat cost extra, so routes cross a
  // patrol line perpendicularly instead of walking along it.
  const legs = [];
  for (const g of state.level.guards) {
    for (let i = 0; i < g.path.length - 1; i++) {
      legs.push([g.path[i], g.path[i + 1]]);
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * CELL + CELL / 2;
      const y = r * CELL + CELL / 2;
      const idx = r * cols + c;
      if (pointInWall(state.level, x, y, 20)) blocked[idx] = 1;
      for (const [a, b] of legs) {
        if (segDist(x, y, a.x, a.y, b.x, b.y) < 48) {
          pen[idx] = 6;
          break;
        }
      }
    }
  }
  return { cols, rows, blocked, pen };
}

function toCell(grid, x, y) {
  return {
    c: Math.max(0, Math.min(grid.cols - 1, Math.floor(x / CELL))),
    r: Math.max(0, Math.min(grid.rows - 1, Math.floor(y / CELL))),
  };
}

function nearestWalkable(grid, x, y) {
  const start = toCell(grid, x, y);
  if (!grid.blocked[start.r * grid.cols + start.c]) return start;
  // spiral out to the closest open cell
  for (let rad = 1; rad < 12; rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
        const c = start.c + dc;
        const r = start.r + dr;
        if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows) continue;
        if (!grid.blocked[r * grid.cols + c]) return { c, r };
      }
    }
  }
  return start;
}

function astar(state, grid, sx, sy, tx, ty) {
  const from = nearestWalkable(grid, sx, sy);
  const to = nearestWalkable(grid, tx, ty);
  const { cols, rows, blocked } = grid;
  const key = (c, r) => r * cols + c;
  const open = [{ c: from.c, r: from.r, g: 0, f: 0 }];
  const came = new Map();
  const gScore = new Map([[key(from.c, from.r), 0]]);
  const closed = new Set();
  const h = (c, r) => Math.hypot(c - to.c, r - to.r);
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    const ck = key(cur.c, cur.r);
    if (closed.has(ck)) continue;
    closed.add(ck);
    if (cur.c === to.c && cur.r === to.r) {
      const path = [];
      let k = ck;
      let node = cur;
      while (node) {
        path.unshift({ x: node.c * CELL + CELL / 2, y: node.r * CELL + CELL / 2 });
        const prev = came.get(k);
        if (!prev) break;
        k = prev;
        node = { c: k % cols, r: Math.floor(k / cols) };
      }
      return path;
    }
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nc = cur.c + dc;
      const nr = cur.r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      if (blocked[key(nc, nr)]) continue;
      if (dc && dr && (blocked[key(cur.c + dc, cur.r)] || blocked[key(cur.c, cur.r + dr)])) continue;
      const nk = key(nc, nr);
      const ng = gScore.get(ck) + (dc && dr ? 1.414 : 1) * (1 + (grid.pen ? grid.pen[nk] : 0));
      if (ng < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, ng);
        came.set(nk, ck);
        open.push({ c: nc, r: nr, g: ng, f: ng + h(nc, nr) });
      }
    }
  }
  return null;
}

function isWatched(state, x, y) {
  for (const g of state.guards) {
    const d = dist(g.x, g.y, x, y);
    if (d < 65) return true; // proximity: never brush past a guard
    if (d < TUNING.guardVisionRange) {
      const ang = Math.atan2(y - g.y, x - g.x);
      if (angleDiff(ang, g.facing) < TUNING.guardVisionHalfAngle + 0.12 &&
        losClear(state.level, g.x, g.y, x, y)) return true;
    }
  }
  for (const c of state.cameras) {
    const d = dist(c.x, c.y, x, y);
    if (d < (c.range || TUNING.cameraVisionRange)) {
      const ang = Math.atan2(y - c.y, x - c.x);
      if (angleDiff(ang, c.angle) < TUNING.cameraVisionHalfAngle + 0.1 &&
        losClear(state.level, c.x, c.y, x, y)) return true;
    }
  }
  return false;
}

function nearestGuardDist(state, x, y) {
  let m = Infinity;
  for (const g of state.guards) m = Math.min(m, dist(g.x, g.y, x, y));
  return m;
}

// Pick a hideout far from the last seen spot and from every guard.
function chooseHideout(state) {
  let best = null;
  let bestScore = -Infinity;
  for (const b of state.level.bushes) {
    let gd = Infinity;
    for (const g of state.guards) gd = Math.min(gd, dist(g.x, g.y, b.x, b.y));
    const ls = state.lastSeen ? dist(state.lastSeen.x, state.lastSeen.y, b.x, b.y) : 400;
    const score = Math.min(gd, 300) + ls * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = b;
    }
  }
  return best || { x: state.level.start.x, y: state.level.start.y };
}

// Nearest untaken relic, else the exit.
function currentTarget(state) {
  const left = state.relics.filter((r) => !r.taken);
  if (left.length) {
    return left.reduce((a, b) =>
      dist(state.player.x, state.player.y, a.x, a.y) <=
      dist(state.player.x, state.player.y, b.x, b.y) ? a : b);
  }
  return state.level.exit;
}

// Is any of the next `lookahead` waypoints watched by a guard or camera?
function roadWatched(state, path, fromIdx, lookahead) {
  if (!path) return true;
  const last = Math.min(path.length - 1, fromIdx + lookahead);
  for (let i = fromIdx; i <= last; i++) {
    if (isWatched(state, path[i].x, path[i].y)) return true;
  }
  return false;
}

// Nearest bush on the way to the target, not just nearest to the player
// (which would send the pilot back the way it came).
function nearestBush(state, target) {
  let best = null;
  let bestD = Infinity;
  for (const b of state.level.bushes) {
    const d = dist(state.player.x, state.player.y, b.x, b.y) +
      dist(b.x, b.y, target.x, target.y);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best || { x: state.level.start.x, y: state.level.start.y, r: 30 };
}

function autopilotFloor(state, debug = false) {
  const grid = buildGrid(state);
  let path = null;
  let pathIdx = 0;
  let targetKey = '';
  let replanIn = 0;
  let ticks = 0;
  let mode = 'go'; // go | shelter | hide
  let shelterTarget = null;
  let shelterTicks = 0;
  let hideTarget = null;
  const maxTicks = 60 * 300;
  const input = { mx: 0, my: 0, run: false, sneak: false, throwNoise: false };
  let prevAlarm = false;
  let prevScore = state.score;

  const log = (...a) => {
    if (debug) console.log(`  [${(ticks / 60).toFixed(1)}s]`, ...a);
  };

  while (ticks < maxTicks) {
    ticks++;
    if (state.caught) {
      log(`CAUGHT at (${state.player.x.toFixed(0)},${state.player.y.toFixed(0)}) det=${state.detection.toFixed(0)} — resetting floor`);
      resetFloor(state);
      path = null;
      targetKey = '';
      mode = 'go';
      shelterTicks = 0;
      continue;
    }
    if (state.floorClear || state.won) {
      return { ok: true, ticks, alarms: state.alarmsThisFloor };
    }
    if (state.score !== prevScore) {
      log(`relic taken, score=${state.score} at (${state.player.x.toFixed(0)},${state.player.y.toFixed(0)})`);
      prevScore = state.score;
    }
    if (state.alarm && !prevAlarm) {
      log(`ALARM det=${state.detection.toFixed(0)} player=(${state.player.x.toFixed(0)},${state.player.y.toFixed(0)}) guards=${state.guards.map((g) => `${g.mode}@(${g.x.toFixed(0)},${g.y.toFixed(0)})`).join(' ')}`);
    }
    prevAlarm = state.alarm;
    if (debug && ticks % 600 === 0) {
      log(`player=(${state.player.x.toFixed(0)},${state.player.y.toFixed(0)}) det=${state.detection.toFixed(0)} alarm=${state.alarm} mode=${mode} relicsLeft=${relicsLeft(state)} guards=${state.guards.map((g) => `${g.mode}@(${g.x.toFixed(0)},${g.y.toFixed(0)})`).join(' ')}`);
    }

    // --- danger overrides everything: break for cover ---
    if ((state.alarm || state.detection > 25) && mode !== 'hide') {
      mode = 'hide';
      hideTarget = chooseHideout(state);
      path = astar(state, grid, state.player.x, state.player.y, hideTarget.x, hideTarget.y);
      pathIdx = 0;
      log(`hiding -> (${hideTarget.x},${hideTarget.y}) det=${state.detection.toFixed(0)} alarm=${state.alarm}`);
    }

    if (mode === 'hide') {
      const calm = !state.alarm && state.detection < 4;
      const guardNear = nearestGuardDist(state, state.player.x, state.player.y) < 120;
      if (calm && !guardNear) {
        mode = 'go';
        path = null;
        targetKey = '';
        log('calm — resuming');
      } else {
        if (guardNear) {
          hideTarget = chooseHideout(state);
          path = astar(state, grid, state.player.x, state.player.y, hideTarget.x, hideTarget.y);
          pathIdx = 0;
        }
        followPath(state, input, grid, path, pathIdx, true);
        input.run = state.alarm && nearestGuardDist(state, state.player.x, state.player.y) < 100;
        if (path && pathIdx < path.length &&
          dist(state.player.x, state.player.y, path[pathIdx].x, path[pathIdx].y) < 14) pathIdx++;
        if (!path || pathIdx >= path.length) {
          input.mx = 0;
          input.my = 0;
        }
        update(state, input, 1 / 60);
        continue;
      }
    }

    // --- shelter: ducked into a bush while the road ahead is watched ---
    if (mode === 'shelter') {
      shelterTicks++;
      const atBush = shelterTarget &&
        dist(state.player.x, state.player.y, shelterTarget.x, shelterTarget.y) <= (shelterTarget.r || 30);
      if (!atBush && path && pathIdx < path.length) {
        // still travelling to the bush
        followPath(state, input, grid, path, pathIdx, true);
        if (dist(state.player.x, state.player.y, path[pathIdx].x, path[pathIdx].y) < 14) pathIdx++;
        update(state, input, 1 / 60);
        continue;
      }
      // in the bush: has the road cleared?
      const t = currentTarget(state);
      const p2 = astar(state, grid, state.player.x, state.player.y, t.x, t.y);
      if (p2 && !roadWatched(state, p2, 0, 3)) {
        log('road clear — leaving the bush');
        mode = 'go';
        path = null;
        targetKey = '';
        shelterTicks = 0;
      } else if (shelterTicks > 60 * 25) {
        log('shelter timeout — trying the road anyway');
        mode = 'go';
        path = null;
        targetKey = '';
        shelterTicks = 0;
      } else {
        input.mx = 0;
        input.my = 0;
        input.sneak = true;
        input.run = false;
        update(state, input, 1 / 60);
        continue;
      }
    }

    // --- go mode: pick a target and follow the path ---
    const target = currentTarget(state);
    const key = `${target.x},${target.y}`;
    if (key !== targetKey || replanIn <= 0 || !path) {
      path = astar(state, grid, state.player.x, state.player.y, target.x, target.y);
      pathIdx = 0;
      targetKey = key;
      replanIn = 30;
    }
    replanIn--;
    if (!path || path.length === 0) {
      return { ok: false, ticks, reason: 'no path to target' };
    }

    // Road ahead watched? Never wait in the open on a patrol line —
    // duck into the nearest bush and wait there.
    if (roadWatched(state, path, pathIdx, 2)) {
      mode = 'shelter';
      shelterTarget = nearestBush(state, target);
      shelterTicks = 0;
      path = astar(state, grid, state.player.x, state.player.y, shelterTarget.x, shelterTarget.y);
      pathIdx = 0;
      log(`road watched — sheltering in bush (${shelterTarget.x},${shelterTarget.y})`);
      continue;
    }

    const wp = path[pathIdx];
    const nearGuard = nearestGuardDist(state, state.player.x, state.player.y) < 280;
    const nearCam = state.cameras.some((c) => dist(c.x, c.y, state.player.x, state.player.y) < 300);
    input.sneak = nearGuard || nearCam;
    input.run = false;
    const dx = wp.x - state.player.x;
    const dy = wp.y - state.player.y;
    const len = Math.hypot(dx, dy) || 1;
    input.mx = dx / len;
    input.my = dy / len;
    update(state, input, 1 / 60);
    if (dist(state.player.x, state.player.y, wp.x, wp.y) < 14) pathIdx++;
  }
  return { ok: false, ticks, reason: 'floor timeout' };
}

// Drive the player along a path (used while fleeing to cover).
function followPath(state, input, grid, path, pathIdx, sneak) {
  if (!path || pathIdx >= path.length) {
    input.mx = 0;
    input.my = 0;
    return;
  }
  const wp = path[pathIdx];
  const dx = wp.x - state.player.x;
  const dy = wp.y - state.player.y;
  const len = Math.hypot(dx, dy) || 1;
  input.mx = dx / len;
  input.my = dy / len;
  input.sneak = sneak;
  input.run = false;
}

console.log('== autopilot: full campaign ==');
{
  const s = createGame(7);
  s.status = 'play';
  let allOk = true;
  let totalTicks = 0;
  for (let f = 0; f < 5; f++) {
    const res = autopilotFloor(s, process.env.DEBUG === '1' && f === Number(process.env.DEBUG_FLOOR || '0'));
    totalTicks += res.ticks;
    console.log(`  floor ${f + 1}: ${res.ok ? 'clear' : 'FAILED'} in ${(res.ticks / 60).toFixed(1)}s, alarms=${res.alarms}${res.reason ? ` (${res.reason})` : ''}`);
    if (!res.ok) {
      allOk = false;
      break;
    }
    if (f < 4) {
      const ok = nextFloor(s);
      if (!ok) {
        allOk = false;
        console.log('  nextFloor refused after a clear floor');
        break;
      }
    }
  }
  check('autopilot wins all 5 floors', allOk && s.won, `won=${s.won}`);
  check('autopilot finishes ghost (0 alarms)', s.totalAlarms === 0, `alarms=${s.totalAlarms}`);
  check('autopilot score above 10000', s.score > 10000, `score=${s.score}`);
  check('autopilot finishes in under 5 minutes', s.time < 300, `time=${s.time.toFixed(1)}s`);
  console.log(`  campaign: score=${s.score} time=${s.time.toFixed(1)}s ticks=${totalTicks} alarms=${s.totalAlarms}`);
}

console.log(`\n${pass} passed, ${fail} failed${fail ? ` — ${failures.join('; ')}` : ''}`);
process.exit(fail ? 1 : 0);
