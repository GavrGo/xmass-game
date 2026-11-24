// Серверная функция Vercel: отправляет сообщение от бота игроку. Токен бота берётся из переменной BOT_TOKEN.
const ШАБЛОНЫ = {
  challenge: (n) => `🥊🥊🥊 Эй, ${n} вызывает вас на дуэль! Зайдите на страницу лидерборда, чтобы ответить! Вызов будет ждать вас 24 часа. 🥊🥊🥊`,
  declined: (n) => `🙅 ${n} отказался от дуэли! Ваша ставка уже вернулась вам на счет. 🙅`,
  missed: (n) => `⌛ ${n} ждал вас на дуэли до последнего, но вы не пришли... ⌛`,
  won: (n, s) => `🎉🎉🎉 ${n} принял вашу дуэль, и вы победили! Вам достаётся ${s} хэпэшек. 🎉🎉🎉`,
  lost: (n, s) => `😭😭😭 ${n} принял вашу дуэль и победил. Ваша ставка ушла ему (всего ${s} хэпэшек) 😭😭😭.`,
  record: (n, _s, игра, кто) => `🏆 ${n}, твой рекорд в «${игра}» побил пользователь ${кто}!`,
  draw: (n) => `🤝 ${n} принял вашу дуэль — ничья! Ставки вернулись игрокам.🤝`,
};

const токен = () => (process.env.BOT_TOKEN || process.env.VITE_BOT_TOKEN || "").trim().replace(/^["']|["']$/g, "");

async function телеграм(метод, тело) {
  const r = await fetch(`https://api.telegram.org/bot${токен()}/${метод}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(тело || {}),
  });
  return r.json();
}

export default async function handler(req, res) {
  // Диагностика: открыть /api/notify в браузере
  if (req.method === "GET") {
    if (!токен()) return res.status(200).json({ token: false, hint: "BOT_TOKEN не найден: добавьте в Vercel и сделайте Redeploy" });
    try {
      const j = await телеграм("getMe");
      return res.status(200).json({ token: true, botOk: !!j.ok, bot: j.result?.username, error: j.description, appUrl: process.env.APP_URL || null });
    } catch (e) {
      return res.status(200).json({ token: true, botOk: false, error: String(e) });
    }
  }
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!токен()) {
    console.error("notify: BOT_TOKEN не задан");
    return res.status(500).json({ ok: false, error: "BOT_TOKEN не задан" });
  }

  const { kind, to, name, amount, game, by } = req.body || {};
  const шаблон = ШАБЛОНЫ[kind];
  if (!шаблон || !Number.isFinite(Number(to))) return res.status(400).json({ ok: false, error: "bad request" });

  const text = шаблон(String(name ?? "").slice(0, 40), Math.floor(Number(amount) || 0), String(game ?? "").slice(0, 60), String(by ?? "").slice(0, 40));
  const payload = { chat_id: Number(to), text };
  try {
    const j = await телеграм("sendMessage", payload);
    if (!j.ok) console.error("notify: Telegram отказал:", j.error_code, j.description, "chat_id", payload.chat_id);
    return res.status(200).json({ ok: !!j.ok, error: j.description });
  } catch (e) {
    console.error("notify: сеть:", String(e));
    return res.status(502).json({ ok: false, error: String(e) });
  }
}
