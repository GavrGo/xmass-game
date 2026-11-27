// Серверная функция Vercel: рассылка от бота. Доступна только админам (проверка подписи Telegram initData).
import crypto from "node:crypto";

const токен = () => (process.env.BOT_TOKEN || process.env.VITE_BOT_TOKEN || "").trim().replace(/^["']|["']$/g, "");
const адресБазы = () => process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const ключБазы = () => process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

function проверитьInitData(initData, бот) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const строка = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const секрет = crypto.createHmac("sha256", "WebAppData").update(бот).digest();
  const подпись = crypto.createHmac("sha256", секрет).update(строка).digest("hex");
  const совпало = подпись.length === hash.length && crypto.timingSafeEqual(Buffer.from(подпись), Buffer.from(hash));
  if (!совпало) return null;
  if (Date.now() / 1000 - Number(params.get("auth_date")) > 86400) return null;
  return JSON.parse(params.get("user") || "null");
}

async function этоАдмин(telegramId) {
  const r = await fetch(`${адресБазы()}/rest/v1/admins?telegram_id=eq.${Number(telegramId)}&select=telegram_id`, {
    headers: { apikey: ключБазы(), Authorization: `Bearer ${ключБазы()}` },
  });
  const rows = await r.json();
  return Array.isArray(rows) && rows.length > 0;
}

const ФОТО_ЛИМИТ = 4 * 1024 * 1024;
const ПОДПИСЬ_ЛИМИТ = 1024;

function разобратьФото(dataUrl) {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl));
  if (!m) return null;
  const buf = Buffer.from(m[1], "base64");
  return buf.length > 0 && buf.length <= ФОТО_ЛИМИТ ? new Blob([buf], { type: "image/jpeg" }) : null;
}

async function вызов(бот, метод, init) {
  const r = await fetch(`https://api.telegram.org/bot${бот}/${метод}`, { method: "POST", ...init });
  return r.json();
}

async function отправитьСообщение(бот, chatId, текст, фото) {
  if (!фото) {
    const j = await вызов(бот, "sendMessage", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: текст }),
    });
    return j.ok;
  }
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("photo", фото, "photo.jpg");
  const подпись = текст && текст.length <= ПОДПИСЬ_ЛИМИТ;
  if (подпись) form.append("caption", текст);
  const j = await вызов(бот, "sendPhoto", { body: form });
  if (!j.ok) return false;
  if (!текст || подпись) return true;
  const k = await вызов(бот, "sendMessage", {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: текст }),
  });
  return k.ok;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const бот = токен();
  if (!бот || !адресБазы() || !ключБазы()) {
    return res.status(500).json({ ok: false, error: "Не заданы BOT_TOKEN, SUPABASE_URL или SUPABASE_ANON_KEY" });
  }

  const { initData, text, ids, photo } = req.body || {};
  const юзер = проверитьInitData(String(initData || ""), бот);
  if (!юзер || !(await этоАдмин(юзер.id))) {
    return res.status(403).json({ ok: false, error: "Нет доступа" });
  }

  const текст = String(text || "").trim().slice(0, 4000);
  const список = (Array.isArray(ids) ? ids : []).slice(0, 25).map(Number).filter(Boolean);
  const фото = photo ? разобратьФото(photo) : null;
  if (photo && !фото) return res.status(400).json({ ok: false, error: "Фото должно быть JPEG не больше 4 МБ" });
  if ((!текст && !фото) || список.length === 0) {
    return res.status(400).json({ ok: false, error: "Пустой текст или список получателей" });
  }

  let sent = 0;
  let failed = 0;
  await Promise.all(
    список.map(async (chatId) => {
      try {
        if (await отправитьСообщение(бот, chatId, текст, фото)) sent++;
        else failed++;
      } catch {
        failed++;
      }
    })
  );
  return res.status(200).json({ ok: true, sent, failed });
}
