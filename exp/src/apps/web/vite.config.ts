import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "VITE_");
  return {
    plugins: [react()],
    base: "./",
    define: {
      "process.env": JSON.stringify({
        VITE_SUPABASE_URL: environment.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: environment.VITE_SUPABASE_ANON_KEY,
      }),
      "process.env.VITE_SUPABASE_URL": JSON.stringify(
        environment.VITE_SUPABASE_URL,
      ),
      "process.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
        environment.VITE_SUPABASE_ANON_KEY,
      ),
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
