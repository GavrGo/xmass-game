// Пузырь с репликой над эмодзи.
export default function SpeechBubble({ text }: { text: string }) {
  return (
    <div className="relative mx-auto max-w-[280px] rounded-2xl bg-white px-4 py-3 text-center text-sm font-medium text-black shadow-lg">
      {text}
      {/* хвостик пузыря */}
      <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white" />
    </div>
  );
}
