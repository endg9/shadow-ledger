// Synthesized sound — no audio files, no network. Everything is a short
// WebAudio oscillator/noise burst. Safe to construct in headless contexts:
// if there is no AudioContext, every method is a no-op.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let alarmNodes = null;

  function ac() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      return null;
    }
    return ctx;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (muted) return;
    const a = ac();
    if (!a) return;
    try {
      const t0 = a.currentTime + when;
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(a.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    } catch {
      // audio must never break the game
    }
  }

  return {
    unlock() {
      const a = ac();
      if (a && a.state === 'suspended') a.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      if (muted) this.alarmStop();
      return muted;
    },
    get muted() {
      return muted;
    },
    step() {
      tone(180 + Math.random() * 60, 0.05, 'triangle', 0.03);
    },
    pickup() {
      tone(660, 0.12, 'sine', 0.14);
      tone(990, 0.18, 'sine', 0.14, 0.09);
    },
    ledger() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'sine', 0.14, i * 0.1));
    },
    throwNoise() {
      tone(300, 0.1, 'square', 0.06, 0, 120);
    },
    alarmStart() {
      if (muted) return;
      const a = ac();
      if (!a || alarmNodes) return;
      try {
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(440, a.currentTime);
        const lfo = a.createOscillator();
        lfo.frequency.value = 2.2;
        const lg = a.createGain();
        lg.gain.value = 160;
        lfo.connect(lg);
        lg.connect(o.frequency);
        g.gain.value = 0.045;
        o.connect(g);
        g.connect(a.destination);
        o.start();
        lfo.start();
        alarmNodes = { o, lfo, g };
      } catch {
        alarmNodes = null;
      }
    },
    alarmStop() {
      if (!alarmNodes) return;
      try {
        alarmNodes.o.stop();
        alarmNodes.lfo.stop();
      } catch {
        // already stopped
      }
      alarmNodes = null;
    },
    caught() {
      tone(220, 0.5, 'sawtooth', 0.14, 0, 55);
    },
    clear() {
      [392, 523, 659].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, i * 0.09));
    },
    win() {
      [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.3, 'sine', 0.13, i * 0.12));
    },
  };
}
