<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import ManageTransactionForm from "$lib/components/forms/ManageTransactionForm.svelte";
  import type { Account, Transaction } from "$lib/schema";
  import { invalidate } from "$app/navigation";

  let { account, dialogOpen, onTransactionAdded, dataForm } = $props<{
    account: Account,
    dialogOpen: boolean,
    onTransactionAdded: (new_entity: Transaction) => void,
    dataForm
  }>();

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
        <ManageTransactionForm accountId={account.id} {onSave} {dataForm} />
      </Dialog.Description>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>
