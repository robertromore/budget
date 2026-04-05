<script lang="ts">
  import { createQuery, createMutation } from "@tanstack/svelte-query";
  import * as accountsQuery from "$core/query/accounts";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import Plus from "@lucide/svelte/icons/plus";
  import Wallet from "@lucide/svelte/icons/wallet";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import { routerState } from "$lib/router.svelte";

  const accountsResult = createQuery(accountsQuery.listAccounts().options());
  const accounts = $derived(accountsResult.data ?? []);
  const hasNoAccounts = $derived(accounts.length === 0);

  const deleteMutation = createMutation(accountsQuery.deleteAccount.options());

  function handleDelete(id: number, name: string) {
    if (confirm(`Delete account "${name}"?`)) {
      $deleteMutation.mutate({ id });
    }
  }

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
    <Button onclick={() => routerState.current = ({ page: "account-detail", slug: "new" })}>
      <Plus class="mr-2 h-4 w-4" />
      Add Account
    </Button>
  </div>

  {#if accountsResult.isLoading}
    <div class="flex items-center justify-center py-12">
      <p class="text-muted-foreground">Loading accounts...</p>
    </div>
  {:else if hasNoAccounts}
    <div class="rounded-lg border border-blue-200 bg-blue-50 p-8 text-center dark:border-blue-800 dark:bg-blue-950">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
        <Wallet class="h-8 w-8 text-blue-600 dark:text-blue-400" />
      </div>
      <h2 class="mb-2 text-xl font-semibold">No Accounts Yet</h2>
      <p class="mx-auto mb-6 max-w-md text-muted-foreground">
        Get started by creating your first account. You can add checking accounts, savings accounts,
        credit cards, or any other financial account you want to track.
      </p>
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each accounts as account}
        <Card.Root class="border-l-4" style={account.accountColor ? `border-left-color: ${account.accountColor}` : ''}>
          <Card.Header>
            <Card.Title>
              <button
                class="text-foreground hover:text-primary flex items-center gap-2 text-left"
                onclick={() => routerState.current = ({ page: "account-detail", slug: account.slug })}>
                <span>{account.name}</span>
              </button>
            </Card.Title>
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
          <Card.Footer class="flex gap-2">
            <Button
              onclick={() => routerState.current = ({ page: "account-detail", slug: account.slug })}
              variant="outline"
              size="sm">
              View
            </Button>
            <Button
              onclick={() => handleDelete(account.id, account.name)}
              variant="secondary"
              size="sm">
              <Trash2 class="mr-1 h-3 w-3" />
              Delete
            </Button>
          </Card.Footer>
        </Card.Root>
      {/each}
    </div>
  {/if}
</div>
