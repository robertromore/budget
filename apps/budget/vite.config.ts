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
            if (id.includes("/node_modules/svelte/")) {
              return "vendor-svelte";
            }

            if (id.includes("@tanstack")) {
              return "vendor-tanstack";
            }

            if (id.includes("@lucide/svelte/icons/")) {
              const iconName = id.split("/icons/")[1]?.split(".")[0] ?? "";
              const first = iconName.charAt(0).toLowerCase();

              if (first >= "a" && first <= "f") {
                return "vendor-lucide-a-f";
              }
              if (first >= "g" && first <= "m") {
                return "vendor-lucide-g-m";
              }
              if (first >= "n" && first <= "s") {
                return "vendor-lucide-n-s";
              }
              return "vendor-lucide-t-z";
            }

            if (id.includes("@lucide/svelte")) {
              return "vendor-lucide-core";
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

            if (id.includes("@xyflow")) {
              return "vendor-flow";
            }

            if (id.includes("layercake") || id.includes("/node_modules/d3-")) {
              return "vendor-charts";
            }

            if (
              id.includes("shiki") ||
              id.includes("@shikijs") ||
              id.includes("marked") ||
              id.includes("svelte-streamdown")
            ) {
              return "vendor-markdown";
            }

            if (
              id.includes("/node_modules/ai/") ||
              id.includes("@ai-sdk") ||
              id.includes("ai-sdk-ollama")
            ) {
              return "vendor-ai";
            }

            if (
              id.includes("bits-ui") ||
              id.includes("vaul-svelte") ||
              id.includes("svelte-toolbelt")
            ) {
              return "vendor-ui";
            }

            if (id.includes("/node_modules/@sveltejs/kit/")) {
              return "vendor-sveltekit";
            }

            if (
              id.includes("@dnd-kit") ||
              id.includes("@dnd-kit-svelte") ||
              id.includes("svelte-dnd-action")
            ) {
              return "vendor-dnd";
            }

            if (id.includes("svelte-sonner")) {
              return "vendor-sonner";
            }

            if (id.includes("mode-watcher")) {
              return "vendor-mode";
            }

            if (id.includes("nuqs-svelte")) {
              return "vendor-nuqs";
            }

            if (id.includes("formsnap")) {
              return "vendor-formsnap";
            }

            if (id.includes("core-js")) {
              return "vendor-polyfills";
            }

            if (id.includes("html2pdf.js") || id.includes("jspdf") || id.includes("html2canvas")) {
              return "vendor-pdf";
            }

            if (id.includes("xlsx")) {
              return "vendor-spreadsheet";
            }

            if (id.includes("papaparse")) {
              return "vendor-csv";
            }

            return "vendor-misc";
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
