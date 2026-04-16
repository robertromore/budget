<script lang="ts">
  import { Button } from "$ui/lib/components/ui/button";
  import * as Card from "$ui/lib/components/ui/card";
  import { Home } from "@lucide/svelte";

  let email = $state("");
  let password = $state("");
  let error = $state("");
  let loading = $state(false);

  async function handleLogin() {
    if (!email || !password) return;
    loading = true;
    error = "";

    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        error = data.message || "Invalid credentials";
        return;
      }

      window.location.href = "/";
    } catch {
      error = "An error occurred. Please try again.";
    } finally {
      loading = false;
    }
  }
</script>

<div class="flex min-h-screen items-center justify-center">
  <Card.Root class="w-full max-w-sm">
    <Card.Header class="text-center">
      <div class="mx-auto mb-2 flex items-center justify-center gap-2">
        <Home class="h-8 w-8" />
      </div>
      <Card.Title class="text-xl">Home Manager</Card.Title>
      <Card.Description>Sign in to manage your homes.</Card.Description>
    </Card.Header>
    <Card.Content>
      <form onsubmit={handleLogin} class="flex flex-col gap-4">
        {#if error}
          <div class="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        {/if}
        <div>
          <label for="email" class="text-sm font-medium">Email</label>
          <input
            id="email"
            type="email"
            bind:value={email}
            placeholder="you@example.com"
            class="border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label for="password" class="text-sm font-medium">Password</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            class="border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm"
            required
          />
        </div>
        <Button type="submit" disabled={loading} class="w-full">
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </Card.Content>
  </Card.Root>
</div>
