import { useState } from "react";
import { ПРОКАЧКИ, КлючПрокачки, ценаСледующегоУровня, АССЕТЫ } from "../config";
import { КОЛОНКА_УРОВНЯ } from "../types";
import { useUser } from "../store/UserContext";
import { Иконка, Картинка } from "../components/Иконка";
import { шансБесплатнойКрутки, комиссияОбменаПроц, бонусВремениСек } from "../game/effects";
import { звук } from "../lib/sound";
import { Т } from "../texts";

export default function Upgrades() {
  const { user, change } = useUser();
  const [занят, setЗанят] = useState(false);
  const [ошибка, setОшибка] = useState("");
  if (!user) return null;

  const купить = async (ключ: КлючПрокачки) => {
    const колонка = КОЛОНКА_УРОВНЯ[ключ];
    const уровень = user[колонка];
    const цена = ценаСледующегоУровня(ключ, уровень);
    if (занят || уровень >= ПРОКАЧКИ[ключ].максУровень || user.chips < цена) return;
    setЗанят(true);
    setОшибка("");
    try {
      // Списываем фишки и повышаем уровень одним действием, сразу сохраняя в базу
      const новыйУровень: Partial<typeof user> = {};
      (новыйУровень as any)[колонка] = уровень + 1;
      await change({ chips: -цена }, новыйУровень);
      звук.sfx("покупка"); // ← звук покупки
    } catch (e: any) {
      setОшибка(e.message);
      звук.sfx("ошибка");
    }
    setЗанят(false);
  };

  const ТП = Т.прокачка;

  return (
    <div className="px-4">
      {/* Сводка: что даёт текущая прокачка */}
      <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs font-bold">
        <div className="pill px-2 py-2">{ТП.пилюли.freeSpin(шансБесплатнойКрутки(user))}</div>
        <div className="pill px-2 py-2">{ТП.пилюли.комиссия(комиссияОбменаПроц(user))}</div>
        <div className="pill px-2 py-2">{ТП.пилюли.время(бонусВремениСек(user))}</div>
      </div>

      <h2 className="mb-3 text-xl font-bold">{ТП.заголовок}</h2>
      {ошибка && <p className="mb-2 text-sm text-red-400">{ошибка}</p>}

      <div className="flex flex-col gap-2.5">
        {(Object.keys(ПРОКАЧКИ) as КлючПрокачки[]).map((ключ) => {
          const п = ПРОКАЧКИ[ключ];
          const т = ТП.карточки[ключ];
          const ур = user[КОЛОНКА_УРОВНЯ[ключ]];
          const макс = ур >= п.максУровень;
          const цена = ценаСледующегоУровня(ключ, ур);
          const хватает = user.chips >= цена;
          return (
            <div key={ключ} className="card flex items-center gap-3 p-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface2 text-3xl">
                <Картинка путь={`${АССЕТЫ.папки.иконки}upgrade-${ключ}.png`} fallback={<span>{т.значок}</span>} className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate font-bold">{т.название}</span>
                  <span className="shrink-0 rounded-md bg-surface2 px-1.5 py-0.5 text-[11px] font-bold text-muted">{ТП.уровень(ур)}</span>
                </div>
                <p className="text-[11px] leading-snug text-muted">{т.описание}</p>
                <p className="text-xs font-semibold text-brand-yellow">
                  {ТП.сейчас(т.знак, ур * п.эффектЗаУровень, т.единица)}
                  {!макс && ТП.дальше(т.знак, (ур + 1) * п.эффектЗаУровень, т.единица)}
                </p>
              </div>
              {макс ? (
                <span className="max-w-[84px] text-center text-[11px] font-semibold text-muted">{ТП.максимум}</span>
              ) : (
                <button
                  disabled={занят || !хватает}
                  onClick={() => купить(ключ)}
                  className="btn btn-blue flex shrink-0 items-center gap-1.5 !rounded-xl !px-3 !py-2 text-sm"
                >
                  <Иконка имя="фишки" размер={16} />
                  {цена}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
