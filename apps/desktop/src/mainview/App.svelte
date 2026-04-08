<script lang="ts">
  import { rpc } from "$lib/electrobun";
  import { appState } from "$lib/app-state.svelte";
  import Setup from "./pages/Setup.svelte";
  import Login from "./pages/Login.svelte";

  $effect(() => {
    rpc.getConfig({}).then((config) => {
      appState.phase = config.setupComplete ? "login" : "setup";
    }).catch(() => {
      appState.phase = "setup";
    });
  });
</script>

{#if appState.phase === "loading"}
  <div class="flex min-h-screen items-center justify-center">
    <p class="text-muted-foreground">Loading...</p>
  </div>
{:else if appState.phase === "setup"}
  <Setup />
{:else if appState.phase === "login"}
  <Login />
{/if}
