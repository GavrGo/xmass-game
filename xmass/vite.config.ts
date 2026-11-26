import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

// Автоматически находит картинки в public/puzzles/ и отдаёт их список игре.
// В режиме разработки список обновляется сам, при сборке (Vercel) попадает в puzzles/manifest.json.
function списокКартинок(): Plugin {
  const папка = path.resolve(process.cwd(), "public/puzzles");
  const читать = () =>
    fs.existsSync(папка)
      ? fs.readdirSync(папка).filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f)).sort()
      : [];
  return {
    name: "puzzles-manifest",
    configureServer(server) {
      server.middlewares.use("/puzzles/manifest.json", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(читать()));
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "puzzles/manifest.json", source: JSON.stringify(читать()) });
    },
  };
}

// Список всех файлов из public/assets/ и public/sounds/ (картинки интерфейса и звуки).
// Игра по этому списку знает, какие файлы вы уже положили, и подхватывает их автоматически.
function списокАссетов(): Plugin {
  const корень = path.resolve(process.cwd(), "public");
  const папки = ["assets", "sounds"];
  const обойти = (dir: string, база: string): string[] =>
    fs.existsSync(dir)
      ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory()
            ? обойти(path.join(dir, e.name), база + e.name + "/")
            : /^(readme|\.gitkeep)/i.test(e.name)
            ? []
            : [база + e.name]
        )
      : [];
  const читать = () => папки.flatMap((п) => обойти(path.join(корень, п), п + "/"));
  return {
    name: "assets-manifest",
    configureServer(server) {
      server.middlewares.use("/assets-manifest.json", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(читать()));
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "assets-manifest.json", source: JSON.stringify(читать()) });
    },
  };
}

export default defineConfig({
  plugins: [react(), списокКартинок(), списокАссетов()],
  server: { allowedHosts: true }, // чтобы работал туннель (ngrok / cloudflared) для Telegram
});
