import { defineConfig } from "vitest/config";
import { sveltekit } from "@sveltejs/kit/vite";
import path from "path";

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    globals: true,
    environment: "node",
    include: [
      "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
      "tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
    ],
    exclude: ["**/node_modules/**", "**/build/**", "**/.svelte-kit/**", "**/coverage/**"],
    setupFiles: ["tests/integration/setup/vitest-setup.ts"],
    testTimeout: 10000,
    hookTimeout: 10000,

    // Coverage configuration
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "coverage",
      exclude: [
        "node_modules/**",
        "build/**",
        ".svelte-kit/**",
        "coverage/**",
        "tests/**",
        "scripts/**",
        "*.config.*",
        "src/**/*.d.ts",
        "src/app.html",
        "src/service-worker.ts",
        "src/lib/server/db/migrate.ts",
        "src/lib/server/db/seeders/**",
        "src/lib/server/db/factories/**",
        "src/lib/server/db/delete-all.ts",
      ],
      include: ["src/**/*.{js,ts,svelte}"],
      thresholds: {
        global: {
          branches: 70,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // Test organization and reporting
    reporter: ["verbose", "json", "html"],
    outputFile: {
      json: "test-results/results.json",
      html: "test-results/index.html",
    },
  },
  resolve: {
    alias: {
      $lib: path.resolve("./src/lib"),
    },
  },
});
