<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import ManageTransactionForm from '$lib/components/forms/manage-transaction-form.svelte';
  import type { Transaction } from '$lib/schema';
  import { currentAccount, CurrentAccountState } from '$lib/states/current-account.svelte';

  let {
    // account,
    dialogOpen = $bindable()
  }: {
    // account: Account;
    dialogOpen: boolean;
  } = $props();

  let account: CurrentAccountState | undefined = $state();
  $effect(() => {
    account = currentAccount.get();
  });

  const onSave = async (new_entity: Transaction) => {
    dialogOpen = false;
    account?.addTransaction(new_entity);
  };
</script>

<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Add Transaction</Dialog.Title>
      <Dialog.Description>
        <ManageTransactionForm accountId={account?.id || -1} {onSave} />
      </Dialog.Description>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>
