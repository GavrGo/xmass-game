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
  закрыта?: boolean;
  ямы?: { x: number; dy: number; r: number }[];
  трещины?: { x: number; dy: number; r: number }[];
}

const ЗАПАС = 60; // за краем экрана противники появляются и пропадают
const случайно = (a: number, b: number) => a + Math.random() * (b - a);
const целое = (a: number, b: number) => Math.floor(случайно(a, b + 1));

const ПУТЬ_АССЕТОВ = "/assets/babka/";
const загрузить = (файл: string) => Object.assign(new Image(), { src: ПУТЬ_АССЕТОВ + файл });
const готова = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0;
const бабкаИмг = загрузить("Babka.png");
const островИмг = загрузить("safe-island.png");
const таблетка = загрузить("berserk-pill.png");
const яма = загрузить("pit.png");
const трещинаИмг = загрузить("crack.png");
const конус = загрузить("cone.png");
const ДЕРЕВЬЯ = [загрузить("Tree-1.png"), загрузить("Tree-2.png"), загрузить("Bush-1.png"), загрузить("Bush-2.png")];
const ДЕРЕВЬЯ_ВЫСОТА = [46, 42, 26, 26];
const МАШИНЫ = [загрузить("Car-1.png"), загрузить("Car-2.png"), загрузить("Car-3.png"), загрузить("Car-4.png")];
const ЗАПАС_ПОЛОС = 15;
const РЕМОНТ_КАЖДЫЕ = [8, 12];
const БЕРСЕРК_СЕК = 3;
const ДОРОГ_ДО_БЕРСЕРКА = 8;
const ВСПЫШКА_ВОСКРЕШЕНИЯ_СЕК = 0.6;
const ФАЗЫ_ВОСКРЕШЕНИЯ = [0.7, 0.6, 0.9, 0.5];
const ИСКРЫ_ЦВЕТА = ["#ffd27a", "#ff8a2b", "#fff3c4"];

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
  берсеркОсталось = 0;
  дорогДоБерсерка = 0;
  вспышкаT = 999;
  отброшенные: { вид: number; x: number; полоса: number; dy: number; vx: number; vy: number; t: number; зеркало: boolean }[] = [];

  доРемонта = 0;
  предмет: { полоса: number } | null = null;
  искры: { x: number; wy: number; vx: number; vy: number; t: number; life: number; цвет: string; r: number }[] = [];
  воскрешение: { фаза: number; t: number; откуда: number; куда: number; толчок: number } | null = null;

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
    this.воскрешениеИспользовано = false; this.берсеркОсталось = 0; this.дорогДоБерсерка = 0; this.вспышкаT = 999; this.отброшенные = []; this.доРемонта = целое(РЕМОНТ_КАЖДЫЕ[0], РЕМОНТ_КАЖДЫЕ[1]); this.предмет = null; this.искры = []; this.воскрешение = null;
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
    if (this.навыки.has("repair") && --this.доРемонта <= 0) {
      л.закрыта = true;
      const ремонт = this.создатьРемонт();
      л.ямы = ремонт.ямы;
      л.трещины = ремонт.трещины;
      this.доРемонта = целое(РЕМОНТ_КАЖДЫЕ[0], РЕМОНТ_КАЖДЫЕ[1]);
    }
    if (л.закрыта) return л;
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
      if (!л || !л.дорога || л.закрыта) continue;
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
    if (this.воскрешение) { this.обновитьВоскрешение(dt); return; }
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
        if (this.предмет?.полоса === this.полоса) this.подобратьПредмет();
        if (this.буфер) { this.буфер = false; this.прыжок(); }
      } else {
        const e = 1 - (1 - this.t) * (1 - this.t);
        this.позиция = this.полоса + (this.цельПолоса - this.полоса) * e;
      }
    }

    this.обновитьИскры(dt);
    if (this.берсеркОсталось > 0) this.искрыОгня();
    this.вспышкаT += dt;
    if (this.берсеркОсталось > 0) this.берсеркОсталось = Math.max(0, this.берсеркОсталось - dt);
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
          this.взрыв(в.x, i * К.мир.высотаПолосы, 30);
          if (this.берсеркОсталось > 0) { this.отбросить(л, в); continue; }
          if (this.навыки.has("resurrection") && !this.воскрешениеИспользовано) { this.воскрешениеИспользовано = true; this.начатьВоскрешение(м.центр < геройЦентр ? 1 : -1); return; }
          this.закончена = true;
          this.причина = "crash";
          this.событие?.("поражение");
          this.столкновение = { x: (м.центр + геройЦентр) / 2, y: i };
          return;
        }
      }
    }
  }

  private отбросить(л: Полоса, в: Враг) {
    л.враги = л.враги.filter((v) => v !== в);
    this.отброшенные.push({ вид: в.вид, x: в.x, полоса: л.индекс, dy: 0, vx: (в.x < this.мирШирина / 2 ? -1 : 1) * 320, vy: -260, t: 0, зеркало: л.направление === -1 });
  }

  private создатьРемонт() {
    const ямы = Array.from({ length: 6 }, () => ({ x: 0.15 + Math.random() * 0.7, dy: (Math.random() - 0.5) * 0.4, r: 8 + Math.random() * 6 }));
    const трещины = Array.from({ length: 6 }, () => ({ x: 0.1 + Math.random() * 0.8, dy: (Math.random() - 0.5) * 0.4, r: 8 + Math.random() * 6 }));
    return { ямы, трещины };
  }

  private подобратьПредмет() {
    this.предмет = null;
    this.берсеркОсталось = БЕРСЕРК_СЕК;
    this.взрыв(this.мирШирина / 2, this.позиция * К.мир.высотаПолосы, 40);
  }

  private положитьПредмет() {
    const верх = Math.floor(this.позиция + this.мирВысота * К.мир.якорьЭкрана / К.мир.высотаПолосы) - 1;
    this.создатьДо(верх);
    let k = верх;
    while (k > this.полоса + 1 && this.полосы.get(k)?.дорога !== false) k--;
    this.предмет = { полоса: k };
  }

  private начатьВоскрешение(толчок: number) {
    this.воскрешение = { фаза: 0, t: 0, откуда: this.позиция, куда: this.предыдущаяБезопасная(), толчок };
    this.столкновение = { x: this.мирШирина / 2 - толчок * 20, y: this.позиция };
    this.прыгает = false;
    this.буфер = false;
  }

  private предыдущаяБезопасная(): number {
    const от = Math.floor(this.позиция);
    for (let k = от; k > от - 12; k--) if (this.полосы.get(k)?.дорога === false) return k;
    return Math.max(0, от - 1);
  }

  private обновитьВоскрешение(dt: number) {
    const в = this.воскрешение!;
    в.t += dt;
    if (в.фаза === 2) {
      const p = Math.min(1, в.t / ФАЗЫ_ВОСКРЕШЕНИЯ[2]);
      this.позиция = в.откуда + (в.куда - в.откуда) * (p * p * (3 - 2 * p));
    }
    if (в.t < ФАЗЫ_ВОСКРЕШЕНИЯ[в.фаза]) return;
    if (в.фаза === 3) { this.завершитьВоскрешение(в.куда); return; }
    в.t -= ФАЗЫ_ВОСКРЕШЕНИЯ[в.фаза];
    в.фаза++;
    if (в.фаза === 1) this.столкновение = null;
  }

  private завершитьВоскрешение(куда: number) {
    this.воскрешение = null;
    this.полоса = куда;
    this.позиция = куда;
    this.цельПолоса = куда;
    this.прыгает = false;
    this.t = 0;
    this.буфер = false;
    this.вспышкаT = 0;
  }

  private серостьВоскрешения(): number {
    const в = this.воскрешение;
    if (!в) return 0;
    if (в.фаза === 0) return Math.min(1, в.t / ФАЗЫ_ВОСКРЕШЕНИЯ[0]);
    if (в.фаза === 3) return 1 - Math.min(1, в.t / ФАЗЫ_ВОСКРЕШЕНИЯ[3]);
    return 1;
  }

  private сдвигВоскрешения(): number {
    const в = this.воскрешение;
    if (!в) return 0;
    const даль = 30 * в.толчок;
    if (в.фаза === 0) {
      const p = Math.min(1, в.t / 0.25);
      return даль * (1 - (1 - p) * (1 - p));
    }
    if (в.фаза === 1) return даль * (1 - Math.min(1, в.t / ФАЗЫ_ВОСКРЕШЕНИЯ[1]));
    return 0;
  }

  private масштабВоскрешения(): number {
    const в = this.воскрешение;
    if (!в || в.фаза === 0) return 1;
    if (в.фаза === 1) return 1 + 0.6 * Math.min(1, в.t / ФАЗЫ_ВОСКРЕШЕНИЯ[1]);
    if (в.фаза === 2) return 1.6;
    return 1.6 - 0.6 * Math.min(1, в.t / ФАЗЫ_ВОСКРЕШЕНИЯ[3]);
  }

  private взрыв(x: number, wy: number, n: number) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const v = 120 + Math.random() * 320;
      this.искры.push({ x, wy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.45 + Math.random() * 0.4, цвет: ИСКРЫ_ЦВЕТА[k % ИСКРЫ_ЦВЕТА.length], r: 1.5 + Math.random() * 2.5 });
    }
  }

  private искрыОгня() {
    for (let k = 0; k < 2; k++) {
      this.искры.push({ x: this.мирШирина / 2 + (Math.random() - 0.5) * 36, wy: this.позиция * К.мир.высотаПолосы + Math.random() * 14, vx: (Math.random() - 0.5) * 60, vy: 90 + Math.random() * 140, t: 0, life: 0.6 + Math.random() * 0.5, цвет: ИСКРЫ_ЦВЕТА[Math.floor(Math.random() * ИСКРЫ_ЦВЕТА.length)], r: 2 + Math.random() * 2.5 });
    }
  }

  private обновитьИскры(dt: number) {
    for (const s of this.искры) { s.x += s.vx * dt; s.wy += s.vy * dt; s.vy -= 500 * dt; s.t += dt; }
    this.искры = this.искры.filter((s) => s.t < s.life);
  }

  private рисоватьИскры(ctx: CanvasRenderingContext2D, якорь: number) {
    for (const s of this.искры) {
      const p = 1 - s.t / s.life;
      ctx.globalAlpha = p;
      ctx.fillStyle = s.цвет;
      ctx.beginPath();
      ctx.arc(s.x, якорь - s.wy + this.позиция * К.мир.высотаПолосы, s.r * (0.5 + p), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private рисоватьПламя(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    const r = К.персонажи[this.персонаж].высота * 0.6;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.sin(this.время * 3 + k) * 0.25;
      const bx = cx + Math.cos(a) * r * 0.7;
      const by = cy + Math.sin(a) * r * 0.25 + r * 0.5;
      const h = r * (0.7 + 0.45 * Math.abs(Math.sin(this.время * 11 + k * 1.7)));
      ctx.beginPath();
      ctx.moveTo(bx - r * 0.16, by);
      ctx.quadraticCurveTo(bx - r * 0.28, by - h * 0.55, bx + Math.sin(this.время * 14 + k) * r * 0.1, by - h);
      ctx.quadraticCurveTo(bx + r * 0.28, by - h * 0.55, bx + r * 0.16, by);
      ctx.closePath();
      ctx.fillStyle = k % 2 ? "rgba(255,150,40,0.55)" : "rgba(255,210,80,0.5)";
      ctx.fill();
    }
  }

  private рисоватьРемонт(ctx: CanvasRenderingContext2D, л: Полоса, W: number, yc: number, LH: number) {
    ctx.save();
    if (готова(трещинаИмг)) {
      for (const т of л.трещины ?? []) {
        const w = т.r * 4, h = w * трещинаИмг.naturalHeight / трещинаИмг.naturalWidth;
        ctx.drawImage(трещинаИмг, W * т.x - w / 2, yc + т.dy * LH - h / 2, w, h);
      }
    }
    if (готова(яма)) {
      for (const я of л.ямы ?? []) {
        const w = я.r * 4, h = w * яма.naturalHeight / яма.naturalWidth;
        ctx.drawImage(яма, W * я.x - w / 2, yc + я.dy * LH - h / 2, w, h);
      }
    }
    ctx.restore();
    for (const x of [W * 0.07, W * 0.93]) {
      if (!готова(конус)) { эмодзи(ctx, "🚧", x, yc + LH / 2 - 4, 30); continue; }
      const h = LH * 0.8, w = h * конус.naturalWidth / конус.naturalHeight;
      ctx.drawImage(конус, x - w / 2, yc + LH / 2 - 4 - h, w, h);
    }
  }

  private рисоватьПредмет(ctx: CanvasRenderingContext2D, yc: number, W: number) {
    const p = 0.85 + 0.15 * Math.sin(this.время * 6);
    const cy = yc - 20 + Math.sin(this.время * 4) * 6;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const гл = ctx.createRadialGradient(W / 2, cy, 4, W / 2, cy, 70 * p);
    гл.addColorStop(0, "rgba(255,200,90,0.9)");
    гл.addColorStop(1, "rgba(255,160,40,0)");
    ctx.fillStyle = гл;
    ctx.beginPath(); ctx.arc(W / 2, cy, 70 * p, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (готова(таблетка)) {
      const hP = 64, wP = hP * таблетка.naturalWidth / таблетка.naturalHeight;
      ctx.drawImage(таблетка, W / 2 - wP / 2, cy - hP / 2, wP, hP);
    } else {
      эмодзи(ctx, "💊", W / 2, cy + 22, 44);
    }
  }

  private зарядитьБерсерк() {
    if (!this.навыки.has("berserk") || this.берсеркОсталось > 0) return;
    if (++this.дорогДоБерсерка >= ДОРОГ_ДО_БЕРСЕРКА && !this.предмет) { this.дорогДоБерсерка = 0; this.положитьПредмет(); }
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
      if (л.закрыта) this.рисоватьРемонт(ctx, л, W, yc, LH);
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
      const px = W / 2 + this.сдвигВоскрешения();
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
      if (Math.floor(this.позиция) === i && !(this.воскрешение && this.воскрешение.фаза >= 1)) рисоватьГероя();
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
    if (this.предмет) this.рисоватьПредмет(ctx, y(this.предмет.полоса), W);

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
    if (this.берсеркОсталось > 0) this.рисоватьПламя(ctx, cx, cy);
    this.рисоватьИскры(ctx, якорь);
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

    if (this.воскрешение) {
      const s = this.серостьВоскрешения();
      if (s > 0) {
        ctx.save(); ctx.globalCompositeOperation = "saturation"; ctx.globalAlpha = s;
        ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, W, H); ctx.restore();
      }
      if (this.воскрешение.фаза >= 1) {
        const k = this.масштабВоскрешения();
        const п2 = К.персонажи[this.персонаж];
        const вс = п2.высота * 1.2;
        const ст = y(this.позиция) + вс * 0.42;
        const гц = ст - вс / 2;
        ctx.save();
        ctx.globalAlpha = this.воскрешение.фаза === 3 ? 1 - Math.min(1, this.воскрешение.t / ФАЗЫ_ВОСКРЕШЕНИЯ[3]) : 1;
        const сд = this.сдвигВоскрешения();
        const гл = ctx.createRadialGradient(W / 2 + сд, гц, 10, W / 2 + сд, гц, вс * k);
        гл.addColorStop(0, "rgba(255,225,120,0.9)");
        гл.addColorStop(1, "rgba(255,190,40,0)");
        ctx.fillStyle = гл;
        ctx.beginPath(); ctx.arc(W / 2 + сд, гц, вс * k, 0, Math.PI * 2); ctx.fill();
        ctx.translate(W / 2, ст); ctx.scale(k, k); ctx.translate(-W / 2, -ст);
        рисоватьГероя();
        ctx.restore();
      }
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
