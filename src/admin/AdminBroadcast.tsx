import { useState } from "react";
import type { User } from "../types";

const ПАЧКА = 25;
const ПАУЗА_МС = 1000;
const ФОТО_СТОРОНА = 1280;

async function сжатьФото(файл: File): Promise<string> {
  const img = await createImageBitmap(файл);
  const k = Math.min(1, ФОТО_СТОРОНА / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * k);
  canvas.height = Math.round(img.height * k);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function РассылкаАдмина({ игроки }: { игроки: User[] }) {
  const [текст, setТекст] = useState("");
  const [статус, setСтатус] = useState("");
  const [идёт, setИдёт] = useState(false);
  const [фото, setФото] = useState<string | null>(null);

  const выбратьФото = async (файл?: File) => {
    if (!файл) return;
    setФото(await сжатьФото(файл));
  };

  const получатели = игроки.filter((u) => !u.banned);

  const отправить = async () => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      setСтатус("Рассылка работает только внутри Telegram: нет initData.");
      return;
    }
    if ((!текст.trim() && !фото) || получатели.length === 0) return;
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
          body: JSON.stringify({ initData, text: текст, ids, photo: фото }),
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
      <div className="flex flex-col gap-2">
        <input type="file" accept="image/*" onChange={(e) => выбратьФото(e.target.files?.[0])} className="text-sm text-white/70" />
        {фото && (
          <div className="flex items-center gap-3">
            <img src={фото} alt="" className="h-16 w-16 rounded-lg object-cover" />
            <button type="button" onClick={() => setФото(null)} className="text-sm text-white/60 underline">Убрать фото</button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-white/60">Получателей: {получатели.length} (забаненные не получают)</span>
        <button onClick={отправить} disabled={идёт || (!текст.trim() && !фото)} className="btn btn-primary !px-4 !py-2 text-sm disabled:opacity-40">
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
