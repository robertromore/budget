import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  logLevel: 'info', // Enable verbose logging
  server: {
    fs: {
      // Prevent watching node_modules for changes
      strict: true,
    },
    watch: {
      // Reduce file watcher overhead
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/.svelte-kit/**',
        '**/build/**',
        '**/*.log',
        '**/.DS_Store',
        '**/drizzle/**', // Ignore database files
        '**/*.db',
        '**/*.db-*'
      ],
      // Reduce polling interval
      usePolling: false,
      // Increase debounce
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100
      }
    },
    hmr: {
      // Prevent HMR from getting stuck
      timeout: 5000
    }
  },
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
      '@lucide/svelte',
      'lodash-es',
      'lodash-es/get',
      'layerchart',
      'svelte-sonner'
    ]
  },
  ssr: {
    // Pre-bundle some dependencies for SSR
    noExternal: ['@internationalized/date']
  }
});
