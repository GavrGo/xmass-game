// Движок Ksuha Run: физика, препятствия, монеты, погоня, столкновения и рисование на canvas.
// React-экран (screens/KsuhaRun.tsx) только запускает его и показывает меню и результат.
// Все числа берутся из config.ts (раздел КСЮХА_РАН).
import { КСЮХА_РАН as К, КлючСложности, ЭффектЗвука } from "../config";
import { Т } from "../texts";
import { бонусЗарплатыПроц } from "./effects";
import { видимаяРамка, видимыйПрямоугольник } from "../lib/spriteBox";
import type { ИдНавыка } from "./skills";

const ИГРОК = { x: 120, w: 40, h: 52 }; // позиция и размер героини (в «логических» пикселях)
const ДЛИТЕЛЬНОСТЬ_РЫВКА = 0.6;
const МНОЖИТЕЛЬ_РЫВКА = 3;
const ДАЛЬНОСТЬ_ПРЕДУПРЕЖДЕНИЯ = 420;

export type Фаза = "menu" | "playing" | "over";

interface Препятствие { x: number; size: number; картинка: number; вытяжка: [number, number]; passed: boolean }
interface Монета { x: number; h: number; emoji: string; ценность: number; взята: boolean }
interface Всплывашка { x: number; y: number; text: string; t: number }
interface Снежинка { x: number; y: number; r: number; v: number }

// Картинка фишки (assets/icons/slot-chip.png) для монет и счётчика на canvas
const чипКартинка: HTMLImageElement | null = typeof Image !== "undefined" ? Object.assign(new Image(), { src: "/assets/icons/slot-chip.png" }) : null;
const чипГотов = () => !!чипКартинка && чипКартинка.complete && чипКартинка.naturalWidth > 0;

const случайно = (a: number, b: number) => a + Math.random() * (b - a);

const ПУТЬ_АССЕТОВ = "/assets/ksuha/";
const загрузить = (путь: string) => Object.assign(new Image(), { src: путь });
const готова = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0;
const фонИмг = загрузить(ПУТЬ_АССЕТОВ + "BG.png");
const дорогаИмг = загрузить(ПУТЬ_АССЕТОВ + "Road.png");
const КАДРЫ_КСЮХИ = Array.from({ length: 6 }, (_, i) => загрузить(`ksuha-run-${i + 1}.png`));
const КАДРЫ_МЭНА = Array.from({ length: 6 }, (_, i) => загрузить(`man-run-${i + 1}.png`));
const ФПС_СТАРТ = 12;
const ФПС_МИН = 4;
const ФПС_МАКС = 14;
const барьеры = К.препятствия.картинки.map((f) => загрузить(ПУТЬ_АССЕТОВ + f));
const подарокКартинка = загрузить("/assets/icons/slot-gift.png");

function геометрияФигуры(кадры: HTMLImageElement[], индекс: number, cx: number, земля: number, высота: number) {
  const рамки = кадры.map((кадр) => видимаяРамка(кадр));
  const низ = Math.max(...рамки.map((р) => р.y + р.h));
  const верх = Math.min(...рамки.map((р) => р.y));
  const img = кадры[индекс];
  const h = высота / (низ - верх);
  const w = h * img.naturalWidth / img.naturalHeight;
  return { x: cx - w / 2, y: земля - низ * h, w, h };
}

function рисоватьФигуру(ctx: CanvasRenderingContext2D, кадры: HTMLImageElement[], индекс: number, cx: number, земля: number, высота: number, угол = 0) {
  if (!готова(кадры[индекс])) return;
  const г = геометрияФигуры(кадры, индекс, cx, земля, высота);
  ctx.save();
  if (угол) { ctx.translate(cx, земля); ctx.rotate(угол); ctx.translate(-cx, -земля); }
  ctx.drawImage(кадры[индекс], г.x, г.y, г.w, г.h);
  ctx.restore();
}

/** Рисует эмодзи. зеркало = true разворачивает его вправо (эмодзи бегут влево по умолчанию). */
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

export class КсюхаРанДвижок {
  // --- размер экрана и мира ---
  масштаб = 1;
  мирШирина: number = К.мир.минШирина;
  мирВысота = 400;
  safeTopCss = 0;        // верхний отступ под кнопки Telegram (в css-пикселях)

  навыки = new Set<ИдНавыка>();
  щитСломан = false;
  рывок = 0;
  следыРывка: { dx: number; t: number }[] = [];
  отброшенные: { картинка: number; x: number; y: number; ширина: number; высота: number; vx: number; vy: number; t: number }[] = [];
  осколки: { x: number; y: number; vx: number; vy: number; r: number; t: number }[] = [];
  искры: { x: number; y: number; vx: number; vy: number; t: number }[] = [];

  ключСложности: КлючСложности = "medium";
  // Хук для звуков: экран подключает сюда звуковой менеджер (звук прыжка, монеты, поражения)
  событие: ((имя: ЭффектЗвука) => void) | null = null;

  // --- героиня ---
  подъём = 0;            // высота над землёй
  vy = 0;                // вертикальная скорость (вверх — плюс)
  прыжков = 0;
  история: { t: number; h: number }[] = []; // как высоко она была: по этому прыгает преследователь

  // --- мир ---
  препятствия: Препятствие[] = [];
  монеты: Монета[] = [];
  всплывашки: Всплывашка[] = [];
  снег: Снежинка[] = [];
  скорость: number = К.скорость.старт;
  смещение = 0;
  смещениеФона = 0;
  фазаБега = 0;
  кадрБега = 0;
  кадрАккум = 0;
  опорнаяСкорость = 1;

  // --- счёт ---
  пройдено = 0;
  монетСобрано = 0;
  суммаМонет = 0;        // сумма ценности собранных монет (в фишках, может быть дробной)
  время = 0;
  лимит = 0;
  осталось = 0;
  дозаПоявления = 1.1;
  дозаМонеты = 2;
  закончена = false;
  причина: "crash" | "time" | null = null;
  послеКонца = 0;

  constructor(лимитСек: number) { this.сброс(лимитСек, "medium"); }

  get земля() { return this.мирВысота * К.мир.доляВысотыЗемли; }

  /** Подгоняем мир под размер экрана (css-пиксели). */
  задатьРазмер(w: number, h: number, safeTop: number) {
    this.масштаб = Math.min(w / К.мир.минШирина, h / К.мир.минВысота);
    this.мирШирина = w / this.масштаб;
    this.мирВысота = h / this.масштаб;
    this.safeTopCss = safeTop;
  }

  /** Начать всё заново на выбранной сложности. */
  сброс(лимитСек: number, сложность: КлючСложности) {
    this.ключСложности = сложность;
    this.подъём = 0; this.vy = 0; this.прыжков = 0; this.история = [];
    this.рывок = 0; this.следыРывка = []; this.щитСломан = false; this.отброшенные = []; this.осколки = []; this.искры = [];
    this.препятствия = []; this.монеты = []; this.всплывашки = [];
    this.скорость = К.скорость.старт * К.сложности[сложность].множительСкорости;
    this.опорнаяСкорость = this.скорость;
    this.пройдено = 0; this.монетСобрано = 0; this.суммаМонет = 0;
    this.время = 0; this.лимит = лимитСек; this.осталось = лимитСек;
    this.дозаПоявления = 1.1; this.дозаМонеты = случайно(1.5, 3);
    this.закончена = false; this.причина = null; this.послеКонца = 0;
    this.смещение = 0; this.смещениеФона = 0; this.фазаБега = 0; this.кадрБега = 0; this.кадрАккум = 0;
    this.снег = Array.from({ length: 40 }, () => ({
      x: случайно(0, this.мирШирина), y: случайно(0, this.земля), r: случайно(1, 3), v: случайно(15, 45),
    }));
  }

  /** Прыжок (тап / пробел). Второй прыжок в воздухе — если разрешён в config. */
  прыжок() {
    if (this.закончена) return;
    if (this.навыки.has("dash") && this.прыжков === К.физика.максПрыжковПодряд && this.подъём > 0 && this.рывок <= 0) {
      this.рывок = ДЛИТЕЛЬНОСТЬ_РЫВКА;
      this.следыРывка = [];
      this.событие?.("прыжок");
      return;
    }
    if (this.прыжков >= К.физика.максПрыжковПодряд) return;
    this.vy = this.прыжков === 0 ? К.физика.силаПрыжка : К.физика.силаВторогоПрыжка;
    this.прыжков++;
    this.событие?.("прыжок");
  }

  private эффСкорость() {
    if (this.рывок <= 0) return this.скорость;
    const п = 1 - this.рывок / ДЛИТЕЛЬНОСТЬ_РЫВКА;
    return this.скорость * (1 + МНОЖИТЕЛЬ_РЫВКА * Math.min(1, п / 0.12) * Math.pow(1 - п, 1.5));
  }

  /** Самая большая высота, до которой реально допрыгнуть (нужна, чтобы монеты были достижимы). */
  private достижимаяВысота() {
    const g = К.физика.гравитация;
    const первый = (К.физика.силаПрыжка ** 2) / (2 * g);
    if (К.физика.максПрыжковПодряд < 2) return первый;
    return первый + 0.8 * ((К.физика.силаВторогоПрыжка ** 2) / (2 * g));
  }

  /** Только снег — для фона в меню. */
  обновитьСнег(dt: number, скоростьМира: number) {
    for (const с of this.снег) {
      с.x -= (скоростьМира * 0.25 + с.v) * dt;
      с.y += с.v * 0.4 * dt;
      if (с.x < 0) с.x += this.мирШирина;
      if (с.y > this.земля) с.y = 0;
    }
  }

  /** Один шаг игры. dt — сколько секунд прошло с прошлого кадра. */
  обновить(dt: number) {
    if (this.закончена) return;
    const сл = К.сложности[this.ключСложности];
    this.время += dt;

    if (this.рывок > 0) {
      this.рывок = Math.max(0, this.рывок - dt);
      this.следыРывка.push({ dx: 0, t: 0 });
    }
    for (const с of this.следыРывка) {
      с.t += dt;
      с.dx -= this.эффСкорость() * dt;
    }
    this.следыРывка = this.следыРывка.filter((с) => с.t < 0.3);
    for (const п of this.отброшенные) { п.x += п.vx * dt; п.y += п.vy * dt; п.vy += 1400 * dt; п.t += dt; }
    this.отброшенные = this.отброшенные.filter((п) => п.t < 0.9);
    for (const с of this.осколки) { с.x += с.vx * dt; с.y += с.vy * dt; с.vy += 900 * dt; с.t += dt; }
    this.осколки = this.осколки.filter((с) => с.t < 0.6);
    for (const и of this.искры) { и.x += и.vx * dt; и.y += и.vy * dt; и.vx *= 0.9; и.vy *= 0.9; и.t += dt; }
    this.искры = this.искры.filter((и) => и.t < 0.45);

    // Таймер (мягкий лимит)
    if (this.лимит > 0) {
      this.осталось = Math.max(0, this.лимит - this.время);
      if (this.осталось <= 0) { this.закончена = true; this.причина = "time"; return; }
    }

    // Скорость растёт со временем
    // «Бесконечный» режим разгоняется быстрее (множительРоста)
    this.скорость = Math.min(К.скорость.максимум, К.скорость.старт + К.скорость.прирост * (сл.множительРоста ?? 1) * this.время) * сл.множительСкорости;

    // Физика прыжка
    this.vy -= К.физика.гравитация * dt;
    this.подъём += this.vy * dt;
    if (this.подъём <= 0) { this.подъём = 0; this.vy = 0; this.прыжков = 0; }

    // История высот: преследователь повторяет прыжки с задержкой = дистанция / скорость
    this.история.push({ t: this.время, h: this.подъём });
    const лаг = К.погоня.дистанция / this.скорость;
    while (this.история.length > 1 && this.история[1].t <= this.время - лаг) this.история.shift();

    // Движение фона
    this.смещение = (this.смещение + this.эффСкорость() * dt) % 100000;
    this.смещениеФона = (this.смещениеФона + this.эффСкорость() * К.вид.параллакс * dt) % 100000;
    this.фазаБега += dt * 14;
    this.кадрАккум += Math.min(ФПС_МАКС, Math.max(ФПС_МИН, ФПС_СТАРТ * this.опорнаяСкорость / this.скорость)) * dt;
    this.кадрБега = (this.кадрБега + Math.floor(this.кадрАккум)) % 6;
    this.кадрАккум %= 1;
    this.обновитьСнег(dt, this.эффСкорость());

    // Появление препятствий
    this.дозаПоявления -= dt;
    if (this.дозаПоявления <= 0) {
      const п = К.препятствия;
      this.препятствия.push({
        x: this.мирШирина + ДАЛЬНОСТЬ_ПРЕДУПРЕЖДЕНИЯ,
        size: Math.round(случайно(п.минРазмер, п.максРазмер)),
        картинка: Math.floor(Math.random() * п.картинки.length),
        вытяжка: [случайно(0.85, 1.15), случайно(0.85, 1.15)],
        passed: false,
      });
      this.дозаПоявления = случайно(п.паузаМинСек, п.паузаМаксСек) * сл.множительПауз;
    }

    // Появление монет (с паузами, не кучно, и не прямо на препятствии)
    this.дозаМонеты -= dt;
    if (this.дозаМонеты <= 0) {
      const м = К.монеты;
      const стартX = this.мирШирина + 20;
      const рядом = this.препятствия.some((о) => Math.abs(о.x - стартX) < 130);
      if (рядом) {
        this.дозаМонеты = 0.3; // подождём, пока препятствие уедет
      } else {
        const потолок = Math.min(м.высотаМакс, this.достижимаяВысота() - 25);
        const вид = this.выбратьВидМонеты();
        this.монеты.push({ x: стартX, h: случайно(м.высотаМин, Math.max(м.высотаМин, потолок)), emoji: вид.эмодзи, ценность: вид.ценность, взята: false });
        const вМинуту = случайно(м.минВМинуту, м.максВМинуту);
        this.дозаМонеты = Math.max(м.минПаузаСек, (60 / вМинуту) * случайно(0.7, 1.3));
      }
    }

    const зем = this.земля;
    const пб = К.поблажкаХитбокса;

    // Препятствия: движение, счёт, столкновение
    for (const о of this.препятствия) {
      о.x -= this.эффСкорость() * dt;
      if (!о.passed && о.x + о.size < ИГРОК.x) { о.passed = true; this.пройдено++; }

      const г = геометрияФигуры(КАДРЫ_КСЮХИ, this.кадрБега, ИГРОК.x + ИГРОК.w / 2, зем - this.подъём + 4, ИГРОК.h);
      const герой = видимыйПрямоугольник(КАДРЫ_КСЮХИ[this.кадрБега], г.x, г.y, г.w, г.h);
      const ширина = о.size * о.вытяжка[0], высота = о.size * о.вытяжка[1];
      const барьер = видимыйПрямоугольник(барьеры[о.картинка], о.x, зем - высота + 14, ширина, высота);
      if (герой.x + пб < барьер.x + барьер.w - пб && барьер.x + пб < герой.x + герой.w - пб && герой.y + пб < барьер.y + барьер.h - пб && барьер.y + пб < герой.y + герой.h - пб) {
        if (this.рывок > 0) continue;
        if (this.навыки.has("armor") && !this.щитСломан) {
          this.щитСломан = true;
          const ширина = о.size * о.вытяжка[0], высота = о.size * о.вытяжка[1];
          this.отброшенные.push({ картинка: о.картинка, x: о.x, y: this.земля - высота + 14, ширина, высота, vx: 260, vy: -380, t: 0 });
          const cx = ИГРОК.x + ИГРОК.w / 2;
          const cy = this.земля - this.подъём - ИГРОК.h / 2;
          this.искры = Array.from({ length: 40 }, (_, i) => {
            const угол = (i / 40) * Math.PI * 2 + случайно(-0.15, 0.15);
            const v = случайно(180, 460);
            return { x: cx + Math.cos(угол) * ИГРОК.h * 0.9, y: cy + Math.sin(угол) * ИГРОК.h * 0.9, vx: Math.cos(угол) * v, vy: Math.sin(угол) * v, t: 0 };
          });
          this.осколки = Array.from({ length: 18 }, () => ({ x: ИГРОК.x + ИГРОК.w / 2, y: this.земля - this.подъём - ИГРОК.h / 2, vx: случайно(-260, 260), vy: случайно(-420, 60), r: случайно(2, 5), t: 0 }));
          о.x = -99999;
          continue;
        }
        this.событие?.("поражение");
        this.закончена = true; this.причина = "crash"; return;
      }
    }
    this.препятствия = this.препятствия.filter((о) => о.x > -о.size - 20);

    // Монеты: движение и сбор
    for (const м of this.монеты) {
      м.x -= this.эффСкорость() * dt;
      if (м.взята) continue;
      const cx = м.x + К.монеты.размер / 2, cy = зем - м.h;
      const дx = Math.abs(cx - (ИГРОК.x + ИГРОК.w / 2));
      const дy = Math.abs(cy - (зем - this.подъём - ИГРОК.h / 2));
      if (дx < ИГРОК.w / 2 + К.монеты.размер * 0.4 && дy < ИГРОК.h / 2 + К.монеты.размер * 0.4) {
        м.взята = true;
        this.монетСобрано++;
        this.суммаМонет += м.ценность;
        this.всплывашки.push({ x: cx, y: cy, text: `+${м.ценность}`, t: 0 });
        this.событие?.("монета");
      }
    }
    this.монеты = this.монеты.filter((м) => !м.взята && м.x > -60);

    // Всплывающие «+0.5»
    for (const в of this.всплывашки) { в.t += dt; в.y -= 40 * dt; }
    this.всплывашки = this.всплывашки.filter((в) => в.t < 0.8);
  }

  /** После столкновения: мир замирает, преследователь догоняет героиню. */
  обновитьКонец(dt: number) {
    this.послеКонца += dt;
    this.vy -= К.физика.гравитация * dt;
    this.подъём = Math.max(0, this.подъём + this.vy * dt);
    if (this.подъём === 0) this.vy = 0;
    for (const в of this.всплывашки) { в.t += dt; в.y -= 40 * dt; }
    this.всплывашки = this.всплывашки.filter((в) => в.t < 0.8);
  }

  private выбратьВидМонеты() {
    const виды = К.монеты.виды;
    let бросок = Math.random() * виды.reduce((s, v) => s + v.шанс, 0);
    for (const в of виды) { бросок -= в.шанс; if (бросок < 0) return в; }
    return виды[0];
  }

  /** Рисуем кадр. */
  рисовать(ctx: CanvasRenderingContext2D, фаза: Фаза) {
    const W = this.мирШирина, H = this.мирВысота, зем = this.земля;

    const небо = ctx.createLinearGradient(0, 0, 0, H);
    небо.addColorStop(0, "#0b1d2e"); небо.addColorStop(1, "#1f4256");
    ctx.fillStyle = небо; ctx.fillRect(0, 0, W, H);

    if (готова(фонИмг)) {
      const ширФона = зем * фонИмг.naturalWidth / фонИмг.naturalHeight;
      const сдвигФона = this.смещениеФона % ширФона;
      for (let x = -сдвигФона; x < W; x += ширФона) ctx.drawImage(фонИмг, Math.round(x), 0, Math.ceil(ширФона) + 1, зем);
    }

    if (готова(дорогаИмг)) {
      const высотаДороги = К.вид.дорогаВысотаДоля * H;
      const ширДороги = высотаДороги * дорогаИмг.naturalWidth / дорогаИмг.naturalHeight;
      const верх = зем - К.вид.дорожкаДоля * высотаДороги;
      for (let x = -(this.смещение % ширДороги); x < W; x += ширДороги) {
        ctx.drawImage(дорогаИмг, Math.round(x), верх, Math.ceil(ширДороги) + 1, высотаДороги);
      }
    }

    for (const о of this.препятствия) {
      const img = барьеры[о.картинка];
      if (!готова(img)) continue;
      const ш = о.size * о.вытяжка[0], в = о.size * о.вытяжка[1];
      ctx.drawImage(img, о.x, зем - в + 14, ш, в);
    }

    for (const м of this.монеты) {
      const кач = Math.sin(this.время * 6 + м.x * 0.05) * 3;
      const р = К.монеты.размер;
      const img = м.emoji === "🪙" ? чипКартинка : подарокКартинка;
      ctx.save();
      ctx.shadowColor = "rgba(255,255,255,0.9)";
      ctx.shadowBlur = 20;
      if (img && готова(img)) ctx.drawImage(img, м.x, зем - м.h - р / 2 + кач, р, р);
      else эмодзи(ctx, м.emoji, м.x + р / 2, зем - м.h + р / 2 + кач, р);
      ctx.restore();
    }

    const бег = фаза === "playing" && !this.закончена;
    const кач = (сдвиг: number) => (бег ? Math.abs(Math.sin(this.фазаБега + сдвиг)) * 4 : 0);
    const упала = this.закончена ? Math.min(1, this.послеКонца * 4) : 0;
    const догнал = this.закончена ? Math.min(1, this.послеКонца / 0.6) : 0;

    if (this.навыки.has("spiderSense") && фаза === "playing") {
      const пульс = 0.9 + 0.1 * Math.sin(this.время * 8);
      let близость = 0;
      let цельY = 0;
      for (const о of this.препятствия) {
        const дист = о.x - W;
        if (дист <= -60 || дист >= ДАЛЬНОСТЬ_ПРЕДУПРЕЖДЕНИЯ) continue;
        const б = дист > 0 ? 1 - дист / ДАЛЬНОСТЬ_ПРЕДУПРЕЖДЕНИЯ : 1 + дист / 60;
        if (б > близость) {
          близость = б;
          цельY = зем - (о.size * о.вытяжка[1]) / 2 + 14;
        }
      }
      if (близость > 0) {
        const сила = близость * пульс;
        ctx.save();
        ctx.translate(W, цельY);
        ctx.scale(1, 2.2);
        ctx.globalCompositeOperation = "lighter";
        for (let k = 0; k < 3; k++) {
          const фаза = this.время * (0.9 + k * 0.45) + k * 2.3;
          const сдвигX = Math.sin(фаза) * 12;
          const сдвигY = Math.cos(фаза * 0.7 + k) * 20;
          const рад = 78 + Math.sin(фаза * 1.9 + k) * 16;
          const грд = ctx.createRadialGradient(сдвигX, сдвигY, 0, сдвигX, сдвигY, рад);
          const а = [1.0, 0.6, 0.42][k] * сила;
          грд.addColorStop(0, `rgba(255,60,80,${Math.min(1, а).toFixed(3)})`);
          грд.addColorStop(0.45, `rgba(255,30,50,${Math.min(1, а * 0.5).toFixed(3)})`);
          грд.addColorStop(1, "rgba(255,30,50,0)");
          ctx.fillStyle = грд;
          ctx.fillRect(-130, -130, 130, 260);
        }
        ctx.restore();
      }
    }

    const hX = ИГРОК.x + ИГРОК.w / 2;
    const hY = зем - this.подъём - кач(0) + 4;
    const дистанция = К.погоня.дистанция;
    const преслX = hX - дистанция + догнал * (дистанция - 10);
    const hПресл = this.закончена ? 0 : (this.история[0]?.h ?? 0);
    const преслY = зем - hПресл - кач(1.5) + 4;
    рисоватьФигуру(ctx, КАДРЫ_МЭНА, this.кадрБега, преслX, преслY, ИГРОК.h);
    for (const с of this.следыРывка) {
      ctx.save();
      ctx.globalAlpha = 0.5 * (1 - с.t / 0.3);
      ctx.shadowColor = "rgba(80,170,255,1)";
      ctx.shadowBlur = 24;
      рисоватьФигуру(ctx, КАДРЫ_КСЮХИ, this.кадрБега, hX + с.dx, hY, ИГРОК.h, упала * (Math.PI / 2));
      ctx.restore();
    }
    рисоватьФигуру(ctx, КАДРЫ_КСЮХИ, this.кадрБега, hX, hY, ИГРОК.h, упала * (Math.PI / 2));
    if (this.рывок > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.shadowColor = "rgba(80,170,255,1)";
      ctx.shadowBlur = 30;
      рисоватьФигуру(ctx, КАДРЫ_КСЮХИ, this.кадрБега, hX, hY, ИГРОК.h, упала * (Math.PI / 2));
      ctx.restore();
    }

    if (this.навыки.has("armor") && !this.щитСломан && фаза === "playing") {
      const пульс = 0.8 + 0.2 * Math.sin(this.время * 8);
      const cy = hY - ИГРОК.h / 2;
      const r = ИГРОК.h * 0.72;
      const заливка = ctx.createRadialGradient(hX, cy, r * 0.3, hX, cy, r);
      заливка.addColorStop(0, "rgba(120,230,255,0)");
      заливка.addColorStop(0.8, "rgba(90,220,255,0.12)");
      заливка.addColorStop(1, "rgba(170,245,255,0.35)");
      ctx.save();
      ctx.fillStyle = заливка;
      ctx.shadowColor = "rgba(90,220,255,1)";
      ctx.shadowBlur = 24 * пульс;
      ctx.beginPath();
      ctx.arc(hX, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = `rgba(150,240,255,${(0.95 * пульс).toFixed(3)})`;
      ctx.stroke();
      ctx.shadowBlur = 0;
      for (let k = 0; k < 3; k++) {
        const угол = this.время * 2.4 + k * ((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.arc(hX, cy, r - 3, угол, угол + 0.8);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(235,252,255,0.95)";
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const п of this.отброшенные) {
      const img = барьеры[п.картинка];
      if (!готова(img)) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - п.t / 0.9);
      ctx.drawImage(img, п.x, п.y, п.ширина, п.высота);
      ctx.restore();
    }
    for (const с of this.осколки) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - с.t / 0.6);
      ctx.shadowColor = "rgba(120,230,255,1)";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#bff4ff";
      ctx.translate(с.x, с.y);
      ctx.rotate(с.t * 10);
      ctx.fillRect(-с.r, -с.r, с.r * 2, с.r * 2);
      ctx.restore();
    }
    for (const и of this.искры) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - и.t / 0.45);
      ctx.shadowColor = "rgba(255,230,140,1)";
      ctx.shadowBlur = 10;
      ctx.strokeStyle = "#fff4c2";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(и.x, и.y);
      ctx.lineTo(и.x - и.vx * 0.05, и.y - и.vy * 0.05);
      ctx.stroke();
      ctx.restore();
    }
    if (this.причина === "crash") эмодзи(ctx, "💥", hX + 20, зем - 10, 34);

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    for (const с of this.снег) ctx.fillRect(с.x, с.y, с.r, с.r);

    // Всплывающие «+0.5»
    ctx.fillStyle = "#f4c430"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const в of this.всплывашки) { ctx.globalAlpha = Math.max(0, 1 - в.t / 0.8); ctx.fillText(в.text, в.x, в.y); }
    ctx.globalAlpha = 1;

  }
}

/** Награда за забег в фишках: препятствия + монеты, × сложность, × бонус «Повышение ЗП». */
export function посчитатьНаграду(пройдено: number, суммаМонет: number, сложность: КлючСложности, уровеньЗП: number) {
  const множитель = К.сложности[сложность].множительНаграды;
  const бонусПроц = бонусЗарплатыПроц({ salary_level: уровеньЗП });
  const заПрепятствия = пройдено / К.препятствийЗаФишку;
  const заМонеты = суммаМонет;
  const итого = Math.floor((заПрепятствия + заМонеты) * множитель * (1 + бонусПроц / 100) + 1e-9);
  return { заПрепятствия, заМонеты, множитель, бонусПроц, итого };
}
