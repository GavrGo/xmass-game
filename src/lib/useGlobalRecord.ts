import { useEffect, useState } from "react";
import { getGlobalRecord, type КолонкаРекорда, type Рекорд } from "../api/users";

export function useGlobalRecord(колонка: КолонкаРекорда) {
  const [рекорд, setРекорд] = useState<Рекорд | null | undefined>(undefined);
  useEffect(() => {
    let жив = true;
    getGlobalRecord(колонка)
      .then((r) => { if (жив) setРекорд(r); })
      .catch(() => { if (жив) setРекорд(null); });
    return () => { жив = false; };
  }, [колонка]);
  return рекорд;
}
