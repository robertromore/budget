<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import {buttonVariants} from '$lib/components/ui/button';
import {deletePayeeDialog, deletePayeeId} from '$lib/states/ui/payees.svelte';
import {PayeesState} from '$lib/states/entities/payees.svelte';

const _deletePayeeDialog = $derived(deletePayeeDialog);
const _deletePayeeId = $derived(deletePayeeId);
const payeesState = PayeesState.get();

const confirmDeletePayee = async () => {
  _deletePayeeDialog.current = false;
  payeesState.deletePayee(_deletePayeeId.current);
};
</script>

<AlertDialog.Root
  bind:open={() => _deletePayeeDialog.current, (newOpen) => (_deletePayeeDialog.current = newOpen)}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone. This will permanently delete this payee and any associated
        information with it.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDeletePayee}
        class={buttonVariants({variant: 'destructive'})}>Continue</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
