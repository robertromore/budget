<script lang="ts">
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import Plus from '@lucide/svelte/icons/plus';
import Tag from '@lucide/svelte/icons/tag';
import {CategoriesState} from '$lib/states/entities/categories.svelte';
import {
  newCategoryDialog,
  deleteCategoryDialog,
  deleteCategoryId,
  managingCategoryId,
} from '$lib/states/ui/categories.svelte';

const categoriesState = $derived(CategoriesState.get());
const categories = $derived(categoriesState.categories.values());
const categoriesArray = $derived(Array.from(categories));
const hasNoCategories = $derived(categoriesArray.length === 0);

let deleteDialogId = $derived(deleteCategoryId);
let deleteDialogOpen = $derived(deleteCategoryDialog);

const deleteCategory = (id: number) => {
  deleteDialogId.current = id;
  deleteDialogOpen.setTrue();
};

const dialogOpen = $derived(newCategoryDialog);
const managingCategory = $derived(managingCategoryId);

const editCategory = (id: number) => {
  managingCategory.current = id;
  dialogOpen.current = true;
};
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold tracking-tight">Categories</h1>
    <Button
      onclick={() => {
        managingCategory.current = 0;
        dialogOpen.current = true;
      }}>
      <Plus class="mr-2 h-4 w-4" />
      Add Category
    </Button>
  </div>

  <!-- Content -->
  {#if hasNoCategories}
    <!-- Empty State -->
    <div class="rounded-lg border border-blue-200 bg-blue-50 p-8 text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
        <Tag class="h-8 w-8 text-blue-600" />
      </div>
      <h2 class="mb-2 text-xl font-semibold text-blue-900">No Categories Yet</h2>
      <p class="mb-6 text-blue-700 max-w-md mx-auto">
        Get started by creating your first category. You can organize your transactions by categories
        like groceries, utilities, entertainment, and more.
      </p>
      <Button
        onclick={() => {
          managingCategory.current = 0;
          dialogOpen.current = true;
        }}
        class="bg-blue-600 hover:bg-blue-700">
        <Plus class="mr-2 h-4 w-4" />
        Create Your First Category
      </Button>
    </div>
  {:else}
    <!-- Categories Grid -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {#each categoriesArray as { id, name, notes }}
        <Card.Root>
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <Tag class="h-5 w-5 text-muted-foreground" />
              <span>{name}</span>
            </Card.Title>
            {#if notes && notes.length > 0}
              <Card.Description>
                <span class="text-sm block">
                  {notes.length > 80 ? notes.substring(0, 80) + '...' : notes}
                </span>
              </Card.Description>
            {/if}
          </Card.Header>
          <Card.Footer class="flex gap-2">
            <Button
              onclick={() => editCategory(id)}
              variant="outline"
              size="sm"
              aria-label="Edit category {name}">
              Edit
            </Button>
            <Button
              onclick={() => deleteCategory(id)}
              variant="secondary"
              size="sm"
              aria-label="Delete category {name}">
              Delete
            </Button>
          </Card.Footer>
        </Card.Root>
      {/each}
    </div>
  {/if}
</div>