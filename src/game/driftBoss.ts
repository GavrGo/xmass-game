export const CAR = { len: 40, width: 20, height: 9 };

export const DRIFT = {
  sample: 8,
  speedStart: 230,
  speedMax: 340,
  speedPerPx: 0.025,
  turnRate: 7,
  grip: 8,
  airGrip: 1.5,
  startStraight: 500,
  segMin: 180,
  segMax: 420,
  trackWidth: 150,
  carMargin: 14,
  coinEvery: 9,
  coinChance: 0.75,
  coinPickup: 24,
  rampChance: 0.3,
  jumpVz: 240,
  gravity: 900,
  smokeSlip: 0.22,
  fallTime: 1,
  fallDrop: 120,
};

// dir 0 — влево-вверх на экране, dir 1 — вправо-вверх
const VEC = [
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];
const ANG = [Math.PI, -Math.PI / 2];

export interface Pt {
  x: number;
  y: number;
  dir: number;
  ramp: boolean;
  coin: boolean;
  taken: boolean;
  used: boolean;
}

export interface Track {
  pts: Pt[];
  x: number;
  y: number;
  dir: number;
  sinceCoin: number;
}

export interface Smoke {
  x: number;
  y: number;
  age: number;
  life: number;
  r: number;
}

export interface Mark {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  on: boolean;
}

export interface Game {
  track: Track;
  idx: number;
  x: number;
  y: number;
  h: number;
  vx: number;
  vy: number;
  z: number;
  vz: number;
  air: boolean;
  offset: number;
  dist: number;
  coins: number;
  phase: "play" | "fall" | "over";
  fallT: number;
  smoke: Smoke[];
  marks: Mark[];
}

function push(t: Track, ramp: boolean) {
  t.sinceCoin++;
  const coin = t.sinceCoin >= DRIFT.coinEvery && Math.random() < DRIFT.coinChance;
  if (coin) t.sinceCoin = 0;
  t.pts.push({ x: t.x, y: t.y, dir: t.dir, ramp, coin, taken: false, used: false });
}

function advance(t: Track, len: number, dir: number) {
  t.dir = dir;
  const steps = Math.round(len / DRIFT.sample);
  for (let i = 0; i < steps; i++) {
    t.x += VEC[dir].x * DRIFT.sample;
    t.y += VEC[dir].y * DRIFT.sample;
    push(t, false);
  }
  return steps;
}

function addSegment(t: Track) {
  const len = DRIFT.segMin + Math.random() * (DRIFT.segMax - DRIFT.segMin);
  const start = t.pts.length;
  const steps = advance(t, len, 1 - t.dir);
  if (steps >= 20 && Math.random() < DRIFT.rampChance) {
    t.pts[start + Math.floor(steps / 2)].ramp = true;
  }
}

function growTrack(t: Track, minLen: number) {
  while (t.pts.length < minLen) addSegment(t);
}

function createTrack(): Track {
  const t: Track = { pts: [], x: 0, y: 0, dir: 1, sinceCoin: 0 };
  push(t, false);
  advance(t, DRIFT.startStraight, 0);
  growTrack(t, 400);
  return t;
}

export function createGame(): Game {
  return {
    track: createTrack(),
    idx: 0,
    x: 0,
    y: 0,
    h: ANG[0],
    vx: Math.cos(ANG[0]) * DRIFT.speedStart,
    vy: Math.sin(ANG[0]) * DRIFT.speedStart,
    z: 0,
    vz: 0,
    air: false,
    offset: 0,
    dist: 0,
    coins: 0,
    phase: "play",
    fallT: 0,
    smoke: [],
    marks: [],
  };
}

function angleDiff(a: number, b: number) {
  const d = a - b;
  return Math.atan2(Math.sin(d), Math.cos(d));
}

function emitSmoke(g: Game) {
  const side = (Math.random() - 0.5) * 16;
  const c = Math.cos(g.h);
  const s = Math.sin(g.h);
  g.smoke.push({
    x: g.x - c * 16 - s * side,
    y: g.y - s * 16 + c * side,
    age: 0,
    life: 0.6 + Math.random() * 0.4,
    r: 5 + Math.random() * 4,
  });
}

function updateSmoke(g: Game, dt: number) {
  for (const p of g.smoke) p.age += dt;
  g.smoke = g.smoke.filter((p) => p.age < p.life);
}

function pushMark(g: Game, on: boolean) {
  const c = Math.cos(g.h);
  const s = Math.sin(g.h);
  const rx = g.x - c * (CAR.len * 0.35);
  const ry = g.y - s * (CAR.len * 0.35);
  const bw = CAR.width * 0.38;
  g.marks.push({ ax: rx - s * bw, ay: ry + c * bw, bx: rx + s * bw, by: ry - c * bw, on });
  if (g.marks.length > 150) g.marks.splice(0, g.marks.length - 150);
}

export function step(g: Game, holding: boolean, dt: number) {
  if (g.phase === "over") return;
  if (g.idx > g.track.pts.length - 400) growTrack(g.track, g.idx + 600);

  if (g.phase === "fall") {
    g.fallT += dt;
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    g.vx *= 1 - 2 * dt;
    g.vy *= 1 - 2 * dt;
    g.z -= DRIFT.fallDrop * dt;
    if (g.fallT >= DRIFT.fallTime) g.phase = "over";
    updateSmoke(g, dt);
    return;
  }

  const d = angleDiff(holding ? ANG[1] : ANG[0], g.h);
  g.h += Math.sign(d) * Math.min(Math.abs(d), DRIFT.turnRate * dt);

  const speed = Math.min(DRIFT.speedMax, DRIFT.speedStart + g.dist * DRIFT.speedPerPx);
  const k = Math.min(1, (g.air ? DRIFT.airGrip : DRIFT.grip) * dt);
  g.vx += (Math.cos(g.h) * speed - g.vx) * k;
  g.vy += (Math.sin(g.h) * speed - g.vy) * k;
  const m = Math.hypot(g.vx, g.vy) || 1;
  g.vx = (g.vx / m) * speed;
  g.vy = (g.vy / m) * speed;
  g.x += g.vx * dt;
  g.y += g.vy * dt;

  const pts = g.track.pts;
  let best = g.idx;
  let bestD = Infinity;
  const from = Math.max(0, g.idx - 8);
  const to = Math.min(pts.length - 1, g.idx + 40);
  for (let i = from; i <= to; i++) {
    const dx = pts[i].x - g.x;
    const dy = pts[i].y - g.y;
    const dd = dx * dx + dy * dy;
    if (dd < bestD) {
      bestD = dd;
      best = i;
    }
  }
  g.idx = best;
  g.offset = Math.sqrt(bestD);
  g.dist = Math.max(g.dist, best * DRIFT.sample);

  if (g.air) {
    g.vz -= DRIFT.gravity * dt;
    g.z += g.vz * dt;
    if (g.z <= 0) {
      g.z = 0;
      g.vz = 0;
      g.air = false;
    }
  } else if (pts[g.idx].ramp && !pts[g.idx].used) {
    pts[g.idx].used = true;
    g.air = true;
    g.vz = DRIFT.jumpVz;
  }

  if (!g.air && g.offset > DRIFT.trackWidth / 2 - DRIFT.carMargin) {
    g.phase = "fall";
    g.fallT = 0;
    updateSmoke(g, dt);
    return;
  }

  for (let i = Math.max(0, g.idx - 4); i <= Math.min(pts.length - 1, g.idx + 6); i++) {
    const p = pts[i];
    if (p.coin && !p.taken && !g.air && Math.hypot(p.x - g.x, p.y - g.y) < DRIFT.coinPickup) {
      p.taken = true;
      g.coins++;
    }
  }

  const slip = Math.abs(angleDiff(Math.atan2(g.vy, g.vx), g.h));
  const skidding = !g.air && slip > DRIFT.smokeSlip;
  if (skidding && Math.random() < 0.7) emitSmoke(g);
  pushMark(g, skidding);
  updateSmoke(g, dt);
}

export function scoreOf(g: Game) {
  return Math.floor(g.dist / 10) + g.coins * 10;
}
