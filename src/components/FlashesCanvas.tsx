import { useEffect, useRef } from "react";

export interface Вспышка {
  id: number;
  x: number;       // центр по горизонтали (0..1 от ширины поля)
  y: number;       // центр по вертикали (0..1 от высоты поля)
  радиус: number;  // размер вспышки (доля ширины поля)
  старт: number;   // performance.now() в момент старта
}

const ДЛИТЕЛЬНОСТЬ_МС = 450; // как быстро вспышка гаснет

// Прозрачный canvas поверх поля: рисует яркие радиальные вспышки, которые быстро затухают.
export default function ВспышкиCanvas({ вспышки }: { вспышки: Вспышка[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const список = useRef(вспышки);
  список.current = вспышки;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const кадр = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight, dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const сейчас = performance.now();
      for (const в of список.current) {
        const t = (сейчас - в.старт) / ДЛИТЕЛЬНОСТЬ_МС;
        if (t < 0 || t >= 1) continue;
        const a = Math.pow(1 - t, 1.6);               // яркость: быстро падает
        const R = в.радиус * w * (0.5 + 0.9 * t);      // вспышка растёт
        const x = в.x * w, y = в.y * h;
        const g = ctx.createRadialGradient(x, y, 0, x, y, R);
        g.addColorStop(0, `rgba(255,255,240,${a})`);        // яркий центр
        g.addColorStop(0.3, `rgba(255,220,90,${a * 0.85})`);
        g.addColorStop(0.65, `rgba(255,120,20,${a * 0.4})`);
        g.addColorStop(1, "rgba(255,80,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, R, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(кадр);
    };
    raf = requestAnimationFrame(кадр);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 z-10 h-full w-full" />;
}
