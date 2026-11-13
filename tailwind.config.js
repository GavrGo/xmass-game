/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Рождественская палитра. Менять можно свободно.
        xmas: { red: "#c8102e", green: "#165b33", gold: "#f4c430", dark: "#0f1a14" },
      },
    },
  },
  plugins: [],
};
