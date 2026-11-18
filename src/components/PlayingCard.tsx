import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Карта } from "../game/blackjack";

const ТЕКСТ = "\uFE0E"; // принудительно «текстовые» значки мастей, а не эмодзи
const КРАСНЫЙ = "#CF3A4D";
const ТЁМНЫЙ = "#2A2D3A";

/** Рубашка: тёмная, с едва заметным ромбовидным узором и розеткой по центру. */
export function CardBack({ w }: { w: number }) {
  const h = Math.round(w * 1.42);
  return (
    <svg width={w} height={h} viewBox="0 0 70 99" style={{ display: "block", borderRadius: w * 0.12, boxShadow: "0 6px 14px rgba(0,0,0,.45)" }}>
      <defs>
        <linearGradient id="bj-back-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#35363D" />
          <stop offset="1" stopColor="#222328" />
        </linearGradient>
        <pattern id="bj-back-pat" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx="4.5" cy="4.5" r="1" fill="#44454E" />
          <path d="M0 0H9M0 0V9" stroke="#2D2E35" strokeWidth=".6" />
        </pattern>
      </defs>
      <rect width="70" height="99" rx="8" fill="url(#bj-back-bg)" />
      <rect width="70" height="99" rx="8" fill="url(#bj-back-pat)" opacity=".9" />
      <rect x="4.5" y="4.5" width="61" height="90" rx="5" fill="none" stroke="#4A4B55" strokeWidth=".8" />
      <g transform="translate(35 49.5)" fill="none" stroke="#5A5B66" strokeWidth=".8">
        <circle r="15" fill="#26272D" />
        <circle r="11" />
        <path d="M0-11L11 0 0 11-11 0Z" />
        <circle r="3" fill="#5A5B66" stroke="none" />
      </g>
    </svg>
  );
}

function Лицо({ карта, w }: { карта: Карта; w: number }) {
  const цвет = карта.масть === "♥" || карта.масть === "♦" ? КРАСНЫЙ : ТЁМНЫЙ;
  const значок = карта.масть + ТЕКСТ;
  return (
    <div style={{
      position: "absolute", inset: 0, borderRadius: w * 0.12, overflow: "hidden", color: цвет,
      background: "linear-gradient(160deg,#FBFBFD 0%,#E6E8EF 55%,#D2D5DF 100%)",
      boxShadow: "0 6px 14px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.65)",
      backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
    }}>
      <div style={{ position: "absolute", left: w * 0.1, top: w * 0.06, fontWeight: 800, lineHeight: 1, fontSize: w * (карта.ранг === "10" ? 0.33 : 0.4) }}>{карта.ранг}</div>
      <div style={{ position: "absolute", left: w * 0.11, top: w * 0.5, lineHeight: 1, fontSize: w * 0.28 }}>{значок}</div>
      <div style={{ position: "absolute", right: -w * 0.05, bottom: -w * 0.08, lineHeight: 1, fontSize: w * 0.74, opacity: 0.13 }}>{значок}</div>
    </div>
  );
}

/** Карта с анимацией вылета из колоды (#bj-deck) и переворотом при открытии. */
export default function PlayingCard({ карта, закрыта, w }: { карта: Карта; закрыта: boolean; w: number }) {
  const h = Math.round(w * 1.42);
  const ref = useRef<HTMLDivElement>(null);
  const [старт, setСтарт] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    const колода = document.getElementById("bj-deck")?.getBoundingClientRect();
    const я = ref.current?.getBoundingClientRect();
    setСтарт(колода && я ? {
      ["--fx" as any]: `${колода.left + колода.width / 2 - (я.left + я.width / 2)}px`,
      ["--fy" as any]: `${колода.top + колода.height / 2 - (я.top + я.height / 2)}px`,
    } : {});
  }, []);

  return (
    <div ref={ref} className={старт ? "bj-deal" : ""} style={{ width: w, height: h, perspective: 700, opacity: старт ? undefined : 0, ...старт }}>
      <div style={{ position: "relative", width: "100%", height: "100%", transformStyle: "preserve-3d", transition: "transform .45s ease", transform: закрыта ? "rotateY(180deg)" : "none" }}>
        <Лицо карта={карта} w={w} />
        <div style={{ position: "absolute", inset: 0, transform: "rotateY(180deg)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
          <CardBack w={w} />
        </div>
      </div>
    </div>
  );
}
