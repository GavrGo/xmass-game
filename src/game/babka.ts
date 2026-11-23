// Движок Babka Crash: полосы с движением, шаг вперёд по тапу, столкновения, рисование на canvas.
// Все числа берутся из config.ts (раздел БАБКА_КРАШ).
import { БАБКА_КРАШ as К, КлючПерсонажа, ЭффектЗвука } from "../config";
import { Т } from "../texts";
import { бонусЗарплатыПроц } from "./effects";
import { видимаяРамка, видимыйПрямоугольник } from "../lib/spriteBox";
import type { ИдНавыка } from "./skills";

export type РежимБабки = "zen" | "timed";
export type ФазаБабки = "menu" | "playing" | "over";

interface Враг { x: number; вид: number }
interface Полоса {
  индекс: number;
  дорога: boolean;
  номерДороги: number;
  направление: 1 | -1;
  скорость: number;
  враги: Враг[];
  накоплено: number;  // сколько проехали с последнего появления
  шаг: number;        // через сколько появится следующий противник
  деревья: { x: number; вид: number }[];
  заграждение?: number;
}

const ЗАПАС = 60; // за краем экрана противники появляются и пропадают
const случайно = (a: number, b: number) => a + Math.random() * (b - a);
const целое = (a: number, b: number) => Math.floor(случайно(a, b + 1));

const ПУТЬ_АССЕТОВ = "/assets/babka/";
const загрузить = (файл: string) => Object.assign(new Image(), { src: ПУТЬ_АССЕТОВ + файл });
const готова = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0;
const бабкаИмг = загрузить("Babka.png");
const островИмг = загрузить("safe-island.png");
const ДЕРЕВЬЯ = [загрузить("Tree-1.png"), загрузить("Tree-2.png"), загрузить("Bush-1.png"), загрузить("Bush-2.png")];
const ДЕРЕВЬЯ_ВЫСОТА = [46, 42, 26, 26];
const МАШИНЫ = [загрузить("Car-1.png"), загрузить("Car-2.png"), загрузить("Car-3.png"), загрузить("Car-4.png")];
const ЗАПАС_ПОЛОС = 15;
const БЕРСЕРК_СЕК = 3;
const ДОРОГ_ДО_БЕРСЕРКА = 8;
const ВСПЫШКА_ВОСКРЕШЕНИЯ_СЕК = 0.6;
const ЗАГРАЖДЕНИЕ_СЕК = 2;

function видимыйЦентрМашины(в: Враг, зеркало: boolean, ширина: number) {
  const f = видимаяРамка(МАШИНЫ[в.вид]);
  const доля = зеркало ? 1 - (f.x + f.w / 2) : f.x + f.w / 2;
  return { центр: в.x - ширина / 2 + доля * ширина, ширина: f.w * ширина };
}

/** Рисует эмодзи (cx, низ — точка внизу по центру). зеркало — развернуть по горизонтали, угол — поворот. */
function эмодзи(ctx: CanvasRenderingContext2D, символ: string, cx: number, низ: number, size: number, зеркало = false, угол = 0) {
  ctx.save();
  ctx.translate(cx, низ);
  if (угол) ctx.rotate(угол);
  if (зеркало) ctx.scale(-1, 1);
  ctx.font = `${size}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(символ, 0, 0);
  ctx.restore();
}

export class БабкаДвижок {
  масштаб = 1;
  мирШирина: number = К.мир.минШирина;
  мирВысота = 640;
  safeTopCss = 0;

  персонаж: КлючПерсонажа = "babka";
  // Хук для звуков: экран подключает сюда звуковой менеджер (звук шага, поражения)
  событие: ((имя: ЭффектЗвука) => void) | null = null;
  полосы = new Map<number, Полоса>();
  позиция = 0;        // дробный номер полосы под персонажем (во время шага — между двумя полосами)
  полоса = 0;         // полоса, на которой стоит персонаж
  цельПолоса = 0;
  прыгает = false;
  t = 0;              // прогресс шага 0..1
  буфер = false;      // тап во время шага запоминается и выполняется сразу после

  дорог = 0;          // счёт: сколько дорог пройдено
  время = 0;
  лимит = 0;
  осталось = 0;
  закончена = false;
  причина: "crash" | "time" | null = null;
  послеКонца = 0;
  столкновение: { x: number; y: number } | null = null;
  навыки = new Set<ИдНавыка>();
  воскрешениеИспользовано = false;
  ремонтИспользован = false;
  берсеркОсталось = 0;
  дорогДоБерсерка = 0;
  вспышкаT = 999;
  отброшенные: { вид: number; x: number; полоса: number; dy: number; vx: number; vy: number; t: number; зеркало: boolean }[] = [];

  private созданоДо = -1;
  private дорогСоздано = 0;
  private осталосьВГруппе = 0;

  constructor() { this.сброс(0, "babka"); }

  /** Подгоняем мир под экран (css-пиксели). */
  задатьРазмер(w: number, h: number, safeTop: number) {
    this.масштаб = Math.min(w / К.мир.минШирина, h / К.мир.минВысота);
    this.мирШирина = w / this.масштаб;
    this.мирВысота = h / this.масштаб;
    this.safeTopCss = safeTop;
  }

  сброс(лимитСек: number, персонаж: КлючПерсонажа) {
    this.персонаж = персонаж;
    this.полосы = new Map();
    this.позиция = 0; this.полоса = 0; this.цельПолоса = 0;
    this.прыгает = false; this.t = 0; this.буфер = false;
    this.дорог = 0; this.время = 0; this.лимит = лимитСек; this.осталось = лимитСек;
    this.закончена = false; this.причина = null; this.послеКонца = 0; this.столкновение = null;
    this.созданоДо = -1; this.дорогСоздано = 0;
    this.воскрешениеИспользовано = false; this.ремонтИспользован = false; this.берсеркОсталось = 0; this.дорогДоБерсерка = 0; this.вспышкаT = 999; this.отброшенные = [];
    this.осталосьВГруппе = целое(К.группаДорог.мин, К.группаДорог.макс);
    this.создатьДо(Math.ceil(this.мирВысота / К.мир.высотаПолосы) + 8);
  }

  private врагТип() { return К.противники.машина; }
  /** Расстояние между противниками: по времени, но так, чтобы между ними всегда можно было пройти. */
  private минШаг() { return this.врагТип().ширина + К.персонажи[this.персонаж].ширина * 2 + 10; }

  private новыйШаг(скорость: number, номер: number) {
    const интервал = Math.max(К.интервал.финиш, К.интервал.старт - (номер - 1) * К.интервал.спадЗаДорогу);
    return Math.max(this.минШаг(), скорость * интервал * случайно(0.9, 1.1));
  }

  private входСвободен(л: Полоса) {
    const вход = л.направление === 1 ? -ЗАПАС : this.мирШирина + ЗАПАС;
    return л.враги.every((в) => Math.abs(в.x - вход) >= this.минШаг());
  }

  private создатьДо(индекс: number) {
    while (this.созданоДо < индекс) {
      this.созданоДо++;
      this.полосы.set(this.созданоДо, this.новаяПолоса(this.созданоДо));
    }
  }

  private новаяПолоса(i: number): Полоса {
    const W = this.мирШирина;
    let дорога = false;
    if (i > 0) {
      if (this.осталосьВГруппе > 0) { дорога = true; this.осталосьВГруппе--; }
      else { дорога = false; this.осталосьВГруппе = целое(К.группаДорог.мин, К.группаДорог.макс); }
    }
    const л: Полоса = { индекс: i, дорога, номерДороги: 0, направление: Math.random() < 0.5 ? 1 : -1, скорость: 0, враги: [], накоплено: 0, шаг: 0, деревья: [] };
    if (!дорога) {
      for (let k = 0; k < 5; k++) {
        const слева = Math.random() < 0.5;
        л.деревья.push({ x: слева ? случайно(8, 60) : W - случайно(8, 60), вид: Math.floor(Math.random() * ДЕРЕВЬЯ.length) });
      }
      return л;
    }
    this.дорогСоздано++;
    л.номерДороги = this.дорогСоздано;
    const база = К.скорость.машины;
    const рост = Math.min(К.скорость.максМножитель, 1 + К.скорость.ростЗаДорогу * this.дорогСоздано);
    л.скорость = база * рост * случайно(1 - К.скорость.разброс, 1 + К.скорость.разброс);
    л.шаг = this.новыйШаг(л.скорость, л.номерДороги);
    л.накоплено = случайно(0, л.шаг);
    // Сразу расставляем противников по всей ширине
    let x = -ЗАПАС + случайно(0, л.шаг);
    while (x < W + ЗАПАС) {
      л.враги.push({ x, вид: Math.floor(Math.random() * МАШИНЫ.length) });
      x += this.новыйШаг(л.скорость, л.номерДороги);
    }
    return л;
  }

  /** Шаг вперёд (тап). Тап во время шага запоминается. */
  прыжок() {
    if (this.закончена) return;
    if (this.прыгает) { this.буфер = true; return; }
    this.прыгает = true;
    this.t = 0;
    this.цельПолоса = this.полоса + 1;
    this.событие?.("ход");
  }

  /** Двигаем противников (и в меню для красоты, и в игре). */
  двигатьВрагов(dt: number) {
    const W = this.мирШирина;
    const от = Math.floor(this.позиция) - ЗАПАС_ПОЛОС - 3, до = Math.floor(this.позиция) + Math.ceil(this.мирВысота / К.мир.высотаПолосы) + ЗАПАС_ПОЛОС;
    this.создатьДо(до + 3);
    for (let i = от; i <= до; i++) {
      const л = this.полосы.get(i);
      if (!л || !л.дорога) continue;
      const d = л.направление * л.скорость * dt;
      for (const в of л.враги) в.x += d;
      л.накоплено += л.скорость * dt;
      if (л.накоплено >= л.шаг && this.входСвободен(л)) {
        л.накоплено -= л.шаг;
        л.шаг = this.новыйШаг(л.скорость, л.номерДороги);
        л.враги.push({ x: л.направление === 1 ? -ЗАПАС : W + ЗАПАС, вид: Math.floor(Math.random() * МАШИНЫ.length) });
      }
      л.враги = л.враги.filter((в) => в.x > -ЗАПАС * 2 && в.x < W + ЗАПАС * 2);
    }
    // забываем полосы далеко позади
    for (const k of this.полосы.keys()) if (k < Math.floor(this.позиция) - ЗАПАС_ПОЛОС - 8) this.полосы.delete(k);
  }

  обновить(dt: number) {
    if (this.закончена) return;
    this.время += dt;
    if (this.лимит > 0) {
      this.осталось = Math.max(0, this.лимит - this.время);
      if (this.осталось <= 0) { this.закончена = true; this.причина = "time"; return; }
    }

    // Шаг вперёд
    if (this.прыгает) {
      this.t += dt / (К.прыжокМс / 1000);
      if (this.t >= 1) {
        this.t = 1;
        this.прыгает = false;
        this.полоса = this.цельПолоса;
        this.позиция = this.полоса;
        if (this.полосы.get(this.полоса)?.дорога) { this.дорог++; this.зарядитьБерсерк(); }
        if (this.буфер) { this.буфер = false; this.прыжок(); }
      } else {
        const e = 1 - (1 - this.t) * (1 - this.t);
        this.позиция = this.полоса + (this.цельПолоса - this.полоса) * e;
      }
    }

    this.вспышкаT += dt;
    if (this.берсеркОсталось > 0) this.берсеркОсталось = Math.max(0, this.берсеркОсталось - dt);
    for (const л of this.полосы.values()) if (л.заграждение) л.заграждение = Math.max(0, л.заграждение - dt);
    for (const f of this.отброшенные) { f.x += f.vx * dt; f.dy += f.vy * dt; f.vy += 900 * dt; f.t += dt; }
    this.отброшенные = this.отброшенные.filter((f) => f.t < 0.8);
    this.двигатьВрагов(dt);

    // Столкновения: хитбокс персонажа против хитбоксов противников на полосах, которых он касается
    const п = К.персонажи[this.персонаж];
    const вт = this.врагТип();
    const k = 1 - К.поблажкаХитбокса;
    const px = this.мирШирина / 2;
    const высотаГероя = п.высота * 1.2;
    const ширГероя = высотаГероя * (готова(бабкаИмг) ? бабкаИмг.naturalWidth / бабкаИмг.naturalHeight : п.ширина / п.высота);
    const рамкаГероя = видимаяРамка(бабкаИмг);
    const геройШир = рамкаГероя.w * ширГероя;
    const геройЦентр = px + (рамкаГероя.x + рамкаГероя.w / 2 - 0.5) * ширГероя;
    for (let i = Math.floor(this.позиция); i <= Math.ceil(this.позиция); i++) {
      const л = this.полосы.get(i);
      if (!л?.дорога) continue;
      const dy = Math.abs(i - this.позиция) * К.мир.высотаПолосы;
      if (dy >= ((п.высота + вт.высота) / 2) * k) continue;
      for (const в of л.враги) {
        const м = видимыйЦентрМашины(в, л.направление === -1, вт.ширина);
        if (Math.abs(м.центр - геройЦентр) < ((геройШир + м.ширина) / 2) * k) {
          if (this.берсеркОсталось > 0) { this.отбросить(л, в); continue; }
          if (this.навыки.has("repair") && !this.ремонтИспользован) { this.ремонтИспользован = true; this.починить(л); return; }
          if (this.навыки.has("resurrection") && !this.воскрешениеИспользовано) { this.воскрешениеИспользовано = true; this.воскреси(this.ближайшаяБезопаснаяПолоса(i)); return; }
          this.закончена = true;
          this.причина = "crash";
          this.событие?.("поражение");
          this.столкновение = { x: (м.центр + геройЦентр) / 2, y: i };
          return;
        }
      }
    }
  }

  private ближайшаяБезопаснаяПолоса(от: number): number {
    for (let k = 0; ; k++) {
      if (от - k >= 0 && this.полосы.get(от - k)?.дорога === false) return от - k;
      if (this.полосы.get(от + k)?.дорога === false) return от + k;
    }
  }

  private воскреси(полоса: number) {
    this.закончена = false; this.причина = null; this.столкновение = null; this.послеКонца = 0;
    this.полоса = полоса; this.позиция = полоса; this.цельПолоса = полоса;
    this.прыгает = false; this.t = 0; this.буфер = false;
    this.вспышкаT = 0;
  }

  private отбросить(л: Полоса, в: Враг) {
    л.враги = л.враги.filter((v) => v !== в);
    this.отброшенные.push({ вид: в.вид, x: в.x, полоса: л.индекс, dy: 0, vx: (в.x < this.мирШирина / 2 ? -1 : 1) * 320, vy: -260, t: 0, зеркало: л.направление === -1 });
  }

  private починить(л: Полоса) {
    л.враги = [];
    л.заграждение = ЗАГРАЖДЕНИЕ_СЕК;
  }

  private зарядитьБерсерк() {
    if (!this.навыки.has("berserk") || this.берсеркОсталось > 0) return;
    if (++this.дорогДоБерсерка >= ДОРОГ_ДО_БЕРСЕРКА) { this.дорогДоБерсерка = 0; this.берсеркОсталось = БЕРСЕРК_СЕК; }
  }

  обновитьКонец(dt: number) { this.послеКонца += dt; }

  рисовать(ctx: CanvasRenderingContext2D, фаза: ФазаБабки) {
    const W = this.мирШирина, H = this.мирВысота, LH = К.мир.высотаПолосы;
    const якорь = H * К.мир.якорьЭкрана;
    const y = (i: number) => якорь - (i - this.позиция) * LH;
    const п = К.персонажи[this.персонаж];
    const вт = this.врагТип();
    const iМакс = Math.ceil(this.позиция + якорь / LH) + ЗАПАС_ПОЛОС;
    const iМин = Math.floor(this.позиция - (H - якорь) / LH) - ЗАПАС_ПОЛОС;

    ctx.fillStyle = "#727176";
    ctx.fillRect(0, 0, W, H);

    for (let i = iМакс; i >= iМин; i--) {
      const л = this.полосы.get(i);
      if (!л?.дорога) continue;
      const yc = y(i);
      ctx.fillStyle = i % 2 ? "#727176" : "#7D7C80";
      ctx.fillRect(0, yc - LH / 2, W, LH);
      if (this.полосы.get(i + 1)?.дорога) {
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3; ctx.setLineDash([18, 18]);
        ctx.beginPath(); ctx.moveTo(0, yc - LH / 2); ctx.lineTo(W, yc - LH / 2); ctx.stroke(); ctx.setLineDash([]);
      }
    }

    for (let i = iМакс; i >= iМин; i--) {
      const л = this.полосы.get(i);
      if (л?.дорога) continue;
      const yc = y(i);
      if (готова(островИмг)) {
        const высотаОстрова = W * островИмг.naturalHeight / островИмг.naturalWidth;
        ctx.drawImage(островИмг, 0, yc - высотаОстрова / 2, W, высотаОстрова);
      } else {
        ctx.fillStyle = i % 2 ? "#4caf50" : "#43a047";
        ctx.fillRect(0, yc - LH / 2, W, LH);
      }
    }

    const рисоватьГероя = () => {
      const px = W / 2;
      const дуга = this.прыгает ? Math.sin(this.t * Math.PI) * 10 : 0;
      const размерП = п.высота * 1.2;
      const низ = y(this.позиция) + размерП * 0.42 - дуга;
      if (готова(бабкаИмг)) {
        const ширина = размерП * бабкаИмг.naturalWidth / бабкаИмг.naturalHeight;
        ctx.drawImage(бабкаИмг, px - ширина / 2, низ - размерП, ширина, размерП);
      } else {
        эмодзи(ctx, п.эмодзи, px, низ, размерП);
      }
    };

    const рисоватьМашину = (в: Враг, зеркало: boolean, yc: number) => {
      const карт = МАШИНЫ[в.вид];
      if (!готова(карт)) return;
      const ш = вт.ширина, вы = ш * карт.naturalHeight / карт.naturalWidth;
      ctx.save();
      ctx.translate(в.x, yc);
      if (зеркало) ctx.scale(-1, 1);
      ctx.drawImage(карт, -ш / 2, -вы / 2, ш, вы);
      ctx.restore();
    };

    const рисоватьДерево = (д: { x: number; вид: number }, yc: number) => {
      const img = ДЕРЕВЬЯ[д.вид];
      if (!готова(img)) return;
      const высота = ДЕРЕВЬЯ_ВЫСОТА[д.вид];
      const ширина = высота * img.naturalWidth / img.naturalHeight;
      ctx.drawImage(img, д.x - ширина / 2, yc + 14 - высота, ширина, высота);
    };

    for (let i = iМакс; i >= iМин; i--) {
      const л = this.полосы.get(i);
      const yc = y(i);
      if (Math.floor(this.позиция) === i) рисоватьГероя();
      if (!л) continue;
      if (л.дорога) {
        for (const в of л.враги) рисоватьМашину(в, л.направление === -1, yc);
      } else {
        for (const д of л.деревья) рисоватьДерево(д, yc);
      }
    }
    for (const f of this.отброшенные) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - f.t / 0.8);
      рисоватьМашину({ x: f.x, вид: f.вид }, f.зеркало, y(f.полоса) + f.dy);
      ctx.restore();
    }
    for (const л of this.полосы.values()) {
      if (л.заграждение) эмодзи(ctx, "🚧", W / 2 + 40, y(л.индекс) + LH / 4, 30);
    }

    const hH = К.персонажи[this.персонаж].высота * 1.2;
    const cx = W / 2;
    const cy = y(this.позиция) + hH * (0.42 - 0.5) - (this.прыгает ? Math.sin(this.t * Math.PI) * 10 : 0);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (this.берсеркОсталось > 0) {
      const пульс = 0.85 + 0.15 * Math.sin(this.время * 12);
      const огонь = ctx.createRadialGradient(cx, cy, 10, cx, cy, 78);
      огонь.addColorStop(0, `rgba(255,140,40,${(0.7 * пульс).toFixed(3)})`);
      огонь.addColorStop(0.5, `rgba(255,80,20,${(0.35 * пульс).toFixed(3)})`);
      огонь.addColorStop(1, "rgba(255,60,0,0)");
      ctx.fillStyle = огонь;
      ctx.beginPath(); ctx.arc(cx, cy, 78, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 56, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (this.берсеркОсталось / БЕРСЕРК_СЕК));
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,210,120,0.95)"; ctx.stroke();
    }
    if (this.вспышкаT < ВСПЫШКА_ВОСКРЕШЕНИЯ_СЕК) {
      const p = this.вспышкаT / ВСПЫШКА_ВОСКРЕШЕНИЯ_СЕК;
      const r = 40 + 90 * p;
      const вспышка = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      вспышка.addColorStop(0, `rgba(255,230,120,${(0.95 * (1 - p)).toFixed(3)})`);
      вспышка.addColorStop(1, "rgba(255,200,60,0)");
      ctx.fillStyle = вспышка;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    if (this.столкновение) {
      const sy = y(this.столкновение.y);
      эмодзи(ctx, "💥", this.столкновение.x, sy + 20, 52);
      ctx.fillStyle = `rgba(255,0,0,${Math.max(0, 0.35 - this.послеКонца * 0.4)})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Счёт и время
    if (фаза !== "menu") {
      const y0 = 12 + this.safeTopCss / this.масштаб;
      ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 4;
      ctx.fillStyle = "#fff"; ctx.font = "bold 20px sans-serif"; ctx.textBaseline = "top";
      ctx.textAlign = "left"; ctx.fillText(Т.игры.бабка.худ.дорог(this.дорог), 14, y0);
      if (this.лимит > 0) { ctx.textAlign = "right"; ctx.fillText(Т.игры.бабка.худ.время(Math.ceil(this.осталось)), W - 14, y0); }
      if (фаза === "playing" && this.дорог === 0 && !this.закончена) {
        ctx.textAlign = "center"; ctx.font = "bold 18px sans-serif";
        ctx.fillText(Т.игры.бабка.худ.подсказкаШаг, W / 2, H * 0.9);
      }
      ctx.shadowBlur = 0;
    }
  }
}

/** Награда: сумма по дорогам (старт + прирост × (k−1)), × режим, × персонаж, × бонус «Повышение ЗП». */
export function посчитатьНаградуБабки(дорог: number, режим: РежимБабки, персонаж: КлючПерсонажа, уровеньЗП: number) {
  const сумма = дорог * К.награда.старт + (К.награда.прирост * дорог * (дорог - 1)) / 2;
  const режимМнож = режим === "zen" ? К.дзенМножитель : 1;
  const персМнож = К.персонажи[персонаж].множительНаграды;
  const бонусПроц = бонусЗарплатыПроц({ salary_level: уровеньЗП });
  return { сумма, режимМнож, персМнож, бонусПроц, итого: Math.floor(сумма * режимМнож * персМнож * (1 + бонусПроц / 100) + 1e-9) };
}
