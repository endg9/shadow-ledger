// Shadow Ledger — canvas renderer. Draws the whole game from state.
import { W, H, TUNING } from './config.js';
import { dist, inBush, inShadow, exitOpen, relicsLeft } from './world.js';

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, '0')}`;
}

function drawCone(ctx, x, y, facing, range, halfAngle, color) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawWalls(ctx, level) {
  for (const w of level.walls) {
    ctx.fillStyle = '#232733';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = '#3a4157';
    ctx.lineWidth = 2;
    ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
    ctx.fillStyle = '#2e3446';
    ctx.fillRect(w.x, w.y, w.w, 4);
  }
}

function drawFloor(ctx, state) {
  const level = state.level;
  ctx.fillStyle = '#10121a';
  ctx.fillRect(0, 0, W, H);
  // faint floor tiles
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 48; x < W; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 48; y < H; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  // shadow pools
  for (const s of level.shadows) {
    ctx.fillStyle = 'rgba(40,60,120,0.35)';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = 'rgba(90,120,200,0.35)';
    ctx.strokeRect(s.x, s.y, s.w, s.h);
  }
  // bushes
  for (const b of level.bushes) {
    ctx.fillStyle = '#1d4d2b';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a6b3a';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.arc(b.x + Math.cos(a) * b.r * 0.55, b.y + Math.sin(a) * b.r * 0.55, b.r * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#3f9155';
    ctx.beginPath();
    ctx.arc(b.x - b.r * 0.2, b.y - b.r * 0.2, b.r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  // relics
  for (const r of state.relics) {
    if (r.taken) continue;
    const pulse = 1 + Math.sin(state.time * 3 + r.x) * 0.12;
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.scale(pulse, pulse);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = r.ledger ? '#ffd94a' : '#e8b23a';
    const s = r.ledger ? 15 : 11;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.strokeStyle = r.ledger ? '#fff3b0' : '#ffe9a8';
    ctx.lineWidth = 2;
    ctx.strokeRect(-s / 2, -s / 2, s, s);
    ctx.restore();
    if (r.ledger) {
      ctx.fillStyle = '#ffe27a';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('THE LEDGER', r.x, r.y - 24);
    }
  }
  // exit door
  const e = level.exit;
  const open = exitOpen(state);
  ctx.fillStyle = open ? '#1f7a44' : '#7a2b2b';
  ctx.fillRect(e.x - 18, e.y - 18, 36, 36);
  ctx.strokeStyle = open ? '#5ee08a' : '#ff7a7a';
  ctx.lineWidth = 3;
  ctx.strokeRect(e.x - 18, e.y - 18, 36, 36);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT' : 'LOCKED', e.x, e.y + 4);
  if (!open) {
    ctx.fillStyle = '#ffb0b0';
    ctx.font = '10px sans-serif';
    ctx.fillText(`${relicsLeft(state)} relic${relicsLeft(state) === 1 ? '' : 's'} left`, e.x, e.y + 32);
  }
}

function drawGuards(ctx, state) {
  const level = state.level;
  for (const c of state.cameras) {
    const col = 'rgba(255,190,60,0.16)';
    drawCone(ctx, c.x, c.y, c.angle, c.range || TUNING.cameraVisionRange, TUNING.cameraVisionHalfAngle, col);
    ctx.fillStyle = '#c9a227';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(c.x + Math.cos(c.angle) * 5, c.y + Math.sin(c.angle) * 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const g of state.guards) {
    const alert = g.mode === 'chase';
    const sus = g.mode === 'suspicious' || g.mode === 'look';
    drawCone(
      ctx,
      g.x,
      g.y,
      g.facing,
      TUNING.guardVisionRange,
      TUNING.guardVisionHalfAngle,
      alert ? 'rgba(255,60,60,0.22)' : sus ? 'rgba(255,190,60,0.18)' : 'rgba(255,220,120,0.10)',
    );
    ctx.fillStyle = alert ? '#e5484d' : sus ? '#f5a623' : '#8a93a6';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0c0e14';
    ctx.lineWidth = 2;
    ctx.stroke();
    // facing tick
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.facing) * 18, g.y + Math.sin(g.facing) * 18);
    ctx.stroke();
    if (alert || sus) {
      ctx.fillStyle = alert ? '#ff5a5a' : '#ffd23e';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(alert ? '!' : '?', g.x, g.y - 20);
    }
    void level;
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  const bush = inBush(state.level, p.x, p.y);
  // Wren: a hooded teal figure; half-hidden when crouched in a bush.
  ctx.save();
  if (bush) ctx.globalAlpha = 0.65;
  ctx.fillStyle = '#2dd4bf';
  ctx.beginPath();
  ctx.arc(p.x, p.y, TUNING.playerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f766e';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#0f2e2a';
  ctx.beginPath();
  ctx.arc(p.x + p.fx * 5, p.y + p.fy * 5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (bush) {
    ctx.fillStyle = '#9fe8b8';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN', p.x, p.y - 20);
  }
  // noisemaker pings
  for (const pg of state.pings) {
    const k = pg.t / pg.ttl;
    ctx.strokeStyle = `rgba(255,220,100,${1 - k})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pg.x, pg.y, 10 + k * 46, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHud(ctx, state) {
  ctx.fillStyle = 'rgba(8,10,16,0.82)';
  ctx.fillRect(0, 0, W, 34);
  ctx.fillStyle = '#e8eaf2';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(state.level.name, 12, 22);
  ctx.textAlign = 'center';
  const open = exitOpen(state);
  ctx.fillStyle = open ? '#5ee08a' : '#ffb0b0';
  ctx.fillText(`Relics ${state.relics.length - relicsLeft(state)}/${state.relics.length}`, 400, 22);
  ctx.fillStyle = '#e8eaf2';
  ctx.fillText(`Noise ${state.noiseLeft}`, 500, 22);
  ctx.fillText(`Score ${state.score}`, 600, 22);
  ctx.fillText(fmtTime(state.time), 700, 22);
  // detection meter
  const mx = 760;
  ctx.fillStyle = '#333';
  ctx.fillRect(mx, 10, 120, 14);
  const frac = state.detection / 100;
  ctx.fillStyle = state.alarm ? '#ff4040' : frac > 0.5 ? '#ffb020' : '#37c978';
  ctx.fillRect(mx, 10, 120 * frac, 14);
  ctx.strokeStyle = '#666';
  ctx.strokeRect(mx, 10, 120, 14);
  ctx.fillStyle = '#fff';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.alarm ? 'ALARM' : state.detection > 0 ? 'SEEN' : state.player.hidden ? 'HIDDEN' : 'CLEAR', mx + 60, 21);
  ctx.textAlign = 'right';
  ctx.fillStyle = state.ghostFloor ? '#9fe8b8' : '#888';
  ctx.fillText(state.ghostFloor ? 'GHOST' : 'SPOTTED', W - 12, 22);
  // transient message
  if (state.messageT > 0 && state.message) {
    ctx.fillStyle = 'rgba(8,10,16,0.75)';
    const tw = ctx.measureText(state.message).width + 24;
    ctx.fillRect((W - tw) / 2, 44, tw, 26);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, W / 2, 62);
  }
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(6,8,14,0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = accent || '#e8eaf2';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, H / 2 - 60);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#cfd3e0';
  lines.forEach((ln, i) => {
    ctx.fillText(ln, W / 2, H / 2 - 10 + i * 26);
  });
}

export function render(ctx, state) {
  ctx.clearRect(0, 0, W, H);
  if (state.status === 'title') {
    drawFloor(ctx, state);
    drawGuards(ctx, state);
    drawPlayer(ctx, state);
    overlay(ctx, 'SHADOW LEDGER', [
      'Wren slips through a guarded archive at night.',
      'Steal every relic. Steal THE LEDGER on Floor 5. Never be seen.',
      '',
      'WASD / Arrows — move    Shift — run (loud)    C — sneak (quiet)',
      'E — throw a noisemaker    P — pause    M — mute    R — retry floor',
      '',
      'Bushes hide you. Shadow pools halve detection. Ghost a floor: +1000.',
      '',
      'Press ENTER to slip in',
    ]);
    return;
  }
  drawFloor(ctx, state);
  drawGuards(ctx, state);
  drawPlayer(ctx, state);
  drawHud(ctx, state);
  if (state.status === 'caught') {
    overlay(ctx, 'CAUGHT!', [
      'A guard got hands on Wren.',
      `Floor ${state.floorIndex + 1} restarts — your score is kept.`,
      '',
      'Press ENTER or R to try the floor again',
    ], '#ff6b6b');
  } else if (state.status === 'clear') {
    overlay(ctx, 'FLOOR CLEAR', [
      state.ghostFloor ? 'Ghost bonus +1000 — nobody raised the alarm.' : 'Cleared — but the alarm went up, no Ghost bonus.',
      `Score ${state.score}`,
      '',
      'Press ENTER for the next floor',
    ], '#5ee08a');
  } else if (state.status === 'win') {
    overlay(ctx, 'THE LEDGER IS YOURS', [
      `GHOST — ${state.totalAlarms === 0 ? 'not a single alarm all night' : `${state.totalAlarms} alarm${state.totalAlarms === 1 ? '' : 's'} raised`}`,
      `Score ${state.score}    Time ${fmtTime(state.time)}    Alarms ${state.totalAlarms}`,
      '',
      'Wren vanishes into the night with the archive’s greatest secret.',
      '',
      'Press ENTER to play again',
    ], '#ffd94a');
  } else if (state.status === 'paused') {
    overlay(ctx, 'PAUSED', ['Press P to keep sneaking']);
  }
  void dist;
  void inShadow;
}
