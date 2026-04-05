<script lang="ts">
  const SERVER = window.location.origin;

  let email = $state("");
  let password = $state("");
  let status = $state("");
  let isSubmitting = $state(false);
  let config = $state<any>(null);

  let props = $props<{ onLogin: () => void }>();

  function triggerLogin() {
    props.triggerLogin();
  }

  // Load config to check auth mode
  $effect(() => {
    fetch(`${SERVER}/api/config`)
      .then((r) => r.json())
      .then((c: any) => {
        config = c;
        if (c.authMode === "local") {
          autoLogin();
        }
      })
      .catch((err) => {
        status = `Config error: ${err}`;
      });
  });

  async function autoLogin() {
    status = "Signing in...";
    try {
      const res = await fetch(`${SERVER}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: "local@budget.app", password: "local-desktop-user" }),
      });
      if (res.ok) {
        status = "Success! Loading app...";
        triggerLogin();
      } else {
        const text = await res.text();
        status = `Login failed (${res.status}): ${text.slice(0, 100)}`;
        config = { ...config, authMode: "password" };
      }
    } catch (err) {
      status = `Connection error: ${err}`;
    }
  }

  async function handleSubmit() {
    isSubmitting = true;
    status = "Signing in...";
    try {
      const res = await fetch(`${SERVER}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        triggerLogin();
      } else {
        status = "Invalid email or password.";
        isSubmitting = false;
      }
    } catch (err) {
      status = `Connection error: ${err}`;
      isSubmitting = false;
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

    <form class="space-y-4 text-left" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <div>
        <label class="mb-1 block text-sm font-medium" for="email">Email</label>
        <input id="email" type="email" bind:value={email} required
          class="w-full rounded-md border bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium" for="password">Password</label>
        <input id="password" type="password" bind:value={password} required
          class="w-full rounded-md border bg-background px-3 py-2 text-sm" />
      </div>

      {#if status}
        <p class="text-sm text-destructive">{status}</p>
      {/if}

      <button type="submit" disabled={isSubmitting}
        class="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
        {isSubmitting ? "Signing in..." : "Sign In"}
      </button>
    </form>
  {/if}
</div>
