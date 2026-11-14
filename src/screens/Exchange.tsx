import { useState } from "react";
import { useUser } from "../store/UserContext";
import { ОБМЕН, МАГАЗИН_ОБМЕННИКА, ОНБОРДИНГ, АССЕТЫ } from "../config";
import { комиссияОбменаПроц } from "../game/effects";
import { посчитатьОбмен, Направление } from "../game/exchange";
import { прочитатьКрутки, записатьКрутки } from "../game/emoji";
import AvatarSpinModal from "../components/AvatarSpinModal";
import { Иконка, Картинка } from "../components/Иконка";
import { звук } from "../lib/sound";
import { Т } from "../texts";

export default function Exchange() {
  const { user, change, telegramId } = useUser();
  const [направление, setНаправление] = useState<Направление>("chipsToTickets");
  const [ввод, setВвод] = useState("");
  const [сообщение, setСообщение] = useState("");
  const [занят, setЗанят] = useState(false);

  // --- Магазин ---
  const [новыйНик, setНовыйНик] = useState("");
  const [сообщениеМагазина, setСообщениеМагазина] = useState("");
  const [крутки, setКрутки] = useState(() => прочитатьКрутки(telegramId));
  const [окноАватара, setОкноАватара] = useState(false);

  if (!user) return null;

  const комиссия = комиссияОбменаПроц(user);
  const количество = Math.max(0, Math.floor(Number(ввод) || 0));
  const { получите, спишется } = посчитатьОбмен(направление, количество, комиссия);

  const фишкиВБилеты = направление === "chipsToTickets";
  const баланс = фишкиВБилеты ? user.chips : user.tickets;
  const хватает = количество <= баланс;
  const можно = !занят && получите >= 1 && хватает;
  const ТО = Т.обмен;

  const подтвердить = async () => {
    if (!можно) return;
    setЗанят(true);
    try {
      await change(
        фишкиВБилеты
          ? { chips: -спишется, tickets: получите }
          : { tickets: -спишется, chips: получите }
      );
      setСообщение(ТО.готово(
        фишкиВБилеты ? Т.общее.фишки(спишется) : Т.общее.билеты(спишется),
        фишкиВБилеты ? Т.общее.билеты(получите) : Т.общее.фишки(получите),
      ));
      setВвод("");
      звук.sfx("покупка"); // ← звук обмена
    } catch (e: any) {
      setСообщение(ТО.ошибка(e.message));
      звук.sfx("ошибка");
    }
    setЗанят(false);
  };

  const переключить = () => {
    setНаправление(фишкиВБилеты ? "ticketsToChips" : "chipsToTickets");
    setВвод("");
    setСообщение("");
  };

  // ---------- Смена никнейма ----------
  const цНик = МАГАЗИН_ОБМЕННИКА.сменаНика.цена;
  const ник = новыйНик.trim();
  const ник_ок = ник.length >= ОНБОРДИНГ.минДлинаНика && ник.length <= ОНБОРДИНГ.максДлинаНика && ник !== user.nickname;

  const сменитьНик = async () => {
    if (занят || !ник_ок || user.chips < цНик) return;
    setЗанят(true);
    setСообщениеМагазина("");
    try {
      await change({ chips: -цНик }, { nickname: ник });
      setСообщениеМагазина(ТО.магазин.ник.готово(ник));
      setНовыйНик("");
      звук.sfx("покупка");
    } catch (e: any) {
      setСообщениеМагазина(ТО.ошибка(e.message));
      звук.sfx("ошибка");
    }
    setЗанят(false);
  };

  // ---------- Крутки эмодзи ----------
  const цКрутки = МАГАЗИН_ОБМЕННИКА.кручкиЭмодзи.цена;
  const колКруток = МАГАЗИН_ОБМЕННИКА.кручкиЭмодзи.количество;

  const купитьКрутки = async () => {
    if (занят || user.chips < цКрутки) return;
    setЗанят(true);
    setСообщениеМагазина("");
    try {
      await change({ chips: -цКрутки });
      const новое = крутки + колКруток;
      записатьКрутки(telegramId, новое);
      setКрутки(новое);
      setОкноАватара(true); // сразу открываем выбор аватара
      звук.sfx("покупка");
    } catch (e: any) {
      setСообщениеМагазина(ТО.ошибка(e.message));
      звук.sfx("ошибка");
    }
    setЗанят(false);
  };

  const списатьКрутку = () => {
    const новое = Math.max(0, крутки - 1);
    записатьКрутки(telegramId, новое);
    setКрутки(новое);
  };

  return (
    <div className="px-4">
      {/* Персонаж: public/assets/characters/exchange.png */}
      <div className="mb-2 flex justify-center">
        <Картинка
          путь={АССЕТЫ.папки.персонажи + АССЕТЫ.персонажи.обмен}
          fallback={<div className="text-8xl leading-none">🧑‍🎄</div>}
          className="max-h-40 object-contain"
        />
      </div>

      {/* Панель обмена */}
      <div className="card p-4">
        <h3 className="mb-3 text-center text-lg font-bold">{ТО.заголовок}</h3>

        <div className="rounded-2xl bg-surface2 p-3">
          <div className="text-xs text-muted">{ТО.платишь}</div>
          <div className="mt-1 flex items-center gap-3">
            <div className="flex items-center gap-2 font-bold">
              <Иконка имя={фишкиВБилеты ? "фишки" : "билеты"} размер={26} />
              {фишкиВБилеты ? ТО.фишки : ТО.билеты}
            </div>
            <input
              type="number" inputMode="numeric" min={0} value={ввод}
              onChange={(e) => { setВвод(e.target.value); setСообщение(""); }}
              placeholder="0"
              className="ml-auto w-28 bg-transparent text-right text-2xl font-bold text-white outline-none placeholder:text-white/30"
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted">
            <span>{ТО.баланс(баланс)}</span>
            <button onClick={() => setВвод(String(баланс))} className="rounded-md bg-surface px-2 py-0.5 font-bold text-white">{ТО.всё}</button>
          </div>
        </div>

        <div className="my-2 flex justify-center">
          <button onClick={переключить} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface2 text-xl ring-4 ring-[#1E1F24] active:scale-95">{ТО.переключить}</button>
        </div>

        <div className="rounded-2xl bg-surface2 p-3">
          <div className="text-xs text-muted">{ТО.получаешь}</div>
          <div className="mt-1 flex items-center gap-3">
            <div className="flex items-center gap-2 font-bold">
              <Иконка имя={фишкиВБилеты ? "билеты" : "фишки"} размер={26} />
              {фишкиВБилеты ? ТО.билеты : ТО.фишки}
            </div>
            <div className="ml-auto text-2xl font-bold text-brand-yellow">{получите}</div>
          </div>
        </div>

        <div className="mt-3 space-y-0.5 text-center text-xs text-muted">
          <div>{ТО.курс(ОБМЕН.фишекЗаБилет)}</div>
          <div>{ТО.комиссия(комиссия)} · {ТО.спишется}: {спишется}</div>
        </div>

        {!хватает && <p className="mt-2 text-center text-sm text-red-400">{ТО.нехватаетСредств}</p>}
        {количество > 0 && получите < 1 && хватает && <p className="mt-2 text-center text-sm text-muted">{ТО.слишкомМало}</p>}

        <button onClick={подтвердить} disabled={!можно} className="btn btn-blue mt-3 w-full !py-3 text-lg">{ТО.кнопка}</button>
        {сообщение && <p className="mt-3 text-center text-sm text-brand-yellow">{сообщение}</p>}
      </div>

      {/* ================= МАГАЗИН ================= */}
      <h3 className="mb-3 mt-6 text-lg font-bold">{ТО.магазин.заголовок}</h3>

      <div className="card mb-3 p-4">
        <div className="flex justify-between font-bold">
          <span>{ТО.магазин.ник.заголовок}</span>
          <span className="text-brand-yellow">{Т.общее.фишки(цНик)}</span>
        </div>
        <p className="mb-2 text-sm text-muted">{ТО.магазин.ник.сейчас(user.nickname)}</p>
        <input
          value={новыйНик}
          onChange={(e) => setНовыйНик(e.target.value)}
          maxLength={ОНБОРДИНГ.максДлинаНика}
          placeholder={ТО.магазин.ник.подсказка}
          className="w-full rounded-xl bg-surface2 px-4 py-2.5 text-white outline-none placeholder:text-muted focus:ring-2 focus:ring-brand-blue"
        />
        <button onClick={сменитьНик} disabled={занят || !ник_ок || user.chips < цНик} className="btn btn-blue mt-2 w-full">{ТО.магазин.ник.кнопка(цНик)}</button>
        {user.chips < цНик && <p className="mt-1 text-xs text-red-400">{ТО.магазин.нехватаетФишек}</p>}
      </div>

      <div className="card p-4">
        <div className="flex justify-between font-bold">
          <span>{ТО.магазин.крутки.заголовок(user.emoji, колКруток)}</span>
          <span className="text-brand-yellow">{Т.общее.фишки(цКрутки)}</span>
        </div>
        <p className="mb-2 text-sm text-muted">
          {ТО.магазин.крутки.описание}
          {крутки > 0 && ТО.магазин.крутки.осталось(крутки)}
        </p>
        {крутки > 0 && (
          <button onClick={() => setОкноАватара(true)} className="btn btn-yellow mb-2 w-full">{ТО.магазин.крутки.крутить(крутки)}</button>
        )}
        <button onClick={купитьКрутки} disabled={занят || user.chips < цКрутки} className="btn btn-blue w-full">{ТО.магазин.крутки.купить(колКруток, цКрутки)}</button>
        {user.chips < цКрутки && <p className="mt-1 text-xs text-red-400">{ТО.магазин.нехватаетФишек}</p>}
      </div>

      {сообщениеМагазина && <p className="mt-3 text-center text-sm text-brand-yellow">{сообщениеМагазина}</p>}

      {окноАватара && (
        <AvatarSpinModal
          текущий={user.emoji}
          осталось={крутки}
          onКрутка={списатьКрутку}
          onВыбрать={(э) => change({}, { emoji: э })}
          onЗакрыть={() => setОкноАватара(false)}
        />
      )}
    </div>
  );
}
