// Серверная функция Vercel: отправляет сообщение от бота игроку. Токен бота берётся из переменной BOT_TOKEN.
const ШАБЛОНЫ = {
  challenge: (n) => `Эй, ${n} вызывает вас на дуэль! Зайдите на страницу лидерборда, чтобы ответить! Вызов будет ждать вас 24 часа.`,
  declined: (n) => `${n} отказался от дуэли! Ваша ставка уже вернулась вам на счет.`,
  missed: (n) => `${n} ждал вас на дуэли до последнего, но вы не пришли...`,
  won: (n, s) => `${n} принял вашу дуэль, и вы победили! Вам достаётся ${s} хэпэшек.`,
  lost: (n, s) => `${n} принял вашу дуэль и победил. Ваша ставка ушла ему (всего ${s} хэпэшек).`,
  draw: (n) => `${n} принял вашу дуэль — ничья! Ставки вернулись игрокам.`,
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const token = process.env.BOT_TOKEN || process.env.VITE_BOT_TOKEN;
  if (!token) return res.status(500).json({ ok: false, error: "BOT_TOKEN не задан" });

  const { kind, to, name, amount } = req.body || {};
  const шаблон = ШАБЛОНЫ[kind];
  if (!шаблон || !Number.isFinite(Number(to))) return res.status(400).json({ ok: false });

  const text = шаблон(String(name ?? "").slice(0, 40), Math.floor(Number(amount) || 0));
  const payload = { chat_id: Number(to), text };
  if (process.env.APP_URL) {
    payload.reply_markup = { inline_keyboard: [[{ text: "Открыть игру", web_app: { url: process.env.APP_URL } }]] };
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    return res.status(200).json({ ok: !!j.ok, error: j.description });
  } catch (e) {
    return res.status(502).json({ ok: false });
  }
}
