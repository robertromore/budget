import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption } from "vite";

export default defineConfig({
  // Cast to PluginOption[] to handle type mismatch from monorepo vite resolution
  plugins: [tailwindcss(), sveltekit()] as PluginOption[],
  server: {
    watch: {
      // Ignore database files to prevent constant rebuilds from DB operations
      ignored: [
        "**/drizzle/db/**",
        "**/*.db",
        "**/*.db-journal",
        "**/*.db-wal",
        "**/*.db-shm",
        "**/*.sqlite",
        "**/*.sqlite-journal",
        "**/*.sqlite-wal",
        "**/*.sqlite-shm",
        "**/data/**/*.db",
        // Ignore test files to prevent dev server refreshes when editing tests
        "**/tests/**",
        "**/test-results/**",
      ],
    },
  },
  build: {
    chunkSizeWarningLimit: 1000, // Increase warning threshold to 1MB
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor libraries
          if (id.includes("node_modules")) {
            if (id.includes("@tanstack") || id.includes("lucide")) {
              return "vendor-ui";
            }
            if (id.includes("@trpc") || id.includes("zod")) {
              return "vendor-trpc";
            }
            if (id.includes("@internationalized/date") || id.includes("date-fns")) {
              return "vendor-date";
            }
            if (id.includes("sveltekit-superforms")) {
              return "vendor-forms";
            }
            return "vendor-misc";
          }

          // Application code splitting
          if (
            id.includes("/routes/accounts/[id]/") &&
            (id.includes("data-table") || id.includes("columns"))
          ) {
            return "data-table";
          }

          if (id.includes("/states/") || id.includes("/models/")) {
            return "app-state";
          }

          if (id.includes("/components/ui/")) {
            return "ui-components";
          }
        },
      },
    },
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      "@tanstack/table-core",
      "@tanstack/svelte-table",
      "@tanstack/svelte-query",
      "@trpc/client",
      "zod",
      "@lucide/svelte",
      "lodash-es",
      "lodash-es/get",
      "layercake",
      "svelte-sonner",
    ],
  },
  ssr: {
    // Pre-bundle some dependencies for SSR
    noExternal: ["@internationalized/date"],
  },
});
