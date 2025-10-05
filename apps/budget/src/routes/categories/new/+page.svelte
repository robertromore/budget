<script lang="ts">
import {goto} from '$app/navigation';
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Tag from '@lucide/svelte/icons/tag';
import {ManageCategoryForm} from '$lib/components/forms';
import type {Category} from '$lib/schema';
import type {EditableEntityItem} from '$lib/types';
import {CategoriesState} from '$lib/states/entities/categories.svelte';

const categoriesState = CategoriesState.get();

const handleSave = (entity: EditableEntityItem, isNew: boolean) => {
  const category = entity as Category;

  if (isNew && category.slug) {
    // Add the new category to state
    categoriesState.addCategory(category);

    // Navigate to the new category's detail page
    setTimeout(() => {
      goto(`/categories/${category.slug}`, { replaceState: true });
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

<div class="container mx-auto py-6 space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" href="/categories" class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to Categories</span>
      </Button>
      <div>
        <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Tag class="h-8 w-8 text-muted-foreground" />
          New Category
        </h1>
        <p class="text-muted-foreground mt-1">Create a new category to organize your transactions</p>
      </div>
    </div>
  </div>

  <!-- Form Card -->
  <Card.Root class="max-w-4xl">
    <Card.Header>
      <Card.Title>Category Information</Card.Title>
      <Card.Description>
        Fill in the details for your new category. Only the name is required.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <ManageCategoryForm
        id={0}
        onSave={handleSave}
      />
    </Card.Content>
  </Card.Root>
</div>