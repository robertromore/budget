<script lang="ts">
  import { QueryClientProvider } from "@tanstack/svelte-query";
  import { queryClient } from "$core/query/_client";
  import { getCurrentRoute, navigate, setInitialRoute, type Route } from "$lib/router.svelte";
  import Setup from "./pages/Setup.svelte";
  import Login from "./pages/Login.svelte";
  import Accounts from "./pages/Accounts.svelte";

  const SERVER = window.location.origin;

  type AppPhase = "loading" | "setup" | "login" | "app";
  let phase = $state<AppPhase>("loading");

  // Check config on mount to decide initial phase
  $effect(() => {
    fetch(`${SERVER}/api/config`)
      .then((r) => r.json())
      .then((config: any) => {
        phase = config.setupComplete ? "login" : "setup";
      })
      .catch(() => {
        phase = "setup";
      });
  });

  function onLoginComplete() {
    setInitialRoute({ page: "accounts" });
    phase = "app";
  }

  const route = $derived(getCurrentRoute());
</script>

<QueryClientProvider client={queryClient}>
  {#if phase === "loading"}
    <div class="flex min-h-screen items-center justify-center">
      <p class="text-muted-foreground">Loading...</p>
    </div>
  {:else if phase === "setup"}
    <Setup onComplete={() => phase = "login"} />
  {:else if phase === "login"}
    <Login onLogin={onLoginComplete} />
  {:else if phase === "app"}
    <!-- App navigation bar -->
    <nav class="border-b bg-card px-6 py-3">
      <div class="mx-auto flex max-w-5xl items-center gap-4">
        <span class="text-lg font-bold">Budget</span>
        <button
          class="text-sm hover:text-primary"
          class:text-primary={route.page === "accounts"}
          class:font-medium={route.page === "accounts"}
          onclick={() => navigate({ page: "accounts" })}>
          Accounts
        </button>
      </div>
    </nav>

    <!-- Page content -->
    {#if route.page === "accounts"}
      <Accounts />
    {:else}
      <div class="flex min-h-[60vh] items-center justify-center">
        <p class="text-muted-foreground">Page not found</p>
      </div>
    {/if}
  {/if}
</QueryClientProvider>
