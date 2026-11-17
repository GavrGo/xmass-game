import { Т } from "../texts";
// Выбор случайной картинки из public/puzzles/ (список строит vite.config.ts автоматически).
// Если картинок нет или они не грузятся — рисуем запасную прямо в игре.

async function списокКартинок(): Promise<string[]> {
  try {
    const r = await fetch("/puzzles/manifest.json", { cache: "no-store" });
    if (!r.ok) return [];
    const список = await r.json();
    if (!Array.isArray(список)) return [];
    return список.map((f: string) => "/puzzles/" + encodeURIComponent(f));
  } catch {
    return [];
  }
}

function загрузить(src: string): Promise<boolean> {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => ok(true);
    img.onerror = () => ok(false);
    img.src = src;
  });
}

/** Запасная новогодняя картинка 800×800 (если папка с картинками пуста). */
function запаснаяКартинка(): string {
  const c = document.createElement("canvas");
  c.width = c.height = 800;
  const ctx = c.getContext("2d")!;
  const г = ctx.createLinearGradient(0, 0, 800, 800);
  г.addColorStop(0, "#c8102e"); г.addColorStop(0.5, "#165b33"); г.addColorStop(1, "#0b1d2e");
  ctx.fillStyle = г; ctx.fillRect(0, 0, 800, 800);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (let i = -800; i < 800; i += 80) { ctx.save(); ctx.translate(i, 0); ctx.rotate(Math.PI / 4); ctx.fillRect(0, 0, 30, 1600); ctx.restore(); }
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const фигуры: [string, number, number, number][] = [
    ["🎄", 400, 400, 340], ["⛄", 150, 150, 150], ["🎁", 650, 160, 140], ["🔔", 150, 650, 140], ["⭐", 650, 650, 150],
  ];
  for (const [e, x, y, s] of фигуры) { ctx.font = `${s}px serif`; ctx.fillText(e, x, y); }
  ctx.fillStyle = "#f4c430"; ctx.font = "bold 70px sans-serif"; ctx.fillText(Т.игры.пятнашки.запаснаяПодпись, 400, 740);
  return c.toDataURL("image/jpeg", 0.88);
}

/** Возвращает адрес случайной картинки (стараясь не повторять прошлую). */
export async function выбратьКартинку(прошлая: string | null): Promise<string> {
  const все = await списокКартинок();
  const кандидаты = все.filter((s) => s !== прошлая);
  const порядок = (кандидаты.length ? кандидаты : все).sort(() => Math.random() - 0.5);
  for (const src of порядок) {
    if (await загрузить(src)) return src;
  }
  return запаснаяКартинка();
}
