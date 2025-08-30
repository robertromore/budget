<script lang="ts">
  import * as Form from "$lib/components/ui/form";
  import { accountFormSchema } from "$lib/schema/forms";
  import { type Account } from "$lib/schema";
  import { superForm } from "sveltekit-superforms/client";
  import Textarea from "$lib/components/ui/textarea/textarea.svelte";
  import { page } from "$app/state";
  import Input from "$lib/components/ui/input/input.svelte";
  import { useAccount, useCreateAccount, useUpdateAccount } from "$lib/hooks/accounts";
  import { toast } from "svelte-sonner";

  let {
    accountId,
    onSave,
    onDelete,
  }: {
    accountId?: number;
    onDelete?: (id: number) => void;
    onSave?: (new_entity: Account) => void;
  } = $props();

  const {
    data: { manageAccountForm },
  } = page;

  // Use TanStack Query hooks instead of manual store
  const accountQuery = useAccount(accountId || 0);
  const createAccountMutation = useCreateAccount();
  const updateAccountMutation = useUpdateAccount();

  // Reactive data from queries
  $: account = $accountQuery.data;
  $: isLoadingAccount = $accountQuery.isPending && !!accountId;
  $: isCreating = $createAccountMutation.isPending;
  $: isUpdating = $updateAccountMutation.isPending;
  $: isSaving = isCreating || isUpdating;

  const form = superForm(manageAccountForm, {
    id: "account-form",
    onSubmit: async ({ formData, cancel }) => {
      // Cancel the default form submission
      cancel();
      
      const data = {
        id: accountId,
        name: formData.get('name') as string,
        slug: (formData.get('name') as string).toLowerCase().replace(/\s+/g, '-'),
        notes: formData.get('notes') as string,
      };

      try {
        let savedAccount: Account;
        
        if (accountId) {
          // Update existing account
          savedAccount = await $updateAccountMutation.mutateAsync(data);
          toast.success("Account updated successfully");
        } else {
          // Create new account
          savedAccount = await $createAccountMutation.mutateAsync(data);
          toast.success("Account created successfully");
        }

        // Call callback if provided
        if (onSave) {
          onSave(savedAccount);
        }
      } catch (error) {
        toast.error(accountId ? "Failed to update account" : "Failed to create account");
        console.error("Account save error:", error);
      }
    },
  });

  const { form: formData, enhance } = form;

  // Pre-populate form data when editing
  $: if (account && accountId) {
    $formData.id = accountId;
    $formData.name = account.name;
    $formData.notes = account.notes || "";
  }
</script>

<!-- Show loading state while fetching account data -->
{#if isLoadingAccount}
  <div class="loading-state">
    <p>Loading account details...</p>
  </div>
{:else}
  <form method="post" use:enhance class="grid grid-cols-2 gap-2">
    <input hidden value={$formData.id} name="id" />
    
    <Form.Field {form} name="name">
      <Form.Control let:attrs>
        <Form.Label>Account Name</Form.Label>
        <Input {...attrs} bind:value={$formData.name} disabled={isSaving} />
      </Form.Control>
      <Form.FieldErrors />
    </Form.Field>

    <Form.Field {form} name="notes" class="col-span-2">
      <Form.Control let:attrs>
        <Form.Label>Notes</Form.Label>
        <Textarea {...attrs} bind:value={$formData.notes} disabled={isSaving} />
      </Form.Control>
      <Form.FieldErrors />
    </Form.Field>

    <div class="col-span-2 flex gap-2 justify-end">
      <Form.Button type="submit" disabled={isSaving}>
        {#if isSaving}
          {accountId ? "Updating..." : "Creating..."}
        {:else}
          {accountId ? "Update Account" : "Create Account"}
        {/if}
      </Form.Button>
    </div>
  </form>
{/if}

<!-- Show mutation errors -->
{#if $createAccountMutation.error}
  <div class="error-message">
    <p>Error creating account: {$createAccountMutation.error.message}</p>
  </div>
{/if}

{#if $updateAccountMutation.error}
  <div class="error-message">
    <p>Error updating account: {$updateAccountMutation.error.message}</p>
  </div>
{/if}

<style>
  .loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem;
    color: #6b7280;
  }

  .error-message {
    margin-top: 1rem;
    padding: 0.75rem;
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.375rem;
    color: #dc2626;
  }
</style>