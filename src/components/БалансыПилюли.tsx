import { useUser } from "../store/UserContext";
import { Иконка } from "./Иконка";
import { коротко } from "../lib/format";

// Три «таблетки» с балансами (фишки, билеты, хэпэшки). Обновляются в реальном времени.
export default function БалансыПилюли() {
  const { user } = useUser();
  if (!user) return null;
  const пилюли = [
    { имя: "фишки" as const, значение: user.chips },
    { имя: "билеты" as const, значение: user.tickets },
    { имя: "хэпэшки" as const, значение: user.hearts },
  ];
  return (
    <div className="mx-4 mb-3 flex gap-2">
      {пилюли.map((п) => (
        <div key={п.имя} className="pill flex flex-1 items-center justify-center gap-2 py-2 text-sm font-bold">
          <Иконка имя={п.имя} размер={20} />
          {коротко(п.значение)}
        </div>
      ))}
    </div>
  );
}
