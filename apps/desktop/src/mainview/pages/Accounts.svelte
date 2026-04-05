<script lang="ts">
  import { createQuery } from "@tanstack/svelte-query";
  import { trpc } from "$lib/trpc-client";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import Plus from "@lucide/svelte/icons/plus";
  import Wallet from "@lucide/svelte/icons/wallet";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import { routerState } from "$lib/router.svelte";

  const accountsResult = createQuery({
    queryKey: ["accounts", "list"],
    queryFn: () => trpc().accountRoutes.all.query(),
  });

  const accounts = $derived(accountsResult.data ?? []);
  const hasNoAccounts = $derived(accounts.length === 0);

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }
</script>

<div class="mx-auto max-w-5xl space-y-6 p-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold tracking-tight">Accounts</h1>
  </div>

  {#if accountsResult.isLoading}
    <div class="flex items-center justify-center py-12">
      <p class="text-muted-foreground">Loading accounts...</p>
    </div>
  {:else if accountsResult.error}
    <div class="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
      <p class="font-medium text-red-800 dark:text-red-200">Failed to load accounts</p>
      <p class="mt-1 text-sm text-red-600 dark:text-red-400">{accountsResult.error.message}</p>
    </div>
  {:else if hasNoAccounts}
    <div class="rounded-lg border border-blue-200 bg-blue-50 p-8 text-center dark:border-blue-800 dark:bg-blue-950">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
        <Wallet class="h-8 w-8 text-blue-600 dark:text-blue-400" />
      </div>
      <h2 class="mb-2 text-xl font-semibold">No Accounts Yet</h2>
      <p class="mx-auto mb-6 max-w-md text-muted-foreground">
        Create your first account to get started tracking your finances.
      </p>
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each accounts as account}
        <Card.Root class="border-l-4" style={account.accountColor ? `border-left-color: ${account.accountColor}` : ''}>
          <Card.Header>
            <Card.Title>{account.name}</Card.Title>
            <Card.Description>
              {#if account.accountType}
                <span class="capitalize">{account.accountType.replace('_', ' ')}</span>
              {/if}
              {#if account.institution}
                <span> · {account.institution}</span>
              {/if}
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <p class="text-xl font-semibold tabular-nums">
              {formatCurrency(account.balance ?? 0)}
            </p>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  {/if}
</div>
