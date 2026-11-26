export const DRIFT = {
  sample: 8,
  speedStart: 230,
  speedMax: 320,
  speedPerPx: 0.03,
  turnRate: 3.1,
  grip: 4,
  airGrip: 1.5,
  trackWidth: 120,
  carMargin: 12,
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

export interface Pt {
  x: number;
  y: number;
  ramp: boolean;
  coin: boolean;
  taken: boolean;
  used: boolean;
}

export interface Track {
  pts: Pt[];
  x: number;
  y: number;
  h: number;
  sinceCoin: number;
}

export interface Smoke {
  x: number;
  y: number;
  age: number;
  life: number;
  r: number;
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
}

function push(t: Track, ramp: boolean) {
  t.sinceCoin++;
  const coin = t.sinceCoin >= DRIFT.coinEvery && Math.random() < DRIFT.coinChance;
  if (coin) t.sinceCoin = 0;
  t.pts.push({ x: t.x, y: t.y, ramp, coin, taken: false, used: false });
}

function advance(t: Track, steps: number, turn: number) {
  for (let i = 0; i < steps; i++) {
    t.h += turn / steps;
    t.x += Math.cos(t.h) * DRIFT.sample;
    t.y += Math.sin(t.h) * DRIFT.sample;
    push(t, false);
  }
}

function addStraight(t: Track, len: number) {
  const steps = Math.round(len / DRIFT.sample);
  const start = t.pts.length;
  advance(t, steps, 0);
  if (steps >= 20 && Math.random() < DRIFT.rampChance) {
    t.pts[start + Math.floor(steps / 2)].ramp = true;
  }
}

function addTurn(t: Track) {
  const deg = (60 + Math.random() * 40) * (Math.PI / 180);
  let delta = (Math.random() < 0.5 ? 1 : -1) * deg;
  if (Math.abs(t.h + delta) > 1.7) delta = -delta;
  const radius = 150 + Math.random() * 70;
  advance(t, Math.max(4, Math.round((radius * deg) / DRIFT.sample)), delta);
}

function addSegment(t: Track) {
  if (Math.random() < 0.5) addStraight(t, 240 + Math.random() * 260);
  else addTurn(t);
}

function growTrack(t: Track, minLen: number) {
  while (t.pts.length < minLen) addSegment(t);
}

function createTrack(): Track {
  const t: Track = { pts: [], x: 0, y: 0, h: 0, sinceCoin: 0 };
  push(t, false);
  addStraight(t, 500);
  growTrack(t, 400);
  return t;
}

export function createGame(): Game {
  return {
    track: createTrack(),
    idx: 0,
    x: 0,
    y: 0,
    h: 0,
    vx: DRIFT.speedStart,
    vy: 0,
    z: 0,
    vz: 0,
    air: false,
    offset: 0,
    dist: 0,
    coins: 0,
    phase: "play",
    fallT: 0,
    smoke: [],
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

  g.h += (holding ? 1 : -1) * DRIFT.turnRate * dt;
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
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
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
  if (!g.air && slip > DRIFT.smokeSlip && Math.random() < 0.7) emitSmoke(g);
  updateSmoke(g, dt);
}

export function scoreOf(g: Game) {
  return Math.floor(g.dist / 10) + g.coins * 10;
}
