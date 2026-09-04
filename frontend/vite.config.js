import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    host: true,
    proxy: {
      "/api": {
        target: "https://capstone-git-testing-kylelopez706s-projects.vercel.app",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
