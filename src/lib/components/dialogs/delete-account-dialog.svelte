<script lang="ts">
  import * as AlertDialog from '$lib/components/ui/alert-dialog';
  import { buttonVariants } from '$lib/components/ui/button';
  import { trpc } from '$lib/trpc/client';
  import { page } from '$app/state';
  import { invalidateAll } from '$app/navigation';

  let {
    deleteDialogId = $bindable(),
    deleteDialogOpen = $bindable()
  }: {
    deleteDialogId: number | null;
    deleteDialogOpen: boolean;
  } = $props();

  const confirmDeleteAccount = async () => {
    deleteDialogOpen = false;
    await trpc(page).accountRoutes.remove.mutate({ id: deleteDialogId! });
    await invalidateAll();
  };
</script>

<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone. This will permanently delete your account and any associated
        information with it.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDeleteAccount}
        class={buttonVariants({ variant: 'destructive' })}>Continue</AlertDialog.Action
      >
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
