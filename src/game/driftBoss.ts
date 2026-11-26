export const CAR = { len: 40, width: 20 };
export const WHEEL_POS: [number, number][] = [
  [-12, -10],
  [-12, 10],
  [12, -10],
  [12, 10],
];

export const DRIFT = {
  sample: 8,
  speedStart: 230,
  speedMax: 340,
  speedPerPx: 0.025,
  turnMax: 7,
  turnFollow: 8,
  turnAccel: 20,
  grip: 8,
  slideGrip: 3.5,
  airGrip: 1.5,
  startStraight: 500,
  segMin: 180,
  segMax: 420,
  wideWidth: 150,
  narrowWidth: 85,
  wideFirst: 150,
  zoneLen: 100,
  coinEvery: 9,
  coinChance: 0.75,
  coinPickup: 24,
  rampChance: 0.35,
  rampGap: 160,
  rampLen: 16,
  rampHeight: 20,
  launchRate: 60,
  launchK: 1.6,
  landCooldown: 0.25,
  gravity: 900,
  smokeSlip: 0.22,
  fallTime: 1,
  fallDrop: 120,
  wheelsOffToFall: 2,
  edgeGrace: 0.25,
};

const VEC = [
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];
const ANG = [Math.PI, -Math.PI / 2];

export interface Pt {
  x: number;
  y: number;
  dir: number;
  w: number;
  lift: number;
  coin: boolean;
  taken: boolean;
}

export interface Track {
  pts: Pt[];
  x: number;
  y: number;
  dir: number;
  sinceCoin: number;
  lastRamp: number;
}

export interface Smoke {
  x: number;
  y: number;
  z: number;
  age: number;
  life: number;
  r: number;
}

export interface Mark {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  z: number;
  on: boolean;
}

export interface Game {
  track: Track;
  idx: number;
  x: number;
  y: number;
  h: number;
  av: number;
  vx: number;
  vy: number;
  z: number;
  vz: number;
  ground: number;
  cool: number;
  air: boolean;
  dist: number;
  coins: number;
  phase: "play" | "fall" | "over";
  fallT: number;
  offT: number;
  smoke: Smoke[];
  marks: Mark[];
}

function widthAt(d: number) {
  const s = d / 10;
  if (s < DRIFT.wideFirst) return DRIFT.wideWidth;
  return Math.floor((s - DRIFT.wideFirst) / DRIFT.zoneLen) % 2 === 0 ? DRIFT.narrowWidth : DRIFT.wideWidth;
}

function push(t: Track) {
  t.sinceCoin++;
  const coin = t.sinceCoin >= DRIFT.coinEvery && Math.random() < DRIFT.coinChance;
  if (coin) t.sinceCoin = 0;
  t.pts.push({
    x: t.x,
    y: t.y,
    dir: t.dir,
    w: widthAt(t.pts.length * DRIFT.sample),
    lift: 0,
    coin,
    taken: false,
  });
}

function advance(t: Track, len: number, dir: number) {
  t.dir = dir;
  const steps = Math.round(len / DRIFT.sample);
  for (let i = 0; i < steps; i++) {
    t.x += VEC[dir].x * DRIFT.sample;
    t.y += VEC[dir].y * DRIFT.sample;
    push(t);
  }
  return steps;
}

function addSegment(t: Track) {
  const len = DRIFT.segMin + Math.random() * (DRIFT.segMax - DRIFT.segMin);
  const start = t.pts.length;
  const steps = advance(t, len, 1 - t.dir);
  const L = DRIFT.rampLen;
  if (steps < L + 6 || Math.random() >= DRIFT.rampChance) return;
  const from = start + 2 + Math.floor(Math.random() * (steps - L - 4));
  if (from - t.lastRamp < DRIFT.rampGap) return;
  t.lastRamp = from + L / 2;
  for (let j = 0; j < L; j++) {
    t.pts[from + j].lift = DRIFT.rampHeight * Math.sin((Math.PI * (j + 1)) / (L + 1));
  }
}

function growTrack(t: Track, minLen: number) {
  while (t.pts.length < minLen) addSegment(t);
}

function createTrack(): Track {
  const t: Track = { pts: [], x: 0, y: 0, dir: 1, sinceCoin: 0, lastRamp: -1e9 };
  push(t);
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
    av: 0,
    vx: Math.cos(ANG[0]) * DRIFT.speedStart,
    vy: Math.sin(ANG[0]) * DRIFT.speedStart,
    z: 0,
    vz: 0,
    ground: 0,
    cool: 0,
    air: false,
    dist: 0,
    coins: 0,
    phase: "play",
    fallT: 0,
    offT: 0,
    smoke: [],
    marks: [],
  };
}

function angleDiff(a: number, b: number) {
  const d = a - b;
  return Math.atan2(Math.sin(d), Math.cos(d));
}

function distSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(ax + dx * t - px, ay + dy * t - py);
}

function offRoadWheels(g: Game, best: number) {
  const c = Math.cos(g.h);
  const s = Math.sin(g.h);
  const pts = g.track.pts;
  const half = pts[best].w / 2;
  const lo = Math.max(0, best - 3);
  const hi = Math.min(pts.length - 2, best + 3);
  let n = 0;
  for (const [a, b] of WHEEL_POS) {
    const wx = g.x + c * a - s * b;
    const wy = g.y + s * a + c * b;
    let d = Infinity;
    for (let i = lo; i <= hi; i++) {
      d = Math.min(d, distSeg(wx, wy, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y));
    }
    if (d > half) n++;
  }
  return n;
}

function emitSmoke(g: Game) {
  const side = (Math.random() - 0.5) * 16;
  const c = Math.cos(g.h);
  const s = Math.sin(g.h);
  g.smoke.push({
    x: g.x - c * 16 - s * side,
    y: g.y - s * 16 + c * side,
    z: g.z,
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
  g.marks.push({ ax: rx - s * bw, ay: ry + c * bw, bx: rx + s * bw, by: ry - c * bw, z: g.z, on });
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
  const want = Math.max(-DRIFT.turnMax, Math.min(DRIFT.turnMax, d * DRIFT.turnFollow));
  g.av += (want - g.av) * Math.min(1, DRIFT.turnAccel * dt);
  g.h += g.av * dt;
  const turning = Math.abs(g.av) > 0.05;

  const speed = Math.min(DRIFT.speedMax, DRIFT.speedStart + g.dist * DRIFT.speedPerPx);
  const grip = g.air ? DRIFT.airGrip : turning ? DRIFT.slideGrip : DRIFT.grip;
  const k = Math.min(1, grip * dt);
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
  g.dist = Math.max(g.dist, best * DRIFT.sample);

  const ground = pts[best].lift;
  g.cool = Math.max(0, g.cool - dt);
  if (g.air) {
    g.vz -= DRIFT.gravity * dt;
    g.z += g.vz * dt;
    if (g.vz <= 0 && g.z <= ground) {
      g.air = false;
      g.z = ground;
      g.vz = 0;
      g.cool = DRIFT.landCooldown;
    }
  } else {
    const rate = (ground - g.ground) / dt;
    if (rate < -DRIFT.launchRate && g.cool <= 0) {
      g.air = true;
      g.vz = -rate * DRIFT.launchK;
    } else {
      g.z = ground;
    }
  }
  g.ground = ground;

  const off = !g.air && offRoadWheels(g, best) >= DRIFT.wheelsOffToFall;
  g.offT = off ? g.offT + dt : 0;
  if (g.offT > DRIFT.edgeGrace) {
    g.phase = "fall";
    g.fallT = 0;
    updateSmoke(g, dt);
    return;
  }

  for (let i = Math.max(0, best - 4); i <= Math.min(pts.length - 1, best + 6); i++) {
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
