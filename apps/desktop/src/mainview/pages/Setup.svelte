<script lang="ts">
  import { rpc } from "$lib/electrobun";
  import { appState } from "$lib/app-state.svelte";

  let databasePath = $state("");
  let authMode = $state<"local" | "password">("local");
  let email = $state("");
  let password = $state("");
  let status = $state("");
  let isSubmitting = $state(false);

  // Load defaults
  $effect(() => {
    rpc.getConfig({}).then((config) => {
      if (config.databasePath) databasePath = config.databasePath;
    }).catch(() => {});
  });

  async function handleSubmit() {
    isSubmitting = true;
    status = "Setting up...";

    try {
      const result = await rpc.setup({
        databasePath,
        authMode,
        ...(authMode === "password" ? { email, password } : {}),
      });

      if (result.success) {
        status = "Setup complete!";
        setTimeout(() => appState.phase = "login", 500);
      } else {
        status = `Error: ${result.error}`;
        isSubmitting = false;
      }
    } catch (err) {
      status = `Error: ${err}`;
      isSubmitting = false;
    }
  }
</script>

<div class="mx-auto mt-12 max-w-md px-6">
  <h1 class="mb-1 text-2xl font-bold">Welcome to Budget</h1>
  <p class="mb-6 text-muted-foreground">Let's set up your desktop app.</p>

  <form class="space-y-4" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
    <div>
      <label class="mb-1 block text-sm font-medium" for="dbPath">Database Location</label>
      <input id="dbPath" type="text" bind:value={databasePath}
        class="w-full rounded-md border bg-background px-3 py-2 text-sm" />
      <p class="mt-1 text-xs text-muted-foreground">Where to store your financial data</p>
    </div>

    <div>
      <label class="mb-1 block text-sm font-medium">Security</label>
      <div class="mt-1 space-y-2">
        <label class="flex items-center gap-2 text-sm">
          <input type="radio" bind:group={authMode} value="local" />
          No password (local only)
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input type="radio" bind:group={authMode} value="password" />
          Password protected
        </label>
      </div>
    </div>

    {#if authMode === "password"}
      <div>
        <label class="mb-1 block text-sm font-medium" for="email">Email</label>
        <input id="email" type="email" bind:value={email} required
          class="w-full rounded-md border bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium" for="password">Password</label>
        <input id="password" type="password" bind:value={password} minlength="8" required
          class="w-full rounded-md border bg-background px-3 py-2 text-sm" />
      </div>
    {/if}

    {#if status}
      <p class="text-sm text-muted-foreground">{status}</p>
    {/if}

    <button type="submit" disabled={isSubmitting}
      class="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
      {isSubmitting ? "Setting up..." : "Complete Setup"}
    </button>
  </form>
</div>
