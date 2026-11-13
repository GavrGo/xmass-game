import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Если .env не заполнен — показываем понятное сообщение вместо белого экрана
if (!url || !key) {
  document.body.innerHTML =
    '<div style="padding:24px;color:#fff;font-family:sans-serif">' +
    "Не заданы VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY в файле .env.<br>" +
    "Заполните .env и перезапустите npm run dev.</div>";
  throw new Error("Нет ключей Supabase в .env");
}

export const supabase = createClient(url, key);
