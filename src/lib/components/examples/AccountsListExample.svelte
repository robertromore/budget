<script lang="ts">
  import { useAccounts, useDeleteAccount, useCreateAccount } from "$lib/hooks/accounts";
  import { Button } from "$lib/components/ui/button";
  import { toast } from "svelte-sonner";
  
  // Use TanStack Query hooks instead of manual stores
  const accountsQuery = useAccounts();
  const deleteAccountMutation = useDeleteAccount();
  const createAccountMutation = useCreateAccount();
  
  // Reactive statements for UI state
  $: accounts = $accountsQuery.data || [];
  $: isLoading = $accountsQuery.isPending;
  $: error = $accountsQuery.error;
  $: isDeleting = $deleteAccountMutation.isPending;
  $: isCreating = $createAccountMutation.isPending;
  
  // Handle account deletion with optimistic updates
  async function handleDeleteAccount(accountId: number) {
    try {
      await $deleteAccountMutation.mutateAsync({ id: accountId });
      toast.success("Account deleted successfully");
    } catch (error) {
      toast.error("Failed to delete account");
    }
  }
  
  // Handle account creation
  async function handleCreateAccount() {
    try {
      await $createAccountMutation.mutateAsync({
        name: "New Account",
        slug: "new-account",
      });
      toast.success("Account created successfully");
    } catch (error) {
      toast.error("Failed to create account");
    }
  }
</script>

<div class="accounts-container">
  <div class="header">
    <h2>Accounts</h2>
    <Button 
      on:click={handleCreateAccount}
      disabled={isCreating}
    >
      {isCreating ? "Creating..." : "Add Account"}
    </Button>
  </div>
  
  {#if isLoading}
    <div class="loading">Loading accounts...</div>
  {:else if error}
    <div class="error">
      <p>Error loading accounts: {error.message}</p>
      <Button on:click={() => $accountsQuery.refetch()}>
        Retry
      </Button>
    </div>
  {:else}
    <div class="accounts-list">
      {#each accounts as account (account.id)}
        <div class="account-card">
          <div class="account-info">
            <h3>{account.name}</h3>
            <p>Balance: ${account.balance || 0}</p>
          </div>
          <Button 
            variant="destructive"
            size="sm"
            on:click={() => handleDeleteAccount(account.id)}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .accounts-container {
    padding: 1rem;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .loading, .error {
    padding: 2rem;
    text-align: center;
  }
  
  .accounts-list {
    display: grid;
    gap: 1rem;
  }
  
  .account-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
  }
  
  .account-info h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
    font-weight: 600;
  }
  
  .account-info p {
    margin: 0;
    color: #6b7280;
  }
</style>