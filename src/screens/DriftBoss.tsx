import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Т } from "../texts";
import { DRIFT, createGame, scoreOf, step, type Game } from "../game/driftBoss";

const BEST_KEY = "driftBossBest";
const ROAD = "#3b4262";
const CURB = "#14172a";

type Status = "idle" | "play" | "over";

const isoX = (x: number, y: number) => (x - y) * 0.866;
const isoY = (x: number, y: number) => (x + y) * 0.5;

function draw(ctx: CanvasRenderingContext2D, g: Game, W: number, H: number, time: number) {
  const cam = g.phase === "play" ? 1 : 1 - 0.7 * Math.min(1, g.fallT / DRIFT.fallTime);
  const s = (Math.min(W, H) / 480) * cam;
  const cx = isoX(g.x, g.y);
  const cy = isoY(g.x, g.y);
  const P = (x: number, y: number, lift = 0): [number, number] => [
    (isoX(x, y) - cx) * s + W / 2,
    (isoY(x, y) - cy) * s + H / 2 - lift * s * 1.5,
  ];
  const pts = g.track.pts;
  const from = Math.max(0, g.idx - 160);
  const to = Math.min(pts.length - 1, g.idx + 260);

  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) / 1.4);
  bg.addColorStop(0, "#1c1f3d");
  bg.addColorStop(1, "#070812");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = from; i <= to; i++) {
    const [sx, sy] = P(pts[i].x, pts[i].y);
    if (i === from) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.strokeStyle = CURB;
  ctx.lineWidth = (DRIFT.trackWidth + 14) * s * 0.85;
  ctx.stroke();
  ctx.strokeStyle = ROAD;
  ctx.lineWidth = DRIFT.trackWidth * s * 0.85;
  ctx.stroke();
  ctx.save();
  ctx.setLineDash([10 * s, 12 * s]);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2 * s;
  ctx.stroke();
  ctx.restore();

  for (let i = from; i <= to; i++) {
    const p = pts[i];
    if (!p.ramp) continue;
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    const r = DRIFT.trackWidth / 2;
    const [x1, y1] = P(p.x + nx * r, p.y + ny * r);
    const [x2, y2] = P(p.x - nx * r, p.y - ny * r);
    ctx.strokeStyle = p.used ? "#7a4b12" : "#ff9f1a";
    ctx.lineWidth = 7 * s;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  for (let i = from; i <= to; i++) {
    const p = pts[i];
    if (!p.coin || p.taken) continue;
    const [sx, sy] = P(p.x, p.y, Math.abs(Math.sin(time * 4 + i)) * 3);
    ctx.beginPath();
    ctx.arc(sx, sy, 7 * s, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd23f";
    ctx.fill();
    ctx.strokeStyle = "#b8860b";
    ctx.lineWidth = 2 * s;
    ctx.stroke();
  }

  const alpha = g.phase === "fall" ? Math.max(0, 1 - g.fallT / DRIFT.fallTime) : 1;

  for (const p of g.smoke) {
    const [sx, sy] = P(p.x, p.y);
    const k = p.age / p.life;
    ctx.beginPath();
    ctx.arc(sx, sy, p.r * s * (1 + k * 2.2), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220,222,235,${0.45 * (1 - k) * alpha})`;
    ctx.fill();
  }

  const [shx, shy] = P(g.x, g.y);
  ctx.beginPath();
  ctx.ellipse(shx, shy, 20 * s, 11 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,0,0,${0.35 * alpha * (g.air ? 0.5 : 1)})`;
  ctx.fill();

  const c = Math.cos(g.h);
  const sn = Math.sin(g.h);
  const L = 34;
  const Wd = 17;
  const C = (a: number, b: number) => P(g.x + c * a - sn * b, g.y + sn * a + c * b, g.z);
  const fill = (pts4: [number, number][], color: string) => {
    ctx.beginPath();
    pts4.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  ctx.globalAlpha = alpha;
  const body = [C(L / 2, Wd / 2), C(L / 2, -Wd / 2), C(-L / 2, -Wd / 2), C(-L / 2, Wd / 2)];
  fill(body, "#ff4d6d");
  ctx.strokeStyle = "#2b0a12";
  ctx.lineWidth = 2 * s;
  ctx.stroke();
  fill([C(L * 0.12, Wd * 0.32), C(L * 0.12, -Wd * 0.32), C(L * 0.32, -Wd * 0.32), C(L * 0.32, Wd * 0.32)], "#9fe8ff");
  ctx.globalAlpha = 1;
}

export default function DriftBoss() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
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
        if (hudRef.current) {
          hudRef.current.textContent = `${Math.floor(g.dist / 10)} ${Т.дрифтБосс.дистанция} · ${g.coins} ${Т.дрифтБосс.монеты}`;
        }
      }
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
    <div
      onPointerDown={press}
      className="fixed inset-0 z-30 select-none overflow-hidden bg-black"
      style={{ touchAction: "none" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => navigate("/games")}
          className="btn btn-secondary pointer-events-auto !px-3 !py-2 text-sm"
        >
          {Т.общее.назад}
        </button>
        <div ref={hudRef} className="rounded-full bg-black/50 px-3 py-1.5 text-sm font-bold text-white" />
      </div>

      {status === "idle" && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 p-6 text-center">
          <div className="text-3xl font-extrabold text-white">{Т.дрифтБосс.название}</div>
          <div className="max-w-xs text-sm text-white/80">{Т.дрифтБосс.подсказка}</div>
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
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => navigate("/games")}
              className="btn btn-secondary"
            >
              {Т.дрифтБосс.меню}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
