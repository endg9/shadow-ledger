// Keyboard input. Returns a fresh input vector each frame; the world
// consumes `throwNoise` as an edge (one throw per key press).
export function createInput() {
  const keys = new Set();
  let throwQueued = false;

  function down(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    if (e.repeat) return;
    keys.add(e.key.toLowerCase());
    if (e.key.toLowerCase() === 'e') throwQueued = true;
  }
  function up(e) {
    keys.delete(e.key.toLowerCase());
  }

  return {
    attach() {
      window.addEventListener('keydown', down);
      window.addEventListener('keyup', up);
    },
    detach() {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    },
    pressed(key) {
      return keys.has(key.toLowerCase());
    },
    vector() {
      let mx = 0;
      let my = 0;
      if (keys.has('a') || keys.has('arrowleft')) mx -= 1;
      if (keys.has('d') || keys.has('arrowright')) mx += 1;
      if (keys.has('w') || keys.has('arrowup')) my -= 1;
      if (keys.has('s') || keys.has('arrowdown')) my += 1;
      const throwNoise = throwQueued;
      throwQueued = false;
      return {
        mx,
        my,
        run: keys.has('shift'),
        sneak: keys.has('c'),
        throwNoise,
      };
    },
  };
}
