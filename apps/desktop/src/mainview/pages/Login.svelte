<script lang="ts">
  const SERVER = window.location.origin;

  let email = $state("");
  let password = $state("");
  let status = $state("");
  let isSubmitting = $state(false);
  let config = $state<any>(null);

  interface Props {
    onLogin: () => void;
  }
  let { onLogin }: Props = $props();

  // Load config to check auth mode
  $effect(() => {
    fetch(`${SERVER}/api/config`)
      .then((r) => r.json())
      .then((c: any) => {
        config = c;
        // Auto-login for local mode
        if (c.authMode === "local") {
          autoLogin();
        }
      })
      .catch(() => {});
  });

  async function autoLogin() {
    status = "Signing in...";
    try {
      const res = await fetch(`${SERVER}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "local@budget.app", password: "local-desktop-user" }),
      });
      if (res.ok) {
        onLogin();
      } else {
        status = "Auto-login failed. Please sign in manually.";
        // Fall through to manual login form
        if (config) config.authMode = "password";
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
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        onLogin();
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

<div class="login">
  {#if !config}
    <p>Loading...</p>
  {:else if config.authMode === "local"}
    <h1>Budget</h1>
    <p class="status">{status || "Signing in automatically..."}</p>
  {:else}
    <h1>Sign In</h1>

    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" type="email" bind:value={email} required />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input id="password" type="password" bind:value={password} required />
      </div>

      {#if status}
        <p class="status">{status}</p>
      {/if}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign In"}
      </button>
    </form>
  {/if}
</div>

<style>
  .login {
    max-width: 360px;
    margin: 5rem auto;
    padding: 0 1.5rem;
    text-align: center;
  }

  h1 {
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
  }

  form {
    text-align: left;
  }

  .field {
    margin-bottom: 1rem;
  }

  .field label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.3rem;
    font-size: 0.9rem;
  }

  input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 0.95rem;
    box-sizing: border-box;
  }

  .status {
    color: #666;
    font-size: 0.9rem;
  }

  button {
    width: 100%;
    padding: 0.7rem;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 0.5rem;
  }

  button:hover:not(:disabled) { background: #1d4ed8; }
  button:disabled { opacity: 0.6; cursor: not-allowed; }

  @media (prefers-color-scheme: dark) {
    input { background: #2a2a2a; border-color: #444; color: #e0e0e0; }
  }
</style>
