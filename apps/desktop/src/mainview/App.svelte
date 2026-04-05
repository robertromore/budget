<script lang="ts">
  import { QueryClientProvider } from "@tanstack/svelte-query";
  import { queryClient } from "$core/query/_client";
  import Setup from "./pages/Setup.svelte";
  import Login from "./pages/Login.svelte";
  import Home from "./pages/Home.svelte";

  const SERVER = window.location.origin;

  type Page = "loading" | "setup" | "login" | "home";
  let currentPage = $state<Page>("loading");

  // Check config on mount to decide initial page
  $effect(() => {
    fetch(`${SERVER}/api/config`)
      .then((r) => r.json())
      .then((config: any) => {
        currentPage = config.setupComplete ? "login" : "setup";
      })
      .catch(() => {
        currentPage = "setup";
      });
  });
</script>

<QueryClientProvider client={queryClient}>
  {#if currentPage === "loading"}
    <div class="center">
      <p>Loading...</p>
    </div>
  {:else if currentPage === "setup"}
    <Setup onComplete={() => currentPage = "login"} />
  {:else if currentPage === "login"}
    <Login onLogin={() => currentPage = "home"} />
  {:else if currentPage === "home"}
    <Home />
  {/if}
</QueryClientProvider>

<style>
  :global(body) {
    font-family: system-ui, -apple-system, sans-serif;
  }

  .center {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    color: #888;
  }
</style>
