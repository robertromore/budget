<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import ManageTransactionForm from "$lib/components/business/transactions/manage-transaction-form.svelte";
  import type { Transaction } from "$lib/schema";
  import { CurrentAccountState } from "$lib/stores/app/current-account.svelte";

  let {
    // account,
    dialogOpen = $bindable(),
  }: {
    // account: Account;
    dialogOpen: boolean;
  } = $props();

  let account: CurrentAccountState = CurrentAccountState.get();

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
        <ManageTransactionForm accountId={account?.id || 0} {onSave} />
      </Dialog.Description>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>
