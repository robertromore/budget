import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: true
  },
  optimizeDeps: {
    exclude: ['layerchart']
  },
  ssr: {
    noExternal: ['layerchart']
  }
});
