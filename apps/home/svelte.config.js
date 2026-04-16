import adapter from "svelte-adapter-bun";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [vitePreprocess({})],

  kit: {
    adapter: adapter(),
    alias: {
      $core: "../../packages/core/src",
      "$core/*": "../../packages/core/src/*",
      $ui: "../../packages/ui/src",
      "$ui/*": "../../packages/ui/src/*",
    },
  },
};

export default config;
