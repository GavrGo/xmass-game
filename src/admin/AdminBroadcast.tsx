import { useState } from "react";
import type { User } from "../types";

const ПАЧКА = 25;
const ПАУЗА_МС = 1000;

export default function РассылкаАдмина({ игроки }: { игроки: User[] }) {
  const [текст, setТекст] = useState("");
  const [статус, setСтатус] = useState("");
  const [идёт, setИдёт] = useState(false);

  const получатели = игроки.filter((u) => !u.banned);

  const отправить = async () => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      setСтатус("Рассылка работает только внутри Telegram: нет initData.");
      return;
    }
    if (!текст.trim() || получатели.length === 0) return;
    if (!confirm(`Отправить сообщение ${получатели.length} игрокам?`)) return;

    setИдёт(true);
    let отправлено = 0;
    let неДоставлено = 0;
    for (let i = 0; i < получатели.length; i += ПАЧКА) {
      const ids = получатели.slice(i, i + ПАЧКА).map((u) => u.telegram_id);
      setСтатус(`Отправка: ${Math.min(i + ПАЧКА, получатели.length)} из ${получатели.length}`);
      try {
        const r = await fetch("/api/broadcast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData, text: текст, ids }),
        });
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
        отправлено += j.sent;
        неДоставлено += j.failed;
      } catch (e: any) {
        setСтатус(`Ошибка: ${e.message ?? "неизвестно"}. Отправлено ${отправлено}.`);
        setИдёт(false);
        return;
      }
      await new Promise((r) => setTimeout(r, ПАУЗА_МС));
    }
    setСтатус(`Готово: отправлено ${отправлено}, не доставлено ${неДоставлено}`);
    setИдёт(false);
  };

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="font-bold">Рассылка от бота</div>
      <textarea
        value={текст}
        onChange={(e) => setТекст(e.target.value)}
        rows={6}
        maxLength={4000}
        placeholder="Текст сообщения (обычный текст, без форматирования)"
        className="w-full rounded-xl bg-surface2 px-3 py-2 text-white outline-none"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-white/60">Получателей: {получатели.length} (забаненные не получают)</span>
        <button onClick={отправить} disabled={идёт || !текст.trim()} className="btn btn-blue !px-4 !py-2 text-sm disabled:opacity-40">
          {идёт ? "Отправка..." : "Отправить всем"}
        </button>
      </div>
      {статус && <p className="text-sm text-brand-yellow">{статус}</p>}
      <p className="text-xs text-white/40">
        Бот может писать только тем, кто хотя бы раз открыл его (нажал /start). Остальные попадут в «не доставлено».
      </p>
    </div>
  );
}
