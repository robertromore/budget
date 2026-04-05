<script lang="ts">
  import { createQuery } from "@tanstack/svelte-query";
  import * as accountsQuery from "$core/query/accounts";

  const accountsResult = createQuery(accountsQuery.listAccounts().options());
  const accounts = $derived(accountsResult.data ?? []);
</script>

<div class="home">
  <header>
    <h1>Budget</h1>
    <p class="subtitle">Your accounts</p>
  </header>

  {#if accountsResult.isLoading}
    <p class="loading">Loading accounts...</p>
  {:else if accountsResult.error}
    <div class="error">
      <p>Failed to load accounts</p>
      <p class="detail">{accountsResult.error.message}</p>
    </div>
  {:else if accounts.length === 0}
    <div class="empty">
      <p>No accounts yet.</p>
      <p class="hint">Create your first account to get started.</p>
    </div>
  {:else}
    <ul class="accounts">
      {#each accounts as account}
        <li class="account-card">
          <div class="account-name">{account.name}</div>
          <div class="account-type">{account.type}</div>
          <div class="account-balance">
            ${(account.balance / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .home {
    max-width: 600px;
    margin: 2rem auto;
    padding: 0 1.5rem;
  }

  header {
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 1.8rem;
    margin-bottom: 0.1rem;
  }

  .subtitle {
    color: #888;
    font-size: 1rem;
  }

  .loading, .empty, .error {
    text-align: center;
    padding: 3rem 1rem;
    color: #888;
  }

  .error {
    color: #c00;
  }

  .error .detail {
    font-size: 0.85rem;
    color: #999;
    margin-top: 0.25rem;
  }

  .hint {
    font-size: 0.9rem;
    color: #aaa;
  }

  .accounts {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .account-card {
    display: flex;
    align-items: center;
    padding: 1rem 1.25rem;
    background: #f8f8f8;
    border-radius: 8px;
    gap: 1rem;
  }

  .account-name {
    font-weight: 600;
    flex: 1;
  }

  .account-type {
    font-size: 0.8rem;
    color: #999;
    text-transform: capitalize;
    background: #eee;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
  }

  .account-balance {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    min-width: 100px;
    text-align: right;
  }

  @media (prefers-color-scheme: dark) {
    .account-card { background: #2a2a2a; }
    .account-type { background: #333; color: #aaa; }
  }
</style>
