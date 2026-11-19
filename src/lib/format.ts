/** Короткая запись больших чисел: 10200 → «10.2k» */
export function коротко(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

/**
 * Дата из конфига в формате «дд/мм/гг чч:мм» (можно «дд/мм/гггг чч:мм», время необязательно) → метка времени в мс.
 * часыПояса — смещение часового пояса, в котором записана дата (3 = МСК). Неверный формат → NaN.
 */
export function датаИзКонфига(строка: string, часыПояса = 0): number {
  const м = String(строка).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!м) return NaN;
  const [д, мес] = [Number(м[1]), Number(м[2])];
  const год = м[3].length === 2 ? 2000 + Number(м[3]) : Number(м[3]);
  const чч = м[4] ? Number(м[4]) : 0;
  const мм = м[5] ? Number(м[5]) : 0;
  const t = Date.UTC(год, мес - 1, д, чч, мм) - часыПояса * 3600_000;
  return Number.isFinite(t) ? t : NaN;
}
