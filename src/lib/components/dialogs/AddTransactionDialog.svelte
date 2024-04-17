<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import ManageTransactionForm from "$lib/components/forms/ManageTransactionForm.svelte";
  import type { Account, Transaction } from "$lib/schema";

  let { account, dialogOpen = $bindable() }: {
    account: Account,
    dialogOpen: boolean,
  } = $props();

  const onSave = async(new_entity: Transaction) => {
    dialogOpen = false;
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
