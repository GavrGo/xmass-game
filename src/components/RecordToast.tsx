import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useUser } from "../store/UserContext";
import {
  получитьНепрочитанныеРекорды,
  отметитьРекордыПросмотренными,
  НАЗВАНИЕ_ИГРЫ,
  type ЗаписьРекорда,
} from "../api/records";

export default function RecordToast() {
  const { pathname } = useLocation();
  const { telegramId } = useUser();
  const [записи, setЗаписи] = useState<ЗаписьРекорда[]>([]);

  useEffect(() => {
    if (!telegramId || !pathname.startsWith("/games/")) return;
    let жив = true;
    получитьНепрочитанныеРекорды(telegramId)
      .then(async (список) => {
        if (!жив || список.length === 0) return;
        setЗаписи(список);
        await отметитьРекордыПросмотренными(список.map((з) => з.id));
      })
      .catch((e) => console.warn("record toast:", e));
    return () => { жив = false; };
  }, [telegramId, pathname]);

  useEffect(() => {
    if (!записи.length) return;
    const таймер = setTimeout(() => setЗаписи([]), 6000);
    return () => clearTimeout(таймер);
  }, [записи]);

  if (!записи.length) return null;
  return (
    <div
      onClick={() => setЗаписи([])}
      className="fixed left-3 right-3 top-3 z-50 cursor-pointer rounded-xl border border-yellow-400/60 bg-[#1B1515] p-3 text-sm text-white shadow-lg"
    >
      {записи.map((з) => (
        <div key={з.id}>
          🏆 {з.old_nick}, твой рекорд в «{НАЗВАНИЕ_ИГРЫ[з.column_key]}» побил пользователь {з.new_nick}!
        </div>
      ))}
    </div>
  );
}
