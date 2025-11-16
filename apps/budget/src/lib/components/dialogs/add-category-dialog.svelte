<script lang="ts">
import * as Sheet from '$lib/components/ui/sheet';
import type { UseBoolean } from '$lib/hooks/ui/use-boolean.svelte';
import type { UseNumber } from '$lib/hooks/ui/use-number.svelte';
import { managingCategoryId, newCategoryDialog } from '$lib/states/ui/categories.svelte';
import { ManageCategoryDialogForm } from '$lib/components/forms';

const dialogOpen: UseBoolean = $derived(newCategoryDialog);
const categoryId: UseNumber = $derived(managingCategoryId);
</script>

<Sheet.Root
  bind:open={dialogOpen.current}
  onOpenChange={(open) => {
    dialogOpen.current = open;
  }}>
  <Sheet.Content preventScroll={false} class="overflow-auto sm:max-w-lg">
    <Sheet.Header>
      <Sheet.Title>
        {#if categoryId.current === 0}
          Add Category
        {:else}
          Manage Category
        {/if}
      </Sheet.Title>
    </Sheet.Header>

    <div class="p-4 pt-0">
      <ManageCategoryDialogForm
        categoryId={categoryId.current}
        formId="add-category-dialog-form"
        onSave={() => (dialogOpen.current = false)} />
    </div>
  </Sheet.Content>
</Sheet.Root>
