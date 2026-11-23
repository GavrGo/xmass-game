const КАДРОВ = 32;
const ОБОРОТОВ = 1.25;
const ДЛИТЕЛЬНОСТЬ = 600;
const СТИЛЬ_СКРЫТИЯ = "[data-swapping] [data-sym] { visibility: hidden !important; }";

type Точка = { x: number; y: number };

function траектория(p0: Точка, центр: Точка, w: number, h: number, обратно: boolean): Keyframe[] {
  const dx = p0.x - центр.x, dy = p0.y - центр.y;
  const r0 = Math.hypot(dx, dy), θ0 = Math.atan2(dy, dx);
  const кадры: Keyframe[] = [];
  for (let i = 0; i <= КАДРОВ; i++) {
    const k = обратно ? 1 - i / КАДРОВ : i / КАДРОВ;
    const r = r0 * Math.pow(1 - k, 1.4);
    const θ = θ0 + k * ОБОРОТОВ * 2 * Math.PI;
    const x = центр.x + r * Math.cos(θ);
    const y = центр.y + r * Math.sin(θ);
    кадры.push({
      transform: `translate(${x - w / 2}px, ${y - h / 2}px) scale(${1 - 0.5 * k})`,
      opacity: 1 - 0.5 * k,
    });
  }
  return кадры;
}

function клонИконки(el: HTMLElement, слой: HTMLElement) {
  const r = el.getBoundingClientRect();
  const копия = el.cloneNode(true) as HTMLElement;
  копия.removeAttribute("data-sym");
  Object.assign(копия.style, {
    position: "fixed", left: "0px", top: "0px", margin: "0", animation: "none",
    width: `${r.width}px`, height: `${r.height}px`, transition: "none",
  });
  слой.appendChild(копия);
  return { копия, p0: { x: r.left + r.width / 2, y: r.top + r.height / 2 }, w: r.width, h: r.height };
}

const кадр = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

export async function спиральныйПереход(доска: HTMLElement | null, сменить: () => void): Promise<void> {
  if (!доска) { сменить(); return; }
  const стиль = document.createElement("style");
  стиль.textContent = СТИЛЬ_СКРЫТИЯ;
  document.head.appendChild(стиль);
  const br = доска.getBoundingClientRect();
  const центр = { x: br.left + br.width / 2, y: br.top + br.height / 2 };
  const слой = document.createElement("div");
  слой.className = "pointer-events-none fixed inset-0 z-[60]";
  document.body.appendChild(слой);
  доска.dataset.swapping = "1";
  try {
    const уходящие = Array.from(доска.querySelectorAll<HTMLElement>("[data-sym]")).map((el) => клонИконки(el, слой));
    await Promise.all(уходящие.map(({ копия, p0, w, h }) =>
      копия.animate(траектория(p0, центр, w, h, false), { duration: ДЛИТЕЛЬНОСТЬ, easing: "ease-in", fill: "forwards" }).finished));
    слой.innerHTML = "";
    сменить();
    await кадр();
    const входящие = Array.from(доска.querySelectorAll<HTMLElement>("[data-sym]")).map((el) => клонИконки(el, слой));
    await Promise.all(входящие.map(({ копия, p0, w, h }) =>
      копия.animate(траектория(p0, центр, w, h, true), { duration: ДЛИТЕЛЬНОСТЬ, easing: "ease-out", fill: "forwards" }).finished));
  } finally {
    delete доска.dataset.swapping;
    стиль.remove();
    слой.remove();
  }
}
