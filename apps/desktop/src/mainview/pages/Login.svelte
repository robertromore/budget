<script lang="ts">
  import { rpc } from "$lib/electrobun";
  import { appState } from "$lib/app-state.svelte";
  import { routerState } from "$lib/router.svelte";

  let status = $state("");
  let config = $state<any>(null);

  $effect(() => {
    rpc.getConfig({}).then((c) => {
      config = c;
      if (c.authMode === "local") {
        autoLogin();
      }
    }).catch((err) => {
      status = `Config error: ${err}`;
    });
  });

  async function autoLogin() {
    status = "Signing in...";
    try {
      const result = await rpc.autoLogin({});
      if (result.success) {
        status = "Success! Loading app...";
        routerState.current = { page: "accounts" };
        appState.phase = "app";
      } else {
        status = "Auto-login failed.";
        config = { ...config, authMode: "password" };
      }
    } catch (err) {
      status = `Error: ${err}`;
    }
  }
</script>

<div class="mx-auto mt-20 max-w-sm px-6 text-center">
  {#if !config}
    <p class="text-muted-foreground">Loading...</p>
  {:else if config.authMode === "local"}
    <h1 class="mb-4 text-2xl font-bold">Budget</h1>
    <p class="text-muted-foreground">{status || "Signing in automatically..."}</p>
  {:else}
    <h1 class="mb-6 text-2xl font-bold">Sign In</h1>
    <p class="text-sm text-muted-foreground">Password auth not yet implemented in desktop.</p>
  {/if}
</div>
