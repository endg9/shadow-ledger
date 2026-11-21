// Shadow Ledger — configuration and level data.
// Fresh writing for the best-stealth-game-20261121-1759 bounty.
// Top-down stealth: Wren steals relics across 5 guarded floors.

export const W = 960;
export const H = 600;
export const BORDER = 24;

export const TUNING = {
  walkSpeed: 122,
  runSpeed: 192,
  sneakSpeed: 72,
  guardPatrolSpeed: 70, // per-level overrides apply
  guardChaseSpeed: 210,
  guardReturnSpeed: 120,
  guardVisionRange: 205,
  guardVisionHalfAngle: 0.61, // ~35 degrees
  cameraVisionRange: 235,
  cameraVisionHalfAngle: 0.52, // ~30 degrees
  bushHideMinDist: 50, // a guard closer than this sees through a bush
  detectionBase: 40, // per second while seen
  detectionCloseBonus: 25, // extra at point-blank
  detectionCamera: 46, // per second while a camera sees you
  detectionDecay: 30, // per second while hidden
  sneakFactor: 0.5,
  runFactor: 1.5,
  shadowFactor: 0.5,
  suspicionAt: 50, // detection at which a guard investigates
  alarmAt: 100,
  chaseGiveUpUnseen: 2.5, // seconds unseen before the hunt ends
  catchRadius: 20,
  relicPickupRadius: 26,
  exitRadius: 30,
  hearRunRadius: 140,
  noiseThrowDist: 135,
  noiseHearRadius: 330,
  playerRadius: 14,
};

export const SCORE = {
  relic: 500,
  ledger: 1000,
  ghostFloor: 1000,
  timeBonusPerSecond: 5,
  timeBonusWindow: 600,
};

function borderWalls() {
  return [
    { x: 0, y: 0, w: W, h: BORDER }, // top
    { x: 0, y: H - BORDER, w: W, h: BORDER }, // bottom
    { x: 0, y: 0, w: BORDER, h: H }, // left
    { x: W - BORDER, y: 0, w: BORDER, h: H }, // right
  ];
}

// Shelves are the interior wall blocks. Aisles between them stay open:
// horizontal aisles around y=90, y=250, y=460 and the vertical corridor
// around x=480 are clear on every floor, so patrols never cross a wall.
export const LEVELS = [
  {
    name: 'Floor 1 — The Archive',
    start: { x: 80, y: 520 },
    exit: { x: 880, y: 60 },
    noisemakers: 3,
    walls: [
      ...borderWalls(),
      { x: 180, y: 120, w: 220, h: 40 },
      { x: 560, y: 120, w: 220, h: 40 },
      { x: 180, y: 340, w: 220, h: 40 },
      { x: 560, y: 340, w: 220, h: 40 },
    ],
    guards: [
      { path: [{ x: 90, y: 250 }, { x: 870, y: 250 }], speed: 70 },
      { path: [{ x: 870, y: 470 }, { x: 90, y: 470 }], speed: 70 },
    ],
    cameras: [],
    bushes: [
      { x: 480, y: 140, r: 34 },
      { x: 140, y: 300, r: 34 },
      { x: 820, y: 300, r: 34 },
      { x: 480, y: 520, r: 34 },
    ],
    shadows: [
      { x: 400, y: 200, w: 160, h: 60 },
      { x: 700, y: 440, w: 160, h: 60 },
      { x: 120, y: 440, w: 140, h: 60 },
    ],
    relics: [
      { x: 480, y: 84 },
      { x: 120, y: 84 },
      { x: 880, y: 520 },
    ],
  },
  {
    name: 'Floor 2 — The Stacks',
    start: { x: 80, y: 520 },
    exit: { x: 880, y: 60 },
    noisemakers: 3,
    walls: [
      ...borderWalls(),
      { x: 150, y: 110, w: 200, h: 40 },
      { x: 610, y: 110, w: 200, h: 40 },
      { x: 150, y: 350, w: 200, h: 40 },
      { x: 610, y: 350, w: 200, h: 40 },
    ],
    guards: [
      { path: [{ x: 80, y: 240 }, { x: 880, y: 240 }], speed: 78 },
      { path: [{ x: 880, y: 460 }, { x: 80, y: 460 }], speed: 78 },
      { path: [{ x: 480, y: 80 }, { x: 480, y: 520 }], speed: 65 },
    ],
    cameras: [],
    bushes: [
      { x: 150, y: 300, r: 34 },
      { x: 810, y: 300, r: 34 },
      { x: 480, y: 300, r: 34 },
      { x: 480, y: 540, r: 30 },
    ],
    shadows: [
      { x: 400, y: 200, w: 160, h: 60 },
      { x: 700, y: 180, w: 140, h: 60 },
      { x: 120, y: 440, w: 140, h: 60 },
    ],
    relics: [
      { x: 90, y: 90 },
      { x: 870, y: 90 },
      { x: 880, y: 540 },
    ],
  },
  {
    name: 'Floor 3 — The Vault Hall',
    start: { x: 80, y: 520 },
    exit: { x: 880, y: 60 },
    noisemakers: 3,
    walls: [
      ...borderWalls(),
      { x: 200, y: 130, w: 180, h: 40 },
      { x: 580, y: 130, w: 180, h: 40 },
      { x: 200, y: 330, w: 180, h: 40 },
      { x: 580, y: 330, w: 180, h: 40 },
    ],
    guards: [
      { path: [{ x: 90, y: 250 }, { x: 870, y: 250 }], speed: 85 },
      { path: [{ x: 870, y: 450 }, { x: 90, y: 450 }], speed: 85 },
      { path: [{ x: 480, y: 70 }, { x: 480, y: 530 }], speed: 70 },
      { path: [{ x: 90, y: 90 }, { x: 870, y: 90 }], speed: 80 },
    ],
    cameras: [],
    bushes: [
      { x: 480, y: 160, r: 34 },
      { x: 150, y: 300, r: 34 },
      { x: 810, y: 300, r: 34 },
      { x: 300, y: 480, r: 34 },
      { x: 660, y: 480, r: 34 },
    ],
    shadows: [
      { x: 420, y: 210, w: 120, h: 60 },
      { x: 120, y: 180, w: 120, h: 60 },
      { x: 720, y: 440, w: 120, h: 60 },
    ],
    relics: [
      { x: 480, y: 80 },
      { x: 120, y: 90 },
      { x: 840, y: 530 },
      { x: 120, y: 530 },
    ],
  },
  {
    name: 'Floor 4 — The Gallery',
    start: { x: 80, y: 520 },
    exit: { x: 880, y: 60 },
    noisemakers: 4,
    walls: [
      ...borderWalls(),
      { x: 170, y: 115, w: 210, h: 40 },
      { x: 580, y: 115, w: 210, h: 40 },
      { x: 170, y: 345, w: 210, h: 40 },
      { x: 580, y: 345, w: 210, h: 40 },
    ],
    guards: [
      { path: [{ x: 90, y: 240 }, { x: 870, y: 240 }], speed: 90 },
      { path: [{ x: 870, y: 460 }, { x: 90, y: 460 }], speed: 90 },
      { path: [{ x: 480, y: 80 }, { x: 480, y: 520 }], speed: 75 },
    ],
    cameras: [
      { x: 480, y: 40, base: Math.PI / 2, sweep: 0.9, range: 235, speed: 0.55 },
      { x: 480, y: 560, base: -Math.PI / 2, sweep: 0.9, range: 235, speed: 0.55 },
    ],
    bushes: [
      { x: 150, y: 200, r: 34 },
      { x: 810, y: 200, r: 34 },
      { x: 150, y: 450, r: 34 },
      { x: 810, y: 450, r: 34 },
    ],
    shadows: [
      { x: 400, y: 200, w: 160, h: 60 },
      { x: 640, y: 440, w: 160, h: 60 },
      { x: 120, y: 440, w: 140, h: 60 },
    ],
    relics: [
      { x: 120, y: 90 },
      { x: 840, y: 90 },
      { x: 120, y: 530 },
      { x: 840, y: 530 },
    ],
  },
  {
    name: 'Floor 5 — The Ledger Room',
    start: { x: 80, y: 520 },
    exit: { x: 880, y: 60 },
    noisemakers: 4,
    walls: [
      ...borderWalls(),
      { x: 190, y: 125, w: 200, h: 40 },
      { x: 570, y: 125, w: 200, h: 40 },
      { x: 190, y: 335, w: 200, h: 40 },
      { x: 570, y: 335, w: 200, h: 40 },
    ],
    guards: [
      { path: [{ x: 90, y: 250 }, { x: 870, y: 250 }], speed: 95 },
      { path: [{ x: 870, y: 450 }, { x: 90, y: 450 }], speed: 95 },
      { path: [{ x: 480, y: 80 }, { x: 480, y: 520 }], speed: 80 },
      { path: [{ x: 90, y: 90 }, { x: 870, y: 90 }], speed: 80 },
    ],
    cameras: [
      { x: 480, y: 40, base: Math.PI / 2, sweep: 0.9, range: 235, speed: 0.6 },
      { x: 90, y: 300, base: 0, sweep: 0.8, range: 235, speed: 0.5 },
    ],
    bushes: [
      { x: 400, y: 290, r: 30 },
      { x: 560, y: 290, r: 30 },
      { x: 150, y: 300, r: 34 },
      { x: 810, y: 300, r: 34 },
      { x: 300, y: 480, r: 34 },
      { x: 660, y: 480, r: 34 },
    ],
    shadows: [
      { x: 420, y: 210, w: 120, h: 60 },
      { x: 120, y: 440, w: 140, h: 60 },
      { x: 700, y: 440, w: 140, h: 60 },
    ],
    relics: [
      { x: 120, y: 530 },
      { x: 840, y: 530 },
      { x: 480, y: 300, ledger: true },
    ],
  },
];
