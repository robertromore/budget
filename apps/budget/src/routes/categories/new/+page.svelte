<script lang="ts">
import {goto} from '$app/navigation';
import {page} from '$app/state';
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Tag from '@lucide/svelte/icons/tag';
import {ManageCategoryForm} from '$lib/components/forms';
import type {Category} from '$lib/schema';
import type {EditableEntityItem} from '$lib/types';
import {CategoriesState} from '$lib/states/entities/categories.svelte';

const categoriesState = CategoriesState.get();

// Get parentId from query parameter if present
const parentIdParam = $derived(page.url.searchParams.get('parentId'));
const initialParentId = $derived(parentIdParam ? parseInt(parentIdParam) : null);

const handleSave = (entity: EditableEntityItem, isNew: boolean) => {
  const category = entity as Category;

  if (isNew && category.slug) {
    // Add the new category to state
    categoriesState.addCategory(category);

    // Navigate to the new category's detail page
    setTimeout(() => {
      goto(`/categories/${category.slug}`, {replaceState: true});
    }, 100);
  } else {
    // Navigate back to categories list
    goto('/categories');
  }
};
</script>

<svelte:head>
  <title>New Category - Budget App</title>
  <meta name="description" content="Create a new category for your transactions" />
</svelte:head>

<div class="container mx-auto space-y-6 py-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" href="/categories" class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to Categories</span>
      </Button>
      <div>
        <h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <Tag class="text-muted-foreground h-8 w-8" />
          New Category
        </h1>
        <p class="text-muted-foreground mt-1">
          Create a new category to organize your transactions
        </p>
      </div>
    </div>
  </div>

  <!-- Form Card -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Category Information</Card.Title>
      <Card.Description>
        Fill in the details for your new category. Only the name is required.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <ManageCategoryForm id={0} {initialParentId} onSave={handleSave} />
    </Card.Content>
  </Card.Root>
</div>
