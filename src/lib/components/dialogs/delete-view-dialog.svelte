<script lang="ts">
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import { buttonVariants } from '$lib/components/ui/button';
  import type { CurrentViewState } from '$lib/states/current-view.svelte';
  import { currentViews } from '$lib/states/current-views.svelte';
  import type { TransactionsFormat } from '$lib/types';

  let {
    views = $bindable(),
    dialogOpen = $bindable(),
    onDelete
  }: {
    views?: number[];
    dialogOpen: boolean;
    onDelete?: () => void;
  } = $props();

  const _currentViews = $derived(currentViews.get());
  let confirmDeleteView = async () => {
    if (views) {
      const viewStates: CurrentViewState<TransactionsFormat>[] = _currentViews.get(views) as CurrentViewState<TransactionsFormat>[];
      if (viewStates) {
        viewStates.forEach(viewState => viewState.view.deleteView());
      }
    }
    if (onDelete) {
      onDelete();
    }
    dialogOpen = false;
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
        onclick={confirmDeleteView}
        class={buttonVariants({ variant: 'destructive' })}>Continue</AlertDialog.Action
      >
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
