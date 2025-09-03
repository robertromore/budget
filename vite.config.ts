import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  build: {
    chunkSizeWarningLimit: 1000, // Increase warning threshold to 1MB
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor libraries
          if (id.includes('node_modules')) {
            if (id.includes('@tanstack') || id.includes('lucide')) {
              return 'vendor-ui';
            }
            if (id.includes('@trpc') || id.includes('zod')) {
              return 'vendor-trpc';
            }
            if (id.includes('@internationalized/date') || id.includes('date-fns')) {
              return 'vendor-date';
            }
            if (id.includes('sveltekit-superforms')) {
              return 'vendor-forms';
            }
            return 'vendor-misc';
          }
          
          // Application code splitting
          if (id.includes('/routes/accounts/[id]/') && 
              (id.includes('data-table') || id.includes('columns'))) {
            return 'data-table';
          }
          
          if (id.includes('/states/') || id.includes('/models/')) {
            return 'app-state';
          }
          
          if (id.includes('/components/ui/')) {
            return 'ui-components';
          }
        }
      }
    }
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      '@tanstack/table-core',
      '@tanstack/svelte-table',
      '@tanstack/svelte-query',
      '@trpc/client',
      'zod',
      '@lucide/svelte'
    ]
  },
  ssr: {
    // Pre-bundle some dependencies for SSR
    noExternal: ['@internationalized/date']
  }
});
