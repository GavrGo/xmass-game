/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ---- Дизайн-палитра (по макетам). Меняйте цвета здесь ----
        app: "#0F0F11",       // основной тёмный фон
        surface: "#1E1F24",   // карточки, строки
        surface2: "#2A2B32",  // вложенные элементы
        muted: "#8E8E93",     // второстепенный текст
        brand: { red: "#D81B36", blue: "#0A84FF", yellow: "#FFD000" },
        // старые имена оставлены, чтобы ничего не сломалось: они теперь указывают на новую палитру
        xmas: { red: "#D81B36", green: "#0A84FF", gold: "#FFD000", dark: "#0F0F11" },
      },
    },
  },
  plugins: [],
};
