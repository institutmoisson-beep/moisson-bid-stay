import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  // Cette ligne permet de charger les fichiers CSS/JS correctement sur un sous-domaine Hostinger
  base: "./",
  
  plugins: [react()],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Configuration pour Vitest (si vous utilisez des tests)
  // @ts-ignore
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/*/.{test,spec}.{ts,tsx}"],
  },
});
