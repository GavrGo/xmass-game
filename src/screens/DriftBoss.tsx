import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Т } from "../texts";
import { DRIFT, WHEEL_POS, createGame, scoreOf, step, type Game, type Pt } from "../game/driftBoss";

const BEST_KEY = "driftBossBest";

type Status = "idle" | "play" | "over";
const isoX = (x: number, y: number) => (x - y) * 0.866;
const isoY = (x: number, y: number) => (x + y) * 0.5;

const ROAD = "#a9d6f5";
const ROAD_DARK = "#7fb9e6";
const WALL = "#1f3d6b";
const WALL_H = 10;
const COLS = 6;
const CELL = 3;
const BACK = 120;
const AHEAD = 200;
const CAR_TOP = "#6ee06a";
const CAR_CABIN = "#9ef59a";
const CAR_SIDE = "#3fae4a";
const CAR_END = "#2f8f3c";
const STRIPE = "#f4fff0";
const GLASS = "#22344a";
const TIRE = "#1d1d22";
const HUB = "#c9ced8";
const LIGHT = "#fff6b3";
const TAIL = "#ff3b3b";

type Local = [number, number, number];
type Face = { pts: [number, number][]; color: string; depth: number };

const BODY_PROF: [number, number][] = [
  [-20, 2],
  [20, 2],
  [20, 6.5],
  [10, 7],
  [-14, 7],
  [-20, 7.5],
];
const CABIN_PROF: [number, number][] = [
  [-14, 7],
  [-6, 12],
  [3, 12],
  [10, 7],
];
const CABIN_GLASS: [number, number][] = [
  [-11.5, 7.9],
  [-6.2, 11.2],
  [2.2, 11.2],
  [7.6, 8],
];

function draw(ctx: CanvasRenderingContext2D, g: Game, W: number, H: number, time: number) {
  const cam = g.phase === "play" ? 1 : 1 - 0.7 * Math.min(1, g.fallT / DRIFT.fallTime);
  const s = (Math.min(W, H) / 300) * cam;
  const cx = isoX(g.x, g.y);
  const cy = isoY(g.x, g.y);
  const P = (x: number, y: number, z = 0): [number, number] => [
    (isoX(x, y) - cx) * s + W / 2,
    (isoY(x, y) - cy) * s + H / 2 - z * s * 1.5,
  ];
  const pts = g.track.pts;
  const from = Math.max(0, g.idx - BACK);
  const to = Math.min(pts.length - 2, g.idx + AHEAD);
  const alpha = g.phase === "fall" ? Math.max(0, 1 - g.fallT / DRIFT.fallTime) : 1;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#f4a95a");
  bg.addColorStop(1, "#e9a04c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = alpha;

  const poly = (q: [number, number][], color: string) => {
    ctx.beginPath();
    q.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8;
    ctx.fill();
    ctx.stroke();
  };
  const edge = (i: number, f: number, dz: number): [number, number] => {
    const p = pts[i];
    const r = (p.w / 2) * f;
    const nx = p.dir ? 1 : 0;
    const ny = p.dir ? 0 : -1;
    return P(p.x + nx * r, p.y + ny * r, p.lift + dz);
  };

  const cc = Math.cos(g.h);
  const ss = Math.sin(g.h);
  const drawCar = () => {
    const body: Face[] = [];
    const cabin: Face[] = [];
    const details: Face[] = [];
    let layer = body;
    const rc = Math.cos(g.roll);
    const rs = Math.sin(g.roll);
    const rot = (a: number, b: number, z: number): Local => [a, b * rc + z * rs, z * rc - b * rs];
    const toW = (a: number, b: number, z: number): [number, number, number] => {
      const [ra, rb, rz] = rot(a, b, z);
      return [g.x + cc * ra - ss * rb, g.y + ss * ra + cc * rb, g.z + rz + 10 * Math.abs(rs)];
    };
    const addFace = (local: Local[], n: Local, color: string) => {
      const [rn0, rn1, rn2] = rot(n[0], n[1], n[2]);
      const wn = [rn0 * cc - rn1 * ss, rn0 * ss + rn1 * cc, rn2];
      if (wn[0] + wn[1] + 1.5 * wn[2] <= 0) return;
      const w = local.map(([a, b, z]) => toW(a, b, z));
      const k = w.length;
      const mx = w.reduce((t, p) => t + p[0], 0) / k;
      const my = w.reduce((t, p) => t + p[1], 0) / k;
      const mz = w.reduce((t, p) => t + p[2], 0) / k;
      layer.push({ pts: w.map(([x, y, z]) => P(x, y, z)), color, depth: mx + my + 1.5 * mz });
    };
    const prism = (prof: [number, number][], b0: number, b1: number, colors: string[], cap: string) => {
      const n = prof.length;
      const ca = prof.reduce((t, p) => t + p[0], 0) / n;
      const cz = prof.reduce((t, p) => t + p[1], 0) / n;
      for (let i = 0; i < n; i++) {
        const [pa, pz] = prof[i];
        const [qa, qz] = prof[(i + 1) % n];
        let na = qz - pz;
        let nz = pa - qa;
        const ma = (pa + qa) / 2 - ca;
        const mz = (pz + qz) / 2 - cz;
        if (na * ma + nz * mz < 0) {
          na = -na;
          nz = -nz;
        }
        const len = Math.hypot(na, nz);
        addFace(
          [
            [pa, b0, pz],
            [qa, b0, qz],
            [qa, b1, qz],
            [pa, b1, pz],
          ],
          [na / len, 0, nz / len],
          colors[i],
        );
      }
      addFace(
        prof.map(([a, z]) => [a, b1, z] as Local),
        [0, 1, 0],
        cap,
      );
      addFace(
        prof.map(([a, z]) => [a, b0, z] as Local),
        [0, -1, 0],
        cap,
      );
    };

    const [shx, shy] = P(g.x, g.y, g.ground);
    ctx.beginPath();
    [
      [-20.5, -10.5],
      [20.5, -10.5],
      [20.5, 10.5],
      [-20.5, 10.5],
    ].forEach(([a, b], k) => {
      const [sx, sy] = P(g.x + cc * a - ss * b, g.y + ss * a + cc * b, g.ground);
      if (k) ctx.lineTo(sx, sy);
      else ctx.moveTo(sx, sy);
    });
    ctx.closePath();
    ctx.fillStyle = `rgba(0,0,0,${0.3 * (g.air ? 0.5 : 1) * alpha})`;
    ctx.fill();

    prism(BODY_PROF, -10, 10, [CAR_SIDE, CAR_END, CAR_TOP, CAR_TOP, CAR_TOP, CAR_END], CAR_SIDE);
    layer = cabin;
    prism(CABIN_PROF, -8.5, 8.5, [GLASS, CAR_TOP, GLASS, CAR_SIDE], CAR_CABIN);
    for (const [b0, b1] of [
      [-3.6, -2.2],
      [2.2, 3.6],
    ] as [number, number][]) {
      addFace(
        [
          [-13, b0, 7.02],
          [9, b0, 7.02],
          [9, b1, 7.02],
          [-13, b1, 7.02],
        ],
        [0, 0, 1],
        STRIPE,
      );
    }
    layer = details;
    for (const sb of [-1, 1]) {
      addFace(
        CABIN_GLASS.map(([a, z]) => [a, sb * 8.65, z] as Local),
        [0, sb, 0],
        GLASS,
      );
    }
    for (const [b0, b1] of [
      [4, 7],
      [-7, -4],
    ] as [number, number][]) {
      addFace(
        [
          [20.1, b0, 3],
          [20.1, b1, 3],
          [20.1, b1, 5],
          [20.1, b0, 5],
        ],
        [1, 0, 0],
        LIGHT,
      );
      addFace(
        [
          [-20.1, b0, 3],
          [-20.1, b1, 3],
          [-20.1, b1, 5],
          [-20.1, b0, 5],
        ],
        [-1, 0, 0],
        TAIL,
      );
    }
    for (const aw of [-12, 12]) {
      for (const sb of [-1, 1]) {
        const ring: Local[] = [];
        const hub: Local[] = [];
        for (let k = 0; k < 20; k++) {
          const t = (k / 20) * Math.PI * 2;
          ring.push([aw + 4 * Math.cos(t), sb * 10.3, 4 + 4 * Math.sin(t)]);
          hub.push([aw + 1.8 * Math.cos(t), sb * 10.5, 4 + 1.8 * Math.sin(t)]);
        }
        addFace(ring, [0, sb, 0], TIRE);
        addFace(hub, [0, sb, 0], HUB);
      }
    }

    for (const layerFaces of [body, cabin]) {
      layerFaces.sort((p, q) => p.depth - q.depth);
      for (const f of layerFaces) poly(f.pts, f.color);
    }
    for (const f of details) poly(f.pts, f.color);
  };

  const near = pts[g.idx];
  const carBehind = g.phase === "fall" && g.x + g.y > near.x + near.y;
  if (carBehind) drawCar();

  for (let i = from; i < to; i++) {
    poly([edge(i, -1, 0), edge(i + 1, -1, 0), edge(i + 1, -1, -WALL_H), edge(i, -1, -WALL_H)], WALL);
    poly([edge(i, 1, 0), edge(i + 1, 1, 0), edge(i + 1, 1, -WALL_H), edge(i, 1, -WALL_H)], WALL);
  }
  for (let i = from; i < to; i++) {
    const row = Math.floor(i / CELL);
    for (let k = 0; k < COLS; k++) {
      const f0 = -1 + (2 * k) / COLS;
      const f1 = -1 + (2 * (k + 1)) / COLS;
      poly(
        [edge(i, f0, 0), edge(i + 1, f0, 0), edge(i + 1, f1, 0), edge(i, f1, 0)],
        (row + k) % 2 === 0 ? ROAD : ROAD_DARK,
      );
    }
  }

  ctx.strokeStyle = "rgba(25,25,30,0.8)";
  ctx.lineWidth = 4 * s;
  for (let k = 1; k < g.marks.length; k++) {
    const m0 = g.marks[k - 1];
    const m1 = g.marks[k];
    if (!m0.on || !m1.on) continue;
    const a0 = P(m0.ax, m0.ay, m0.z);
    const a1 = P(m1.ax, m1.ay, m1.z);
    const b0 = P(m0.bx, m0.by, m0.z);
    const b1 = P(m1.bx, m1.by, m1.z);
    ctx.beginPath();
    ctx.moveTo(a0[0], a0[1]);
    ctx.lineTo(a1[0], a1[1]);
    ctx.moveTo(b0[0], b0[1]);
    ctx.lineTo(b1[0], b1[1]);
    ctx.stroke();
  }

  for (let i = from; i <= to; i++) {
    const p: Pt = pts[i];
    if (!p.coin || p.taken) continue;
    const [sx, sy] = P(p.x, p.y, p.lift + 2 + Math.abs(Math.sin(time * 4 + i)) * 3);
    ctx.beginPath();
    ctx.arc(sx, sy, 7 * s, 0, Math.PI * 2);
    ctx.fillStyle = "#ffc93c";
    ctx.fill();
    ctx.strokeStyle = "#b8860b";
    ctx.lineWidth = 2 * s;
    ctx.stroke();
  }

  for (const p of g.smoke) {
    const [sx, sy] = P(p.x, p.y, p.z);
    const k = p.age / p.life;
    ctx.beginPath();
    ctx.arc(sx, sy, p.r * s * (1 + k * 2.2), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220,222,235,${0.6 * (1 - k) * alpha})`;
    ctx.fill();
  }

  if (!carBehind) drawCar();
  ctx.globalAlpha = 1;
}

export default function DriftBoss() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coinsRef = useRef<HTMLSpanElement>(null);
  const distRef = useRef<HTMLSpanElement>(null);
  const gameRef = useRef<Game | null>(null);
  const statusRef = useRef<Status>("idle");
  const holdingRef = useRef(false);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState({ score: 0, best: 0 });

  const begin = () => {
    gameRef.current = createGame();
    statusRef.current = "play";
    setStatus("play");
  };

  const press = () => {
    if (statusRef.current === "idle") begin();
    if (statusRef.current === "play") holdingRef.current = true;
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let W = 0;
    let H = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const release = () => {
      holdingRef.current = false;
    };
    const keyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      if (!e.repeat) press();
    };
    const keyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") release();
    };
    window.addEventListener("resize", resize);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    let raf = 0;
    let last = performance.now();
    let time = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      time += dt;
      if (!gameRef.current) gameRef.current = createGame();
      const g = gameRef.current;
      if (statusRef.current === "play") {
        step(g, holdingRef.current, dt);
        if (g.phase === "over") {
          statusRef.current = "over";
          holdingRef.current = false;
          const score = scoreOf(g);
          const prev = Number(localStorage.getItem(BEST_KEY)) || 0;
          const best = Math.max(prev, score);
          localStorage.setItem(BEST_KEY, String(best));
          setResult({ score, best });
          setStatus("over");
        }
      }
      if (coinsRef.current) coinsRef.current.textContent = String(g.coins);
      if (distRef.current) distRef.current.textContent = String(Math.floor(g.dist / 10));
      draw(ctx, g, W, H, time);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    };
  }, []);

  return (
    <div onPointerDown={press} className="fixed inset-0 z-30 select-none overflow-hidden bg-black" style={{ touchAction: "none" }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <div className="flex items-center gap-1.5 rounded-full bg-black/40 py-1 pl-1 pr-3">
          <span className="h-7 w-7 rounded-full bg-gradient-to-b from-yellow-200 to-yellow-500 ring-2 ring-yellow-700" />
          <span ref={coinsRef} className="text-base font-extrabold text-white">0</span>
        </div>
        <span ref={distRef} className="absolute left-1/2 top-2 -translate-x-1/2 text-4xl font-black text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.35)]">
          0
        </span>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => navigate("/games")}
          className="btn btn-secondary pointer-events-auto !px-3 !py-2 text-sm"
        >
          {Т.общее.назад}
        </button>
      </div>

      {status === "idle" && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/30 p-6 text-center">
          <div className="text-3xl font-extrabold text-white">{Т.дрифтБосс.название}</div>
          <div className="max-w-xs text-sm text-white/85">{Т.дрифтБосс.подсказка}</div>
          <div className="mt-2 text-sm font-bold text-brand-yellow">{Т.дрифтБосс.старт}</div>
        </div>
      )}

      {status === "over" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 p-6 text-center">
          <div className="text-2xl font-extrabold text-white">{Т.дрифтБосс.конец}</div>
          <div className="text-lg font-bold text-brand-yellow">
            {Т.дрифтБосс.счёт}: {result.score}
          </div>
          <div className="text-sm text-white/70">
            {Т.дрифтБосс.рекорд}: {result.best}
          </div>
          <div className="mt-2 flex gap-3">
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={begin} className="btn btn-primary">
              {Т.дрифтБосс.заново}
            </button>
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => navigate("/games")} className="btn btn-secondary">
              {Т.дрифтБосс.меню}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
