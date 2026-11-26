import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Т } from "../texts";
import { DRIFT, createGame, policeAxis, routePts, scoreOf, step, type Cop, type Game, type Mark, type Pose, type Prop, type PropKind, type Pt } from "../game/driftBoss";

const BEST_KEY = "driftBossBest";

type Status = "idle" | "play" | "stamp" | "over";
const isoX = (x: number, y: number) => (x - y) * 0.866;
const isoY = (x: number, y: number) => (x + y) * 0.5;

const WALL = "#16294a";
const WALL_H = 10;
const BACK = 120;
const AHEAD = 200;
const GLASS = "#22344a";
const TIRE = "#1d1d22";
const HUB = "#c9ced8";
const LIGHT = "#fff6b3";
const TAIL = "#ff3b3b";
type Litter = { kind: "paper" | "bag" | "pack"; color: string; w: number; h: number };
const LITTER: Litter[] = [
  { kind: "paper", color: "#b9b6ab", w: 6, h: 5 },
  { kind: "paper", color: "#a8a48f", w: 5, h: 7 },
  { kind: "bag", color: "#8fa5b3", w: 8, h: 7 },
  { kind: "pack", color: "#8e2d28", w: 6, h: 4 },
  { kind: "pack", color: "#2a5485", w: 5, h: 4 },
  { kind: "pack", color: "#9c7620", w: 5, h: 4 },
];
const ASPHALT = "#2b2e36";
const ROAD_EDGE = "#3f5a7b";
const hash = (n: number) => {
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};
const STAMP_HOLD = 2.4;

type Local = [number, number, number];
type Face = { pts: [number, number][]; color: string; depth: number };
type Palette = {
  top: string;
  cabin: string;
  side: string;
  end: string;
  glass: string;
  stripe: string;
  light: string;
  tail: string;
};

const COP_PAL: Palette = {
  top: "#f0f0f0",
  cabin: "#e2e2e2",
  side: "#2b2b2b",
  end: "#1b1b1b",
  glass: "#1a1e24",
  stripe: "#9a9a9a",
  light: "#fafafa",
  tail: "#8a1f1f",
};

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

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function regular(n: number, r: number): [number, number][] {
  return Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
}

const PROP_SHAPE: Record<Exclude<PropKind, "police" | "barrier">, { ring: [number, number][]; h: number; side: string; top: string }> = {
  barrel: { ring: regular(8, 6), h: 14, side: "#8a3f1d", top: "#9a5a33" },
  crate: {
    ring: [
      [-6, -6],
      [6, -6],
      [6, 6],
      [-6, 6],
    ],
    h: 12,
    side: "#6b4824",
    top: "#8a6a40",
  },
  bin: { ring: regular(8, 5), h: 11, side: "#363f33", top: "#4a5646" },
};

const scaleHex = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(Math.min(255, v * f)).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
};
const PAINTS = ["#e8322b", "#ff8a1f", "#f2d02e", "#2fbf5a", "#2ec4d6", "#2f6fe0", "#8a4fe0", "#ff5fa8"];
const PLAYER_PALS: Palette[] = PAINTS.map((c) => ({
  top: c,
  cabin: scaleHex(c, 1.15),
  side: scaleHex(c, 0.6),
  end: scaleHex(c, 0.42),
  glass: GLASS,
  stripe: scaleHex(c, 1.6),
  light: LIGHT,
  tail: TAIL,
}));
const shadeHex = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(Math.min(255, v * f));
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
};

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
  bg.addColorStop(0, "#0a1f3a");
  bg.addColorStop(1, "#050d1c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  for (const r of g.ripples) {
    const k = r.age / DRIFT.rippleLife;
    const R = 8 + 60 * k;
    ctx.beginPath();
    for (let q = 0; q <= 32; q++) {
      const th = (q / 32) * Math.PI * 2;
      const [rx, ry] = P(r.x + Math.cos(th) * R, r.y + Math.sin(th) * R, 0);
      if (q) ctx.lineTo(rx, ry);
      else ctx.moveTo(rx, ry);
    }
    ctx.strokeStyle = `rgba(190,225,255,${(0.6 * (1 - k) * alpha).toFixed(3)})`;
    ctx.lineWidth = 2 * s;
    ctx.stroke();
  }
  const layers: [number, number, number, string][] = [
    [60, 1.6, 0.22, "rgba(90,150,210,0.22)"],
    [37, 2.3, 0.16, "rgba(140,190,235,0.14)"],
  ];
  for (const [cell, speed, thr, col] of layers) {
    const gx0 = Math.round(g.x / cell);
    const gy0 = Math.round(g.y / cell);
    ctx.beginPath();
    for (let i = -14; i <= 14; i++) {
      for (let j = -14; j <= 14; j++) {
        const wx = (gx0 + i) * cell;
        const wy = (gy0 + j) * cell;
        if (Math.sin(time * speed + wx * 0.05 + wy * 0.09) < thr) continue;
        const [ax, ay] = P(wx, wy, 0);
        const [bx, by] = P(wx + 16, wy, 0);
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
      }
    }
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.2 * s;
    ctx.stroke();
  }
  {
    const gx0 = Math.round(g.x / 90);
    const gy0 = Math.round(g.y / 90);
    for (let i = -8; i <= 8; i++) {
      for (let j = -8; j <= 8; j++) {
        const wx = (gx0 + i) * 90 + hash(i * 31 + j * 17) * 60;
        const wy = (gy0 + j) * 90 + hash(i * 13 + j * 53) * 60;
        const tw = 0.5 + 0.5 * Math.sin(time * 2 + hash(i + j * 7) * 20);
        if (tw < 0.55) continue;
        const [gx, gy] = P(wx, wy, 0);
        ctx.beginPath();
        ctx.arc(gx, gy, 1.4 * s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210,235,255,${(0.55 * (tw - 0.55) / 0.45).toFixed(3)})`;
        ctx.fill();
      }
    }
  }
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
  const segPoint = (arr: Pt[], i: number, u: number, v: number, dz: number): [number, number] => {
    const a = arr[i];
    const b = arr[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const hw = ((a.w + (b.w - a.w) * u) / 2) * v;
    return P(
      a.x + (b.x - a.x) * u - ((b.y - a.y) / len) * hw,
      a.y + (b.y - a.y) * u + ((b.x - a.x) / len) * hw,
      a.lift + (b.lift - a.lift) * u + dz,
    );
  };
  const segQuad = (arr: Pt[], i: number, dz: number): [number, number][] => [
    segPoint(arr, i, 0, 1, dz),
    segPoint(arr, i, 1, 1, dz),
    segPoint(arr, i, 1, -1, dz),
    segPoint(arr, i, 0, -1, dz),
  ];
  const bendsAt = (arr: Pt[], i: number) => {
    const a = arr[i - 1];
    const b = arr[i];
    const c = arr[i + 1];
    return Math.abs((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)) > 1e-6;
  };
  const tracePoly = (q: [number, number][]) => {
    ctx.beginPath();
    q.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  const alt = g.track.alt;
  const routesAt = (i: number): Pt[][] => (alt[i] !== pts[i] || alt[i + 1] !== pts[i + 1] ? [pts, alt] : [pts]);
  const roadShapes = (a: number, b: number, dz: number) => {
    const out: [number, number][][] = [];
    for (let i = a; i < b; i++) {
      for (const arr of routesAt(i)) {
        out.push(segQuad(arr, i, dz));
        if (i > a && bendsAt(arr, i)) {
          const p = arr[i];
          out.push(regular(12, p.w / 2).map(([dx, dy]) => P(p.x + dx, p.y + dy, p.lift + dz)));
        }
      }
    }
    return out;
  };

  const drawVehicle = (v: Pose, pal: Palette, bar: boolean) => {
    const cc = Math.cos(v.h);
    const ss = Math.sin(v.h);
    const cp = Math.cos(v.pitch);
    const sp = Math.sin(v.pitch);
    const rc = Math.cos(v.roll);
    const rs = Math.sin(v.roll);
    const body: Face[] = [];
    const cabin: Face[] = [];
    const details: Face[] = [];
    let layer = body;

    const rot = (a: number, b: number, z: number): Local => {
      const z1 = z * cp + a * sp;
      return [a * cp - z * sp, b * rc + z1 * rs, z1 * rc - b * rs];
    };
    const toW = (a: number, b: number, z: number): [number, number, number] => {
      const [ra, rb, rz] = rot(a, b, z);
      return [v.x + cc * ra - ss * rb, v.y + ss * ra + cc * rb, v.z + rz + 10 * Math.abs(rs)];
    };
    const addFace = (local: Local[], n: Local, color: string) => {
      const [n0, n1, n2] = rot(n[0], n[1], n[2]);
      const wn0 = n0 * cc - n1 * ss;
      const wn1 = n0 * ss + n1 * cc;
      if (wn0 + wn1 + 1.5 * n2 <= 0) return;
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
    const box = (a0: number, a1: number, b0: number, b1: number, z0: number, z1: number, color: string) => {
      addFace(
        [
          [a0, b0, z1],
          [a1, b0, z1],
          [a1, b1, z1],
          [a0, b1, z1],
        ],
        [0, 0, 1],
        color,
      );
      addFace(
        [
          [a1, b0, z0],
          [a1, b1, z0],
          [a1, b1, z1],
          [a1, b0, z1],
        ],
        [1, 0, 0],
        color,
      );
      addFace(
        [
          [a0, b0, z0],
          [a0, b1, z0],
          [a0, b1, z1],
          [a0, b0, z1],
        ],
        [-1, 0, 0],
        color,
      );
      addFace(
        [
          [a0, b0, z0],
          [a1, b0, z0],
          [a1, b0, z1],
          [a0, b0, z1],
        ],
        [0, -1, 0],
        color,
      );
      addFace(
        [
          [a0, b1, z0],
          [a1, b1, z0],
          [a1, b1, z1],
          [a0, b1, z1],
        ],
        [0, 1, 0],
        color,
      );
    };

    const shadow = [
      [-20.5, -10.5],
      [20.5, -10.5],
      [20.5, 10.5],
      [-20.5, 10.5],
    ].map(([a, b]) => P(v.x + cc * a - ss * b, v.y + ss * a + cc * b, v.ground));
    ctx.beginPath();
    shadow.forEach(([sx, sy], k) => (k ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy)));
    ctx.closePath();
    ctx.fillStyle = `rgba(0,0,0,${0.3 * (v.air ? 0.5 : 1) * alpha})`;
    ctx.fill();

    const beamCone = (b: number) => {
      const [ox, oy, oz] = toW(20.5, b, 4);
      const ex = ox + cc * 150;
      const ey = oy + ss * 150;
      const lx = -ss * 20;
      const ly = cc * 20;
      const wx = -ss * 2.5;
      const wy = cc * 2.5;
      const o = P(ox, oy, oz);
      const e = P(ex, ey, v.ground);
      const grad = ctx.createLinearGradient(o[0], o[1], e[0], e[1]);
      grad.addColorStop(0, `rgba(255,236,170,${0.22 * alpha})`);
      grad.addColorStop(1, "rgba(255,236,170,0)");
      const q = [
        P(ox + wx, oy + wy, oz),
        P(ex + lx, ey + ly, v.ground),
        P(ex - lx, ey - ly, v.ground),
        P(ox - wx, oy - wy, oz),
      ];
      ctx.beginPath();
      q.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    };
    ctx.globalCompositeOperation = "lighter";
    beamCone(-5.5);
    beamCone(5.5);
    ctx.globalCompositeOperation = "source-over";
    prism(BODY_PROF, -10, 10, [pal.side, pal.end, pal.top, pal.top, pal.top, pal.end], pal.side);
    layer = body;
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
        pal.stripe,
      );
    }
    layer = cabin;
    prism(CABIN_PROF, -8.5, 8.5, [pal.glass, pal.top, pal.glass, pal.side], pal.cabin);

    layer = details;
    for (const sb of [-1, 1]) {
      addFace(
        CABIN_GLASS.map(([a, z]) => [a, sb * 8.65, z] as Local),
        [0, sb, 0],
        pal.glass,
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
        pal.light,
      );
      addFace(
        [
          [-20.1, b0, 3],
          [-20.1, b1, 3],
          [-20.1, b1, 5],
          [-20.1, b0, 5],
        ],
        [-1, 0, 0],
        pal.tail,
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
    if (bar) {
      const red = Math.floor(time * 6) % 2 === 0;
      box(-4, 2, -4.5, -0.5, 12, 14, red ? "#ff2d2d" : "#4a1414");
      box(-4, 2, 0.5, 4.5, 12, 14, red ? "#1f1f1f" : "#2d62ff");
    }

    for (const layerFaces of [body, cabin]) {
      layerFaces.sort((p, q) => p.depth - q.depth);
      for (const f of layerFaces) poly(f.pts, f.color);
    }
    for (const f of details) poly(f.pts, f.color);

    const lamp = (a: number, b: number, z: number, r: number, col: string, k: number) => {
      const [wx, wy, wz] = toW(a, b, z);
      const [gx, gy] = P(wx, wy, wz);
      const grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * s);
      grd.addColorStop(0, `rgba(${col},${k * alpha})`);
      grd.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(gx, gy, r * s, 0, Math.PI * 2);
      ctx.fill();
    };
    ctx.globalCompositeOperation = "lighter";
    for (const b of [-5.5, 5.5]) {
      lamp(20.5, b, 4, 10, "255,240,180", 0.45);
      lamp(-20.5, b, 4, 12, "255,40,40", 0.6);
    }
    ctx.globalCompositeOperation = "source-over";
  };

  const drawPoliceCar = (pr: Prop) => {
    const pt = pts[pr.idx];
    ctx.globalAlpha = alpha;
    drawVehicle({ x: pr.x, y: pr.y, z: pt.lift, h: policeAxis(pt.dir), roll: pr.tilt, pitch: 0, ground: pt.lift, air: false }, COP_PAL, true);
  };

  const drawBarrier = (pr: Prop) => {
    const pt = pts[pr.idx];
    const flying = pr.state === "flying";
    const z0 = flying ? pr.z : pt.lift;
    ctx.globalAlpha = alpha * (flying ? clamp01((DRIFT.propLife - pr.age) / 0.6) : 1);
    const a = policeAxis(pt.dir) + pr.rot;
    const hx = Math.cos(a) * DRIFT.policeHalf;
    const hy = Math.sin(a) * DRIFT.policeHalf;
    const ax = pr.x - hx;
    const ay = pr.y - hy;
    const bx = pr.x + hx;
    const by = pr.y + hy;
    const fenceH = 7;
    const panels = 4;
    for (let k = 0; k < panels; k++) {
      const t0 = k / panels;
      const t1 = (k + 1) / panels;
      const x0 = ax + (bx - ax) * t0;
      const y0 = ay + (by - ay) * t0;
      const x1 = ax + (bx - ax) * t1;
      const y1 = ay + (by - ay) * t1;
      poly([P(x0, y0, z0), P(x1, y1, z0), P(x1, y1, z0 + fenceH), P(x0, y0, z0 + fenceH)], k % 2 ? "#f2f2f2" : "#e0482b");
    }
    const [t0x, t0y] = P(ax, ay, z0 + fenceH);
    const [t1x, t1y] = P(bx, by, z0 + fenceH);
    ctx.beginPath();
    ctx.moveTo(t0x, t0y);
    ctx.lineTo(t1x, t1y);
    ctx.strokeStyle = "#2b2b2b";
    ctx.lineWidth = 1.2 * s;
    ctx.stroke();
    ctx.globalAlpha = alpha;
  };

  const drawProp = (pr: Prop) => {
    if (pr.kind === "police") {
      drawPoliceCar(pr);
      return;
    }
    if (pr.kind === "barrier") {
      drawBarrier(pr);
      return;
    }
    const shape = PROP_SHAPE[pr.kind];
    ctx.globalAlpha = alpha * (pr.state === "flying" ? clamp01((DRIFT.propLife - pr.age) / 0.6) : 1);
    const z0 = pr.state === "flying" ? pr.z : pts[pr.idx].lift;
    const z1 = z0 + shape.h;
    const c = Math.cos(pr.rot);
    const sn = Math.sin(pr.rot);
    const at = (a: number, b: number, k = 1): [number, number] => [
      pr.x + (c * a - sn * b) * k,
      pr.y + (sn * a + c * b) * k,
    ];
    const ring = shape.ring.map(([a, b]) => at(a, b));
    const n = ring.length;
    const faces: { ax: number; ay: number; bx: number; by: number; d: number; color: string }[] = [];
    for (let i = 0; i < n; i++) {
      const [ax, ay] = ring[i];
      const [bx, by] = ring[(i + 1) % n];
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      let nx = by - ay;
      let ny = ax - bx;
      const len = Math.hypot(nx, ny) || 1;
      nx /= len;
      ny /= len;
      if (nx * (mx - pr.x) + ny * (my - pr.y) < 0) {
        nx = -nx;
        ny = -ny;
      }
      if (nx + ny <= 0) continue;
      const lit = 0.7 + 0.3 * clamp01(nx * 0.5 + ny * 0.5);
      faces.push({ ax, ay, bx, by, d: mx + my, color: shadeHex(shape.side, lit) });
    }
    faces.sort((a, b) => a.d - b.d);
    const seam = shadeHex(shape.side, 0.5);
    const hi = "rgba(255,240,215,0.45)";
    for (const f of faces) {
      poly([P(f.ax, f.ay, z0), P(f.bx, f.by, z0), P(f.bx, f.by, z1), P(f.ax, f.ay, z1)], f.color);
      const seg = (t0: number, za: number, t1: number, zb: number, col: string, w: number) => {
        const p0 = P(f.ax + (f.bx - f.ax) * t0, f.ay + (f.by - f.ay) * t0, za);
        const p1 = P(f.ax + (f.bx - f.ax) * t1, f.ay + (f.by - f.ay) * t1, zb);
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.strokeStyle = col;
        ctx.lineWidth = w * s;
        ctx.stroke();
      };
      if (pr.kind === "barrel") {
        seg(0, z0 + 3, 1, z0 + 3, seam, 1.4);
        seg(0, z1 - 3, 1, z1 - 3, seam, 1.4);
        seg(0.3, z0 + 2, 0.3, z1 - 2, hi, 1.2);
      } else if (pr.kind === "crate") {
        seg(0, z0 + shape.h / 3, 1, z0 + shape.h / 3, seam, 1);
        seg(0, z0 + (2 * shape.h) / 3, 1, z0 + (2 * shape.h) / 3, seam, 1);
        seg(0.5, z0, 0.5, z1, seam, 0.8);
      } else {
        for (const t of [0.2, 0.4, 0.6, 0.8]) seg(t, z0 + 1, t, z1 - 3, seam, 0.8);
        seg(0, z1 - 2, 1, z1 - 2, seam, 1);
      }
    }
    const topP = ring.map(([x, y]) => P(x, y, z1));
    poly(topP, shape.top);
    if (pr.kind === "barrel") {
      poly(
        shape.ring.map(([a, b]) => {
          const [x, y] = at(a, b, 0.55);
          return P(x, y, z1);
        }),
        "#6b3218",
      );
    } else if (pr.kind === "crate") {
      ctx.beginPath();
      ctx.moveTo(topP[0][0], topP[0][1]);
      ctx.lineTo(topP[2][0], topP[2][1]);
      ctx.moveTo(topP[1][0], topP[1][1]);
      ctx.lineTo(topP[3][0], topP[3][1]);
      ctx.strokeStyle = seam;
      ctx.lineWidth = s;
      ctx.stroke();
    } else {
      poly(
        shape.ring.map(([a, b]) => {
          const [x, y] = at(a, b, 0.6);
          return P(x, y, z1);
        }),
        "#2d352b",
      );
      ctx.beginPath();
      const [kx, ky] = P(pr.x, pr.y, z1 + 1);
      ctx.arc(kx, ky, 1.6 * s, 0, Math.PI * 2);
      ctx.fillStyle = "#8a9286";
      ctx.fill();
    }
    ctx.globalAlpha = alpha;
  };

  const near = routePts(g.track, g.route)[g.idx];
  const carBehind = g.phase === "fall" && g.x + g.y > near.x + near.y;
  const behindCop = (c: Cop) => c.phase === "fall" && c.x + c.y > routePts(g.track, c.route)[c.idx].x + routePts(g.track, c.route)[c.idx].y;
  if (carBehind) drawVehicle(g, PLAYER_PALS[g.paint], false);
  for (const c of g.cops) if (behindCop(c)) drawVehicle(c, COP_PAL, true);

  const top = roadShapes(from, to, 0);
  for (const q of roadShapes(from, to, -WALL_H)) poly(q, WALL);
  ctx.lineJoin = "round";
  ctx.strokeStyle = ROAD_EDGE;
  ctx.lineWidth = 2.4 * s;
  for (const q of top) {
    tracePoly(q);
    ctx.stroke();
  }
  for (const q of top) {
    tracePoly(q);
    ctx.fillStyle = ASPHALT;
    ctx.fill();
  }
  for (let i = from; i < to; i++) {
    for (const arr of routesAt(i)) {
      for (let j = 0; j < 4; j++) {
        const [sx, sy] = segPoint(arr, i, hash(i * 5 + j * 3 + 0.25), -0.9 + 1.8 * hash(i * 7 + j + 0.5), 0);
        ctx.beginPath();
        ctx.arc(sx, sy, (0.6 + 1.1 * hash(i * 3 + j)) * s, 0, Math.PI * 2);
        ctx.fillStyle = hash(i * 11 + j) > 0.5 ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.28)";
        ctx.fill();
      }
    }
  }

  const drawCopGlow = (c: Cop) => {
    const k = (Math.sin(time * 16 + c.idx) + 1) / 2;
    const fx = Math.cos(c.h);
    const fy = Math.sin(c.h);
    const blob = (x: number, y: number, z: number, r: number, col: string, a: number) => {
      const [gx, gy] = P(x, y, z);
      const grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * s);
      grd.addColorStop(0, `rgba(${col},${a})`);
      grd.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(gx, gy, r * s, 0, Math.PI * 2);
      ctx.fill();
    };
    blob(c.x - fy * 9, c.y + fx * 9, c.ground + 1, 90, "255,30,30", 0.7 * k);
    blob(c.x + fy * 9, c.y - fx * 9, c.ground + 1, 90, "30,110,255", 0.7 * (1 - k));
    blob(c.x - fy * 5, c.y + fx * 5, c.ground + 18, 34, "255,30,30", 0.95 * k);
    blob(c.x + fy * 5, c.y - fx * 5, c.ground + 18, 34, "30,110,255", 0.95 * (1 - k));
  };
  ctx.globalCompositeOperation = "lighter";
  for (const c of g.cops) if (c.phase !== "fall") drawCopGlow(c);
  ctx.globalCompositeOperation = "source-over";
  for (let i = from; i < to; i++) {
    const crest = clamp01(((pts[i].lift + pts[i + 1].lift) / 2) / DRIFT.rampHeight);
    if (crest <= 0) continue;
    for (const arr of routesAt(i)) {
      tracePoly(segQuad(arr, i, 0));
      ctx.fillStyle = `rgba(255,255,255,${(0.3 * crest).toFixed(3)})`;
      ctx.fill();
    }
  }

  const drawMarks = (list: Mark[]) => {
    ctx.strokeStyle = "rgba(25,25,30,0.8)";
    ctx.lineWidth = 4 * s;
    for (let k = 1; k < list.length; k++) {
      const m0 = list[k - 1];
      const m1 = list[k];
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
  };
  drawMarks(g.marks);
  for (const c of g.cops) if (c.phase !== "fall") drawMarks(c.marks);

  for (const l of g.leaves) {
    const L = LITTER[l.tone];
    const fade = l.fly ? clamp01(1 - l.age / DRIFT.leafLife) : 1;
    const c = Math.cos(l.rot);
    const sn = Math.sin(l.rot);
    const at = (a: number, b: number): [number, number] =>
      P(l.x + c * a - sn * b, l.y + sn * a + c * b, l.z + 0.5);
    const { w, h } = L;
    const outline: [number, number][] =
      L.kind === "bag"
        ? [[-w, -h * 0.6], [w * 0.4, -h], [w, -h * 0.2], [w * 0.7, h], [-w * 0.2, h * 0.9], [-w, h * 0.3]]
        : L.kind === "pack"
          ? [[-w, -h], [w, -h], [w * 0.8, 0], [w, h], [-w, h], [-w * 0.8, 0]]
          : [[-w, -h], [w, -h], [w, h], [-w, h]];
    ctx.beginPath();
    outline.forEach(([a, b], k) => {
      const [px, py] = at(a, b);
      if (k) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    });
    ctx.closePath();
    ctx.globalAlpha = alpha * fade * 0.8;
    ctx.fillStyle = L.color;
    ctx.fill();
    if (L.kind === "bag") {
      ctx.strokeStyle = "rgba(90,120,140,0.6)";
      ctx.lineWidth = 0.7 * s;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = alpha;
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

  for (const pr of g.track.props) {
    if (from <= pr.idx && pr.idx <= to) drawProp(pr);
  }

  for (const d of g.splash) {
    const [dx, dy] = P(d.x, d.y, d.z);
    const k = d.age / d.life;
    ctx.beginPath();
    ctx.arc(dx, dy, (2.4 * (1 - k) + 0.9) * s, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(215,240,255,${((1 - k) * alpha).toFixed(3)})`;
    ctx.fill();
  }
  for (const sp of g.sparks) {
    const [sx, sy] = P(sp.x, sp.y, sp.z);
    const k = sp.age / sp.life;
    ctx.beginPath();
    ctx.arc(sx, sy, (2.4 * (1 - k) + 0.8) * s, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,${Math.round(200 + 55 * (1 - k))},${k < 0.5 ? 120 : 60},${1 - k})`;
    ctx.fill();
  }

  for (const p of g.smoke) {
    const [sx, sy] = P(p.x, p.y, p.z);
    const k = p.age / p.life;
    ctx.beginPath();
    ctx.arc(sx, sy, p.r * s * (1 + k * 2.2), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.shade},${p.shade},${p.shade},${0.48 * (1 - k) * alpha})`;
    ctx.fill();
  }

  for (const c of g.cops) if (!behindCop(c)) drawVehicle(c, COP_PAL, true);
  if (!carBehind) drawVehicle(g, PLAYER_PALS[g.paint], false);
  if (g.phase === "play") {
    const [hx, hy] = P(g.x, g.y, g.z + 40);
    const bw = 44 * s;
    const bh = 5 * s;
    const frac = g.health / DRIFT.maxHealth;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(hx - bw / 2, hy - bh / 2, bw, bh);
    ctx.fillStyle = frac > 0.4 ? "#7bd88f" : frac > 0.2 ? "#f5c542" : "#ff5a4e";
    ctx.fillRect(hx - bw / 2, hy - bh / 2, bw * frac, bh);
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
    let bw = 0;
    let stampAt = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      time += dt;
      if (!gameRef.current) gameRef.current = createGame();
      const g = gameRef.current;
      if (statusRef.current === "play") {
        step(g, holdingRef.current, dt);
        if (g.phase === "over") {
          statusRef.current = "stamp";
          stampAt = time;
          holdingRef.current = false;
          const score = scoreOf(g);
          const prev = Number(localStorage.getItem(BEST_KEY)) || 0;
          const best = Math.max(prev, score);
          localStorage.setItem(BEST_KEY, String(best));
          setResult({ score, best });
          setStatus("stamp");
        }
      } else if (statusRef.current === "stamp") {
        step(g, false, dt);
        if (time - stampAt > STAMP_HOLD) {
          statusRef.current = "over";
          setStatus("over");
        }
      } else if (statusRef.current === "over") {
        step(g, false, dt);
      }
      bw = g.phase === "play" ? 0 : Math.min(1, bw + dt * 1.2);
      canvas.style.filter = bw > 0 ? `grayscale(${bw})` : "";
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
    <div
      onPointerDown={press}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 z-30 select-none overflow-hidden bg-black"
      style={{ touchAction: "none", WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
    >
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

      {status === "stamp" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <style>{`@keyframes driftStamp{0%{transform:scale(2.2);opacity:0}50%{transform:scale(0.96);opacity:1}72%{transform:scale(1.03)}100%{transform:scale(1);opacity:1}}`}</style>
          <div style={{ transform: "scaleX(1.4)" }}>
            <div
              style={{
                animation: "driftStamp 0.38s cubic-bezier(0.2,0.9,0.3,1.2) both",
                fontFamily: "'Arial Black', Impact, sans-serif",
                fontWeight: 900,
                fontSize: "2.2rem",
                lineHeight: 1.1,
                color: "#ffffff",
                WebkitTextStroke: "5px #000",
                paintOrder: "stroke fill",
                letterSpacing: "0.02em",
                whiteSpace: "nowrap",
              }}
            >
              {Т.дрифтБосс.потрачено}
            </div>
          </div>
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
