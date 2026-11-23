import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Т } from "../texts";
import Эм from "../components/Emoji";
import GameMenu from "../components/GameMenu";
import GameResult from "../components/GameResult";
import LevelBanner from "../components/LevelBanner";
import { звук } from "../lib/sound";
import { стат } from "../lib/stats";
import { useNoSwipes } from "../lib/useNoSwipes";
import { useUser } from "../store/UserContext";
import { useMastery, сБонусом } from "../lib/useMastery";
import { ДЖИРА_ФАЙТ as К } from "../config";
import { getGlobalRecord, Рекорд } from "../api/users";
import { глобальныйРекорд } from "../game/records";
import { бонусВремениСек } from "../game/effects";
import type { User } from "../types";
import {
  Доски, Режим, завершена, можноПерелить, перелить, верхняяПорция, естьХод, уровеньРешён,
  сгенерироватьУровень, времяУровня, наградаДжира, доскНаУровне,
} from "../game/jira";

type Фаза = "menu" | "playing" | "over";

interface Итог {
  база: number;
  причина: "нет ходов" | "время" | "выход";
  уровней: number;
  фишек: number;
  личный: number;
  глобальный: Рекорд | null | "ошибка" | undefined;
}

const ВЫСОТА_ЗАДАЧИ = 38; // px
const ШИРИНА_ДОСКИ = 76;  // px
const мм = (с: number) => `${Math.floor(с / 60)}:${String(с % 60).padStart(2, "0")}`;

// Схематичная задача: цветной прямоугольник с «намёком на текст»
function Задача({ цвет }: { цвет: string }) {
  return (
    <div className="relative h-full w-full rounded-md shadow-sm" style={{ background: цвет }}>
      <div className="absolute left-1.5 top-1.5 h-1.5 w-1/3 rounded-full bg-white/80" />
      <div className="absolute left-1.5 top-4 h-1 w-3/4 rounded bg-white/45" />
      <div className="absolute left-1.5 top-[26px] h-1 w-1/2 rounded bg-white/30" />
      <div className="absolute bottom-1 right-1.5 h-3 w-3 rounded-full bg-white/85" />
    </div>
  );
}

export default function JiraFight() {
  const { user, change } = useUser();
  const { бонус, мастерство, начатьЗабег, шкала, начислить: начислитьМастерство } = useMastery("jira");
  const navigate = useNavigate();
  useNoSwipes(); // игра управляется только тапами

  const [фаза, setФаза] = useState<Фаза>("menu");
  const [режим, setРежим] = useState<Режим>("zen");
  const [уровень, setУровень] = useState(1);
  const [доски, setДоски] = useState<Доски>([]);
  const [выбрана, setВыбрана] = useState<number | null>(null);
  const [осталось, setОсталось] = useState(0);
  const [тост, setТост] = useState("");
  const [баннер, setБаннер] = useState<{ id: number; текст: string } | null>(null);
  const баннерСчёт = useRef(0);
  const [тряска, setТряска] = useState<number | null>(null);
  const [фишекСессии, setФишекСессии] = useState(0);
  const [итог, setИтог] = useState<Итог | null>(null);

  const доскиRef = useRef<Доски>([]);
  const уровеньRef = useRef(1);
  const награждённые = useRef<Set<number>>(new Set());
  const сессия = useRef({ уровней: 0, фишек: 0, сырых: 0 });
  const рекордRef = useRef(0);
  const конецRef = useRef(0);
  const очередь = useRef<Promise<void>>(Promise.resolve());
  const предупреждение = useRef<string | undefined>();
  const играЗакончена = useRef(true);
  const таймерТоста = useRef<ReturnType<typeof setTimeout>>();
  const свежее = useRef({ user, change, режим });
  свежее.current = { user, change, режим };

  const показатьТост = (т: string) => {
    setТост(т);
    clearTimeout(таймерТоста.current);
    таймерТоста.current = setTimeout(() => setТост(""), 1300);
  };

  const показатьБаннер = (текст: string) => {
    const id = ++баннерСчёт.current;
    setБаннер({ id, текст });
    setTimeout(() => setБаннер((б) => (б?.id === id ? null : б)), 1700);
  };

  /** Зачисляем фишки (по очереди, чтобы записи в базу не перепутались). */
  const начислить = (базовая: number, extra: Partial<User> = {}): Promise<boolean> => {
    const сумма = Math.round(базовая * бонус);
    const задача = очередь.current.then(async () => {
      const { change: изменить } = свежее.current;
      try {
        начислитьМастерство(сумма);
        await изменить({ chips: сумма }, extra);
        сессия.current.фишек += сумма;
        сессия.current.сырых += базовая;
        setФишекСессии(сессия.current.фишек);
        return true;
      } catch (e: any) {
        if (Object.keys(extra).length && String(e?.message).includes("best_jira_level")) {
          try {
            начислитьМастерство(сумма);
            await изменить({ chips: сумма });
            сессия.current.фишек += сумма;
        сессия.current.сырых += базовая;
            setФишекСессии(сессия.current.фишек);
            предупреждение.current = Т.предупреждения.jira;
            return true;
          } catch { return false; }
        }
        return false;
      }
    });
    очередь.current = задача.then(() => undefined);
    return задача;
  };

  /** Новый уровень. */
  const начатьУровень = (L: number) => {
    const д = сгенерироватьУровень(L);
    доскиRef.current = д; setДоски(д);
    уровеньRef.current = L; setУровень(L);
    награждённые.current = new Set();
    setВыбрана(null);
    if (свежее.current.режим === "timed") {
      const u = свежее.current.user;
      const лимит = времяУровня(L, u ? бонусВремениСек(u) : 0);
      конецRef.current = Date.now() + лимит * 1000;
      setОсталось(лимит);
    }
    начатьЗабег();
    setФаза("playing");
  };

  const старт = () => {
    стат("plays_jira");
    сессия.current = { уровней: 0, фишек: 0, сырых: 0 };
    setФишекСессии(0);
    предупреждение.current = undefined;
    рекордRef.current = свежее.current.user?.best_jira_level ?? 0;
    играЗакончена.current = false;
    setИтог(null);
    начатьУровень(1);
  };

  /** Игра окончена. */
  const завершить = async (причина: Итог["причина"]) => {
    if (играЗакончена.current) return;
    играЗакончена.current = true;
    const u = свежее.current.user;
    if (!u) return;
    setВыбрана(null);
    const личный = () => Math.max(рекордRef.current, сессия.current.уровней);
    setИтог({ причина, уровней: сессия.current.уровней, фишек: сессия.current.фишек, база: сессия.current.сырых, личный: личный(), глобальный: undefined });
    setФаза("over");
    if (причина !== "выход") звук.sfx("поражение"); // ← звук проигрыша
    await очередь.current; // дожидаемся всех зачислений
    setИтог((п) => (п ? { ...п, фишек: сессия.current.фишек } : п));
    try {
      const г = await getGlobalRecord("best_jira_level");
      const мой = личный();
      const рекордсмен: Рекорд | null =
        г && г.значение >= мой ? г : мой > 0 ? { telegram_id: u.telegram_id, nickname: u.nickname, значение: мой } : null;
      setИтог((п) => (п ? { ...п, глобальный: рекордсмен } : п));
    } catch {
      setИтог((п) => (п ? { ...п, глобальный: "ошибка" } : п));
    }
  };

  /** Уровень закрыт: бонус за уровень, рекорд, окно «Дальше». */
  const уровеньПройден = () => {
    const L = уровеньRef.current;
    const { user: u, режим: р } = свежее.current;
    const наградаЗаУровень = наградаДжира(К.награды.заУровень, р, u?.salary_level ?? 0);
    const новыйРекорд = L > рекордRef.current;
    if (новыйРекорд) рекордRef.current = L;
    сессия.current.уровней = L;
    начислить(наградаЗаУровень, новыйРекорд ? { best_jira_level: L } : {});
    setВыбрана(null);
    звук.sfx("победа");
    показатьБаннер(ТЖ.баннерУровня(L + 1));
    начатьУровень(L + 1);
  };

  /** Переливаем задачи с доски a на доску b. */
  const сделатьХод = (a: number, b: number) => {
    const { user: u, режим: р } = свежее.current;
    звук.sfx("ход"); // ← звук переливания
    const рез = перелить(доскиRef.current, a, b);
    доскиRef.current = рез.доски;
    setДоски(рез.доски);
    setВыбрана(null);

    // Доска собрана — награда (один раз за доску)
    if (завершена(рез.доски[b]) && !награждённые.current.has(b)) {
      награждённые.current.add(b);
      const н = наградаДжира(К.награды.заДоску, р, u?.salary_level ?? 0);
      показатьТост(Т.игры.jira.тостДоска(н));
      звук.sfx("бонус"); // ← звук закрытой доски
      начислить(н);
    }

    if (уровеньРешён(рез.доски)) { уровеньПройден(); return; }
    if (!естьХод(рез.доски)) завершить("нет ходов");
  };

  /** Нажатие на доску. */
  const нажатьДоску = (i: number) => {
    if (фаза !== "playing") return;
    const д = доскиRef.current;
    const можноВзять = д[i].length > 0 && !завершена(д[i]);
    if (выбрана === null) {
      if (можноВзять) setВыбрана(i);
      return;
    }
    if (выбрана === i) { setВыбрана(null); return; }
    if (можноПерелить(д, выбрана, i)) { сделатьХод(выбрана, i); return; }
    // Нельзя — трясём доску и выбираем новую, если можно
    setТряска(i);
    setTimeout(() => setТряска(null), 320);
    setВыбрана(можноВзять ? i : null);
  };

  // Таймер уровня (только «На время»)
  useEffect(() => {
    if (фаза !== "playing" || режим !== "timed") return;
    const t = setInterval(() => {
      const ост = Math.max(0, Math.ceil((конецRef.current - Date.now()) / 1000));
      setОсталось(ост);
      if (ост <= 0) завершить("время");
    }, 250);
    return () => clearInterval(t);
  }, [фаза, режим]);

  const выйти = () => {
    if (фаза === "playing") {
      if (!confirm(Т.игры.jira.выходПодтверждение)) return;
      завершить("выход");
    } else {
      navigate("/games");
    }
  };

  if (!user) return null;
  const м = режим === "zen" ? К.дзенМножитель : 1;
  const бонусВрем = бонусВремениСек(user);
  const ТЖ = Т.игры.jira;
  const режимТекст = режим === "zen" ? Т.общее.дзен : Т.общее.наВремя;

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center overflow-y-auto px-3 pb-6 pt-3 select-none" style={{ background: "linear-gradient(#0747A6, #091E42)", touchAction: "manipulation" }}>
      {/* Шапка в стиле Jira */}
      <div className="flex w-full max-w-md items-center justify-between">
        <button onClick={выйти} className="btn btn-secondary !px-3 !py-2 text-sm">{фаза === "playing" ? Т.общее.выйти : Т.общее.назад}</button>
        <h2 className="text-lg font-bold">{ТЖ.заголовокМеню}</h2>
        <div className={`pill min-w-[72px] px-3 py-2 text-center text-sm font-bold ${режим === "timed" && осталось <= 10 && фаза === "playing" ? "text-red-300" : ""}`}>
          {фаза === "menu" ? "—" : режим === "timed" ? `⏱ ${мм(осталось)}` : ТЖ.уровеньКратко(уровень)}
        </div>
      </div>

      {фаза !== "menu" && (
        <div className="mt-2 flex w-full max-w-md justify-between text-sm text-white/80">
          <span>{ТЖ.шапка(уровень, режимТекст)}</span>
          <span>{ТЖ.заИгру} <b>{фишекСессии}</b> <Эм>{Т.иконки.фишки}</Эм></span>
        </div>
      )}

      {/* Доски */}
      <div className="mt-4 flex w-full max-w-md flex-wrap justify-center gap-3">
        {доски.map((д, i) => {
          const готова = завершена(д);
          const выб = выбрана === i;
          const порция = выб ? верхняяПорция(д) : 0;
          return (
            <button
              key={i}
              onClick={() => нажатьДоску(i)}
              className={`rounded-lg bg-[#EBECF0] p-1.5 text-left shadow-lg transition ${тряска === i ? "shake" : ""} ${выб ? "ring-4 ring-[#FFC400]" : ""}`}
              style={{ width: ШИРИНА_ДОСКИ, borderTop: `5px solid ${К.цветаДосок[i % К.цветаДосок.length]}`, opacity: готова ? 0.75 : 1 }}
            >
              <div className="mb-1 flex items-center justify-between">
                <div className="h-1.5 w-7 rounded bg-[#5E6C84]/60" />
                <span className="text-[10px] font-bold text-[#42526E]">{готова ? "✔" : `${д.length}/${К.вместимостьДоски}`}</span>
              </div>
              <div className="flex flex-col-reverse gap-1" style={{ height: К.вместимостьДоски * (ВЫСОТА_ЗАДАЧИ + 4) }}>
                {д.map((цвет, k) => (
                  <div
                    key={`${i}-${k}-${цвет}`}
                    className="pop-in"
                    style={{ height: ВЫСОТА_ЗАДАЧИ, transform: k >= д.length - порция ? "translateY(-8px)" : undefined, transition: "transform 0.15s" }}
                  >
                    <Задача цвет={К.эпики[цвет]} />
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {фаза === "playing" && <p className="mt-4 text-center text-xs text-white/60">{ТЖ.справка}</p>}

      {тост && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-20 text-center">
          <span className="inline-block rounded-2xl bg-black/75 px-4 py-2 text-base font-bold text-brand-yellow ring-2 ring-brand-yellow"><Эм>{тост}</Эм></span>
        </div>
      )}

      {/* ===== МЕНЮ ===== */}
      {фаза === "menu" && (
        <GameMenu
          колонка="best_jira_level"
          название={Т.игры.jira.название}
          заголовокВыбора="Режим"
          мастерство={мастерство}
          сложности={[
            { id: "timed", название: Т.общее.наВремя, подпись: ТЖ.режимВремя(мм(времяУровня(1, бонусВрем)), К.наВремя.наКаждуюДоскуСек, бонусВрем) },
            { id: "zen", название: Т.общее.дзен, подпись: ТЖ.режимДзен(К.дзенМножитель), множитель: К.дзенМножитель },
          ]}
          выбрана={режим}
          onВыбор={(id) => setРежим(id as typeof режим)}
          onСтарт={старт}
          onНазад={() => navigate("/games")}
        />
      )}

      {баннер && <LevelBanner key={баннер.id} текст={баннер.текст} />}

      {/* ===== ИТОГ ===== */}
      {фаза === "over" && итог && (
        <GameResult
          заголовок={итог.причина === "время" ? ТЖ.итог.времяВышло : итог.причина === "нет ходов" ? ТЖ.итог.нетХодов : ТЖ.итог.завершена}
          база={итог.база}
          прокачкаПроц={0}
          мастерство={мастерство} шкала={шкала}
          итог={итог.фишек}
          прогресс={{ подпись: "Уровень", значение: String(итог.уровней) }}
          лучший={итог.личный}
          лучшийПодпись="Лучший ур."
          колонка="best_jira_level"
          форматРекорда={(n) => `Ур. ${n}`}
          основная={{ подпись: Т.общее.игратьЕщё, onClick: () => { setИтог(null); setДоски([]); setФаза("menu"); } }}
          вторичная={{ подпись: Т.общее.кСпискуИгр, onClick: () => navigate("/games") }}
        />
      )}

    </div>
  );
}
