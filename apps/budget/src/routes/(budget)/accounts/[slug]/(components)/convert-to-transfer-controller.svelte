<!--
  Convert To Transfer Controller — opens the convert-to-transfer
  dialog whenever the parent passes a non-null `transaction` prop.
  The parent clears the prop in `onClose`.
-->
<script lang="ts">
import type { TransactionsFormat } from '$lib/types';
import ConvertToTransferDialog from '$lib/components/transactions-table/dialogs/convert-to-transfer-dialog.svelte';

interface Props {
  transaction: TransactionsFormat | null;
  preselectedAccountId?: number | undefined;
  onClose?: () => void;
}

let { transaction, preselectedAccountId = undefined, onClose }: Props = $props();

let dialogOpen = $state(false);
let lastSeenId: number | string | null = null;

// Open the dialog when the parent supplies a new transaction.
$effect(() => {
  const id = transaction?.id ?? null;
  if (id !== lastSeenId) {
    lastSeenId = id;
    if (transaction !== null) dialogOpen = true;
  }
});

// Notify parent when user closes the dialog.
$effect(() => {
  if (!dialogOpen && lastSeenId !== null) {
    lastSeenId = null;
    onClose?.();
  }
});
</script>

{#if transaction}
  <ConvertToTransferDialog {transaction} bind:dialogOpen {preselectedAccountId} />
{/if}
