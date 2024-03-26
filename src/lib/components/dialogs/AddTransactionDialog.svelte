<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import ManageTransactionForm from "$lib/components/forms/ManageTransactionForm.svelte";
  import type { Account, Transaction } from "$lib/schema";

  let { account, dialogOpen = $bindable(), onTransactionAdded }: {
    account: Account,
    dialogOpen: boolean,
    onTransactionAdded: (new_entity: Transaction) => void
  } = $props();

  const onSave = async(new_entity: Transaction) => {
    dialogOpen = false;
    onTransactionAdded(new_entity);
  };
</script>

<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Add Transaction</Dialog.Title>
      <Dialog.Description>
        <ManageTransactionForm accountId={account.id} {onSave} />
      </Dialog.Description>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>
