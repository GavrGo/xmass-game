import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../store/UserContext";
import { ДЖИРА_ФАЙТ as К } from "../config";
import { getGlobalRecord, Рекорд } from "../api/users";
import РекордыБлок from "../components/РекордыБлок";
import { бонусВремениСек } from "../game/effects";
import type { User } from "../types";
import {
  Доски, Режим, завершена, можноПерелить, перелить, верхняяПорция, естьХод, уровеньРешён,
  сгенерироватьУровень, времяУровня, наградаДжира, доскНаУровне,
} from "../game/jira";

type Фаза = "menu" | "playing" | "level" | "over";

interface ДанныеУровня { уровень: number; награда: number; досок: number; фишекЗаДоски: number }
interface Итог {
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
  const navigate = useNavigate();

  const [фаза, setФаза] = useState<Фаза>("menu");
  const [режим, setРежим] = useState<Режим>("zen");
  const [уровень, setУровень] = useState(1);
  const [доски, setДоски] = useState<Доски>([]);
  const [выбрана, setВыбрана] = useState<number | null>(null);
  const [осталось, setОсталось] = useState(0);
  const [тост, setТост] = useState("");
  const [тряска, setТряска] = useState<number | null>(null);
  const [фишекСессии, setФишекСессии] = useState(0);
  const [данныеУровня, setДанныеУровня] = useState<ДанныеУровня | null>(null);
  const [итог, setИтог] = useState<Итог | null>(null);

  const доскиRef = useRef<Доски>([]);
  const уровеньRef = useRef(1);
  const награждённые = useRef<Set<number>>(new Set());
  const статУровня = useRef({ досок: 0, фишек: 0 });
  const сессия = useRef({ уровней: 0, фишек: 0 });
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

  /** Зачисляем фишки (по очереди, чтобы записи в базу не перепутались). */
  const начислить = (сумма: number, extra: Partial<User> = {}): Promise<boolean> => {
    const задача = очередь.current.then(async () => {
      const { change: изменить } = свежее.current;
      try {
        await изменить({ chips: сумма }, extra);
        сессия.current.фишек += сумма;
        setФишекСессии(сессия.current.фишек);
        return true;
      } catch (e: any) {
        if (Object.keys(extra).length && String(e?.message).includes("best_jira_level")) {
          try {
            await изменить({ chips: сумма });
            сессия.current.фишек += сумма;
            setФишекСессии(сессия.current.фишек);
            предупреждение.current = "Фишки зачислены, но рекорд не сохранён: выполните SQL из migrations/005_jira_fight.sql";
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
    статУровня.current = { досок: 0, фишек: 0 };
    setВыбрана(null);
    if (свежее.current.режим === "timed") {
      const u = свежее.current.user;
      const лимит = времяУровня(L, u ? бонусВремениСек(u) : 0);
      конецRef.current = Date.now() + лимит * 1000;
      setОсталось(лимит);
    }
    setДанныеУровня(null);
    setФаза("playing");
  };

  const старт = () => {
    сессия.current = { уровней: 0, фишек: 0 };
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
    setИтог({ причина, уровней: сессия.current.уровней, фишек: сессия.current.фишек, личный: личный(), глобальный: undefined });
    setФаза("over");
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
    const бонус = наградаДжира(К.награды.заУровень, р, u?.salary_level ?? 0);
    const новыйРекорд = L > рекордRef.current;
    if (новыйРекорд) рекордRef.current = L;
    сессия.current.уровней = L;
    начислить(бонус, новыйРекорд ? { best_jira_level: L } : {});
    setДанныеУровня({ уровень: L, награда: бонус, досок: статУровня.current.досок, фишекЗаДоски: статУровня.current.фишек });
    setВыбрана(null);
    setФаза("level");
  };

  /** Переливаем задачи с доски a на доску b. */
  const сделатьХод = (a: number, b: number) => {
    const { user: u, режим: р } = свежее.current;
    const рез = перелить(доскиRef.current, a, b);
    доскиRef.current = рез.доски;
    setДоски(рез.доски);
    setВыбрана(null);

    // Доска собрана — награда (один раз за доску)
    if (завершена(рез.доски[b]) && !награждённые.current.has(b)) {
      награждённые.current.add(b);
      const н = наградаДжира(К.награды.заДоску, р, u?.salary_level ?? 0);
      статУровня.current.досок += 1;
      статУровня.current.фишек += н;
      показатьТост(`✅ Доска собрана! +${н} 🪙`);
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
      if (!confirm("Выйти из игры? Награда за текущий уровень не начислится (за собранные доски — уже начислена).")) return;
      завершить("выход");
    } else {
      navigate("/games");
    }
  };

  if (!user) return null;
  const м = режим === "zen" ? К.дзенМножитель : 1;
  const бонусВрем = бонусВремениСек(user);

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center overflow-y-auto px-3 pb-6 pt-3 select-none" style={{ background: "linear-gradient(#0747A6, #091E42)", touchAction: "manipulation" }}>
      {/* Шапка в стиле Jira */}
      <div className="flex w-full max-w-md items-center justify-between">
        <button onClick={выйти} className="rounded-xl bg-white/15 px-3 py-2 text-sm font-bold">← {фаза === "playing" ? "Выйти" : "Назад"}</button>
        <h2 className="text-lg font-bold">🔷 Jira Fight</h2>
        <div className={`min-w-[72px] rounded-xl bg-white/15 px-3 py-2 text-center text-sm font-bold ${режим === "timed" && осталось <= 10 && фаза === "playing" ? "text-red-300" : ""}`}>
          {фаза === "menu" ? "—" : режим === "timed" ? `⏱ ${мм(осталось)}` : `Ур. ${уровень}`}
        </div>
      </div>

      {фаза !== "menu" && (
        <div className="mt-2 flex w-full max-w-md justify-between text-sm text-white/80">
          <span>Уровень <b>{уровень}</b> · {режим === "zen" ? "Дзен" : "На время"}</span>
          <span>За игру: <b>{фишекСессии}</b> 🪙</span>
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

      {фаза === "playing" && (
        <p className="mt-4 text-center text-xs text-white/60">
          Тапните доску, затем другую — задачи верхнего цвета перельются. Соберите доски одного цвета.
        </p>
      )}

      {тост && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-20 text-center">
          <span className="inline-block rounded-2xl bg-black/75 px-4 py-2 text-base font-bold text-[#FFC400] ring-2 ring-[#FFC400]">{тост}</span>
        </div>
      )}

      {/* ===== МЕНЮ ===== */}
      {фаза === "menu" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-y-auto bg-black/80 p-5">
          <h2 className="text-3xl font-bold text-[#FFC400]">🔷 Jira Fight</h2>
          <p className="mt-2 max-w-sm text-center text-sm text-white/70">
            Переливайте задачи между досками, пока на каждой доске не окажутся задачи одного эпика (цвета). Уровни усложняются.
          </p>
          <div className="mt-4 flex w-full max-w-sm flex-col gap-2">
            <button onClick={() => setРежим("zen")} className={`rounded-2xl p-4 text-left ${режим === "zen" ? "bg-[#0052CC] ring-2 ring-[#FFC400]" : "bg-white/10"}`}>
              <div className="font-bold">🧘 Дзен</div>
              <div className="text-xs text-white/70">Без таймера · награды ×{К.дзенМножитель}</div>
            </button>
            <button onClick={() => setРежим("timed")} className={`rounded-2xl p-4 text-left ${режим === "timed" ? "bg-[#0052CC] ring-2 ring-[#FFC400]" : "bg-white/10"}`}>
              <div className="font-bold">⏱ На время</div>
              <div className="text-xs text-white/70">
                Таймер на каждый уровень: {мм(времяУровня(1, бонусВрем))} на первом (+{К.наВремя.наКаждуюДоскуСек} сек за доску){бонусВрем > 0 && ` · бонус +${бонусВрем} сек`}
              </div>
            </button>
          </div>
          <p className="mt-3 text-xs text-white/70">
            Доска собрана: {наградаДжира(К.награды.заДоску, режим, user.salary_level)} 🪙 · уровень закрыт: {наградаДжира(К.награды.заУровень, режим, user.salary_level)} 🪙
          </p>
          <p className="mt-1 text-xs text-white/50">Уровень 1: {доскНаУровне(1)} доски · если ходов не осталось — игра заканчивается</p>
          <button onClick={старт} className="mt-4 w-full max-w-sm rounded-2xl bg-xmas-red py-4 text-xl font-bold active:scale-95">▶ Старт</button>
          <button onClick={() => navigate("/games")} className="mt-3 text-sm text-white/60">← К списку игр</button>
          <p className="mt-3 text-xs text-[#FFC400]">Ваш рекорд: уровень {user.best_jira_level ?? 0}</p>
        </div>
      )}

      {/* ===== УРОВЕНЬ ПРОЙДЕН ===== */}
      {фаза === "level" && данныеУровня && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/75 p-5">
          <div className="w-full max-w-sm rounded-3xl bg-[#091E42] p-5 text-center ring-2 ring-[#FFC400]">
            <h3 className="mb-2 text-2xl font-bold">🎉 Уровень {данныеУровня.уровень} закрыт!</h3>
            <div className="my-3 rounded-2xl bg-white/10 p-3 text-left text-sm">
              <Строка л={`Собрано досок: ${данныеУровня.досок}`} п={`+${данныеУровня.фишекЗаДоски} 🪙`} />
              <Строка л="Закрытие уровня" п={`+${данныеУровня.награда} 🪙`} />
              <div className="my-1 border-t border-white/10" />
              <Строка л="Всего за уровень" п={`+${данныеУровня.фишекЗаДоски + данныеУровня.награда} 🪙`} />
            </div>
            <p className="mb-3 text-xs text-white/60">Дальше: уровень {данныеУровня.уровень + 1} — {доскНаУровне(данныеУровня.уровень + 1)} досок</p>
            <div className="flex gap-2">
              <button onClick={() => начатьУровень(данныеУровня.уровень + 1)} className="flex-1 rounded-xl bg-[#36B37E] py-3 font-bold">Дальше ▶</button>
              <button onClick={() => завершить("выход")} className="flex-1 rounded-xl bg-xmas-red py-3 font-bold">Забрать и выйти</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ИТОГ ===== */}
      {фаза === "over" && итог && (
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-y-auto bg-black/75 p-5">
          <div className="w-full max-w-sm rounded-3xl bg-[#091E42] p-5 text-center ring-2 ring-[#FFC400]">
            <h3 className="mb-2 text-2xl font-bold">
              {итог.причина === "время" ? "⏱ Время вышло!" : итог.причина === "нет ходов" ? "🚫 Ходов больше нет" : "👋 Игра завершена"}
            </h3>
            <div className="my-3 rounded-2xl bg-white/10 p-3 text-left text-sm">
              <Строка л="Уровней пройдено" п={String(итог.уровней)} />
              <Строка л="Получено фишек" п={`+${итог.фишек} 🪙`} />
            </div>
            <РекордыБлок личный={{ nickname: user.nickname, значение: итог.личный }} глобальный={итог.глобальный} />
            {предупреждение.current && <p className="mb-2 text-xs text-orange-300">{предупреждение.current}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setИтог(null); setДоски([]); setФаза("menu"); }} className="flex-1 rounded-xl bg-[#36B37E] py-3 font-bold">Играть ещё</button>
              <button onClick={() => navigate("/games")} className="flex-1 rounded-xl bg-xmas-red py-3 font-bold">Забрать и выйти</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Строка = ({ л, п }: { л: string; п: string }) => (
  <div className="flex justify-between gap-3 py-0.5">
    <span className="text-white/60">{л}</span>
    <span className="text-right font-bold">{п}</span>
  </div>
);
