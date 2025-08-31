import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  build: {
    chunkSizeWarningLimit: 1000, // Increase warning threshold to 1MB
  },
});
