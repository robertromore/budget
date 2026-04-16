import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()] as PluginOption[],
  server: {
    port: 5174,
    watch: {
      ignored: [
        "**/drizzle/db/**",
        "**/*.db",
        "**/*.db-journal",
        "**/*.db-wal",
        "**/*.db-shm",
        "**/*.sqlite",
        "**/*.sqlite-journal",
      ],
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
  optimizeDeps: {
    include: [
      "@tanstack/svelte-query",
      "@trpc/client",
      "zod",
      "@lucide/svelte",
      "svelte-sonner",
    ],
  },
  ssr: {
    noExternal: ["@internationalized/date"],
  },
});
