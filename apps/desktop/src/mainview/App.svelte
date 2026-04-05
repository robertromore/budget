<script lang="ts">
  import { QueryClientProvider, createQuery } from "@tanstack/svelte-query";
  import { queryClient } from "$core/query/_client";
  import { trpc } from "$lib/trpc-client";

  let serverStatus = $state("Checking...");
  let accounts = $state<any[]>([]);
  let error = $state("");

  // Test the tRPC connection on mount
  $effect(() => {
    fetch("http://localhost:2022/api/trpc")
      .then((res) => {
        serverStatus = res.ok ? "Connected" : `Error: ${res.status}`;
      })
      .catch(() => {
        serverStatus = "Not reachable";
      });
  });
</script>

<QueryClientProvider client={queryClient}>
  <main>
    <h1>Budget Desktop</h1>
    <p>Electrobun + Svelte + @budget/core</p>

    <div class="status">
      <h2>Server Status</h2>
      <p class="status-value" class:connected={serverStatus === "Connected"}>
        {serverStatus}
      </p>
      <p class="detail">tRPC server on localhost:2022</p>
    </div>
  </main>
</QueryClientProvider>

<style>
  main {
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 600px;
    margin: 4rem auto;
    text-align: center;
  }

  h1 {
    color: #333;
    font-size: 2rem;
    margin-bottom: 0.25rem;
  }

  p {
    color: #666;
    font-size: 1.1rem;
  }

  .status {
    margin-top: 2rem;
    padding: 1.5rem;
    border-radius: 8px;
    background: #f5f5f5;
  }

  .status h2 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-value {
    font-size: 1.3rem;
    font-weight: 600;
    color: #c00;
  }

  .status-value.connected {
    color: #090;
  }

  .detail {
    font-size: 0.85rem;
    color: #999;
  }

  @media (prefers-color-scheme: dark) {
    h1 { color: #e0e0e0; }
    .status { background: #2a2a2a; }
    .status h2 { color: #aaa; }
    .detail { color: #777; }
  }
</style>
