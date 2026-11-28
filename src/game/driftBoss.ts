import { ДРИФТ_БОСС } from "../config";
import { бонусЗарплатыПроц } from "./effects";
import { CAR_MODEL_COUNT } from "./carModels";

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
  coinGapMin: 20,
  coinGapMax: 40,
  coinRunMin: 6,
  coinRunMax: 14,
  coinStep: 3,
  coinPickup: 24,
  rampChance: 0.35,
  rampGap: 160,
  rampLen: 16,
  rampHeight: 20,
  launchK: 0.4,
  launchSlope: 0.7,
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
  copLag: 0.5,
  copEnterLag: 1.4,
  copEnterTau: 1.2,
  copSpawnFirst: 5,
  copSpawnEvery: 10,
  copWearTime: 35,
  copWornGrip: 0.2,
  copSlide: 0.5,
  copSkidRate: 0.6,
  copLane: 20,
  copWander: 6,
  copLaneK: 6,
  copWearReach: 40,
  copHaltDecel: 260,
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
  policeChance: 0.2,
  policeHalf: 20,
  policeFence: 14,
  policeReach: 12,
  leanAngle: 0.6,
  leanIn: 0.15,
  leanTime: 1,
  leanDecay: 6,
  sparkCount: 14,
  sparkLife: 0.5,
  sparkGravity: 500,
  splashCount: 44,
  splashLife: 0.9,
  splashKick: 170,
  rippleLife: 1.0,
  copJitter: 0.15,
  leafCount: 22,
  leafNear: 100,
  leafAhead: 90,
  leafRadius: 26,
  leafKick: 260,
  leafLife: 3.2,
  leafCull: 1800,
  leafBehind: 1000,
  forkChance: 0.32,
  forkAxisMin: 120,
  forkAxisMax: 180,
  forkLegMin: 14,
  forkLegCountMin: 3,
  forkLegCountMax: 4,
  forkSep: 17,
  forkRampChance: 0.6,
  boomTime: 1.5,
  rampJunctionGap: 10,
  maxHealth: 5,
  forkMinGap: 380,
  routeSlack: 2,
  smokeChance: 0.35,
  copCull: 200,
  repairMinGap: 150,
  repairChance: 0.004,
  repairHeal: 2,
  repairReach: 46,
  smokeMax: 90,
  sparkMax: 160,
  distPerPoint: 1000,
  distMult: 1.07,
  coinPoints: 1,
  copKillPoints: 30,
  popLife: 1.1,
  durabilityHp: 5,
  insuranceInvuln: 2,
  insuranceRamp: 6,
  insuranceSlow: 0.55,
  collectorBoost: 1.5,
  collectorBoostPlus: 2,
  slowmoSpeed: 290,
  slowmoScale: 0.45,
  slowmoTime: 0.9,
  slowmoJumpsMin: 3,
  slowmoJumpsMax: 4,
  camZoomStart: 30,
  camZoomRamp: 8,
  camZoomOut: 0.25,
  rewindDelay: 2,
  rewindTime: 1.3,
  rewindSpan: 16,
};

const VEC = [
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];
const ANG = [Math.PI, -Math.PI / 2];
const SMOKE_SHADES = [70, 84, 98, 112, 126];
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

export type PropKind = "barrel" | "crate" | "bin" | "police" | "barrier";

export interface Prop {
  kind: PropKind;
  idx: number;
  x: number;
  y: number;
  dir: number;
  lift: number;
  z: number;
  state: "idle" | "flying" | "leaning";
  vx: number;
  vy: number;
  vz: number;
  rot: number;
  spin: number;
  tilt: number;
  leanSide: number;
  age: number;
  struck: boolean;
}

export interface Repair {
  idx: number;
  x: number;
  y: number;
  taken: boolean;
}

interface CoinGen {
  on: boolean;
  left: number;
  pos: number;
  acc: number;
}

export interface Track {
  pts: Pt[];
  alt: Pt[];
  width: number;
  сложность: СложностьДрифта;
  forkEnd: number;
  props: Prop[];
  x: number;
  y: number;
  dir: number;
  coinGen: CoinGen;
  sinceProp: number;
  sinceRepair: number;
  repairs: Repair[];
  lastRamp: number;
  coinBoost: number;
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

export interface Leaf {
  x: number;
  y: number;
  z: number;
  floor: number;
  vx: number;
  vy: number;
  vz: number;
  rot: number;
  spin: number;
  age: number;
  fly: boolean;
  tone: number;
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
  route: number;
  offT: number;
  speed: number;
  phase: "enter" | "chase" | "halt" | "fall";
  age: number;
  slide: number;
  slideV: number;
  laneTarget: number;
  laneT: number;
  lag: number;
  fallT: number;
  fallSide: number;
  marks: Mark[];
  jit: number;
  home: number;
}

interface Hist {
  t: number;
  x: number;
  y: number;
  h: number;
  v: number;
  route: number;
}

export interface Pop {
  x: number;
  y: number;
  z: number;
  age: number;
}

export interface Game extends Pose {
  track: Track;
  route: number;
  idx: number;
  av: number;
  vx: number;
  vy: number;
  vz: number;
  cool: number;
  dist: number;
  coins: number;
  phase: "play" | "fall" | "boom" | "rewind" | "over";
  fallT: number;
  offT: number;
  fallSide: number;
  t: number;
  hist: Hist[];
  cops: Cop[];
  copTimer: number;
  leaves: Leaf[];
  smoke: Smoke[];
  sparks: Spark[];
  splash: Spark[];
  ripples: { x: number; y: number; age: number }[];
  paint: number;
  model: number;
  сложность: СложностьДрифта;
  marks: Mark[];
  health: number;
  boomT: number;
  kills: number;
  pops: Pop[];
  maxHealth: number;
  bumpers: boolean;
  insuranceLeft: number;
  invulnT: number;
  speedLag: number;
  speedFrom: number;
  speedTo: number;
  slowT: number;
  jumpsHigh: number;
  jumpsNeed: number;
  pendingRevive: boolean;   // страховка уже сработала, идёт сценка гибели
  deadT: number;            // сколько секунд прошло с момента гибели
  rewindT: number;          // прогресс сценки «перемотки»
  rewindFrom: number;
  rewindTo: number;
  sideSkirts: boolean;      // Прочность+: боковые накладки
}

/** Навыки Drift Boss, открытые по уровню мастерства. */
export interface НавыкиДрифта {
  прочность: boolean;
  прочностьПлюс: boolean;
  страховка: number;      // сколько восстановлений доступно за забег
  коллекционер: number;   // множитель количества монет на дороге
}

export const БЕЗ_НАВЫКОВ: НавыкиДрифта = { прочность: false, прочностьПлюс: false, страховка: 0, коллекционер: 1 };

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Сложность заезда.
 * normal   — штатные правила: полный разгон, дорога чередует узкие и широкие зоны.
 * training — «Тренировочный»: разгон вдвое медленнее, дорога почти не сужается,
 *            фишки идут с множителем 0.1 и в рекорды такой заезд не попадает.
 */
export type СложностьДрифта = "normal" | "training";

export interface ПравилаСложности {
  название: string;
  подпись?: string;
  /** <1 — скорость набирается медленнее (0.5 = в два раза). */
  множительРазгона: number;
  /** Доля узких зон: 0 — штатное чередование, 0.1 — сужение раз в 10 зон. */
  доляУзкихЗон: number;
  множительНаград: number;
  вРекордах: boolean;
}

export const ДРИФТ_СЛОЖНОСТИ: Record<СложностьДрифта, ПравилаСложности> = {
  normal: {
    название: "Обычный",
    подпись: "Полный разгон, дорога сужается как обычно",
    множительРазгона: 1,
    доляУзкихЗон: 0,
    множительНаград: 1,
    вРекордах: true,
  },
  training: {
    название: "Тренировочный",
    подпись: "Разгон в 2 раза медленнее, дороги почти не сужаются",
    множительРазгона: 0.5,
    доляУзкихЗон: 0.1,
    множительНаград: 0.1,
    вРекордах: false,
  },
};

function widthAt(d: number, сложность: СложностьДрифта = "normal") {
  const s = d / 10;
  if (s < DRIFT.wideFirst) return DRIFT.wideWidth;
  const зона = Math.floor((s - DRIFT.wideFirst) / DRIFT.zoneLen);
  const доля = ДРИФТ_СЛОЖНОСТИ[сложность].доляУзкихЗон;
  if (доля > 0) {
    // Тренировка: узкая зона попадается редко, остальное время дорога широкая.
    const шаг = Math.max(2, Math.round(1 / доля));
    return зона > 0 && зона % шаг === 0 ? DRIFT.narrowWidth : DRIFT.wideWidth;
  }
  return зона % 2 === 0 ? DRIFT.narrowWidth : DRIFT.wideWidth;
}

export function routePts(track: Track, route: number) {
  return route ? track.alt : track.pts;
}

function routeDist(x: number, y: number, pts: Pt[], i: number) {
  const k = clamp(i, 0, pts.length - 2);
  return distSeg(x, y, pts[k].x, pts[k].y, pts[k + 1].x, pts[k + 1].y);
}

function randInt(lo: number, hi: number) {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function newCoinGen(): CoinGen {
  return { on: false, left: randInt(DRIFT.coinGapMin, DRIFT.coinGapMax), pos: 0, acc: 0 };
}

function nextCoin(c: CoinGen, boost = 1): boolean {
  if (c.left <= 0) {
    c.on = !c.on;
    c.left = c.on ? randInt(DRIFT.coinRunMin, DRIFT.coinRunMax) : randInt(DRIFT.coinGapMin, DRIFT.coinGapMax);
    c.pos = 0;
    c.acc = 0;
  }
  // Плотность монет в дорожке: шаг уменьшается пропорционально множителю.
  const шаг = DRIFT.coinStep / Math.max(1, boost);
  c.acc += 1;
  const coin = c.on && c.acc >= шаг;
  if (coin) c.acc -= шаг;
  c.left--;
  c.pos++;
  return coin;
}

function push(t: Track) {
  const j = t.pts.length;
  const coin = nextCoin(t.coinGen, t.coinBoost);
  const w = t.width;
  const pt: Pt = { x: t.x, y: t.y, dir: t.dir, w, lift: 0, coin, taken: false };
  t.pts.push(pt);
  t.alt.push(pt);
  t.sinceProp++;
  if (j >= DRIFT.propStartIdx && !coin && t.sinceProp >= DRIFT.propMinGap && Math.random() < DRIFT.propChance) {
    t.sinceProp = 0;
    spawnProp(t, pt, j);
  }
  t.sinceRepair++;
  if (j >= DRIFT.propStartIdx && !coin && t.sinceRepair >= DRIFT.repairMinGap && Math.random() < DRIFT.repairChance) {
    t.sinceRepair = 0;
    const lat = (Math.random() * 2 - 1) * (w / 2 - 30);
    t.repairs.push({ idx: j, x: pt.dir === 0 ? pt.x : pt.x + lat, y: pt.dir === 0 ? pt.y + lat : pt.y, taken: false });
  }
}

function spawnProp(t: Track, at: Pt, idx: number) {
  const w = at.w;
  const police = w === DRIFT.wideWidth && Math.random() < DRIFT.policeChance;
  const lat = (Math.random() * 2 - 1) * (w / 2 - (police ? DRIFT.policeHalf + 4 : 16));
  const x = at.dir === 0 ? at.x : at.x + lat;
  const y = at.dir === 0 ? at.y + lat : at.y;
  if (police) {
    t.props.push(
      makeProp("police", idx, x, y, at.dir, at.lift),
      makeProp("barrier", idx, x - VEC[at.dir].x * DRIFT.policeFence, y - VEC[at.dir].y * DRIFT.policeFence, at.dir, at.lift),
    );
  } else {
    t.props.push(makeProp(PROP_KINDS[Math.floor(Math.random() * PROP_KINDS.length)], idx, x, y, at.dir, at.lift));
  }
}

function makeProp(kind: PropKind, idx: number, x: number, y: number, dir: number, lift: number): Prop {
  return { kind, idx, x, y, dir, lift, z: 0, state: "idle", vx: 0, vy: 0, vz: 0, rot: 0, spin: 0, tilt: 0, leanSide: 0, age: 0, struck: false };
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

interface Leg {
  axis: number;
  len: number;
}

function splitLen(total: number, count: number): number[] {
  const w = Array.from({ length: count }, () => 0.5 + Math.random());
  const sum = w.reduce((a, b) => a + b, 0);
  const spare = total - count * DRIFT.forkLegMin;
  const parts = w.map((x) => DRIFT.forkLegMin + Math.floor((spare * x) / sum));
  parts[count - 1] += total - parts.reduce((a, b) => a + b, 0);
  return parts;
}

function legsFrom(startAxis: number, count: number, A: number, B: number): Leg[] {
  const need = [0, 0];
  for (let k = 0; k < count; k++) need[(startAxis + k) % 2]++;
  const lens = [splitLen(A, need[0]), splitLen(B, need[1])];
  const used = [0, 0];
  const legs: Leg[] = [];
  for (let k = 0; k < count; k++) {
    const axis = (startAxis + k) % 2;
    legs.push({ axis, len: lens[axis][used[axis]++] });
  }
  return legs;
}

function trail(legs: Leg[]) {
  const u = [0];
  let c = 0;
  for (const leg of legs) {
    for (let i = 0; i < leg.len; i++) {
      if (leg.axis === 0) c++;
      u.push(c);
    }
  }
  return u;
}

function separated(a: Leg[], b: Leg[], n: number) {
  const ua = trail(a);
  const ub = trail(b);
  const sign = Math.sign(ua[1] - ub[1]);
  if (sign === 0) return false;
  for (let i = 1; i < n; i++) {
    const d = ua[i] - ub[i];
    if (Math.sign(d) !== sign) return false;
    if (i >= DRIFT.forkSep && i <= n - DRIFT.forkSep && Math.abs(d) < DRIFT.forkSep) return false;
  }
  return true;
}

function forkLegs() {
  const A = randInt(DRIFT.forkAxisMin, DRIFT.forkAxisMax);
  const B = randInt(DRIFT.forkAxisMin, DRIFT.forkAxisMax);
  for (let k = 0; k < 200; k++) {
    const main = legsFrom(0, randInt(DRIFT.forkLegCountMin, DRIFT.forkLegCountMax), A, B);
    const branch = legsFrom(1, randInt(DRIFT.forkLegCountMin, DRIFT.forkLegCountMax), A, B);
    if (separated(main, branch, A + B)) return { main, branch };
  }
  return {
    main: [
      { axis: 0, len: A },
      { axis: 1, len: B },
    ],
    branch: [
      { axis: 1, len: B },
      { axis: 0, len: A },
    ],
  };
}

function legRamp(arr: Pt[], a: number, b: number) {
  const L = DRIFT.rampLen;
  const M = DRIFT.rampJunctionGap;
  if (b - a < L + 2 * M || Math.random() >= DRIFT.forkRampChance) return;
  const from = a + M + Math.floor(Math.random() * (b - a - L - 2 * M));
  for (let j = 0; j < L; j++) {
    arr[from + j].lift = DRIFT.rampHeight * Math.sin((Math.PI * (j + 1)) / (L + 1));
  }
}

// A fork is two staircases between the same split and merge points. Both use only the
// two legal directions, have the same length, and are kept apart so the roads never
// overlap. Each path has several turns and may carry ramps.
function buildFork(t: Track) {
  const step = DRIFT.sample;
  t.width = DRIFT.wideWidth;
  const w = t.width;
  const s0 = t.pts.length - 1;
  const S = t.pts[s0];
  const dIn = t.dir;
  const dirOf = (axis: number) => (axis ? 1 - dIn : dIn);
  const { main, branch } = forkLegs();
  const mainRanges: [number, number][] = [];
  for (const leg of main) {
    const a = t.pts.length;
    advance(t, leg.len * step, dirOf(leg.axis));
    mainRanges.push([a, t.pts.length]);
  }
  const e0 = t.pts.length - 1;
  const coinGen = newCoinGen();
  let ax = S.x;
  let ay = S.y;
  let k = s0 + 1;
  const branchRanges: [number, number][] = [];
  for (const leg of branch) {
    const a = k;
    const d = dirOf(leg.axis);
    for (let i = 0; i < leg.len; i++) {
      ax += VEC[d].x * step;
      ay += VEC[d].y * step;
      if (k < e0) t.alt[k] = { x: ax, y: ay, dir: d, w, lift: 0, coin: nextCoin(coinGen), taken: false };
      k++;
    }
    branchRanges.push([a, Math.min(k, e0)]);
  }
  t.alt[e0] = t.pts[e0];
  for (const [a, b] of mainRanges) legRamp(t.pts, a, Math.min(b, e0));
  for (const [a, b] of branchRanges) legRamp(t.alt, a, b);
  for (let i = s0 + 8; i < e0 - 8; i += 6) {
    if (Math.random() < DRIFT.propChance) spawnProp(t, t.alt[i], i);
  }
  t.forkEnd = e0;
}

function addSegment(t: Track) {
  if (Math.random() < DRIFT.forkChance && t.pts.length - t.forkEnd >= DRIFT.forkMinGap && t.pts.length > DRIFT.propStartIdx) {
    buildFork(t);
    return;
  }
  t.width = t.pts.length - 1 === t.forkEnd ? DRIFT.wideWidth : widthAt(t.pts.length * DRIFT.sample, t.сложность);
  const len = DRIFT.segMin + Math.random() * (DRIFT.segMax - DRIFT.segMin);
  const start = t.pts.length;
  const steps = advance(t, len, 1 - t.dir);
  const L = DRIFT.rampLen;
  const M = DRIFT.rampJunctionGap;
  if (steps < L + 2 * M || Math.random() >= DRIFT.rampChance) return;
  const from = start + M + Math.floor(Math.random() * (steps - L - 2 * M));
  if (from - t.lastRamp < DRIFT.rampGap) return;
  t.lastRamp = from + L / 2;
  for (let j = 0; j < L; j++) {
    t.pts[from + j].lift = DRIFT.rampHeight * Math.sin((Math.PI * (j + 1)) / (L + 1));
  }
}

function growTrack(t: Track, minLen: number) {
  while (t.pts.length < minLen) addSegment(t);
}

function createTrack(coinBoost = 1, сложность: СложностьДрифта = "normal"): Track {
  const t: Track = {
    pts: [],
    alt: [],
    width: DRIFT.wideWidth,
    сложность,
    forkEnd: -1,
    props: [],
    x: 0,
    y: 0,
    dir: 0,
    coinGen: newCoinGen(),
    sinceProp: 0,
    sinceRepair: 0,
    repairs: [],
    lastRamp: -1e9,
    coinBoost,
  };
  push(t);
  advance(t, DRIFT.startStraight, 0);
  growTrack(t, 400);
  return t;
}

// Выбор модели машины на заезд. История живёт на уровне модуля, а не в компоненте:
// иначе при перемонтировании экрана она сбрасывается.
// Правило: машина случайная, но не повторяется в этом заезде и в двух предыдущих.
// То есть выпавшая в первом заезде модель снова доступна только с четвёртого.
const ОКНО_ИСТОРИИ = Math.max(1, Math.min(2, CAR_MODEL_COUNT - 1));
let историяМоделей: number[] = [];

/** Случайная модель, которой не было в двух прошлых заездах. */
export function взятьМодель(): number {
  const запрещены = new Set(историяМоделей);
  const свободные: number[] = [];
  for (let i = 0; i < CAR_MODEL_COUNT; i++) if (!запрещены.has(i)) свободные.push(i);
  const пул = свободные.length > 0 ? свободные : Array.from({ length: CAR_MODEL_COUNT }, (_, i) => i);
  const модель = пул[Math.floor(Math.random() * пул.length)];
  историяМоделей = [...историяМоделей, модель].slice(-ОКНО_ИСТОРИИ);
  return модель;
}

/** История последних выбранных моделей (для тестов и отладки). */
export function историяВыбранныхМоделей(): number[] {
  return [...историяМоделей];
}

function нормализоватьМодель(модель?: number): number {
  const m = модель === undefined ? взятьМодель() : модель;
  return ((m % CAR_MODEL_COUNT) + CAR_MODEL_COUNT) % CAR_MODEL_COUNT;
}

export function createGame(навыки: НавыкиДрифта = БЕЗ_НАВЫКОВ, модель?: number, сложность: СложностьДрифта = "normal"): Game {
  const максЗдоровье = DRIFT.maxHealth + (навыки.прочность ? DRIFT.durabilityHp : 0);
  return {
    track: createTrack(навыки.коллекционер || 1, сложность),
    route: 0,
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
    slowT: 0,
    jumpsHigh: 0,
    jumpsNeed: DRIFT.slowmoJumpsMin,
    pendingRevive: false,
    deadT: 0,
    rewindT: 0,
    rewindFrom: 0,
    rewindTo: 0,
    phase: "play",
    fallT: 0,
    offT: 0,
    fallSide: 0,
    t: 0,
    hist: [],
    cops: [],
    copTimer: DRIFT.copSpawnFirst,
    leaves: [],
    smoke: [],
    sparks: [],
    splash: [],
    ripples: [],
    paint: Math.floor(Math.random() * 8),
    model: нормализоватьМодель(модель),
    сложность,
    marks: [],
    health: максЗдоровье,
    maxHealth: максЗдоровье,
    bumpers: навыки.прочность,
    sideSkirts: навыки.прочностьПлюс,
    insuranceLeft: Math.max(0, Math.floor(навыки.страховка)),
    invulnT: 0,
    speedLag: 0,
    speedFrom: DRIFT.speedStart,
    speedTo: DRIFT.speedStart,
    boomT: 0,
    kills: 0,
    pops: [],
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

function offRoadWheels(p: { x: number; y: number; h: number }, track: Track, best: number) {
  const c = Math.cos(p.h);
  const s = Math.sin(p.h);
  const lo = Math.max(0, best - 26);
  const hi = Math.min(track.pts.length - 2, best + 26);
  let n = 0;
  for (const [a, b] of WHEEL_POS) {
    const wx = p.x + c * a - s * b;
    const wy = p.y + s * a + c * b;
    let inside = false;
    for (const arr of [track.pts, track.alt]) {
      for (let i = lo; i <= hi && !inside; i++) {
        const half = Math.max(arr[i].w, arr[i + 1].w) / 2;
        if (distSeg(wx, wy, arr[i].x, arr[i].y, arr[i + 1].x, arr[i + 1].y) <= half) inside = true;
      }
    }
    if (!inside) n++;
  }
  return n;
}

function sideOf(p: { x: number; y: number; h: number }, pt: Pt) {
  const lat = -(p.x - pt.x) * Math.sin(p.h) + (p.y - pt.y) * Math.cos(p.h);
  return lat >= 0 ? 1 : -1;
}

function emitSmoke(g: Game, p: Pose) {
  if (g.smoke.length >= DRIFT.smokeMax) return;
  const side = (Math.random() - 0.5) * 16;
  const c = Math.cos(p.h);
  const s = Math.sin(p.h);
  g.smoke.push({
    x: p.x - c * 16 - s * side,
    y: p.y - s * 16 + c * side,
    z: p.z,
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
  if (g.sparks.length >= DRIFT.sparkMax) return;
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

function blast(g: Game) {
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 80 + Math.random() * 320;
    g.sparks.push({ x: g.x, y: g.y, z: g.z + 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 120 + Math.random() * 320, age: 0, life: 0.5 + Math.random() * 0.9 });
  }
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * 22;
    g.smoke.push({ x: g.x + Math.cos(a) * d, y: g.y + Math.sin(a) * d, z: g.z + 6 + Math.random() * 26, age: 0, life: 1 + Math.random() * 1.2, r: 10 + Math.random() * 12, shade: SMOKE_SHADES[Math.floor(Math.random() * SMOKE_SHADES.length)] });
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

export function policeAxis(dir: number) {
  return dir === 0 ? Math.PI / 2 : 0;
}

function acrossSeg(p: Prop, dir: number): [number, number, number, number] {
  const a = policeAxis(dir) + p.rot;
  const c = Math.cos(a) * DRIFT.policeHalf;
  const s = Math.sin(a) * DRIFT.policeHalf;
  return [p.x - c, p.y - s, p.x + c, p.y + s];
}

function hitProps(g: Game, x: number, y: number, vx: number, vy: number, radius: number, byPlayer: boolean) {
  for (const p of g.track.props) {
    if (p.state !== "idle") continue;
    if (p.kind === "police") {
      const dir = p.dir;
      const [ax, ay, bx, by] = acrossSeg(p, dir);
      if (distSeg(x, y, ax, ay, bx, by) > DRIFT.policeReach) continue;
      if (byPlayer && !p.struck) {
        p.struck = true;
        g.kills++;
        g.pops.push({ x: p.x, y: p.y, z: p.lift + 16, age: 0 });
        if (g.invulnT <= 0) {
          g.health = Math.max(0, g.health - 1);
          if (g.health === 0) {
            if (g.insuranceLeft > 0) {
              g.insuranceLeft--;
              g.pendingRevive = true;
              g.deadT = 0;
            }
            g.phase = "boom";
            g.boomT = 0;
            g.vx = 0;
            g.vy = 0;
            blast(g);
            for (const c of g.cops) if (c.phase === "chase" || c.phase === "enter") c.phase = "halt";
          }
        }
      }
      const sp = Math.hypot(vx, vy) || 1;
      const kick = DRIFT.propKick + sp * 0.25;
      p.state = "leaning";
      p.age = 0;
      p.leanSide = dir === 0 ? 1 : -1;
      p.vx = (vx / sp) * kick;
      p.vy = (vy / sp) * kick;
      emitSparks(g, x, y, p.lift + 6);
      continue;
    }
    const dx = p.x - x;
    const dy = p.y - y;
    const d = Math.hypot(dx, dy);
    let reach = d;
    if (p.kind === "barrier") {
      const [ax, ay, bx, by] = acrossSeg(p, p.dir);
      reach = distSeg(x, y, ax, ay, bx, by);
    }
    if (reach > radius + DRIFT.propRadius) continue;
    const nx = d > 0.01 ? dx / d : 1;
    const ny = d > 0.01 ? dy / d : 0;
    const kick = DRIFT.propKick + Math.hypot(vx, vy) * 0.25;
    p.state = "flying";
    p.age = 0;
    p.z = p.lift;
    p.vx = nx * kick + vx * 0.5;
    p.vy = ny * kick + vy * 0.5;
    p.vz = DRIFT.propKickUp * (0.7 + Math.random() * 0.6);
    p.spin = (Math.random() * 2 - 1) * 10;
    emitSparks(g, (x + p.x) / 2, (y + p.y) / 2, p.z + 6);
  }
}

function updateProps(g: Game, dt: number) {
  for (const p of g.track.props) {
    if (p.state === "leaning") {
      p.age += dt;
      const slide = Math.exp(-DRIFT.propDrag * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= slide;
      p.vy *= slide;
      if (p.age >= DRIFT.leanTime) {
        p.state = "idle";
        p.age = 0;
        p.tilt = 0;
        continue;
      }
      const env = p.age < DRIFT.leanIn ? p.age / DRIFT.leanIn : Math.exp(-(p.age - DRIFT.leanIn) * DRIFT.leanDecay);
      p.tilt = p.leanSide * DRIFT.leanAngle * env;
      continue;
    }
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
    const floor = p.lift;
    if (p.z < floor) {
      p.z = floor;
      p.vz = -p.vz * 0.35;
      p.spin *= 0.6;
      if (Math.abs(p.vz) < 30) p.vz = 0;
    }
  }
  g.track.props = g.track.props.filter((p) => p.state !== "flying" || p.age < DRIFT.propLife);
}

function emitSplash(g: Game, x: number, y: number) {
  g.ripples.push({ x, y, age: 0 });
  for (let i = 0; i < DRIFT.splashCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = DRIFT.splashKick * (0.3 + Math.random() * 0.7);
    g.splash.push({
      x,
      y,
      z: 0,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      vz: 120 + Math.random() * 180,
      age: 0,
      life: DRIFT.splashLife * (0.6 + Math.random() * 0.8),
    });
  }
}

function updateSplash(g: Game, dt: number) {
  const k = Math.exp(-2 * dt);
  for (const d of g.splash) {
    d.age += dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.vx *= k;
    d.vy *= k;
    d.vz -= DRIFT.sparkGravity * dt;
    d.z = Math.max(0, d.z + d.vz * dt);
  }
  g.splash = g.splash.filter((d) => d.age < d.life);
  for (const r of g.ripples) r.age += dt;
  g.ripples = g.ripples.filter((r) => r.age < DRIFT.rippleLife);
}

function beginFall(g: Game, best: number) {
  if (g.insuranceLeft > 0) {
    g.insuranceLeft--;
    g.pendingRevive = true;
    g.deadT = 0;
  }
  const p = routePts(g.track, g.route)[best];
  emitSplash(g, g.x, g.y);
  g.phase = "fall";
  g.fallT = 0;
  g.fallSide = sideOf(g, p);
  for (const c of g.cops) if (c.phase === "chase" || c.phase === "enter") c.phase = "halt";
}

/** Скорость по пройденной дистанции — штатная кривая разгона. */
export function speedAt(g: Game) {
  const разгон = ДРИФТ_СЛОЖНОСТИ[g.сложность].множительРазгона;
  return Math.min(DRIFT.speedMax, DRIFT.speedStart + g.dist * DRIFT.speedPerPx * разгон);
}

/** Страховка: гибель отыграна, запускаем сценку «перемотки» на месте аварии. */
function startRewind(g: Game) {
  const pts = routePts(g.track, g.route);
  const p = pts[clamp(g.idx, 0, pts.length - 1)];
  g.phase = "rewind";
  g.rewindT = 0;
  g.deadT = 0;
  g.fallT = 0;
  g.boomT = 0;
  g.offT = 0;
  g.air = false;
  g.vz = 0;
  g.cool = 0;
  g.slowT = 0;
  g.h = ANG[p.dir];
  g.x = p.x;
  g.y = p.y;
  g.z = p.lift;
  g.ground = p.lift;
  g.av = 0;
  g.roll = 0;
  g.pitch = 0;
  g.vx = 0;
  g.vy = 0;
  g.health = g.maxHealth;
  // Плёнку крутим назад: машина откатывается по дороге и встаёт на центр полосы.
  g.rewindFrom = g.idx;
  g.rewindTo = Math.max(1, g.idx - DRIFT.rewindSpan);
  for (const c of g.cops) if (c.phase === "chase" || c.phase === "enter") c.phase = "halt";
}

/** Кадр сценки: машина пятится назад по дороге, экран в помехах. */
function rewindStep(g: Game, dt: number) {
  g.rewindT = Math.min(DRIFT.rewindTime, g.rewindT + dt);
  const k = clamp(g.rewindT / DRIFT.rewindTime, 0, 1);
  const e = 1 - (1 - k) * (1 - k);
  const fi = g.rewindFrom + (g.rewindTo - g.rewindFrom) * e;
  const pts = routePts(g.track, g.route);
  const i = clamp(Math.floor(fi), 0, pts.length - 2);
  const u = clamp(fi - i, 0, 1);
  const a = pts[i];
  const b = pts[i + 1];
  g.x = a.x + (b.x - a.x) * u;
  g.y = a.y + (b.y - a.y) * u;
  g.z = a.lift + (b.lift - a.lift) * u;
  g.ground = g.z;
  g.h = ANG[u < 0.5 ? a.dir : b.dir];
  g.idx = Math.max(0, Math.round(fi));
  g.roll = 0;
  g.pitch = 0;
  g.av = 0;
  g.vx = 0;
  g.vy = 0;
  if (g.rewindT >= DRIFT.rewindTime) finishRevive(g);
}

/** Перемотка закончилась: машина цела, стоит по центру полосы и плавно разгоняется. */
function finishRevive(g: Game) {
  const pts = routePts(g.track, g.route);
  const p = pts[clamp(g.idx, 0, pts.length - 1)];
  const baseSpeed = speedAt(g);
  g.phase = "play";
  g.pendingRevive = false;
  g.deadT = 0;
  g.rewindT = 0;
  g.health = g.maxHealth;
  g.invulnT = DRIFT.insuranceInvuln;
  g.fallT = 0;
  g.boomT = 0;
  g.offT = 0;
  g.air = false;
  g.vz = 0;
  g.cool = 0;
  g.slowT = 0;
  g.x = p.x;
  g.y = p.y;
  g.z = p.lift;
  g.ground = p.lift;
  g.h = ANG[p.dir];
  g.av = 0;
  g.roll = 0;
  g.pitch = 0;
  g.speedFrom = baseSpeed * DRIFT.insuranceSlow;
  g.speedTo = baseSpeed;
  g.speedLag = DRIFT.insuranceRamp;
  g.vx = Math.cos(g.h) * g.speedFrom;
  g.vy = Math.sin(g.h) * g.speedFrom;
  g.marks = [];
  for (const c of g.cops) if (c.phase === "chase" || c.phase === "enter") c.phase = "halt";
}

function playerDrive(g: Game, holding: boolean, dt: number) {
  const d = angleDiff(holding ? ANG[1] : ANG[0], g.h);
  const want = clamp(d * DRIFT.turnFollow, -DRIFT.turnMax, DRIFT.turnMax);
  g.av += (want - g.av) * Math.min(1, DRIFT.turnAccel * dt);
  g.h += g.av * dt;
  g.roll += (clamp(-g.av * DRIFT.rollPerAv, -DRIFT.rollMax, DRIFT.rollMax) - g.roll) * Math.min(1, DRIFT.rollRate * dt);
  const turning = Math.abs(g.av) > 0.05;

  const base = speedAt(g);
  let speed = base;
  if (g.speedLag > 0) {
    g.speedLag = Math.max(0, g.speedLag - dt);
    const k = 1 - g.speedLag / DRIFT.insuranceRamp;
    speed = Math.min(base, g.speedFrom + (g.speedTo - g.speedFrom) * k);
  }
  if (g.invulnT > 0) g.invulnT = Math.max(0, g.invulnT - dt);
  const grip = g.air ? DRIFT.airGrip : turning ? DRIFT.slideGrip : DRIFT.grip;
  const k = Math.min(1, grip * dt);
  g.vx += (Math.cos(g.h) * speed - g.vx) * k;
  g.vy += (Math.sin(g.h) * speed - g.vy) * k;
  const m = Math.hypot(g.vx, g.vy) || 1;
  g.vx = (g.vx / m) * speed;
  g.vy = (g.vy / m) * speed;
  g.x += g.vx * dt;
  g.y += g.vy * dt;

  const last = g.track.pts.length - 2;
  const lo = Math.max(0, g.idx - 12);
  const hi = Math.min(last, g.idx + 44);
  const other = 1 - g.route;
  const curArr = routePts(g.track, g.route);
  const altArr = routePts(g.track, other);
  const nearCur = nearestIdx(curArr, g.x, g.y, lo, hi + 1);
  const nearAlt = nearestIdx(altArr, g.x, g.y, lo, hi + 1);
  if (routeDist(g.x, g.y, altArr, nearAlt) + DRIFT.routeSlack < routeDist(g.x, g.y, curArr, nearCur)) {
    g.route = other;
  }
  let pts = routePts(g.track, g.route);
  let best = nearestIdx(pts, g.x, g.y, lo, hi + 1);
  if (g.route === 1 && g.track.alt[best] === g.track.pts[best] && g.track.alt[best + 1] === g.track.pts[best + 1]) {
    g.route = 0;
    pts = g.track.pts;
    best = nearestIdx(pts, g.x, g.y, lo, hi + 1);
  }
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
    if (speed >= DRIFT.slowmoSpeed) {
      g.jumpsHigh++;
      if (g.jumpsHigh >= g.jumpsNeed) {
        g.jumpsHigh = 0;
        g.jumpsNeed = DRIFT.slowmoJumpsMin + Math.floor(Math.random() * (DRIFT.slowmoJumpsMax - DRIFT.slowmoJumpsMin + 1));
        g.slowT = DRIFT.slowmoTime;
      }
    }
  } else {
    g.z = sf.lift;
  }
  g.ground = sf.lift;
  const pitchTarget = g.air ? Math.atan2(g.vz, speed) : Math.atan(sf.slope);
  g.pitch += (clamp(pitchTarget, -DRIFT.pitchMax, DRIFT.pitchMax) - g.pitch) * Math.min(1, DRIFT.pitchRate * dt);

  const off = g.invulnT <= 0 && !g.air && offRoadWheels(g, g.track, best) >= DRIFT.wheelsOffToFall;
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

  for (const r of g.track.repairs) {
    if (r.taken || g.air || Math.abs(r.idx - g.idx) > 12) continue;
    if (Math.hypot(r.x - g.x, r.y - g.y) < DRIFT.repairReach) {
      r.taken = true;
      g.health = Math.min(g.maxHealth, g.health + DRIFT.repairHeal);
    }
  }

  if (!g.air) hitProps(g, g.x, g.y, g.vx, g.vy, DRIFT.carRadius, true);

  g.hist.push({ t: g.t, x: g.x, y: g.y, h: g.h, v: speed, route: g.route });
  while (g.hist.length > 1 && g.hist[0].t < g.t - DRIFT.copEnterLag - 1) g.hist.shift();

  const slip = Math.abs(angleDiff(Math.atan2(g.vy, g.vx), g.h));
  skid(g, g, !g.air && slip > DRIFT.smokeSlip, g.marks);
}

function skid(g: Game, p: Pose, on: boolean, marks: Mark[]) {
  if (on && Math.random() < DRIFT.smokeChance) emitSmoke(g, p);
  pushMark(marks, p, on);
}

function pushMark(marks: Mark[], p: Pose, on: boolean) {
  const c = Math.cos(p.h);
  const s = Math.sin(p.h);
  const rx = p.x - c * (CAR.len * 0.35);
  const ry = p.y - s * (CAR.len * 0.35);
  const bw = CAR.width * 0.38;
  marks.push({ ax: rx - s * bw, ay: ry + c * bw, bx: rx + s * bw, by: ry - c * bw, z: p.z, on });
  if (marks.length > 150) marks.splice(0, marks.length - 150);
}

function fallStep(g: Game, dt: number) {
  g.fallT += dt;
  g.roll += (g.fallSide * DRIFT.fallRoll - g.roll) * Math.min(1, DRIFT.rollRate * dt);
  g.x += g.vx * dt;
  g.y += g.vy * dt;
  g.vx *= 1 - 2 * dt;
  g.vy *= 1 - 2 * dt;
  g.z -= DRIFT.fallDrop * dt;
  if (g.pendingRevive) {
    g.deadT += dt;
    if (g.deadT >= DRIFT.rewindDelay) startRewind(g);
  } else if (g.fallT >= DRIFT.fallTime) g.phase = "over";
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
    route: (f < 0.5 ? a : b).route,
  };
}

function spawnCop(g: Game) {
  if (g.hist.length === 0) return;
  const s = sampleHist(g.hist, g.t - DRIFT.copEnterLag);
  const pts = routePts(g.track, s.route);
  const idx = nearestIdx(pts, s.x, s.y, Math.max(0, g.idx - 200), g.idx);
  const sf = surfaceAt(pts, idx, s.x, s.y);
  const home = (Math.random() * 2 - 1) * DRIFT.copLane;
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
    route: s.route,
    offT: 0,
    speed: s.v,
    phase: "enter",
    age: 0,
    slide: 0,
    slideV: 0,
    laneTarget: home,
    laneT: 1.5 + Math.random() * 2,
    lag: DRIFT.copEnterLag,
    fallT: 0,
    fallSide: 0,
    marks: [],
    jit: 1 + (Math.random() * 2 - 1) * DRIFT.copJitter,
    home,
  });
}

function copDrive(g: Game, c: Cop, dt: number) {
  c.age += dt;
  const wear = clamp(c.age / DRIFT.copWearTime, 0, 1);
  const x0 = c.x;
  const y0 = c.y;

  if (c.phase === "halt") {
    c.speed = Math.max(0, c.speed - DRIFT.copHaltDecel * dt);
    c.vx = Math.cos(c.h) * c.speed;
    c.vy = Math.sin(c.h) * c.speed;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
  } else {
    const lag = (DRIFT.copLag + (DRIFT.copEnterLag - DRIFT.copLag) * Math.exp(-c.age / DRIFT.copEnterTau)) * c.jit;
    c.lag = lag;
    const tt = Math.min(g.t - lag, g.hist[g.hist.length - 1].t);
    const s = sampleHist(g.hist, tt);
    c.route = s.route;
    const omega = angleDiff(s.h, c.h) / dt;
    c.h = s.h;
    c.av = omega;
    c.laneT -= dt;
    if (c.laneT <= 0) {
      c.laneT = 1.5 + Math.random() * 2;
      c.laneTarget = c.home + (Math.random() * 2 - 1) * DRIFT.copWander;
    }
    const cur = routePts(g.track, c.route)[c.idx];
    const histLat = cur.dir ? s.x - cur.x : cur.y - s.y;
    const roadHalf = Math.max(0, cur.w / 2 - 12);
    const slideTarget = clamp(histLat + c.laneTarget, -roadHalf, roadHalf) - histLat;
    const outward = -omega * s.v * wear * DRIFT.copSlide * c.jit + (slideTarget - c.slide) * DRIFT.copLaneK;
    const lateralGrip = DRIFT.grip * (1 - wear * (1 - DRIFT.copWornGrip));
    c.slideV += (outward - c.slideV * lateralGrip) * dt;
    c.slide += c.slideV * dt;
    const hardHalf = roadHalf + DRIFT.copWearReach * wear;
    const lo = -hardHalf - histLat;
    const hi = hardHalf - histLat;
    if (c.slide < lo || c.slide > hi) {
      c.slide = clamp(c.slide, lo, hi);
      c.slideV = 0;
    }
    c.x = s.x - Math.sin(s.h) * c.slide;
    c.y = s.y + Math.cos(s.h) * c.slide;
    c.vx = (c.x - x0) / dt;
    c.vy = (c.y - y0) / dt;
    c.speed = Math.hypot(c.vx, c.vy);
  }

  let pts = routePts(g.track, c.route);
  c.idx = nearestIdx(pts, c.x, c.y, Math.max(0, c.idx - 8), Math.min(pts.length - 1, c.idx + 40));
  if (c.route === 1 && g.track.alt[c.idx] === g.track.pts[c.idx] && g.track.alt[c.idx + 1] === g.track.pts[c.idx + 1]) {
    c.route = 0;
    pts = g.track.pts;
  }
  const sf = surfaceAt(pts, c.idx, c.x, c.y);
  c.ground = sf.lift;
  c.z = sf.lift;
  c.pitch += (clamp(Math.atan(sf.slope), -DRIFT.pitchMax, DRIFT.pitchMax) - c.pitch) * Math.min(1, DRIFT.pitchRate * dt);
  c.roll += (clamp(-c.av * DRIFT.rollPerAv, -DRIFT.rollMax, DRIFT.rollMax) - c.roll) * Math.min(1, DRIFT.rollRate * dt);
  skid(g, c, Math.abs(c.av) > DRIFT.copSkidRate, c.marks);

  const off = offRoadWheels(c, g.track, c.idx) >= DRIFT.wheelsOffToFall;
  c.offT = off ? c.offT + dt : 0;
  if ((c.phase === "enter" || c.phase === "chase") && c.offT > DRIFT.edgeGrace) {
    c.phase = "fall";
    c.fallT = 0;
    c.fallSide = sideOf(c, pts[c.idx]);
    emitSplash(g, c.x, c.y);
    if (g.phase === "play") {
      g.kills++;
      g.pops.push({ x: c.x, y: c.y, z: c.ground + 16, age: 0 });
    }
  }
  if (c.phase === "enter" && c.age > DRIFT.copEnterTau * 3) c.phase = "chase";
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

function shoveLateral(c: Cop, amt: number) {
  if (c.phase === "halt") {
    c.x -= Math.sin(c.h) * amt;
    c.y += Math.cos(c.h) * amt;
  } else {
    c.slide += amt;
  }
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
      if (d >= R) continue;
      const overlap = R - Math.max(d, 1e-3);
      const la = -dx * Math.sin(a.h) + dy * Math.cos(a.h);
      const sgn = la < 0 ? -1 : 1;
      shoveLateral(a, (-sgn * overlap) / 2);
      shoveLateral(b, (sgn * overlap) / 2);
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
    if (c.phase !== "fall") hitProps(g, c.x, c.y, c.vx, c.vy, DRIFT.copRadius, false);
  }
  g.cops = g.cops.filter((c) => (c.phase === "fall" ? c.fallT < DRIFT.fallTime : c.idx > g.idx - DRIFT.copCull));
}

function stirLeaves(g: Game, x: number, y: number, speed: number) {
  for (const l of g.leaves) {
    if (l.fly) continue;
    const dx = l.x - x;
    const dy = l.y - y;
    const d = Math.hypot(dx, dy);
    if (d > DRIFT.leafRadius || d < 1e-3) continue;
    const k = (1 - d / DRIFT.leafRadius) * DRIFT.leafKick * clamp(speed / DRIFT.speedMax, 0.3, 1.2);
    l.fly = true;
    l.age = 0;
    l.vx = (dx / d) * k;
    l.vy = (dy / d) * k;
    l.vz = 60 + Math.random() * 120;
    l.spin = (Math.random() * 2 - 1) * 14;
  }
}

function spawnLeaves(g: Game) {
  const pts = routePts(g.track, g.route);
  while (g.leaves.length < DRIFT.leafCount) {
    const p = pts[g.idx + DRIFT.leafNear + Math.floor(Math.random() * DRIFT.leafAhead)];
    const lat = (Math.random() * 2 - 1) * (p.w / 2 - 6);
    g.leaves.push({
      x: p.dir === 0 ? p.x : p.x + lat,
      y: p.dir === 0 ? p.y + lat : p.y,
      z: p.lift,
      floor: p.lift,
      vx: 0,
      vy: 0,
      vz: 0,
      rot: Math.random() * Math.PI * 2,
      spin: 0,
      age: 0,
      fly: false,
      tone: Math.floor(Math.random() * 6),
    });
  }
}

function updateLeaves(g: Game, dt: number) {
  if (g.phase === "play" && !g.air) stirLeaves(g, g.x, g.y, Math.hypot(g.vx, g.vy));
  for (const c of g.cops) if (c.phase !== "fall") stirLeaves(g, c.x, c.y, Math.hypot(c.vx, c.vy));
  const k = Math.exp(-2.5 * dt);
  for (const l of g.leaves) {
    if (!l.fly) continue;
    l.age += dt;
    l.x += l.vx * dt;
    l.y += l.vy * dt;
    l.vx *= k;
    l.vy *= k;
    l.vz -= DRIFT.gravity * 0.5 * dt;
    l.z += l.vz * dt;
    l.rot += l.spin * dt;
    if (l.z < l.floor) {
      l.z = l.floor;
      l.vz = -l.vz * 0.3;
      l.spin *= 0.5;
    }
  }
  const fx = Math.cos(g.h);
  const fy = Math.sin(g.h);
  g.leaves = g.leaves.filter((l) => {
    if (l.fly) return l.age < DRIFT.leafLife;
    const fwd = (l.x - g.x) * fx + (l.y - g.y) * fy;
    return fwd > -DRIFT.leafBehind && Math.hypot(l.x - g.x, l.y - g.y) < DRIFT.leafCull;
  });
  spawnLeaves(g);
}

function emitWreckSmoke(g: Game, dt: number) {
  const wrecked = g.phase === "boom" || (g.phase === "over" && g.health === 0);
  if (!wrecked || g.smoke.length >= DRIFT.smokeMax || Math.random() > dt * 12) return;
  g.smoke.push({
    x: g.x + (Math.random() * 2 - 1) * 12,
    y: g.y + (Math.random() * 2 - 1) * 12,
    z: g.z + 22,
    age: 0,
    life: 1.4 + Math.random() * 1.2,
    r: 7 + Math.random() * 6,
    shade: 40 + Math.floor(Math.random() * 30),
  });
}

function tail(g: Game, dt: number) {
  for (const q of g.pops) q.age += dt;
  g.pops = g.pops.filter((q) => q.age < DRIFT.popLife);
  stepCops(g, dt);
  updateProps(g, dt);
  updateSparks(g, dt);
  updateSplash(g, dt);
  emitWreckSmoke(g, dt);
  updateSmoke(g, dt);
  updateLeaves(g, dt);
  g.track.repairs = g.track.repairs.filter((r) => !r.taken && r.idx > g.idx - 60);
}

export function step(g: Game, holding: boolean, dt: number) {
  if (g.phase === "over") {
    tail(g, dt);
    return;
  }
  if (g.idx > g.track.pts.length - 400) growTrack(g.track, g.idx + 600);
  g.t += dt;
  if (g.phase === "boom") {
    g.boomT += dt;
    if (g.pendingRevive) {
      g.deadT += dt;
      if (g.deadT >= DRIFT.rewindDelay) startRewind(g);
    } else if (g.boomT >= DRIFT.boomTime) g.phase = "over";
  } else if (g.phase === "fall") fallStep(g, dt);
  else if (g.phase === "rewind") rewindStep(g, dt);
  else playerDrive(g, holding, dt);
  tail(g, dt);
}

/**
 * Что заезд делает с рекордом в таблице игроков.
 * Возвращает null в `значение`, если рекорд трогать нельзя: режим не в рекордах
 * (тренировка) или очки не побили прежний результат. Такие заезды не пишут в базу
 * вообще ничего, поэтому цифры из тренировки не утекают ни в профиль, ни в топ.
 */
export function итогРекорда(
  очки: number,
  режим: СложностьДрифта,
  прежний: number,
): { вРекордах: boolean; новый: boolean; значение: number | null; личный: number } {
  const правила = ДРИФТ_СЛОЖНОСТИ[режим];
  if (!правила.вРекордах) {
    return { вРекордах: false, новый: false, значение: null, личный: прежний };
  }
  const новый = очки > прежний;
  return {
    вРекордах: true,
    новый,
    значение: новый ? очки : null,
    личный: новый ? очки : прежний,
  };
}

export function scoreOf(g: Game) {
  const n = Math.floor(g.dist / DRIFT.distPerPoint);
  const distScore = Math.floor((Math.pow(DRIFT.distMult, n) - 1) / (DRIFT.distMult - 1));
  return distScore + g.coins * DRIFT.coinPoints + g.kills * DRIFT.copKillPoints;
}

export function посчитатьНаградуДрифта(очки: number, уровеньЗП: number) {
  const сумма = Math.floor(очки * ДРИФТ_БОСС.фишкиЗаОчко);
  const бонусПроц = бонусЗарплатыПроц({ salary_level: уровеньЗП });
  return { сумма, бонусПроц, итого: Math.floor(сумма * (1 + бонусПроц / 100) + 1e-9) };
}
