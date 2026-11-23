const КАДРОВ = 18;
const ОБОРОТОВ = 1.5;

type Точка = { x: number; y: number };

function траектория(p0: Точка, центр: Точка, w: number, h: number, обратно: boolean): Keyframe[] {
  const dx = p0.x - центр.x, dy = p0.y - центр.y;
  const кадры: Keyframe[] = [];
  for (let i = 0; i <= КАДРОВ; i++) {
    const k = обратно ? 1 - i / КАДРОВ : i / КАДРОВ;
    const угол = k * ОБОРОТОВ * 2 * Math.PI;
    const cos = Math.cos(угол), sin = Math.sin(угол);
    const f = (1 - k) + 0.6 * Math.sin(Math.PI * k);
    const x = центр.x + (dx * cos - dy * sin) * f;
    const y = центр.y + (dx * sin + dy * cos) * f;
    кадры.push({
      transform: `translate(${x - w / 2}px, ${y - h / 2}px) rotate(${(угол * 180) / Math.PI}deg) scale(${1 - 0.7 * k})`,
      opacity: 1 - 0.6 * k,
    });
  }
  return кадры;
}

function клон(el: HTMLElement, слой: HTMLElement) {
  const r = el.getBoundingClientRect();
  const копия = el.cloneNode(true) as HTMLElement;
  Object.assign(копия.style, {
    position: "fixed", left: "0px", top: "0px", margin: "0",
    width: `${r.width}px`, height: `${r.height}px`, transition: "none",
  });
  слой.appendChild(копия);
  return { копия, p0: { x: r.left + r.width / 2, y: r.top + r.height / 2 }, w: r.width, h: r.height };
}

const кадр = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

export async function спиральныйПереход(доска: HTMLElement | null, сменить: () => void, мс = 420): Promise<void> {
  if (!доска) { сменить(); return; }
  const br = доска.getBoundingClientRect();
  const центр = { x: br.left + br.width / 2, y: br.top + br.height / 2 };
  const слой = document.createElement("div");
  слой.className = "pointer-events-none fixed inset-0 z-[60]";
  document.body.appendChild(слой);
  try {
    const уходящие = Array.from(доска.querySelectorAll<HTMLElement>("[data-cell]")).map((el) => клон(el, слой));
    доска.style.opacity = "0";
    await Promise.all(уходящие.map(({ копия, p0, w, h }) =>
      копия.animate(траектория(p0, центр, w, h, false), { duration: мс, easing: "ease-in", fill: "forwards" }).finished));
    слой.innerHTML = "";
    сменить();
    await кадр();
    const входящие = Array.from(доска.querySelectorAll<HTMLElement>("[data-cell]")).map((el) => клон(el, слой));
    await Promise.all(входящие.map(({ копия, p0, w, h }) =>
      копия.animate(траектория(p0, центр, w, h, true), { duration: мс + 40, easing: "ease-out", fill: "forwards" }).finished));
  } finally {
    доска.style.opacity = "";
    слой.remove();
  }
}
