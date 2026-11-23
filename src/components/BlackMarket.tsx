import { useState } from "react";
import { useUser } from "../store/UserContext";
import { ЧЁРНЫЙ_РЫНОК, АССЕТЫ } from "../config";
import { Т } from "../texts";
import { звук } from "../lib/sound";
import { хаптик } from "../lib/haptic";
import { естьАртефакт, КЛЮЧИ_АРТЕФАКТОВ } from "../game/artifacts";
import type { КлючАртефакта } from "../game/artifacts";
import { Иконка, Картинка } from "./Icon";
import Искры from "./Sparks";

const ТЧ = Т.чёрныйРынок;

/** Мистическая вкладка в самом низу магазина: артефакты за хэпэшки, покупаются один раз. */
export default function ЧёрныйРынок() {
  const { user, change } = useUser();
  const [открыт, setОткрыт] = useState(false);
  const [занят, setЗанят] = useState(false);
  const [ошибка, setОшибка] = useState("");
  const [новый, setНовый] = useState<КлючАртефакта | null>(null);
  if (!user) return null;

  const купить = async (ключ: КлючАртефакта) => {
    const цена = ЧЁРНЫЙ_РЫНОК.артефакты[ключ].цена;
    if (занят || естьАртефакт(user, ключ) || user.hearts < цена) return;
    setЗанят(true);
    setОшибка("");
    try {
      await change({ hearts: -цена }, { artifacts: [...(user.artifacts ?? []), ключ] });
      setНовый(ключ);
      звук.sfx("бонус");
      хаптик("medium");
    } catch (e: any) {
      setОшибка(ТЧ.ошибка(e?.message ?? ""));
      звук.sfx("ошибка");
    }
    setЗанят(false);
  };

  return (
    <section
      className="relative mt-6 overflow-hidden rounded-3xl border border-purple-500/30"
      style={{ background: "linear-gradient(160deg,#170a22 0%,#0b0610 58%,#16081a 100%)" }}
    >
      <div className="bm-aura pointer-events-none absolute inset-0" />
      <Искры количество={открыт ? 12 : 6} цвет="168,85,247" />

      <button onClick={() => { звук.sfx("клик"); setОткрыт((о) => !о); }} className="relative flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <span className="bm-flicker text-2xl leading-none">🕯️</span>
        <div className="min-w-0">
          <div className="bm-title text-base font-extrabold tracking-wide">{ТЧ.заголовок}</div>
          <div className="text-[11px] leading-snug text-purple-200/60">{ТЧ.подзаголовок}</div>
        </div>
        <span className="ml-auto text-purple-200/70 transition-transform duration-300" style={{ transform: открыт ? "rotate(180deg)" : "none" }}>▾</span>
      </button>

      {открыт && (
        <div className="bm-open relative flex flex-col gap-2 px-3 pb-3">
          {КЛЮЧИ_АРТЕФАКТОВ.map((ключ) => {
            const т = ТЧ.артефакты[ключ];
            const цена = ЧЁРНЫЙ_РЫНОК.артефакты[ключ].цена;
            const есть = естьАртефакт(user, ключ);
            return (
              <div key={ключ} className={`relative flex items-center gap-3 rounded-2xl border bg-black/40 p-3 ${новый === ключ ? "bm-bought border-amber-300/60" : "border-purple-400/20"}`}>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-purple-900/30 text-3xl ring-1 ring-purple-300/20">
                  <Картинка путь={`${АССЕТЫ.папки.иконки}artifact-${ключ}.png`} fallback={<span>{т.значок}</span>} className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold leading-tight">{т.название}</div>
                  <p className="mt-0.5 text-[11px] leading-snug text-purple-100/60">{т.описание}</p>
                </div>
                {есть ? (
                  <span className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold text-purple-200">{ТЧ.куплено}</span>
                ) : (
                  <button
                    onClick={() => купить(ключ)}
                    disabled={занят || user.hearts < цена}
                    className="btn bm-buy flex shrink-0 items-center gap-1.5 !rounded-xl !px-3 !py-2 text-sm disabled:opacity-35 disabled:saturate-0 disabled:shadow-none"
                  >
                    <Иконка имя="хэпэшки" размер={16} />
                    {цена}
                  </button>
                )}
              </div>
            );
          })}
          {ошибка && <p className="text-center text-xs text-red-300">{ошибка}</p>}
        </div>
      )}
    </section>
  );
}
