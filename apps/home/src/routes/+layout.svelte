<script lang="ts">
  import "../app.css";
  import "$lib/trpc/client";
  import { QueryClientProvider } from "@tanstack/svelte-query";
  import { queryClient } from "$core/query/_client";
  import { Toaster } from "svelte-sonner";
  import { ModeWatcher } from "mode-watcher";
  import AppRail from "$lib/components/layout/app-rail.svelte";

  let { children, data } = $props();
</script>

<ModeWatcher />
<Toaster richColors position="bottom-right" />

<QueryClientProvider client={queryClient}>
  <AppRail />
  <div class="md:pl-12">
    {@render children?.()}
  </div>
</QueryClientProvider>
