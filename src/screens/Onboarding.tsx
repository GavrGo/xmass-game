import { useMemo, useState } from "react";
import { useUser } from "../store/UserContext";
import SpeechBubble from "../components/SpeechBubble";
import { анимироватьЭмодзи } from "../game/emoji";
import { ОНБОРДИНГ, СТРОКА_ЭМОДЗИ } from "../config";

// Режем строку на отдельные эмодзи (учитывает сложные символы вроде ☺️)
function разрезать(s: string): string[] {
  const seg = new (Intl as any).Segmenter("ru", { granularity: "grapheme" });
  return Array.from(seg.segment(s), (x: any) => x.segment as string);
}

export default function Onboarding() {
  const { register } = useUser();
  const списокЭмодзи = useMemo(() => разрезать(СТРОКА_ЭМОДЗИ), []);

  const [шаг, setШаг] = useState<"ник" | "эмодзи">("ник");
  const [ник, setНик] = useState("");
  const [эмодзи, setЭмодзи] = useState("❓");
  const [крутки, setКрутки] = useState(0); // сколько раз уже крутили
  const [сохраняем, setСохраняем] = useState(false);
  const [ошибка, setОшибка] = useState("");

  const ник_ок =
    ник.trim().length >= ОНБОРДИНГ.минДлинаНика &&
    ник.trim().length <= ОНБОРДИНГ.максДлинаНика;

  const [крутится, setКрутится] = useState(false);
  const [показаноКруток, setПоказаноКруток] = useState(0); // для баблов: считаем после остановки анимации

  const крутить = async () => {
    if (крутится || крутки >= ОНБОРДИНГ.максКрутокЭмодзи) return;
    const номер = крутки + 1;
    const итогЭмодзи = списокЭмодзи[Math.floor(Math.random() * списокЭмодзи.length)];
    setКрутки(номер);
    setКрутится(true);
    await анимироватьЭмодзи(setЭмодзи, итогЭмодзи); // эмодзи мелькают, потом останавливаются
    setКрутится(false);
    setПоказаноКруток(номер);
  };

  const подтвердить = async () => {
    setСохраняем(true);
    try {
      await register(ник.trim(), эмодзи);
    } catch (e: any) {
      setОшибка(e.message ?? "Не удалось сохранить");
      setСохраняем(false);
    }
  };

  // Бабл показываем, только если для ТЕКУЩЕГО номера крутки есть текст
  const бабл = крутится ? undefined : ОНБОРДИНГ.баблы[показаноКруток];
  const кончились = крутки >= ОНБОРДИНГ.максКрутокЭмодзи;

  if (шаг === "ник") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
        <h1 className="text-3xl font-bold text-xmas-gold">100HP Christmas 🎄</h1>
        <p className="text-white/70">Как тебя зовут?</p>
        <input
          value={ник}
          onChange={(e) => setНик(e.target.value)}
          maxLength={ОНБОРДИНГ.максДлинаНика}
          placeholder="Твой ник"
          className="w-full max-w-xs rounded-xl bg-white/10 px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-xmas-gold"
        />
        <button
          disabled={!ник_ок}
          onClick={() => setШаг("эмодзи")}
          className="w-full max-w-xs rounded-xl bg-xmas-red py-3 text-lg font-bold disabled:bg-gray-600 disabled:text-white/40"
        >
          Дальше
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <p className="text-white/70">Выбери аватар, {ник.trim()}</p>

      <div className="flex h-16 items-end">{бабл && <SpeechBubble text={бабл} />}</div>

      <div className={`flex h-40 w-40 items-center justify-center rounded-full bg-white/10 text-8xl transition ${крутится ? "scale-95 animate-pulse blur-[1px]" : ""}`}>
        {эмодзи}
      </div>

      <p className="text-sm text-white/50">
        Крутки: {крутки} / {ОНБОРДИНГ.максКрутокЭмодзи}
      </p>

      <button
        onClick={крутить}
        disabled={кончились || крутится}
        className="w-full max-w-xs rounded-xl bg-xmas-red py-3 text-lg font-bold disabled:bg-gray-600 disabled:text-white/40"
      >
        Крутить
      </button>

      <button
        onClick={подтвердить}
        disabled={крутки === 0 || крутится || сохраняем}
        className="w-full max-w-xs rounded-xl bg-xmas-green py-3 text-lg font-bold disabled:bg-gray-600 disabled:text-white/40"
      >
        {сохраняем ? "Сохраняем…" : "Это я!"}
      </button>

      {ошибка && <p className="text-red-400">{ошибка}</p>}
    </div>
  );
}
