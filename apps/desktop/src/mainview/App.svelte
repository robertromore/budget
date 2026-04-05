<script lang="ts">
  import { QueryClientProvider } from "@tanstack/svelte-query";
  import { queryClient } from "$lib/query-client";
  import { appState } from "$lib/app-state.svelte";
  import { routerState } from "$lib/router.svelte";
  import Setup from "./pages/Setup.svelte";
  import Login from "./pages/Login.svelte";
  import Accounts from "./pages/Accounts.svelte";

  $effect(() => {
    fetch(`${window.location.origin}/api/config`)
      .then((r) => r.json())
      .then((config: any) => {
        appState.phase = config.setupComplete ? "login" : "setup";
      })
      .catch(() => {
        appState.phase = "setup";
      });
  });
</script>

<QueryClientProvider client={queryClient}>
  {#if appState.phase === "loading"}
    <div class="flex min-h-screen items-center justify-center">
      <p class="text-muted-foreground">Loading...</p>
    </div>
  {:else if appState.phase === "setup"}
    <Setup />
  {:else if appState.phase === "login"}
    <Login />
  {:else if appState.phase === "app"}
    <nav class="border-b bg-card px-6 py-3">
      <div class="mx-auto flex max-w-5xl items-center gap-4">
        <span class="text-lg font-bold">Budget</span>
        <button
          class="text-sm hover:text-primary"
          class:text-primary={routerState.current.page === "accounts"}
          class:font-medium={routerState.current.page === "accounts"}
          onclick={() => routerState.current = { page: "accounts" }}>
          Accounts
        </button>
      </div>
    </nav>

    {#if routerState.current.page === "accounts"}
      <Accounts />
    {:else}
      <div class="flex min-h-[60vh] items-center justify-center">
        <p class="text-muted-foreground">Page not found</p>
      </div>
    {/if}
  {/if}
</QueryClientProvider>
