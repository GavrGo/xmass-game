export default function LevelBanner({ текст }: { текст: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <span className="level-banner whitespace-nowrap rounded-2xl bg-black/60 px-6 py-3 text-3xl font-extrabold text-brand-yellow ring-1 ring-brand-yellow/60 drop-shadow-lg">
        {текст}
      </span>
    </div>
  );
}
