<script lang="ts">
  const SERVER = "http://localhost:2022";

  let databasePath = $state("");
  let authMode = $state<"local" | "password">("local");
  let email = $state("");
  let password = $state("");
  let status = $state("");
  let isSubmitting = $state(false);

  interface Props {
    onComplete: () => void;
  }
  let { onComplete }: Props = $props();

  // Load defaults from server config
  $effect(() => {
    fetch(`${SERVER}/api/config`)
      .then((r) => r.json())
      .then((config: any) => {
        if (config.databasePath) databasePath = config.databasePath;
      })
      .catch(() => {});
  });

  async function handleSubmit() {
    isSubmitting = true;
    status = "Setting up...";

    try {
      const res = await fetch(`${SERVER}/api/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databasePath,
          authMode,
          ...(authMode === "password" ? { email, password } : {}),
        }),
      });

      const result = await res.json();
      if (result.success) {
        status = "Setup complete!";
        setTimeout(onComplete, 500);
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

<div class="setup">
  <h1>Welcome to Budget</h1>
  <p class="subtitle">Let's set up your desktop app.</p>

  <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
    <div class="field">
      <label for="dbPath">Database Location</label>
      <input id="dbPath" type="text" bind:value={databasePath} placeholder="~/Documents/budget/budget.db" />
      <p class="hint">Where to store your financial data</p>
    </div>

    <div class="field">
      <label>Security</label>
      <div class="radio-group">
        <label class="radio">
          <input type="radio" bind:group={authMode} value="local" />
          <span>No password (local only)</span>
        </label>
        <label class="radio">
          <input type="radio" bind:group={authMode} value="password" />
          <span>Password protected</span>
        </label>
      </div>
    </div>

    {#if authMode === "password"}
      <div class="field">
        <label for="email">Email</label>
        <input id="email" type="email" bind:value={email} required />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input id="password" type="password" bind:value={password} minlength="8" required />
      </div>
    {/if}

    {#if status}
      <p class="status">{status}</p>
    {/if}

    <button type="submit" disabled={isSubmitting}>
      {isSubmitting ? "Setting up..." : "Complete Setup"}
    </button>
  </form>
</div>

<style>
  .setup {
    max-width: 480px;
    margin: 3rem auto;
    padding: 0 1.5rem;
  }

  h1 {
    font-size: 1.8rem;
    margin-bottom: 0.25rem;
  }

  .subtitle {
    color: #888;
    margin-bottom: 2rem;
  }

  .field {
    margin-bottom: 1.25rem;
  }

  .field > label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.3rem;
    font-size: 0.9rem;
  }

  input[type="text"],
  input[type="email"],
  input[type="password"] {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 0.95rem;
    box-sizing: border-box;
  }

  .hint {
    font-size: 0.8rem;
    color: #999;
    margin-top: 0.25rem;
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .radio {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: normal;
    cursor: pointer;
  }

  .status {
    color: #666;
    font-size: 0.9rem;
    margin: 1rem 0;
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

  button:hover:not(:disabled) {
    background: #1d4ed8;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (prefers-color-scheme: dark) {
    input[type="text"], input[type="email"], input[type="password"] {
      background: #2a2a2a;
      border-color: #444;
      color: #e0e0e0;
    }
  }
</style>
