<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Tag from '@lucide/svelte/icons/tag';
import { ManageCategoryForm } from '$lib/components/forms';
import type { Category } from '$lib/schema';
import type { EditableEntityItem } from '$lib/types';
import type { PageData } from './$types';
import { CategoriesState } from '$lib/states/entities/categories.svelte';

let { data }: { data: PageData } = $props();

const slug = $derived(page.params['slug']);
const category = $derived(data.category);
const categoriesState = CategoriesState.get();

const handleSave = (entity: EditableEntityItem) => {
  const updatedCategory = entity as Category;

  // Update the category in state
  categoriesState.updateCategory(updatedCategory);

  // Navigate back to the category detail page
  setTimeout(() => {
    goto(`/categories/${updatedCategory.slug}`, { replaceState: true });
  }, 100);
};
</script>

<svelte:head>
  <title>Edit Category - Budget App</title>
  <meta name="description" content="Edit category details" />
</svelte:head>

<div class="container mx-auto space-y-6 py-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" href="/categories/{slug}" class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to Category</span>
      </Button>
      <div>
        <h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <Tag class="text-muted-foreground h-8 w-8" />
          Edit Category
        </h1>
        {#if category}
          <p class="text-muted-foreground mt-1">Update details for {category.name}</p>
        {/if}
      </div>
    </div>
  </div>

  {#if category}
    <!-- Form Card -->
    <Card.Root class="max-w-4xl">
      <Card.Header>
        <Card.Title>Category Information</Card.Title>
        <Card.Description>Update the details for your category.</Card.Description>
      </Card.Header>
      <Card.Content>
        <ManageCategoryForm id={category.id} onSave={handleSave} />
      </Card.Content>
    </Card.Root>
  {:else}
    <Card.Root class="max-w-4xl">
      <Card.Content class="text-muted-foreground py-8 text-center">Category not found</Card.Content>
    </Card.Root>
  {/if}
</div>
