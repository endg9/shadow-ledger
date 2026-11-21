// Shadow Ledger — world simulation. Pure logic, no DOM: the same module
// runs in the browser and in the headless Node verification.
import { LEVELS, TUNING, SCORE, W, H } from './config.js';
import { makeRng } from './random.js';

export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

// --- geometry ---------------------------------------------------------------

export function pointInWall(level, x, y, pad) {
  for (const w of level.walls) {
    if (x > w.x - pad && x < w.x + w.w + pad && y > w.y - pad && y < w.y + w.h + pad) {
      return true;
    }
  }
  return false;
}

export function circleHitsWall(level, x, y, r) {
  return pointInWall(level, x, y, r);
}

// Liang–Barsky segment vs axis-aligned rect: true when the segment
// touches or crosses the rect.
function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - r.x, r.x + r.w - x1, y1 - r.y, r.y + r.h - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

export function segmentHitsWall(level, x1, y1, x2, y2) {
  for (const w of level.walls) {
    if (segmentHitsRect(x1, y1, x2, y2, w)) return true;
  }
  return false;
}

export function losClear(level, x1, y1, x2, y2) {
  return !segmentHitsWall(level, x1, y1, x2, y2);
}

export function inBush(level, x, y) {
  for (const b of level.bushes) {
    if (dist(x, y, b.x, b.y) <= b.r) return b;
  }
  return null;
}

export function inShadow(level, x, y) {
  for (const s of level.shadows) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
  }
  return false;
}

// --- movement ---------------------------------------------------------------

// Slide along walls: try the direct step, then axis-aligned slides, then
// angled fallbacks. A step is accepted only when it closes the distance to
// the target, or barely changes it (sliding along a wall edge temporarily
// holds the distance while the direct route is blocked). Axis slides come
// before the fan: a purely horizontal/vertical step has no drift into a
// padded wall edge, so it un-wedges an actor sliding along that edge,
// where a diagonal fan step would creep into the pad and oscillate.
export function moveToward(level, ent, tx, ty, speed, dt) {
  const dx = tx - ent.x;
  const dy = ty - ent.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.5) return 0;
  const base = Math.atan2(dy, dx);
  const step = Math.min(speed * dt, d);
  const tryAccept = (nx, ny, tol) => {
    if (circleHitsWall(level, nx, ny, TUNING.playerRadius)) return false;
    if (Math.hypot(tx - nx, ty - ny) > d + tol) return false;
    ent.x = nx;
    ent.y = ny;
    return true;
  };
  // 1. direct step (must close the distance)
  const nx0 = ent.x + Math.cos(base) * step;
  const ny0 = ent.y + Math.sin(base) * step;
  if (!circleHitsWall(level, nx0, ny0, TUNING.playerRadius) &&
    Math.hypot(tx - nx0, ty - ny0) < d) {
    ent.x = nx0;
    ent.y = ny0;
    return step;
  }
  // 2. axis-aligned slides, in a fixed order per dominant axis. The order
  // must not depend on the current sign of dx/dy: a "toward the target"
  // choice flips every step once the actor is aligned with the target and
  // ping-pongs it in place. A fixed order slides one way around the wall.
  const horizFirst = Math.abs(dx) >= Math.abs(dy);
  const axes = horizFirst
    ? [[1, 0], [-1, 0], [0, 1], [0, -1]]
    : [[0, 1], [0, -1], [1, 0], [-1, 0]];
  for (const [ax, ay] of axes) {
    if (tryAccept(ent.x + ax * step, ent.y + ay * step, 1.0)) return step;
  }
  // 3. angled fan, including pure-perpendicular slides
  for (const off of [0.45, -0.45, 0.9, -0.9, 1.4, -1.4, Math.PI / 2, -Math.PI / 2]) {
    const a = base + off;
    if (tryAccept(ent.x + Math.cos(a) * step, ent.y + Math.sin(a) * step, 1.0)) return step;
  }
  return 0;
}

export function tryStep(level, ent, dx, dy, radius) {
  const nx = ent.x + dx;
  const ny = ent.y + dy;
  if (!circleHitsWall(level, nx, ny, radius)) {
    ent.x = nx;
    ent.y = ny;
    return true;
  }
  // slide: one axis at a time (a zero-length axis move is not a move)
  if (dx !== 0 && !circleHitsWall(level, nx, ent.y, radius)) {
    ent.x = nx;
    return true;
  }
  if (dy !== 0 && !circleHitsWall(level, ent.x, ny, radius)) {
    ent.y = ny;
    return true;
  }
  return false;
}

// --- vision -----------------------------------------------------------------

export function guardSees(state, g) {
  const p = state.player;
  const t = TUNING;
  const d = dist(g.x, g.y, p.x, p.y);
  if (d > t.guardVisionRange) return false;
  const ang = Math.atan2(p.y - g.y, p.x - g.x);
  if (angleDiff(ang, g.facing) > t.guardVisionHalfAngle) return false;
  const bush = inBush(state.level, p.x, p.y);
  if (bush && d > t.bushHideMinDist) return false;
  if (!losClear(state.level, g.x, g.y, p.x, p.y)) return false;
  return true;
}

export function cameraSees(state, cam) {
  const p = state.player;
  const t = TUNING;
  const d = dist(cam.x, cam.y, p.x, p.y);
  const range = cam.range || t.cameraVisionRange;
  if (d > range) return false;
  const ang = Math.atan2(p.y - cam.y, p.x - cam.x);
  if (angleDiff(ang, cam.angle) > t.cameraVisionHalfAngle) return false;
  const bush = inBush(state.level, p.x, p.y);
  if (bush && d > t.bushHideMinDist) return false;
  if (!losClear(state.level, cam.x, cam.y, p.x, p.y)) return false;
  return true;
}

export function anySees(state) {
  for (const g of state.guards) if (guardSees(state, g)) return { kind: 'guard', who: g };
  for (const c of state.cameras) if (cameraSees(state, c)) return { kind: 'camera', who: c };
  return null;
}

// --- state ------------------------------------------------------------------

export function createGame(seed) {
  const state = {
    seed,
    rng: makeRng(seed),
    floorIndex: 0,
    level: null,
    player: null,
    guards: [],
    cameras: [],
    relics: [],
    detection: 0,
    lastSeen: null,
    unseenT: 0,
    alarm: false,
    alarmsThisFloor: 0,
    ghostFloor: true,
    score: 0,
    noiseLeft: 0,
    noiseCooldown: 0,
    pings: [],
    caught: false,
    floorClear: false,
    won: false,
    time: 0,
    floorTime: 0,
    totalAlarms: 0,
    status: 'title', // title | play | caught | clear | win | paused
    message: '',
    messageT: 0,
    best: 0,
  };
  startFloor(state, 0);
  return state;
}

export function startFloor(state, idx) {
  const def = LEVELS[idx];
  state.floorIndex = idx;
  // Deep copy so runtime mutation never touches the shared level data.
  state.level = JSON.parse(JSON.stringify(def));
  state.player = {
    x: def.start.x,
    y: def.start.y,
    fx: 0,
    fy: -1,
    moving: false,
    running: false,
    sneaking: false,
    hidden: false,
  };
  state.guards = def.guards.map((g) => ({
    x: g.path[0].x,
    y: g.path[0].y,
    path: g.path.map((p) => ({ x: p.x, y: p.y })),
    pathIdx: 1,
    dir: 1,
    speed: g.speed || TUNING.guardPatrolSpeed,
    facing: Math.atan2(g.path[1].y - g.path[0].y, g.path[1].x - g.path[0].x),
    mode: 'patrol', // patrol | suspicious | chase | return | look
    target: null,
    pauseT: 0,
    lookT: 0,
  }));
  state.cameras = def.cameras.map((c) => ({
    x: c.x,
    y: c.y,
    base: c.base,
    sweep: c.sweep,
    range: c.range,
    speed: c.speed,
    angle: c.base,
    phase: 0,
  }));
  state.relics = def.relics.map((r) => ({
    x: r.x,
    y: r.y,
    ledger: !!r.ledger,
    taken: false,
  }));
  state.detection = 0;
  state.lastSeen = null;
  state.unseenT = 0;
  state.alarm = false;
  state.alarmsThisFloor = 0;
  state.ghostFloor = true;
  state.noiseLeft = def.noisemakers;
  state.noiseCooldown = 0;
  state.pings = [];
  state.caught = false;
  state.floorClear = false;
  state.floorTime = 0;
  state.message = '';
  state.messageT = 0;
}

export function resetFloor(state) {
  // Keep score and total time; the floor restarts fresh.
  startFloor(state, state.floorIndex);
  state.status = 'play';
}

export function relicsLeft(state) {
  return state.relics.filter((r) => !r.taken).length;
}

export function exitOpen(state) {
  return relicsLeft(state) === 0;
}

export function nextFloor(state) {
  // No-op unless the floor is actually cleared, and never past the last.
  if (!state.floorClear || state.won) return false;
  if (state.floorIndex >= LEVELS.length - 1) return false;
  if (state.ghostFloor) {
    state.score += SCORE.ghostFloor;
  }
  startFloor(state, state.floorIndex + 1);
  state.status = 'play';
  return true;
}

function setMessage(state, text, dur = 2.2) {
  state.message = text;
  state.messageT = dur;
}

// --- noisemaker ---------------------------------------------------------------

export function throwNoisemaker(state) {
  if (state.noiseLeft <= 0 || state.noiseCooldown > 0) return false;
  if (state.status !== 'play') return false;
  const p = state.player;
  state.noiseLeft--;
  state.noiseCooldown = 0.6;
  let px = p.x + p.fx * TUNING.noiseThrowDist;
  let py = p.y + p.fy * TUNING.noiseThrowDist;
  // Pull the landing point back out of any wall it would land inside.
  for (let i = 0; i < 10; i++) {
    if (!circleHitsWall(state.level, px, py, 8)) break;
    px -= p.fx * 12;
    py -= p.fy * 12;
  }
  px = Math.max(30, Math.min(W - 30, px));
  py = Math.max(30, Math.min(H - 30, py));
  state.pings.push({ x: px, y: py, t: 0, ttl: 1.6 });
  for (const g of state.guards) {
    if (dist(g.x, g.y, px, py) <= TUNING.noiseHearRadius) {
      if (g.mode !== 'chase') {
        g.mode = 'suspicious';
        g.target = { x: px, y: py };
      }
    }
  }
  setMessage(state, 'Noisemaker thrown — patrol diverted');
  return true;
}

// --- main update ---------------------------------------------------------------

export function update(state, input, dt) {
  if (state.status !== 'play') return;
  const t = TUNING;
  const level = state.level;
  const p = state.player;

  state.time += dt;
  state.floorTime += dt;
  if (state.messageT > 0) state.messageT -= dt;
  if (state.noiseCooldown > 0) state.noiseCooldown -= dt;
  for (const ping of state.pings) ping.t += dt;
  state.pings = state.pings.filter((pg) => pg.t < pg.ttl);

  // --- player movement: sneak and run are exclusive (sneak wins) ---
  const mx = input.mx || 0;
  const my = input.my || 0;
  const moving = mx !== 0 || my !== 0;
  p.moving = moving;
  p.sneaking = !!input.sneak;
  p.running = !!input.run && !p.sneaking;
  const speed = p.sneaking ? t.sneakSpeed : p.running ? t.runSpeed : t.walkSpeed;
  if (moving) {
    const len = Math.hypot(mx, my) || 1;
    const nx = mx / len;
    const ny = my / len;
    p.fx = nx;
    p.fy = ny;
    tryStep(level, p, nx * speed * dt, ny * speed * dt, t.playerRadius);
  }
  if (input.throwNoise) throwNoisemaker(state);

  // Running is loud: a nearby guard turns to investigate.
  if (p.running && moving) {
    for (const g of state.guards) {
      if (g.mode === 'patrol' && dist(g.x, g.y, p.x, p.y) < t.hearRunRadius) {
        g.mode = 'suspicious';
        g.target = { x: p.x, y: p.y };
      }
    }
  }

  p.hidden = !!inBush(level, p.x, p.y) || inShadow(level, p.x, p.y);

  // --- cameras sweep ---
  for (const c of state.cameras) {
    c.phase += c.speed * dt;
    c.angle = c.base + Math.sin(c.phase) * c.sweep;
  }

  // --- detection ---
  const seen = anySees(state);
  if (seen) {
    state.unseenT = 0;
    state.lastSeen = { x: p.x, y: p.y };
    let rate;
    if (seen.kind === 'camera') {
      rate = t.detectionCamera;
    } else {
      const d = dist(seen.who.x, seen.who.y, p.x, p.y);
      const range = t.guardVisionRange;
      rate = t.detectionBase + t.detectionCloseBonus * (1 - Math.min(1, d / range));
    }
    if (p.sneaking) rate *= t.sneakFactor;
    if (p.running) rate *= t.runFactor;
    if (inShadow(level, p.x, p.y)) rate *= t.shadowFactor;
    state.detection = Math.min(t.alarmAt, state.detection + rate * dt);
  } else {
    state.unseenT += dt;
    state.detection = Math.max(0, state.detection - t.detectionDecay * dt);
  }

  if (state.detection >= t.suspicionAt && state.detection < t.alarmAt && !state.alarm) {
    // The closest patrolling guard goes to look at the last seen spot.
    let best = null;
    let bestD = Infinity;
    for (const g of state.guards) {
      if (g.mode !== 'patrol') continue;
      const d = dist(g.x, g.y, state.lastSeen.x, state.lastSeen.y);
      if (d < bestD) {
        bestD = d;
        best = g;
      }
    }
    if (best) {
      best.mode = 'suspicious';
      best.target = { x: state.lastSeen.x, y: state.lastSeen.y };
    }
  }

  if (state.detection >= t.alarmAt && !state.alarm) {
    state.alarm = true;
    state.alarmsThisFloor++;
    state.totalAlarms++;
    state.ghostFloor = false;
    for (const g of state.guards) {
      g.mode = 'chase';
      g.target = { x: p.x, y: p.y };
    }
    setMessage(state, 'ALARM! Run for cover!', 2.5);
  }

  // --- guards ---
  for (const g of state.guards) {
    updateGuard(state, g, dt);
  }

  // Chase gives up after being unseen for a while; the pack stands down.
  if (state.alarm && state.unseenT > t.chaseGiveUpUnseen) {
    state.alarm = false;
    state.detection = Math.min(state.detection, t.suspicionAt - 1);
    for (const g of state.guards) {
      if (g.mode === 'chase') {
        g.mode = 'return';
        g.target = null;
      }
    }
    setMessage(state, 'The hunt cools off… stay quiet');
  }

  // --- catch: only with line of sight, never through a wall ---
  if (state.alarm) {
    for (const g of state.guards) {
      if (g.mode === 'chase' && dist(g.x, g.y, p.x, p.y) < t.catchRadius) {
        if (losClear(level, g.x, g.y, p.x, p.y)) {
          state.caught = true;
          state.status = 'caught';
          setMessage(state, 'Caught!', 3);
          return;
        }
      }
    }
  }

  // --- relics: pickup needs line of sight, never through a wall ---
  for (const r of state.relics) {
    if (r.taken) continue;
    if (dist(p.x, p.y, r.x, r.y) < t.relicPickupRadius) {
      if (losClear(level, p.x, p.y, r.x, r.y)) {
        r.taken = true;
        state.score += r.ledger ? SCORE.ledger : SCORE.relic;
        setMessage(
          state,
          r.ledger ? 'THE LEDGER IS YOURS!' : `Relic secured  +${SCORE.relic}`,
          2.2,
        );
      }
    }
  }

  // --- exit: locked until every relic is taken, and needs line of sight ---
  if (exitOpen(state)) {
    const e = level.exit;
    if (dist(p.x, p.y, e.x, e.y) < t.exitRadius) {
      if (losClear(level, p.x, p.y, e.x, e.y)) {
        state.floorClear = true;
        if (state.floorIndex === LEVELS.length - 1) {
          state.won = true;
          state.status = 'win';
          const bonus = Math.max(0, SCORE.timeBonusWindow - Math.floor(state.time)) * SCORE.timeBonusPerSecond;
          state.score += bonus;
          if (state.ghostFloor) state.score += SCORE.ghostFloor;
          if (state.score > state.best) state.best = state.score;
        } else {
          state.status = 'clear';
        }
      }
    }
  }
}

function updateGuard(state, g, dt) {
  const t = TUNING;
  const level = state.level;
  const p = state.player;

  if (g.mode === 'patrol') {
    if (g.pauseT > 0) {
      g.pauseT -= dt;
      return;
    }
    const wp = g.path[g.pathIdx];
    const before = dist(g.x, g.y, wp.x, wp.y);
    const moved = moveToward(level, g, wp.x, wp.y, g.speed, dt);
    if (moved > 0) {
      g.facing = Math.atan2(wp.y - g.y, wp.x - g.x);
    }
    if (dist(g.x, g.y, wp.x, wp.y) < 6 || before - dist(g.x, g.y, wp.x, wp.y) < 0.01) {
      // Arrived (or wedged): pause, then head for the next waypoint.
      g.pauseT = 0.8;
      g.pathIdx += g.dir;
      if (g.pathIdx >= g.path.length) {
        g.pathIdx = g.path.length - 2;
        g.dir = -1;
      } else if (g.pathIdx < 0) {
        g.pathIdx = 1;
        g.dir = 1;
      }
    }
    return;
  }

  if (g.mode === 'suspicious' || g.mode === 'chase') {
    const target = g.mode === 'chase' && state.lastSeen ? state.lastSeen : g.target;
    if (!target) {
      g.mode = 'return';
      return;
    }
    const speed = g.mode === 'chase' ? t.guardChaseSpeed : g.speed * 1.35;
    const before = dist(g.x, g.y, target.x, target.y);
    const moved = moveToward(level, g, target.x, target.y, speed, dt);
    if (moved > 0) {
      g.facing = Math.atan2(target.y - g.y, target.x - g.x);
    }
    if (g.mode === 'chase') {
      // Keep hunting the freshest known position while the alarm holds.
      if (state.lastSeen) g.target = { x: state.lastSeen.x, y: state.lastSeen.y };
      return;
    }
    if (dist(g.x, g.y, target.x, target.y) < 10 || before - dist(g.x, g.y, target.x, target.y) < 0.01) {
      g.mode = 'look';
      g.lookT = 1.4;
    }
    return;
  }

  if (g.mode === 'look') {
    g.lookT -= dt;
    g.facing += dt * 1.6; // scan the area
    if (g.lookT <= 0) {
      g.mode = 'return';
      g.target = null;
    }
    return;
  }

  if (g.mode === 'return') {
    // Head back to the nearest patrol waypoint, then resume the beat.
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < g.path.length; i++) {
      const d = dist(g.x, g.y, g.path[i].x, g.path[i].y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    const wp = g.path[best];
    moveToward(level, g, wp.x, wp.y, t.guardReturnSpeed, dt);
    if (dist(g.x, g.y, wp.x, wp.y) < 8) {
      g.pathIdx = best;
      g.mode = 'patrol';
      g.pauseT = 0.4;
    }
  }
}
