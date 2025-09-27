<script lang="ts">
import * as Sheet from '$lib/components/ui/sheet';
import type {UseBoolean} from '$lib/hooks/ui/use-boolean.svelte';
import type {UseNumber} from '$lib/hooks/ui/use-number.svelte';
import {managingPayeeId, newPayeeDialog} from '$lib/states/ui/payees.svelte';
import {ManagePayeeDialogForm} from '$lib/components/forms';

const dialogOpen: UseBoolean = $derived(newPayeeDialog);
const payeeId: UseNumber = $derived(managingPayeeId);
</script>

<Sheet.Root bind:open={dialogOpen.current} onOpenChange={(open) => {
  dialogOpen.current = open;
}}>
  <Sheet.Content preventScroll={false} class="overflow-auto sm:max-w-lg">
    <Sheet.Header>
      <Sheet.Title>
        {#if payeeId.current === 0}
          Add Payee
        {:else}
          Manage Payee
        {/if}
      </Sheet.Title>
    </Sheet.Header>

    <div class="p-4 pt-0">
      <ManagePayeeDialogForm
        payeeId={payeeId.current}
        formId="add-payee-dialog-form"
        onSave={() => (dialogOpen.current = false)} />
    </div>
  </Sheet.Content>
</Sheet.Root>