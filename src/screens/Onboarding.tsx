import { useState } from "react";
import { useUser } from "../store/UserContext";
import SpeechBubble from "../components/SpeechBubble";
import Модалка from "../components/Модалка";
import { Картинка } from "../components/Иконка";
import { ОНБОРДИНГ, АССЕТЫ } from "../config";
import { СПИСОК_ЭМОДЗИ, анимироватьЭмодзи } from "../game/emoji";
import { стильФона, useАссеты } from "../lib/assets";
import { Т } from "../texts";

// Онбординг по макетам: приветствие → имя → выбор аватара (красные «шторки» поверх тёмного фона).
export default function Onboarding() {
  const { register } = useUser();
  useАссеты();

  const [шаг, setШаг] = useState<"приветствие" | "ник" | "эмодзи">("приветствие");
  const [ник, setНик] = useState("");
  const [эмодзи, setЭмодзи] = useState("👤");
  const [крутки, setКрутки] = useState(0); // сколько раз уже крутили
  const [крутится, setКрутится] = useState(false);
  const [показаноКруток, setПоказаноКруток] = useState(0); // для баблов: считаем после остановки анимации
  const [сохраняем, setСохраняем] = useState(false);
  const [ошибка, setОшибка] = useState("");
  const [выбрано, setВыбрано] = useState(false); // крутили ли хоть раз

  const ник_ок =
    ник.trim().length >= ОНБОРДИНГ.минДлинаНика &&
    ник.trim().length <= ОНБОРДИНГ.максДлинаНика;

  const крутить = async () => {
    if (крутится || крутки >= ОНБОРДИНГ.максКрутокЭмодзи) return;
    const номер = крутки + 1;
    const итогЭмодзи = СПИСОК_ЭМОДЗИ[Math.floor(Math.random() * СПИСОК_ЭМОДЗИ.length)];
    setКрутки(номер);
    setКрутится(true);
    await анимироватьЭмодзи(setЭмодзи, итогЭмодзи); // эмодзи мелькают, потом останавливаются
    setКрутится(false);
    setВыбрано(true);
    setПоказаноКруток(номер);
  };

  const подтвердить = async () => {
    setСохраняем(true);
    try {
      await register(ник.trim(), эмодзи);
    } catch (e: any) {
      setОшибка(e.message ?? Т.онбординг.аватар.ошибкаСохранения);
      setСохраняем(false);
    }
  };

  // Бабл показываем после остановки анимации, если для этого номера крутки есть текст
  const бабл = крутится ? undefined : Т.онбординг.баблы[показаноКруток];
  const кончились = крутки >= ОНБОРДИНГ.максКрутокЭмодзи;

  const hero = (
    <Картинка
      путь={АССЕТЫ.папки.ui + АССЕТЫ.ui.приветствие}
      fallback={<span className="text-7xl leading-none drop-shadow-lg">❤️</span>}
      className="h-24 w-24 object-contain drop-shadow-lg"
    />
  );

  return (
    <div className="fixed inset-0 bg-app" style={стильФона("онбординг")}>
      {шаг === "приветствие" && (
        <Модалка снизу hero={hero}>
          <h2 className="text-xl font-bold">{Т.онбординг.приветствие.заголовок}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/80">{Т.онбординг.приветствие.текст}</p>
          <button onClick={() => setШаг("ник")} className="btn btn-blue mt-5 w-full">{Т.онбординг.приветствие.кнопка}</button>
          <p className="mt-3 text-xs text-white/50">{Т.онбординг.приветствие.подвал}</p>
        </Модалка>
      )}

      {шаг === "ник" && (
        <Модалка снизу hero={hero}>
          <h2 className="text-xl font-bold">{Т.онбординг.ник.заголовок}</h2>
          <p className="mt-1 text-sm text-white/80">{Т.онбординг.ник.подзаголовок}</p>
          <input
            value={ник}
            onChange={(e) => setНик(e.target.value)}
            maxLength={ОНБОРДИНГ.максДлинаНика}
            placeholder={Т.онбординг.ник.подсказка}
            className="mt-4 h-11 w-full rounded-xl border border-white/15 bg-black/45 px-4 text-center text-white outline-none placeholder:text-muted focus:border-white/40"
          />
          <button disabled={!ник_ок} onClick={() => setШаг("эмодзи")} className="btn btn-blue mt-4 w-full">{Т.онбординг.ник.кнопка}</button>
          <p className="mt-3 text-xs text-white/50">{Т.онбординг.ник.подвал}</p>
        </Модалка>
      )}

      {шаг === "эмодзи" && (
        <Модалка снизу>
          <h2 className="text-xl font-bold">{Т.онбординг.аватар.заголовок}</h2>
          <p className="mt-1 text-sm text-white/80">{Т.онбординг.аватар.подзаголовок(ник.trim())}</p>

          <div className="mt-3 flex h-14 items-end justify-center">{бабл && <SpeechBubble text={бабл} />}</div>

          <div className={`mx-auto mt-2 flex h-24 w-24 items-center justify-center rounded-full bg-black/40 text-6xl ring-4 transition ${выбрано && !крутится ? "ring-brand-yellow/70" : "ring-white/10"} ${крутится ? "scale-95 animate-pulse blur-[1px]" : ""}`}>
            {эмодзи}
          </div>

          <p className="mt-2 text-xs text-white/50">{Т.онбординг.аватар.счётчик(крутки, ОНБОРДИНГ.максКрутокЭмодзи)}</p>

          <button onClick={крутить} disabled={кончились || крутится} className="btn btn-yellow mt-3 w-full">{Т.онбординг.аватар.крутить}</button>
          <button onClick={подтвердить} disabled={!выбрано || крутится || сохраняем} className="btn btn-blue mt-2 w-full">
            {сохраняем ? Т.онбординг.аватар.сохраняем : Т.онбординг.аватар.продолжить}
          </button>
          {ошибка && <p className="mt-2 text-sm text-red-300">{ошибка}</p>}
          <p className="mt-3 text-xs text-white/50">{Т.онбординг.аватар.подвал}</p>
        </Модалка>
      )}
    </div>
  );
}
