<script lang="ts">
  import { QueryClient, QueryClientProvider } from "@tanstack/svelte-query";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
    import { SvelteQueryDevtools } from "@tanstack/svelte-query-devtools";

  // Create a query client
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });

  // In browser, setup devtools
  onMount(async () => {
    if (browser && import.meta.env.DEV) {
      const { SvelteQueryDevtools } = await import("@tanstack/svelte-query-devtools");
      // You can mount devtools here if needed
    }
  });
</script>

<QueryClientProvider client={queryClient}>
  <slot />

  {#if browser && import.meta.env.DEV}
    <!-- Devtools will be mounted here in development -->
     <SvelteQueryDevtools />
  {/if}
</QueryClientProvider>
