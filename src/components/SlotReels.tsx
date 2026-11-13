// Три барабана. Только картинка — логика в Home.tsx.
export default function SlotReels({ символы, крутятся }: { символы: string[]; крутятся: boolean[] }) {
  return (
    <div className="flex justify-center gap-3 rounded-3xl border-2 border-xmas-gold bg-black/40 p-4">
      {символы.map((с, i) => (
        <div
          key={i}
          className={`flex h-24 w-24 items-center justify-center rounded-2xl bg-white/90 text-6xl transition ${
            крутятся[i] ? "scale-95 animate-pulse blur-[1px]" : ""
          }`}
        >
          {с}
        </div>
      ))}
    </div>
  );
}
