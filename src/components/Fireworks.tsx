import { useEffect, useRef } from "react";

/** Салют на canvas: бесконечные залпы с искрами, гравитацией и затуханием. Занимает весь родитель (absolute inset-0). */
export default function Fireworks() {
  const холст = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = холст.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth, h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const цвета = ["#FFD34D", "#FFB800", "#FFF2B0", "#FF8A3D", "#FFFFFF"];
    type Искра = { x: number; y: number; vx: number; vy: number; ж: number; цвет: string; р: number };
    const искры: Искра[] = [];
    let стоп = false;

    const залп = () => {
      const x = w * (0.15 + Math.random() * 0.7);
      const y = h * (0.1 + Math.random() * 0.45);
      const n = 26 + Math.floor(Math.random() * 18);
      const цвет = цвета[Math.floor(Math.random() * цвета.length)];
      for (let i = 0; i < n; i++) {
        const угол = (Math.PI * 2 * i) / n + Math.random() * 0.2;
        const скорость = 0.7 + Math.random() * 1.6;
        искры.push({ x, y, vx: Math.cos(угол) * скорость, vy: Math.sin(угол) * скорость, ж: 900 + Math.random() * 900, цвет, р: 1.1 + Math.random() * 1.3 });
      }
    };

    let кадр = 0;
    let следующийЗалп = 0;
    const шаг = () => {
      if (стоп) return;
      const t = performance.now();
      if (t >= следующийЗалп) {
        залп();
        следующийЗалп = t + 520 + Math.random() * 480;
      }
      ctx.clearRect(0, 0, w, h);
      for (let i = искры.length - 1; i >= 0; i--) {
        const и = искры[i];
        и.ж -= 16;
        if (и.ж <= 0) { искры.splice(i, 1); continue; }
        и.x += и.vx; и.y += и.vy;
        и.vx *= 0.985; и.vy = и.vy * 0.985 + 0.035; // трение и гравитация
        ctx.globalAlpha = Math.max(0, и.ж / 1400);
        ctx.fillStyle = и.цвет;
        ctx.beginPath();
        ctx.arc(и.x, и.y, и.р, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      кадр = requestAnimationFrame(шаг);
    };
    кадр = requestAnimationFrame(шаг);

    return () => { стоп = true; cancelAnimationFrame(кадр); };
  }, []);

  return <canvas ref={холст} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}
