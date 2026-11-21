export interface Рамка { x: number; y: number; w: number; h: number }

const ЦЕЛИКОМ: Рамка = { x: 0, y: 0, w: 1, h: 1 };
const кэш = new WeakMap<HTMLImageElement, Рамка>();

/** Область картинки, где есть непрозрачные пиксели, в долях от размера файла. */
export function видимаяРамка(img: HTMLImageElement | null): Рамка {
  if (!img || !img.complete || img.naturalWidth === 0) return ЦЕЛИКОМ;
  const готовая = кэш.get(img);
  if (готовая) return готовая;

  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return ЦЕЛИКОМ;
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;

  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] > 40) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const рамка: Рамка = x1 < 0
    ? ЦЕЛИКОМ
    : { x: x0 / c.width, y: y0 / c.height, w: (x1 - x0 + 1) / c.width, h: (y1 - y0 + 1) / c.height };
  кэш.set(img, рамка);
  return рамка;
}

/** Прямоугольник видимых пикселей картинки, нарисованной в (x, y) размером w×h. */
export function видимыйПрямоугольник(img: HTMLImageElement | null, x: number, y: number, w: number, h: number) {
  const f = видимаяРамка(img);
  return { x: x + f.x * w, y: y + f.y * h, w: f.w * w, h: f.h * h };
}
