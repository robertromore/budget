import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
	plugins: [svelte(), tailwindcss()],
	root: "src/mainview",
	resolve: {
		alias: {
			$core: resolve(__dirname, "../../packages/core/src"),
			$lib: resolve(__dirname, "src/mainview/lib"),
		},
	},
	build: {
		outDir: "../../dist",
		emptyOutDir: true,
	},
	server: {
		port: 5174,
		strictPort: true,
	},
});
