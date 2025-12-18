<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { getIconByName } from '$lib/components/ui/icon-picker/icon-categories';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { deleteAccountDialog, deleteAccountId } from '$lib/states/ui/global.svelte';
import { currencyFormatter } from '$lib/utils/formatters';
import Plus from '@lucide/svelte/icons/plus';
import Wallet from '@lucide/svelte/icons/wallet';
import SeedDefaultAccountsButton from './(components)/seed-default-accounts-button.svelte';

const accountsState = $derived(AccountsState.get());
const accounts = $derived(accountsState.accounts.values());
const accountsArray = $derived(Array.from(accounts));
const hasNoAccounts = $derived(accountsArray.length === 0);

let deleteDialogId = $derived(deleteAccountId);
let deleteDialogOpen = $derived(deleteAccountDialog);

const deleteAccount = (id: number) => {
  deleteDialogId.current = id;
  deleteDialogOpen.setTrue();
};
</script>

<svelte:head>
  <title>Accounts - Budget App</title>
  <meta name="description" content="Manage your financial accounts" />
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold tracking-tight">Accounts</h1>
    <div class="flex items-center gap-2">
      <SeedDefaultAccountsButton />
      <Button href="/accounts/new">
        <Plus class="mr-2 h-4 w-4" />
        Add Account
      </Button>
    </div>
  </div>

  <!-- Content -->
  {#if hasNoAccounts}
    <!-- Empty State -->
    <div class="rounded-lg border border-blue-200 bg-blue-50 p-8 text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
        <Wallet class="h-8 w-8 text-blue-600" />
      </div>
      <h2 class="mb-2 text-xl font-semibold text-blue-900">No Accounts Yet</h2>
      <p class="mx-auto mb-6 max-w-md text-blue-700">
        Get started by creating your first account. You can add checking accounts, savings accounts,
        credit cards, or any other financial account you want to track.
      </p>
      <div class="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <SeedDefaultAccountsButton />
        <span class="text-sm text-blue-700">or</span>
        <Button href="/accounts/new" class="bg-blue-600 hover:bg-blue-700">
          <Plus class="mr-2 h-4 w-4" />
          Create Your First Account
        </Button>
      </div>
    </div>
  {:else}
    <!-- Accounts Grid -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {#each accountsArray as { id, slug, name, balance, notes, accountIcon, accountColor, accountType, institution }}
        <Card.Root
          class="border-l-4"
          style={accountColor ? `border-left-color: ${accountColor}` : ''}>
          <Card.Header>
            <Card.Title>
              <a
                href="/accounts/{slug}"
                class="text-foreground hover:text-primary focus:text-primary focus:ring-primary flex items-center gap-2 rounded focus:ring-2 focus:ring-offset-2 focus:outline-none">
                {#if accountIcon}
                  {@const IconComponent = getIconByName(accountIcon)?.icon}
                  {#if IconComponent}
                    <IconComponent
                      class="h-5 w-5"
                      style={accountColor ? `color: ${accountColor}` : ''} />
                  {/if}
                {/if}
                <span>{name}</span>
              </a>
            </Card.Title>
            <Card.Description class="space-y-1">
              {#if accountType || institution}
                <span class="text-muted-foreground flex items-center gap-1 text-xs">
                  {#if accountType}
                    <span class="capitalize">{accountType.replace('_', ' ')}</span>
                  {/if}
                  {#if institution}
                    <span>• {institution}</span>
                  {/if}
                </span>
                {#if notes && notes.length > 0}
                  <br />
                {/if}
              {/if}
              {#if notes && notes.length > 0}
                <span class="block text-sm">
                  {notes.length > 80 ? notes.substring(0, 80) + '...' : notes}
                </span>
              {/if}
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <strong>Balance:</strong>
            {currencyFormatter.format(balance ?? 0)}
          </Card.Content>
          <Card.Footer class="flex gap-2">
            <Button
              href="/accounts/{slug}/edit"
              variant="outline"
              size="sm"
              aria-label="Edit account {name}">
              Edit
            </Button>
            <Button
              onclick={() => deleteAccount(id)}
              variant="secondary"
              size="sm"
              aria-label="Delete account {name}">
              Delete
            </Button>
          </Card.Footer>
        </Card.Root>
      {/each}
    </div>
  {/if}
</div>
