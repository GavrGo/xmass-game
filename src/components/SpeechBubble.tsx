// Пузырь с репликой над эмодзи.
export default function SpeechBubble({ text, хвост = "низ", хвостСмещение = 0 }: { text: string; хвост?: "низ" | "верх"; хвостСмещение?: number }) {
  return (
    <div className="relative mx-auto max-w-[280px] rounded-2xl bg-white px-4 py-3 text-center text-sm font-medium text-black shadow-lg">
      {text}
      {/* хвостик пузыря */}
      <div className={`absolute left-1/2 h-4 w-4 rotate-45 bg-white ${хвост === "верх" ? "-top-2" : "-bottom-2"}`} style={{ transform: `translateX(calc(-50% + ${хвостСмещение}px)) rotate(45deg)` }} />
    </div>
  );
}
