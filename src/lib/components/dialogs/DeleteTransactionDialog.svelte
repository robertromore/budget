<script lang="ts">
  import { page } from "$app/stores";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { buttonVariants } from "$lib/components/ui/button";
  import type { Transaction } from "$lib/schema";
  import { trpc } from "$lib/trpc/client";

  let {
    transactions = $bindable(),
    accountId = $bindable(),
    accountBalance = $bindable(),
    dialogOpen = $bindable(),
    onTransactionDeleted
  }: {
    transactions: Transaction[];
    accountId: number;
    accountBalance: number;
    dialogOpen: boolean;
    onTransactionDeleted: (entities: Transaction[]) => void;
  } = $props();

  let confirmDeleteTransaction = async() => {
    let total = 0;
    transactions.forEach((tx: Transaction) => {
      total += tx.amount || 0;
    });
    const entities: Transaction[] = await trpc($page).transactionRoutes.delete.mutate({
      entities: transactions.map((transaction) => transaction.id),
      accountId
    });
    onTransactionDeleted(entities);
  };
</script>

<AlertDialog.Root bind:open={dialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone. This will permanently delete this transaction.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDeleteTransaction}
        class={buttonVariants({ variant: 'destructive' })}>Continue</AlertDialog.Action
      >
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
