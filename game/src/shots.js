// Staged screenshot scenes. Deterministic: given a seed, every scene is
// the same every run. Used by ?shot=start|play|stealth|win&seed=N.
import { createGame, startFloor, update } from './world.js';

function idleTicks(state, n) {
  const input = { mx: 0, my: 0, run: false, sneak: false, throwNoise: false };
  for (let i = 0; i < n; i++) update(state, input, 1 / 60);
}

export function stageShot(name, seed) {
  const state = createGame(seed);
  if (name === 'start') {
    state.status = 'title';
    return state;
  }
  if (name === 'play') {
    // Floor 3, mid-patrol: Wren crossing the hall, cones sweeping.
    // Poses are set explicitly and nothing ticks, so no guard can wander
    // into a sightline and turn the scene suspicious before the shot.
    startFloor(state, 2);
    state.status = 'play';
    state.player.x = 300;
    state.player.y = 300;
    state.player.fx = 1;
    state.player.fy = 0;
    const pose = (i, x, y, facing, pathIdx) => {
      const g = state.guards[i];
      g.x = x;
      g.y = y;
      g.facing = facing;
      g.pathIdx = pathIdx;
      g.pauseT = 0;
    };
    pose(0, 400, 250, 0, 1); // G1 mid-aisle, heading right
    pose(1, 600, 450, Math.PI, 1); // G2 heading left
    pose(2, 480, 300, Math.PI / 2, 1); // G3 heading down the spine
    pose(3, 700, 90, Math.PI, 1); // G4 heading left along the top
    state.relics[0].taken = true;
    state.score = 500;
    state.detection = 0;
    return state;
  }
  if (name === 'stealth') {
    // Floor 4: Wren tucked in a bush while a guard's cone sweeps past.
    startFloor(state, 3);
    state.status = 'play';
    state.player.x = 150;
    state.player.y = 200;
    state.player.fx = 0;
    state.player.fy = -1;
    // Park the nearest guard mid-aisle, facing away from the bush.
    state.guards[0].x = 480;
    state.guards[0].y = 240;
    state.guards[0].facing = 0;
    state.guards[0].pathIdx = 1;
    state.guards[0].pauseT = 0;
    state.relics[0].taken = true;
    state.score = 500;
    state.detection = 0;
    idleTicks(state, 20);
    // Re-assert the staged pose (idle ticks move the guard along).
    state.player.x = 150;
    state.player.y = 200;
    state.guards[0].x = 480;
    state.guards[0].y = 240;
    state.guards[0].facing = 0;
    state.detection = 0;
    return state;
  }
  if (name === 'win') {
    // A finished campaign: THE LEDGER stolen, ghost, no alarms.
    startFloor(state, 4);
    state.status = 'win';
    state.won = true;
    state.floorClear = true;
    state.relics.forEach((r) => {
      r.taken = true;
    });
    state.score = 16255;
    state.time = 149.7;
    state.totalAlarms = 0;
    state.ghostFloor = true;
    return state;
  }
  state.status = 'title';
  return state;
}
