<script lang="ts">
import { goto } from '$app/navigation';
import { ManageAccountForm } from '$lib/components/forms';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import type { Account } from '$lib/schema';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import CreditCard from '@lucide/svelte/icons/credit-card';

const handleSave = (account: Account) => {
  // Navigate to the new account's detail page
  setTimeout(() => {
    goto(`/accounts/${account.slug}`, { replaceState: true });
  }, 100);
};
</script>

<svelte:head>
  <title>New Account - Budget App</title>
  <meta name="description" content="Create a new account to track your finances" />
</svelte:head>

<div class="container mx-auto space-y-6 py-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" href="/accounts" class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to Accounts</span>
      </Button>
      <div>
        <h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <CreditCard class="text-muted-foreground h-8 w-8" />
          New Account
        </h1>
        <p class="text-muted-foreground mt-1">Add a new account to track your finances</p>
      </div>
    </div>
  </div>

  <!-- Form Card -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Account Information</Card.Title>
      <Card.Description>
        Fill in the details for your new account. Only the name and account type are required.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <ManageAccountForm accountId={0} onSave={handleSave} />
    </Card.Content>
  </Card.Root>
</div>
