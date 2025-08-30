<script lang="ts">
  import { QueryClient, QueryClientProvider } from "@tanstack/svelte-query";
  import { SvelteQueryDevtools } from "@tanstack/svelte-query-devtools";
  import { dev } from "$app/environment";
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  });
</script>

<QueryClientProvider client={queryClient}>
  {@render children()}
  {#if dev}
    <SvelteQueryDevtools />
  {/if}
</QueryClientProvider>