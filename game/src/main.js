// Shadow Ledger — entry point. Wires input, audio, the fixed-timestep
// loop and the ?shot= staging used for screenshots.
import { createGame, update, nextFloor, resetFloor, relicsLeft } from './world.js';
import { render } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
import { W, H } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '7');

const audio = createAudio();
const input = createInput();
input.attach();

let state;
let lastAlarm = false;
let lastScore = 0;

if (shotName) {
  // Screenshot mode: stage one deterministic scene and render it.
  state = stageShot(shotName, seed);
  document.title = `Shadow Ledger — ${shotName}`;
  render(ctx, state);
} else {
  state = createGame(seed);
  try {
    state.best = Number(window.localStorage.getItem('shadow-ledger-best') || '0');
  } catch {
    state.best = 0;
  }

  window.addEventListener('keydown', (e) => {
    audio.unlock();
    const k = e.key.toLowerCase();
    if (k === 'm') {
      const muted = audio.toggleMute();
      state.message = muted ? 'Muted' : 'Sound on';
      state.messageT = 1.2;
      return;
    }
    if (k === 'p' && (state.status === 'play' || state.status === 'paused')) {
      state.status = state.status === 'play' ? 'paused' : 'play';
      return;
    }
    if (k === 'r' && (state.status === 'play' || state.status === 'caught')) {
      audio.alarmStop();
      resetFloor(state);
      return;
    }
    if (k === 'enter' || k === ' ') {
      if (state.status === 'title') {
        state.status = 'play';
      } else if (state.status === 'caught') {
        audio.alarmStop();
        resetFloor(state);
      } else if (state.status === 'clear') {
        nextFloor(state);
      } else if (state.status === 'win') {
        const best = state.best;
        state = createGame(seed);
        state.best = best;
        state.status = 'play';
      }
    }
  });

  let last = performance.now();
  let acc = 0;
  const DT = 1 / 60;

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    if (state.status !== 'paused') {
      acc += dt;
      let steps = 0;
      while (acc >= DT && steps < 5) {
        const v = input.vector();
        const prevScore = state.score;
        const prevCaught = state.caught;
        update(state, v, DT);
        if (state.score > prevScore) {
          if (state.score - prevScore >= 1000) audio.ledger();
          else audio.pickup();
        }
        if (state.caught && !prevCaught) {
          audio.alarmStop();
          audio.caught();
        }
        if (state.alarm && !lastAlarm) audio.alarmStart();
        if (!state.alarm && lastAlarm) audio.alarmStop();
        lastAlarm = state.alarm;
        if (state.status === 'win' && state.score !== lastScore) {
          audio.win();
          try {
            window.localStorage.setItem('shadow-ledger-best', String(state.score));
          } catch {
            // storage unavailable
          }
        }
        lastScore = state.score;
        acc -= DT;
        steps++;
      }
      if (state.player.moving && Math.random() < 0.06) audio.step();
    }
    render(ctx, state);
  }
  requestAnimationFrame(frame);
  void W;
  void H;
  void relicsLeft;
}
