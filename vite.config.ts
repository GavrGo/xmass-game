import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { allowedHosts: true }, // чтобы работал туннель (ngrok / cloudflared) для Telegram
});
