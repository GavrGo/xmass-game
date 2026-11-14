// Движок Babka Crash: полосы с движением, шаг вперёд по тапу, столкновения, рисование на canvas.
// Все числа берутся из config.ts (раздел БАБКА_КРАШ).
import { БАБКА_КРАШ as К, КлючПерсонажа, ЭффектЗвука } from "../config";
import { Т } from "../texts";
import { бонусЗарплатыПроц } from "./effects";

export type РежимБабки = "zen" | "timed";
export type ФазаБабки = "menu" | "playing" | "over";

interface Враг { x: number; эмодзи: string }
interface Полоса {
  индекс: number;
  дорога: boolean;
  направление: 1 | -1;
  скорость: number;
  враги: Враг[];
  накоплено: number;  // сколько проехали с последнего появления
  шаг: number;        // через сколько появится следующий противник
  деревья: { x: number; эмодзи: string }[];
}

const ЗАПАС = 60; // за краем экрана противники появляются и пропадают
const случайно = (a: number, b: number) => a + Math.random() * (b - a);
const целое = (a: number, b: number) => Math.floor(случайно(a, b + 1));

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
    this.осталосьВГруппе = целое(К.группаДорог.мин, К.группаДорог.макс);
    this.создатьДо(14);
  }

  private врагТип() { return this.персонаж === "babka" ? К.противники.машина : К.противники.бабушка; }
  private эмодзиВрага() {
    const список = this.врагТип().эмодзи;
    return список[Math.floor(Math.random() * список.length)];
  }
  /** Расстояние между противниками: по времени, но так, чтобы между ними всегда можно было пройти. */
  private новыйШаг(скорость: number) {
    const мин = this.врагТип().ширина + К.персонажи[this.персонаж].ширина * 2 + 10;
    return Math.max(мин, скорость * случайно(К.интервал.минСек, К.интервал.максСек));
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
    const л: Полоса = { индекс: i, дорога, направление: Math.random() < 0.5 ? 1 : -1, скорость: 0, враги: [], накоплено: 0, шаг: 0, деревья: [] };
    if (!дорога) {
      const эм = ["🌲", "🌳", "🌼", "🌲"];
      for (let k = 0; k < 5; k++) {
        const слева = Math.random() < 0.5;
        л.деревья.push({ x: слева ? случайно(8, 60) : W - случайно(8, 60), эмодзи: эм[Math.floor(Math.random() * эм.length)] });
      }
      return л;
    }
    this.дорогСоздано++;
    const база = this.персонаж === "babka" ? К.скорость.машины : К.скорость.бабушки;
    const рост = Math.min(К.скорость.максМножитель, 1 + К.скорость.ростЗаДорогу * this.дорогСоздано);
    л.скорость = база * рост * случайно(1 - К.скорость.разброс, 1 + К.скорость.разброс);
    л.шаг = this.новыйШаг(л.скорость);
    л.накоплено = случайно(0, л.шаг);
    // Сразу расставляем противников по всей ширине
    let x = -ЗАПАС + случайно(0, л.шаг);
    while (x < W + ЗАПАС) {
      л.враги.push({ x, эмодзи: this.эмодзиВрага() });
      x += this.новыйШаг(л.скорость);
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
    const от = Math.floor(this.позиция) - 3, до = Math.floor(this.позиция) + 12;
    this.создатьДо(до + 3);
    for (let i = от; i <= до; i++) {
      const л = this.полосы.get(i);
      if (!л || !л.дорога) continue;
      const d = л.направление * л.скорость * dt;
      for (const в of л.враги) в.x += d;
      л.накоплено += л.скорость * dt;
      if (л.накоплено >= л.шаг) {
        л.накоплено -= л.шаг;
        л.шаг = this.новыйШаг(л.скорость);
        л.враги.push({ x: л.направление === 1 ? -ЗАПАС : W + ЗАПАС, эмодзи: this.эмодзиВрага() });
      }
      л.враги = л.враги.filter((в) => в.x > -ЗАПАС * 2 && в.x < W + ЗАПАС * 2);
    }
    // забываем полосы далеко позади
    for (const k of this.полосы.keys()) if (k < Math.floor(this.позиция) - 8) this.полосы.delete(k);
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
        if (this.полосы.get(this.полоса)?.дорога) this.дорог++;
        if (this.буфер) { this.буфер = false; this.прыжок(); }
      } else {
        const e = 1 - (1 - this.t) * (1 - this.t);
        this.позиция = this.полоса + (this.цельПолоса - this.полоса) * e;
      }
    }

    this.двигатьВрагов(dt);

    // Столкновения: хитбокс персонажа против хитбоксов противников на полосах, которых он касается
    const п = К.персонажи[this.персонаж];
    const вт = this.врагТип();
    const k = 1 - К.поблажкаХитбокса;
    const px = this.мирШирина / 2;
    for (let i = Math.floor(this.позиция); i <= Math.ceil(this.позиция); i++) {
      const л = this.полосы.get(i);
      if (!л?.дорога) continue;
      const dy = Math.abs(i - this.позиция) * К.мир.высотаПолосы;
      if (dy >= ((п.высота + вт.высота) / 2) * k) continue;
      for (const в of л.враги) {
        if (Math.abs(в.x - px) < ((п.ширина + вт.ширина) / 2) * k) {
          this.закончена = true;
          this.причина = "crash";
          this.событие?.("поражение");
          this.столкновение = { x: (в.x + px) / 2, y: i };
          return;
        }
      }
    }
  }

  обновитьКонец(dt: number) { this.послеКонца += dt; }

  рисовать(ctx: CanvasRenderingContext2D, фаза: ФазаБабки) {
    const W = this.мирШирина, H = this.мирВысота, LH = К.мир.высотаПолосы;
    const якорь = H * К.мир.якорьЭкрана;
    const y = (i: number) => якорь - (i - this.позиция) * LH;
    const п = К.персонажи[this.персонаж];
    const вт = this.врагТип();

    ctx.fillStyle = "#2e7d32"; ctx.fillRect(0, 0, W, H);

    const iМин = Math.floor(this.позиция - якорь / LH) - 1;
    const iМакс = Math.ceil(this.позиция + (H - якорь) / LH) + 1;
    for (let i = iМин; i <= iМакс; i++) {
      const л = this.полосы.get(i);
      const yc = y(i);
      const дорога = !!л?.дорога;
      if (дорога) {
        ctx.fillStyle = i % 2 ? "#4a5058" : "#444a52";
        ctx.fillRect(0, yc - LH / 2, W, LH);
        // разметка: пунктир между двумя дорогами
        if (this.полосы.get(i + 1)?.дорога) {
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          for (let x = 0; x < W; x += 36) ctx.fillRect(x, yc - LH / 2 - 1.5, 18, 3);
        }
      } else {
        ctx.fillStyle = i % 2 ? "#4caf50" : "#43a047";
        ctx.fillRect(0, yc - LH / 2, W, LH);
        if (л) for (const д of л.деревья) эмодзи(ctx, д.эмодзи, д.x, yc + 14, 30);
      }
    }

    // Противники
    for (const [, л] of this.полосы) {
      if (!л.дорога) continue;
      const yc = y(л.индекс);
      if (yc < -LH || yc > H + LH) continue;
      const размер = вт.высота * 1.15;
      for (const в of л.враги) {
        const зеркало = this.персонаж === "babka" ? (л.направление === 1) === К.машиныСмотрятВлево : false;
        эмодзи(ctx, в.эмодзи, в.x, yc + размер * 0.42, размер, зеркало);
      }
    }

    // Персонаж
    const px = W / 2;
    const дуга = this.прыгает ? Math.sin(this.t * Math.PI) * 10 : 0;
    const угол = this.персонаж === "car" ? (К.поворотМашиныИгрока * Math.PI) / 180 : 0;
    const размерП = п.высота * 1.2;
    эмодзи(ctx, п.эмодзи, px, y(this.позиция) + размерП * 0.42 - дуга, размерП, false, угол);

    // Столкновение
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
