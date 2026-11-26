import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Т } from "../texts";
import { CAR, DRIFT, createGame, scoreOf, step, type Game, type Pt } from "../game/driftBoss";

const BEST_KEY = "driftBossBest";
const ROAD = "#a9d6f5";
const ROAD_DARK = "#7fb9e6";
const EDGE = "#1f3d6b";
const CAR_TOP = "#5fd35a";
const CAR_SIDE = "#2f9a3a";

type Status = "idle" | "play" | "over";

const isoX = (x: number, y: number) => (x - y) * 0.866;
const isoY = (x: number, y: number) => (x + y) * 0.5;

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
  const from = Math.max(0, g.idx - 160);
  const to = Math.min(pts.length - 2, g.idx + 260);
  const alpha = g.phase === "fall" ? Math.max(0, 1 - g.fallT / DRIFT.fallTime) : 1;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#f4a95a");
  bg.addColorStop(1, "#e9a04c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const edge = (i: number, f: number, dy: number): [number, number] => {
    const p = pts[i];
    const r = (p.w / 2) * f;
    const nx = p.dir ? 1 : 0;
    const ny = p.dir ? 0 : -1;
    const [x, y] = P(p.x + nx * r, p.y + ny * r, p.lift);
    return [x, y + dy * s];
  };
  const quad = (i: number, f0: number, f1: number, dy: number) => {
    const a = edge(i, f0, dy);
    const b = edge(i + 1, f0, dy);
    const c = edge(i + 1, f1, dy);
    const d = edge(i, f1, dy);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(c[0], c[1]);
    ctx.lineTo(d[0], d[1]);
    ctx.closePath();
    ctx.fill();
  };

  ctx.fillStyle = EDGE;
  for (let i = from; i < to; i++) quad(i, -1, 1, 12);
  const cols = [-1, -0.5, 0, 0.5, 1];
  for (let i = from; i < to; i++) {
    const band = Math.floor(i / 4);
    for (let c = 0; c < 4; c++) {
      ctx.fillStyle = (band + c) % 2 === 0 ? ROAD : ROAD_DARK;
      quad(i, cols[c], cols[c + 1], 0);
    }
  }

  ctx.globalAlpha = alpha;
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
  const hl = CAR.len / 2;
  const hw = CAR.width / 2;
  const hh = CAR.height;
  const C = (a: number, b: number, lift: number): [number, number] =>
    P(g.x + c * a - sn * b, g.y + sn * a + c * b, g.z + lift);
  const quadCar = (q: [number, number][], color: string) => {
    ctx.beginPath();
    q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  const faces: { n: [number, number]; a: [number, number]; b: [number, number] }[] = [
    { n: [c, sn], a: [hl, -hw], b: [hl, hw] },
    { n: [-sn, c], a: [hl, hw], b: [-hl, hw] },
    { n: [-c, -sn], a: [-hl, hw], b: [-hl, -hw] },
    { n: [sn, -c], a: [-hl, -hw], b: [hl, -hw] },
  ];
  for (const f of faces) {
    if (f.n[0] + f.n[1] <= 0) continue;
    quadCar([C(f.a[0], f.a[1], 0), C(f.b[0], f.b[1], 0), C(f.b[0], f.b[1], hh), C(f.a[0], f.a[1], hh)], CAR_SIDE);
  }
  quadCar([C(hl, hw, hh), C(hl, -hw, hh), C(-hl, -hw, hh), C(-hl, hw, hh)], CAR_TOP);
  for (const b of [-hw * 0.4, hw * 0.4]) {
    quadCar([C(hl, b - 1.8, hh), C(hl, b + 1.8, hh), C(-hl, b + 1.8, hh), C(-hl, b - 1.8, hh)], "#f4fff0");
  }
  quadCar([C(hl * 0.25, hw * 0.75, hh), C(hl * 0.25, -hw * 0.75, hh), C(hl * 0.6, -hw * 0.75, hh), C(hl * 0.6, hw * 0.75, hh)], "#2a3a4a");

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
