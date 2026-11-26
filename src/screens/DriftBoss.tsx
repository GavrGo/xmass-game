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
const CAR_CABIN = "#8ef08a";
const CAR_SIDE = "#3fae4a";
const CAR_END = "#2f8f3c";
const STRIPE = "#f4fff0";
const GLASS = "#22344a";
const TIRE = "#1d1d22";
const HUB = "#c9ced8";
const LIGHT = "#fff6b3";
const TAIL = "#ff3b3b";

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

  ctx.globalAlpha = alpha;
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
    ctx.fillStyle = `rgba(220,222,235,${0.45 * (1 - k)})`;
    ctx.fill();
  }

  const [shx, shy] = P(g.x, g.y, g.ground);
  ctx.beginPath();
  ctx.ellipse(shx, shy, 24 * s, 13 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,0,0,${0.3 * (g.air ? 0.5 : 1)})`;
  ctx.fill();

  const c = Math.cos(g.h);
  const sn = Math.sin(g.h);
  const C = (a: number, b: number, z: number): [number, number] =>
    P(g.x + c * a - sn * b, g.y + sn * a + c * b, g.z + z);
  const quadAt = (q: [number, number, number][], color: string) => poly(q.map(([a, b, z]) => C(a, b, z)), color);
  const sideVisible = (sb: number) => (sb > 0 ? c - sn > 0 : sn - c > 0);
  const frontVisible = c + sn > 0;
  const backVisible = -c - sn > 0;
  const box = (
    a0: number,
    a1: number,
    b0: number,
    b1: number,
    z0: number,
    z1: number,
    top: string,
    side: string,
    end: string,
  ) => {
    quadAt(
      [
        [a0, b0, z1],
        [a1, b0, z1],
        [a1, b1, z1],
        [a0, b1, z1],
      ],
      top,
    );
    if (sideVisible(1))
      quadAt(
        [
          [a0, b1, z0],
          [a1, b1, z0],
          [a1, b1, z1],
          [a0, b1, z1],
        ],
        side,
      );
    if (sideVisible(-1))
      quadAt(
        [
          [a0, b0, z0],
          [a1, b0, z0],
          [a1, b0, z1],
          [a0, b0, z1],
        ],
        side,
      );
    if (frontVisible)
      quadAt(
        [
          [a1, b0, z0],
          [a1, b1, z0],
          [a1, b1, z1],
          [a1, b0, z1],
        ],
        end,
      );
    if (backVisible)
      quadAt(
        [
          [a0, b0, z0],
          [a0, b1, z0],
          [a0, b1, z1],
          [a0, b0, z1],
        ],
        end,
      );
  };

  box(-20, 20, -10, 10, 2, 7, CAR_TOP, CAR_SIDE, CAR_END);
  for (const sb of [-1, 1]) {
    quadAt(
      [
        [-20, sb * 2.2, 7],
        [20, sb * 2.2, 7],
        [20, sb * 3.8, 7],
        [-20, sb * 3.8, 7],
      ],
      STRIPE,
    );
  }
  for (const [a, b] of WHEEL_POS) {
    const sb = Math.sign(b);
    if (!sideVisible(sb)) continue;
    quadAt(
      [
        [a - 4, b * 1.04, 0],
        [a + 4, b * 1.04, 0],
        [a + 4, b * 1.04, 7],
        [a - 4, b * 1.04, 7],
      ],
      TIRE,
    );
    quadAt(
      [
        [a - 2, b * 1.06, 2],
        [a + 2, b * 1.06, 2],
        [a + 2, b * 1.06, 5],
        [a - 2, b * 1.06, 5],
      ],
      HUB,
    );
  }
  box(-9, 8, -8.5, 8.5, 7, 12, CAR_CABIN, CAR_SIDE, CAR_END);
  for (const sb of [-1, 1]) {
    if (!sideVisible(sb)) continue;
    quadAt(
      [
        [-6, sb * 8.6, 8],
        [6, sb * 8.6, 8],
        [6, sb * 8.6, 11],
        [-6, sb * 8.6, 11],
      ],
      GLASS,
    );
  }
  if (frontVisible) {
    quadAt(
      [
        [8.1, -6, 8],
        [8.1, 6, 8],
        [8.1, 6, 11],
        [8.1, -6, 11],
      ],
      GLASS,
    );
    for (const sb of [-1, 1]) {
      quadAt(
        [
          [20.1, sb * 4, 3],
          [20.1, sb * 7, 3],
          [20.1, sb * 7, 5],
          [20.1, sb * 4, 5],
        ],
        LIGHT,
      );
    }
  }
  if (backVisible) {
    for (const sb of [-1, 1]) {
      quadAt(
        [
          [-20.1, sb * 4, 3],
          [-20.1, sb * 7, 3],
          [-20.1, sb * 7, 5],
          [-20.1, sb * 4, 5],
        ],
        TAIL,
      );
    }
  }

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
