// Движок Ksuha Run: физика, препятствия, столкновения и рисование на canvas.
// React-экран (screens/KsuhaRun.tsx) только запускает его и показывает результат.
// Все числа берутся из config.ts (раздел КСЮХА_РАН).
import { КСЮХА_РАН as К } from "../config";
import { бонусЗарплатыПроц } from "./effects";

export const ШИРИНА = 720;  // «логический» размер игрового поля
export const ВЫСОТА = 300;
const ЗЕМЛЯ = ВЫСОТА - 50;  // y линии земли
const ИГРОК = { x: 70, w: 40, h: 52 };

export type Фаза = "ready" | "playing" | "over";

interface Препятствие { x: number; size: number; emoji: string; passed: boolean }
interface Снежинка { x: number; y: number; r: number; v: number }

const случайно = (a: number, b: number) => a + Math.random() * (b - a);

export class КсюхаРанДвижок {
  высота = 0;            // высота Ксюши над землёй
  vy = 0;                // вертикальная скорость (вверх — плюс)
  прыжков = 0;           // сколько прыжков сделано, пока она в воздухе
  препятствия: Препятствие[] = [];
  скорость: number = К.скорость.старт;
  пройдено = 0;          // счёт
  время = 0;             // сколько секунд идёт забег
  лимит = 0;             // лимит времени (0 = без лимита)
  осталось = 0;
  дозаПоявления = 1.1;   // через сколько секунд появится следующее препятствие
  закончена = false;
  причина: "crash" | "time" | null = null;
  снег: Снежинка[] = [];
  смещение = 0;          // для движения полосок земли
  фазаБега = 0;

  constructor(лимитСек: number) { this.сброс(лимитСек); }

  /** Начать всё заново. */
  сброс(лимитСек: number) {
    this.высота = 0; this.vy = 0; this.прыжков = 0;
    this.препятствия = [];
    this.скорость = К.скорость.старт;
    this.пройдено = 0; this.время = 0;
    this.лимит = лимитСек; this.осталось = лимитСек;
    this.дозаПоявления = 1.1;
    this.закончена = false; this.причина = null;
    this.смещение = 0; this.фазаБега = 0;
    this.снег = Array.from({ length: 40 }, () => ({
      x: случайно(0, ШИРИНА), y: случайно(0, ЗЕМЛЯ), r: случайно(1, 3), v: случайно(15, 45),
    }));
  }

  /** Прыжок (тап / пробел). Второй прыжок в воздухе — если разрешён в config. */
  прыжок() {
    if (this.закончена || this.прыжков >= К.физика.максПрыжковПодряд) return;
    this.vy = this.прыжков === 0 ? К.физика.силаПрыжка : К.физика.силаВторогоПрыжка;
    this.прыжков++;
  }

  /** Один шаг игры. dt — сколько секунд прошло с прошлого кадра. */
  обновить(dt: number) {
    if (this.закончена) return;
    this.время += dt;

    // Таймер (мягкий лимит)
    if (this.лимит > 0) {
      this.осталось = Math.max(0, this.лимит - this.время);
      if (this.осталось <= 0) { this.закончена = true; this.причина = "time"; return; }
    }

    // Скорость растёт со временем
    this.скорость = Math.min(К.скорость.максимум, К.скорость.старт + К.скорость.прирост * this.время);

    // Физика прыжка
    this.vy -= К.физика.гравитация * dt;
    this.высота += this.vy * dt;
    if (this.высота <= 0) { this.высота = 0; this.vy = 0; this.прыжков = 0; }

    // Движение земли, снега и бега
    this.смещение = (this.смещение + this.скорость * dt) % ШИРИНА;
    this.фазаБега += dt * 14;
    for (const с of this.снег) {
      с.x -= (this.скорость * 0.25 + с.v) * dt;
      с.y += с.v * 0.4 * dt;
      if (с.x < 0) с.x += ШИРИНА;
      if (с.y > ЗЕМЛЯ) с.y = 0;
    }

    // Появление препятствий (пауза в секундах → расстояние растёт вместе со скоростью)
    this.дозаПоявления -= dt;
    if (this.дозаПоявления <= 0) {
      const п = К.препятствия;
      this.препятствия.push({
        x: ШИРИНА + 20,
        size: Math.round(случайно(п.минРазмер, п.максРазмер)),
        emoji: п.эмодзи[Math.floor(Math.random() * п.эмодзи.length)],
        passed: false,
      });
      this.дозаПоявления = случайно(п.паузаМинСек, п.паузаМаксСек);
    }

    // Движение препятствий, подсчёт очков, столкновения
    const пб = К.поблажкаХитбокса;
    for (const о of this.препятствия) {
      о.x -= this.скорость * dt;

      if (!о.passed && о.x + о.size < ИГРОК.x) { о.passed = true; this.пройдено++; }

      // Прямоугольники столкновения (чуть меньше картинок)
      const иЛево = ИГРОК.x + пб, иПраво = ИГРОК.x + ИГРОК.w - пб;
      const иНиз = ЗЕМЛЯ - this.высота - пб, иВерх = ЗЕМЛЯ - this.высота - ИГРОК.h + пб;
      const оЛево = о.x + пб, оПраво = о.x + о.size - пб;
      const оВерх = ЗЕМЛЯ - о.size + пб;
      if (иПраво > оЛево && иЛево < оПраво && иНиз > оВерх && иВерх < ЗЕМЛЯ) {
        this.закончена = true; this.причина = "crash"; return;
      }
    }
    this.препятствия = this.препятствия.filter((о) => о.x > -о.size - 20);
  }

  /** Рисуем кадр. */
  рисовать(ctx: CanvasRenderingContext2D, фаза: Фаза) {
    // Небо
    const г = ctx.createLinearGradient(0, 0, 0, ВЫСОТА);
    г.addColorStop(0, "#0b1d2e"); г.addColorStop(1, "#1f4256");
    ctx.fillStyle = г; ctx.fillRect(0, 0, ШИРИНА, ВЫСОТА);

    // Снег
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    for (const с of this.снег) ctx.fillRect(с.x, с.y, с.r, с.r);

    // Земля и полоски на ней
    ctx.fillStyle = "#e8f1f5"; ctx.fillRect(0, ЗЕМЛЯ, ШИРИНА, ВЫСОТА - ЗЕМЛЯ);
    ctx.fillStyle = "#b7cbd6";
    for (let i = 0; i < 9; i++) {
      const x = (((i * 90 - this.смещение) % ШИРИНА) + ШИРИНА) % ШИРИНА;
      ctx.fillRect(x, ЗЕМЛЯ + 14 + (i % 3) * 9, 24, 3);
    }

    // Препятствия
    ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    for (const о of this.препятствия) {
      ctx.font = `${о.size}px serif`;
      ctx.fillText(о.emoji, о.x, ЗЕМЛЯ + 4);
    }

    // Ксюша (при беге слегка подпрыгивает)
    const качание = this.высота === 0 && фаза === "playing" ? Math.abs(Math.sin(this.фазаБега)) * 4 : 0;
    ctx.font = `${ИГРОК.h}px serif`;
    ctx.fillText(this.причина === "crash" ? "😵" : "👧", ИГРОК.x - 6, ЗЕМЛЯ - this.высота - качание + 4);

    // Счёт и время
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 22px sans-serif"; ctx.textBaseline = "top";
    ctx.textAlign = "left"; ctx.fillText(`Препятствий: ${this.пройдено}`, 16, 12);
    if (this.лимит > 0) {
      ctx.textAlign = "right"; ctx.fillText(`⏱ ${Math.ceil(this.осталось)}`, ШИРИНА - 16, 12);
    }

    if (фаза === "ready") {
      ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(0, 0, ШИРИНА, ВЫСОТА);
      ctx.fillStyle = "#f4c430"; ctx.font = "bold 30px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("Тапни, чтобы начать", ШИРИНА / 2, ВЫСОТА / 2 - 10);
      ctx.fillStyle = "#ffffff"; ctx.font = "20px sans-serif";
      ctx.fillText("Тап / пробел — прыжок", ШИРИНА / 2, ВЫСОТА / 2 + 28);
    }
  }
}

/** Награда за забег в фишках (с учётом прокачки «Повышение ЗП»). */
export function посчитатьНаграду(пройдено: number, уровеньЗП: number) {
  const бонусПроц = бонусЗарплатыПроц({ salary_level: уровеньЗП });
  const сырых = пройдено / К.препятствийЗаФишку;
  const базовая = Math.floor(сырых + 1e-9);
  const итого = Math.floor(сырых * (1 + бонусПроц / 100) + 1e-9);
  return { базовая, бонусФишек: итого - базовая, итого, бонусПроц };
}
