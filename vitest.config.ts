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
    setupFiles: ["tests/integration/setup/vitest-setup.ts"],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      $lib: path.resolve("./src/lib"),
    },
  },
});