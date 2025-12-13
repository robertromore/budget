<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { buttonVariants } from '$lib/components/ui/button';
import { CategoriesState } from '$lib/states/entities/categories.svelte';
import { deleteCategoryDialog, deleteCategoryId } from '$lib/states/ui/categories.svelte';

const _deleteCategoryDialog = $derived(deleteCategoryDialog);
const _deleteCategoryId = $derived(deleteCategoryId);
const categoriesState = CategoriesState.get();

const confirmDeleteCategory = async () => {
  _deleteCategoryDialog.current = false;
  categoriesState.deleteCategory(_deleteCategoryId.current);
};
</script>

<AlertDialog.Root
  bind:open={
    () => _deleteCategoryDialog.current, (newOpen) => (_deleteCategoryDialog.current = newOpen)
  }>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone. This will permanently delete this category and any associated
        information with it.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDeleteCategory}
        class={buttonVariants({ variant: 'destructive' })}>Continue</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
