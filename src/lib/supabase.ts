import { createClient } from "@supabase/supabase-js";
import { Т } from "../texts";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Если .env не заполнен — показываем понятное сообщение вместо белого экрана
if (!url || !key) {
  document.body.innerHTML =
    '<div style="padding:24px;color:#fff;font-family:sans-serif">' + Т.приложение.нетКлючейSupabase + "</div>";
  throw new Error(Т.приложение.нетКлючейОшибка);
}

export const supabase = createClient(url, key);
