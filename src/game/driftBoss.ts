export const CAR = { len: 40, width: 20 };
export const WHEEL_POS: [number, number][] = [
  [-12, -10],
  [-12, 10],
  [12, -10],
  [12, 10],
];

export const DRIFT = {
  sample: 8,
  speedStart: 150,
  speedMax: 330,
  speedPerPx: 0.018,
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
  launchK: 0.4,
  launchSlope: 0.5,
  landCooldown: 0.25,
  gravity: 900,
  smokeSlip: 0.22,
  fallTime: 1,
  fallDrop: 120,
  wheelsOffToFall: 2,
  edgeGrace: 0.25,
  rollPerAv: 0.06,
  rollMax: 0.45,
  rollRate: 6,
  fallRoll: 1.2,
  pitchRate: 8,
  pitchMax: 0.5,
  copLag: 0.12,
  copSpawnLag: 0.3,
  copSpawnEvery: 10,
  copGap: 14,
  copSpeedGain: 0.8,
  copTurnAccel: 12,
  copHaltGain: 2.2,
  copRadius: 16,
  carRadius: 20,
  propMinGap: 14,
  propChance: 0.45,
  propStartIdx: 90,
  propRadius: 7,
  propKick: 90,
  propKickUp: 170,
  propDrag: 2.2,
  propLife: 2.2,
  sparkCount: 14,
  sparkLife: 0.5,
  sparkGravity: 500,
};

const VEC = [
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];
const ANG = [Math.PI, -Math.PI / 2];
const SMOKE_SHADES = [176, 190, 204, 218, 232];
const PROP_KINDS: PropKind[] = ["barrel", "crate", "bin"];

export interface Pt {
  x: number;
  y: number;
  dir: number;
  w: number;
  lift: number;
  coin: boolean;
  taken: boolean;
}

export type PropKind = "barrel" | "crate" | "bin";

export interface Prop {
  kind: PropKind;
  idx: number;
  x: number;
  y: number;
  z: number;
  state: "idle" | "flying";
  vx: number;
  vy: number;
  vz: number;
  rot: number;
  spin: number;
  age: number;
}

export interface Track {
  pts: Pt[];
  props: Prop[];
  x: number;
  y: number;
  dir: number;
  sinceCoin: number;
  sinceProp: number;
  lastRamp: number;
}

export interface Smoke {
  x: number;
  y: number;
  z: number;
  age: number;
  life: number;
  r: number;
  shade: number;
}

export interface Spark {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
}

export interface Mark {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  z: number;
  on: boolean;
}

export interface Pose {
  x: number;
  y: number;
  z: number;
  h: number;
  roll: number;
  pitch: number;
  ground: number;
  air: boolean;
}

export interface Cop extends Pose {
  av: number;
  vx: number;
  vy: number;
  idx: number;
  offT: number;
  speed: number;
  phase: "chase" | "halt" | "fall";
  fallT: number;
  fallSide: number;
}

interface Hist {
  t: number;
  x: number;
  y: number;
  h: number;
  v: number;
}

export interface Game extends Pose {
  track: Track;
  idx: number;
  av: number;
  vx: number;
  vy: number;
  vz: number;
  cool: number;
  dist: number;
  coins: number;
  phase: "play" | "fall" | "over";
  fallT: number;
  offT: number;
  fallSide: number;
  t: number;
  hist: Hist[];
  cops: Cop[];
  copTimer: number;
  smoke: Smoke[];
  sparks: Spark[];
  marks: Mark[];
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
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
  const w = widthAt(t.pts.length * DRIFT.sample);
  const idx = t.pts.length;
  const pt: Pt = { x: t.x, y: t.y, dir: t.dir, w, lift: 0, coin, taken: false };
  t.pts.push(pt);
  t.sinceProp++;
  if (idx >= DRIFT.propStartIdx && !coin && t.sinceProp >= DRIFT.propMinGap && Math.random() < DRIFT.propChance) {
    t.sinceProp = 0;
    const lat = (Math.random() * 2 - 1) * (w / 2 - 16);
    t.props.push({
      kind: PROP_KINDS[Math.floor(Math.random() * PROP_KINDS.length)],
      idx,
      x: t.dir === 0 ? pt.x : pt.x + lat,
      y: t.dir === 0 ? pt.y + lat : pt.y,
      z: 0,
      state: "idle",
      vx: 0,
      vy: 0,
      vz: 0,
      rot: 0,
      spin: 0,
      age: 0,
    });
  }
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
  const t: Track = { pts: [], props: [], x: 0, y: 0, dir: 0, sinceCoin: 0, sinceProp: 0, lastRamp: -1e9 };
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
    pitch: 0,
    roll: 0,
    cool: 0,
    air: false,
    dist: 0,
    coins: 0,
    phase: "play",
    fallT: 0,
    offT: 0,
    fallSide: 0,
    t: 0,
    hist: [],
    cops: [],
    copTimer: DRIFT.copSpawnEvery,
    smoke: [],
    sparks: [],
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
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
  return Math.hypot(ax + dx * t - px, ay + dy * t - py);
}

function nearestIdx(pts: Pt[], x: number, y: number, lo: number, hi: number) {
  let best = lo;
  let bestD = Infinity;
  for (let i = lo; i <= hi; i++) {
    const dx = pts[i].x - x;
    const dy = pts[i].y - y;
    const dd = dx * dx + dy * dy;
    if (dd < bestD) {
      bestD = dd;
      best = i;
    }
  }
  return best;
}

function surfaceAt(pts: Pt[], i: number, x: number, y: number) {
  const last = pts.length - 2;
  const i0 = clamp(i, 0, last);
  const ahead = (x - pts[i0].x) * (pts[i0 + 1].x - pts[i0].x) + (y - pts[i0].y) * (pts[i0 + 1].y - pts[i0].y) >= 0;
  const s = clamp(ahead ? i0 : i0 - 1, 0, last);
  const a = pts[s];
  const b = pts[s + 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  const slopeAt = (k: number) => (pts[k + 1].lift - pts[k].lift) / DRIFT.sample;
  const slope = slopeAt(s);
  return {
    lift: a.lift + (b.lift - a.lift) * t,
    slope,
    curv: (slope - slopeAt(clamp(s - 1, 0, last))) / DRIFT.sample,
  };
}

function offRoadWheels(p: { x: number; y: number; h: number }, pts: Pt[], best: number) {
  const c = Math.cos(p.h);
  const s = Math.sin(p.h);
  const half = pts[best].w / 2;
  const lo = Math.max(0, best - 3);
  const hi = Math.min(pts.length - 2, best + 3);
  let n = 0;
  for (const [a, b] of WHEEL_POS) {
    const wx = p.x + c * a - s * b;
    const wy = p.y + s * a + c * b;
    let d = Infinity;
    for (let i = lo; i <= hi; i++) {
      d = Math.min(d, distSeg(wx, wy, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y));
    }
    if (d > half) n++;
  }
  return n;
}

function sideOf(p: { x: number; y: number; h: number }, pt: Pt) {
  const lat = -(p.x - pt.x) * Math.sin(p.h) + (p.y - pt.y) * Math.cos(p.h);
  return lat >= 0 ? 1 : -1;
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
    life: 1.6 + Math.random() * 1,
    r: 6 + Math.random() * 5,
    shade: SMOKE_SHADES[Math.floor(Math.random() * SMOKE_SHADES.length)],
  });
}

function updateSmoke(g: Game, dt: number) {
  for (const p of g.smoke) p.age += dt;
  g.smoke = g.smoke.filter((p) => p.age < p.life);
}

function emitSparks(g: Game, x: number, y: number, z: number) {
  for (let i = 0; i < DRIFT.sparkCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 120 + Math.random() * 180;
    g.sparks.push({
      x,
      y,
      z,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      vz: 80 + Math.random() * 200,
      age: 0,
      life: DRIFT.sparkLife * (0.6 + Math.random() * 0.8),
    });
  }
}

function updateSparks(g: Game, dt: number) {
  const k = Math.exp(-3 * dt);
  for (const s of g.sparks) {
    s.age += dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vx *= k;
    s.vy *= k;
    s.vz -= DRIFT.sparkGravity * dt;
    s.z = Math.max(0, s.z + s.vz * dt);
  }
  g.sparks = g.sparks.filter((s) => s.age < s.life);
}

function hitProps(g: Game, x: number, y: number, vx: number, vy: number, radius: number) {
  const pts = g.track.pts;
  for (const p of g.track.props) {
    if (p.state !== "idle") continue;
    const dx = p.x - x;
    const dy = p.y - y;
    const d = Math.hypot(dx, dy);
    if (d > radius + DRIFT.propRadius) continue;
    const nx = d > 0.01 ? dx / d : 1;
    const ny = d > 0.01 ? dy / d : 0;
    const kick = DRIFT.propKick + Math.hypot(vx, vy) * 0.25;
    p.state = "flying";
    p.age = 0;
    p.z = pts[p.idx].lift;
    p.vx = nx * kick + vx * 0.5;
    p.vy = ny * kick + vy * 0.5;
    p.vz = DRIFT.propKickUp * (0.7 + Math.random() * 0.6);
    p.spin = (Math.random() * 2 - 1) * 10;
    emitSparks(g, (x + p.x) / 2, (y + p.y) / 2, p.z + 6);
  }
}

function updateProps(g: Game, dt: number) {
  const pts = g.track.pts;
  for (const p of g.track.props) {
    if (p.state !== "flying") continue;
    p.age += dt;
    const k = Math.exp(-DRIFT.propDrag * dt);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= k;
    p.vy *= k;
    p.rot += p.spin * dt;
    p.vz -= DRIFT.gravity * dt;
    p.z += p.vz * dt;
    const floor = pts[p.idx].lift;
    if (p.z < floor) {
      p.z = floor;
      p.vz = -p.vz * 0.35;
      p.spin *= 0.6;
      if (Math.abs(p.vz) < 30) p.vz = 0;
    }
  }
  g.track.props = g.track.props.filter((p) => p.state === "idle" || p.age < DRIFT.propLife);
}

function beginFall(g: Game, best: number) {
  const p = g.track.pts[best];
  g.phase = "fall";
  g.fallT = 0;
  g.fallSide = sideOf(g, p);
  for (const c of g.cops) if (c.phase === "chase") c.phase = "halt";
}

function playerDrive(g: Game, holding: boolean, dt: number) {
  const d = angleDiff(holding ? ANG[1] : ANG[0], g.h);
  const want = clamp(d * DRIFT.turnFollow, -DRIFT.turnMax, DRIFT.turnMax);
  g.av += (want - g.av) * Math.min(1, DRIFT.turnAccel * dt);
  g.h += g.av * dt;
  g.roll += (clamp(-g.av * DRIFT.rollPerAv, -DRIFT.rollMax, DRIFT.rollMax) - g.roll) * Math.min(1, DRIFT.rollRate * dt);
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
  const best = nearestIdx(pts, g.x, g.y, Math.max(0, g.idx - 8), Math.min(pts.length - 1, g.idx + 40));
  g.idx = best;
  g.dist = Math.max(g.dist, best * DRIFT.sample);

  const sf = surfaceAt(pts, best, g.x, g.y);
  g.cool = Math.max(0, g.cool - dt);
  if (g.air) {
    g.vz -= DRIFT.gravity * dt;
    g.z += g.vz * dt;
    if (g.vz <= 0 && g.z <= sf.lift) {
      g.air = false;
      g.z = sf.lift;
      g.vz = 0;
      g.cool = DRIFT.landCooldown;
    }
  } else if (g.cool <= 0 && -sf.curv * speed * speed > DRIFT.gravity * DRIFT.launchK) {
    g.air = true;
    g.vz = speed * DRIFT.launchSlope;
  } else {
    g.z = sf.lift;
  }
  g.ground = sf.lift;
  const pitchTarget = g.air ? Math.atan2(g.vz, speed) : Math.atan(sf.slope);
  g.pitch += (clamp(pitchTarget, -DRIFT.pitchMax, DRIFT.pitchMax) - g.pitch) * Math.min(1, DRIFT.pitchRate * dt);

  const off = !g.air && offRoadWheels(g, pts, best) >= DRIFT.wheelsOffToFall;
  g.offT = off ? g.offT + dt : 0;
  if (g.offT > DRIFT.edgeGrace) {
    beginFall(g, best);
    return;
  }

  for (let i = Math.max(0, best - 4); i <= Math.min(pts.length - 1, best + 6); i++) {
    const p = pts[i];
    if (p.coin && !p.taken && !g.air && Math.hypot(p.x - g.x, p.y - g.y) < DRIFT.coinPickup) {
      p.taken = true;
      g.coins++;
    }
  }

  if (!g.air) hitProps(g, g.x, g.y, g.vx, g.vy, DRIFT.carRadius);

  g.hist.push({ t: g.t, x: g.x, y: g.y, h: g.h, v: speed });
  while (g.hist.length > 1 && g.hist[0].t < g.t - DRIFT.copSpawnLag - 1) g.hist.shift();

  const slip = Math.abs(angleDiff(Math.atan2(g.vy, g.vx), g.h));
  const skidding = !g.air && slip > DRIFT.smokeSlip;
  if (skidding) {
    emitSmoke(g);
    emitSmoke(g);
  }
  pushMark(g, skidding);
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

function fallStep(g: Game, dt: number) {
  g.fallT += dt;
  g.roll += (g.fallSide * DRIFT.fallRoll - g.roll) * Math.min(1, DRIFT.rollRate * dt);
  g.x += g.vx * dt;
  g.y += g.vy * dt;
  g.vx *= 1 - 2 * dt;
  g.vy *= 1 - 2 * dt;
  g.z -= DRIFT.fallDrop * dt;
  if (g.fallT >= DRIFT.fallTime) g.phase = "over";
}

function sampleHist(hist: Hist[], t: number): Hist {
  let i = hist.length - 1;
  while (i > 0 && hist[i].t > t) i--;
  if (i >= hist.length - 1) return hist[i];
  const a = hist[i];
  const b = hist[i + 1];
  const f = clamp((t - a.t) / (b.t - a.t || 1), 0, 1);
  return {
    t,
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    h: a.h + angleDiff(b.h, a.h) * f,
    v: a.v + (b.v - a.v) * f,
  };
}

function spawnCop(g: Game) {
  if (g.hist.length === 0) return;
  const pts = g.track.pts;
  const s = sampleHist(g.hist, g.t - DRIFT.copSpawnLag);
  const idx = nearestIdx(pts, s.x, s.y, Math.max(0, g.idx - 200), g.idx);
  const sf = surfaceAt(pts, idx, s.x, s.y);
  g.cops.push({
    x: s.x,
    y: s.y,
    z: sf.lift,
    ground: sf.lift,
    h: s.h,
    roll: 0,
    pitch: 0,
    air: false,
    av: 0,
    vx: Math.cos(s.h) * s.v,
    vy: Math.sin(s.h) * s.v,
    idx,
    offT: 0,
    speed: s.v,
    phase: "chase",
    fallT: 0,
    fallSide: 0,
  });
}

function copDrive(g: Game, c: Cop, dt: number) {
  const pts = g.track.pts;
  const tt = c.phase === "halt" ? Math.min(g.t - DRIFT.copLag, g.hist[g.hist.length - 1].t) : g.t - DRIFT.copLag;
  const s = sampleHist(g.hist, tt);
  const dx = s.x - c.x;
  const dy = s.y - c.y;
  const dist = Math.hypot(dx, dy);
  const desired = dist > 12 ? Math.atan2(dy, dx) : ANG[pts[c.idx].dir];
  const want = clamp(angleDiff(desired, c.h) * DRIFT.turnFollow, -DRIFT.turnMax, DRIFT.turnMax);
  c.av += (want - c.av) * Math.min(1, DRIFT.copTurnAccel * dt);
  c.h += c.av * dt;

  const cmd =
    c.phase === "halt"
      ? Math.min(s.v, dist * DRIFT.copHaltGain)
      : clamp(s.v + (dist - DRIFT.copGap) * DRIFT.copSpeedGain, 0, DRIFT.speedMax + 20);
  c.speed += (cmd - c.speed) * Math.min(1, 4 * dt);
  const grip = Math.abs(c.av) > 0.05 ? DRIFT.slideGrip : DRIFT.grip;
  const k = Math.min(1, grip * dt);
  c.vx += (Math.cos(c.h) * c.speed - c.vx) * k;
  c.vy += (Math.sin(c.h) * c.speed - c.vy) * k;
  c.x += c.vx * dt;
  c.y += c.vy * dt;

  c.idx = nearestIdx(pts, c.x, c.y, Math.max(0, c.idx - 8), Math.min(pts.length - 1, c.idx + 40));
  const sf = surfaceAt(pts, c.idx, c.x, c.y);
  c.ground = sf.lift;
  c.z = sf.lift;
  c.pitch += (clamp(Math.atan(sf.slope), -DRIFT.pitchMax, DRIFT.pitchMax) - c.pitch) * Math.min(1, DRIFT.pitchRate * dt);
  c.roll += (clamp(-c.av * DRIFT.rollPerAv, -DRIFT.rollMax, DRIFT.rollMax) - c.roll) * Math.min(1, DRIFT.rollRate * dt);

  const off = offRoadWheels(c, pts, c.idx) >= DRIFT.wheelsOffToFall;
  c.offT = off ? c.offT + dt : 0;
  if (c.phase === "chase" && c.offT > DRIFT.edgeGrace) {
    c.phase = "fall";
    c.fallT = 0;
    c.fallSide = sideOf(c, pts[c.idx]);
  }
}

function copFall(c: Cop, dt: number) {
  c.fallT += dt;
  c.roll += (c.fallSide * DRIFT.fallRoll - c.roll) * Math.min(1, DRIFT.rollRate * dt);
  c.x += c.vx * dt;
  c.y += c.vy * dt;
  c.vx *= 1 - 2 * dt;
  c.vy *= 1 - 2 * dt;
  c.z -= DRIFT.fallDrop * dt;
}

function collideCops(cops: Cop[]) {
  const R = DRIFT.copRadius * 2;
  for (let i = 0; i < cops.length; i++) {
    for (let j = i + 1; j < cops.length; j++) {
      const a = cops[i];
      const b = cops[j];
      if (a.phase === "fall" || b.phase === "fall") continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d >= R || d < 1e-3) continue;
      const nx = dx / d;
      const ny = dy / d;
      const push = (R - d) / 2;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (vn < 0) {
        const imp = vn * 0.5;
        a.vx += nx * imp;
        a.vy += ny * imp;
        b.vx -= nx * imp;
        b.vy -= ny * imp;
      }
    }
  }
}

function stepCops(g: Game, dt: number) {
  if (g.phase === "play") {
    g.copTimer -= dt;
    if (g.copTimer <= 0) {
      spawnCop(g);
      g.copTimer += DRIFT.copSpawnEvery;
    }
  }
  for (const c of g.cops) {
    if (c.phase === "fall") copFall(c, dt);
    else copDrive(g, c, dt);
  }
  collideCops(g.cops);
  for (const c of g.cops) {
    if (c.phase !== "fall") hitProps(g, c.x, c.y, c.vx, c.vy, DRIFT.copRadius);
  }
  g.cops = g.cops.filter((c) => c.phase !== "fall" || c.fallT < DRIFT.fallTime);
}

function tail(g: Game, dt: number) {
  stepCops(g, dt);
  updateProps(g, dt);
  updateSparks(g, dt);
  updateSmoke(g, dt);
}

export function step(g: Game, holding: boolean, dt: number) {
  if (g.phase === "over") {
    tail(g, dt);
    return;
  }
  if (g.idx > g.track.pts.length - 400) growTrack(g.track, g.idx + 600);
  g.t += dt;
  if (g.phase === "fall") fallStep(g, dt);
  else playerDrive(g, holding, dt);
  tail(g, dt);
}

export function scoreOf(g: Game) {
  return Math.floor(g.dist / 10) + g.coins * 10;
}
