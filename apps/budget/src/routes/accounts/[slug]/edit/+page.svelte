<script lang="ts">
import {goto} from '$app/navigation';
import {page} from '$app/state';
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import CreditCard from '@lucide/svelte/icons/credit-card';
import {ManageAccountForm} from '$lib/components/forms';
import type {Account} from '$lib/schema';
import {AccountsState} from '$lib/states/entities/accounts.svelte';

const accountSlug = $derived(page.params['slug']);
const accountsState = $derived(AccountsState.get());
const account = $derived(accountsState.getBySlug(accountSlug || ''));

const handleSave = (updatedAccount: Account) => {
  // Navigate back to the account detail page
  setTimeout(() => {
    goto(`/accounts/${updatedAccount.slug}`, { replaceState: true });
  }, 100);
};
</script>

<svelte:head>
  <title>Edit Account - Budget App</title>
  <meta name="description" content="Edit account details" />
</svelte:head>

<div class="container mx-auto py-6 space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" href="/accounts/{accountSlug}" class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to Account</span>
      </Button>
      <div>
        <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
          <CreditCard class="h-8 w-8 text-muted-foreground" />
          Edit Account
        </h1>
        {#if account}
          <p class="text-muted-foreground mt-1">Update details for {account.name}</p>
        {/if}
      </div>
    </div>
  </div>

  {#if account}
    <!-- Form Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Account Information</Card.Title>
        <Card.Description>
          Update the details for your account.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <ManageAccountForm
          accountId={account.id}
          onSave={handleSave}
        />
      </Card.Content>
    </Card.Root>
  {:else}
    <Card.Root class="max-w-4xl">
      <Card.Content class="py-8 text-center text-muted-foreground">
        Account not found
      </Card.Content>
    </Card.Root>
  {/if}
</div>
