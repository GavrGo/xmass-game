import { createPortal } from "react-dom";
import Modal from "./Modal";
import LockIcon from "./LockIcon";
import { МАСТЕРСТВО } from "../config";
import { бонусНаУровне, подсказкаТребования } from "../game/mastery";
import type { Мастерство } from "../lib/useMastery";
import type { Навык } from "../game/skills";

interface Props {
  название: string;
  инфо: Pick<Мастерство, "уровень" | "прогресс" | "процент" | "заблокирован" | "следующее">;
  держатель: boolean;
  навыки?: Навык[];
  onClose: () => void;
}

export default function MasteryPopup({ название, инфо, держатель, навыки, onClose }: Props) {
  return createPortal(
    <Modal тон="calm" onClose={onClose}>
          <div className={инфо.заблокирован ? "brightness-75" : ""}>
          <h3 className="pr-10 text-lg font-bold">Мастерство · {название}</h3>
          {инфо.заблокирован ? (
            <p className="mb-4 flex items-start gap-2 rounded-xl bg-black/40 px-3 py-2 text-xs font-semibold text-orange-200 ring-1 ring-orange-300/40">
              <LockIcon className="mt-px h-3.5 w-3.5 shrink-0" />
              {подсказкаТребования(инфо.следующее)}
            </p>
          ) : (
            <p className="mb-4 text-xs text-white/60">Каждый уровень увеличивает доход с этой игры.</p>
          )}
          {держатель && (
            <p className="mb-3 rounded-xl bg-amber-300/15 px-3 py-2 text-xs font-semibold text-amber-200 ring-1 ring-amber-300/50">Рекорд: +{Math.round(МАСТЕРСТВО.рекордБонус * 100)}% к доходу сверху</p>
          )}
          <div className="mb-1.5 flex items-baseline justify-between text-sm font-bold">
            <span>Ур. {инфо.уровень} из {МАСТЕРСТВО.максУровень}</span>
            <span className="tabular-nums">+{инфо.процент}%</span>
          </div>
          <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-400 transition-[width] duration-500" style={{ width: `${Math.round(инфо.прогресс * 100)}%` }} />
          </div>
          <ul className="max-h-[50vh] space-y-1.5 overflow-y-auto pr-1 text-left text-xs">
            {Array.from({ length: МАСТЕРСТВО.максУровень }, (_, i) => i + 1).map((ур) => {
              const пройден = ур < инфо.уровень;
              const текущий = ур === инфо.уровень;
              const закрыто = ур > инфо.уровень && ур > МАСТЕРСТВО.отрывУровней;
              const новыеНавыки = навыки?.filter((н) => н.уровень === ур) ?? [];
              return (
                <li key={ур} className={`rounded-xl px-3 py-2 ${текущий ? "bg-amber-300/20 ring-1 ring-amber-300/70" : пройден ? "opacity-35" : "bg-white/5"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">Ур. {ур}</span>
                    <span className="inline-flex items-center gap-1 font-bold text-amber-200">+{Math.round(бонусНаУровне(ур) * 100)}%</span>
                  </div>
                  {новыеНавыки.map((н) => (
                    <div key={н.id} className="mt-1 text-[11px] font-semibold text-emerald-300">+ {н.иконка} {н.название}</div>
                  ))}
                  {закрыто && (
                    <div className="mt-1 text-[11px] font-semibold text-orange-300">Нужно: 2 другие игры на уровне {ур - МАСТЕРСТВО.отрывУровней}+</div>
                  )}
                </li>
              );
            })}
          </ul>
          </div>
    </Modal>,
    document.body,
  );
}
