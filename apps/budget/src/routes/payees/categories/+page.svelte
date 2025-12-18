<script lang="ts">
import ManagePayeeCategoryForm from '$lib/components/forms/manage-payee-category-form.svelte';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Empty from '$lib/components/ui/empty';
import { getIconByName } from '$lib/components/ui/icon-picker/icon-categories';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import * as Sheet from '$lib/components/ui/sheet';
import * as Table from '$lib/components/ui/table';
import { rpc } from '$lib/query';
import { deletePayeeCategory, getUncategorizedPayeesCount } from '$lib/query/payee-categories';
import type { PayeeCategory } from '$lib/schema';
import type { PayeeCategoryWithCounts } from '$lib/server/domains/payee-categories/repository';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import FolderOpen from '@lucide/svelte/icons/folder-open';
import Lightbulb from '@lucide/svelte/icons/lightbulb';
import Pencil from '@lucide/svelte/icons/pencil';
import Plus from '@lucide/svelte/icons/plus';
import Trash2 from '@lucide/svelte/icons/trash-2';
import SeedDefaultPayeeCategoriesButton from './(components)/seed-default-payee-categories-button.svelte';
import UncategorizedPayeesSheet from './(components)/uncategorized-payees-sheet.svelte';

// Fetch categories with counts
const categoriesWithCountsQuery = rpc.payeeCategories.listPayeeCategoriesWithCounts().options();
const categoriesWithCounts = $derived(categoriesWithCountsQuery.data ?? []);

// Fetch uncategorized payees count
const uncategorizedCountQuery = getUncategorizedPayeesCount().options();
const uncategorizedCount = $derived(uncategorizedCountQuery.data ?? 0);

// Computed values
const sortedCategories = $derived(
  categoriesWithCounts.slice().sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    return (a.name || '').localeCompare(b.name || '');
  })
);

const hasNoCategories = $derived(categoriesWithCounts.length === 0);

// Dialog states
let editDialogOpen = $state(false);
let selectedCategory = $state<PayeeCategory | undefined>(undefined);
let deleteDialogOpen = $state(false);
let categoryToDelete = $state<PayeeCategoryWithCounts | undefined>(undefined);
let uncategorizedSheetOpen = $state(false);

// Mutations
const deleteMutation = deletePayeeCategory.options();

const handleCreate = () => {
  selectedCategory = undefined;
  editDialogOpen = true;
};

const handleEdit = (category: PayeeCategory) => {
  selectedCategory = category;
  editDialogOpen = true;
};

const handleDelete = (category: PayeeCategoryWithCounts) => {
  categoryToDelete = category;
  deleteDialogOpen = true;
};

const confirmDelete = async () => {
  if (!categoryToDelete) return;

  try {
    await deleteMutation.mutateAsync(categoryToDelete.id);
    deleteDialogOpen = false;
    categoryToDelete = undefined;
  } catch {
    // Error is handled by mutation
  }
};

const handleSaveSuccess = () => {
  editDialogOpen = false;
  selectedCategory = undefined;
};

const handleDeleteSuccess = (id: number) => {
  editDialogOpen = false;
  selectedCategory = undefined;
};
</script>

<svelte:head>
  <title>Payee Categories - Budget App</title>
  <meta name="description" content="Manage your payee organization categories" />
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <div class="mb-2 flex items-center gap-2">
        <Button variant="ghost" size="sm" href="/payees">
          <ArrowLeft class="mr-2 h-4 w-4" />
          Back to Payees
        </Button>
      </div>
      <h1 class="text-2xl font-bold tracking-tight">Payee Categories</h1>
      <p class="text-muted-foreground">Organize your payees by creating custom categories</p>
    </div>
    <div class="flex items-center gap-2">
      {#if uncategorizedCount > 0}
        <Button variant="outline" onclick={() => (uncategorizedSheetOpen = true)}>
          <Lightbulb class="mr-2 h-4 w-4" />
          Review Uncategorized
          <Badge variant="secondary" class="ml-2">
            {uncategorizedCount}
          </Badge>
        </Button>
      {/if}
      <SeedDefaultPayeeCategoriesButton
        onCategoriesAdded={() => categoriesWithCountsQuery.refetch()} />
      <Button onclick={handleCreate}>
        <Plus class="mr-2 h-4 w-4" />
        Add Category
      </Button>
    </div>
  </div>

  {#if hasNoCategories}
    <!-- Empty State -->
    <Empty.Empty>
      <Empty.EmptyMedia variant="icon">
        <FolderOpen class="h-12 w-12" />
      </Empty.EmptyMedia>
      <Empty.EmptyHeader>
        <Empty.EmptyTitle>No payee categories yet</Empty.EmptyTitle>
        <Empty.EmptyDescription>
          Create your first category to organize your payees
        </Empty.EmptyDescription>
      </Empty.EmptyHeader>
      <Empty.EmptyContent>
        <Button onclick={handleCreate}>
          <Plus class="mr-2 h-4 w-4" />
          Create Category
        </Button>
      </Empty.EmptyContent>
    </Empty.Empty>
  {:else}
    <!-- Categories Table -->
    <Card.Root>
      <Card.Content class="p-0">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head class="w-12"></Table.Head>
              <Table.Head>Name</Table.Head>
              <Table.Head>Description</Table.Head>
              <Table.Head class="text-center">Payees</Table.Head>
              <Table.Head class="text-center">Status</Table.Head>
              <Table.Head class="text-right">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each sortedCategories as category}
              <Table.Row>
                <Table.Cell>
                  <div class="flex items-center justify-center">
                    {#if category.icon}
                      {@const iconData = getIconByName(category.icon)}
                      <div
                        class="flex h-8 w-8 items-center justify-center rounded-md"
                        style={category.color ? `background-color: ${category.color}20` : ''}>
                        {#if iconData?.icon}
                          <iconData.icon
                            class="h-5 w-5"
                            style={category.color ? `color: ${category.color}` : ''} />
                        {:else}
                          <FolderOpen class="text-muted-foreground h-4 w-4" />
                        {/if}
                      </div>
                    {:else}
                      <FolderOpen class="text-muted-foreground h-4 w-4" />
                    {/if}
                  </div>
                </Table.Cell>
                <Table.Cell class="font-medium">
                  <div class="flex items-center gap-2">
                    {category.name}
                    {#if category.color}
                      <div
                        class="h-3 w-3 rounded-full border"
                        style={`background-color: ${category.color}`}>
                      </div>
                    {/if}
                  </div>
                </Table.Cell>
                <Table.Cell class="text-muted-foreground">
                  {category.description || '—'}
                </Table.Cell>
                <Table.Cell class="text-center">
                  <Badge variant="secondary">
                    {category.payeeCount}
                  </Badge>
                </Table.Cell>
                <Table.Cell class="text-center">
                  {#if category.isActive}
                    <Badge variant="default">Active</Badge>
                  {:else}
                    <Badge variant="secondary">Inactive</Badge>
                  {/if}
                </Table.Cell>
                <Table.Cell class="text-right">
                  <div class="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onclick={() => handleEdit(category)}>
                      <Pencil class="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onclick={() => handleDelete(category)}>
                      <Trash2 class="text-destructive h-4 w-4" />
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>
  {/if}
</div>

<!-- Edit Sheet -->
<ResponsiveSheet bind:open={editDialogOpen}>
  {#snippet header()}
    <Sheet.Title>
      {selectedCategory ? 'Edit' : 'Create'} Payee Category
    </Sheet.Title>
    <Sheet.Description>
      {selectedCategory
        ? 'Update the category details below'
        : 'Create a new category to organize your payees'}
    </Sheet.Description>
  {/snippet}

  {#snippet content()}
    <ManagePayeeCategoryForm
      id={selectedCategory?.id}
      initialData={selectedCategory}
      onSave={handleSaveSuccess}
      onDelete={handleDeleteSuccess}
      onCancel={() => (editDialogOpen = false)} />
  {/snippet}
</ResponsiveSheet>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Payee Category?</AlertDialog.Title>
      <AlertDialog.Description>
        {#if categoryToDelete}
          Are you sure you want to delete "{categoryToDelete.name}"?
          {#if categoryToDelete.payeeCount && categoryToDelete.payeeCount > 0}
            This will unassign {categoryToDelete.payeeCount} payee{categoryToDelete.payeeCount === 1
              ? ''
              : 's'} from this category.
          {/if}
          This action cannot be undone.
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action class="bg-destructive hover:bg-destructive/90" onclick={confirmDelete}>
        Delete
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Uncategorized Payees Sheet -->
<UncategorizedPayeesSheet
  bind:open={uncategorizedSheetOpen}
  onOpenChange={(open) => {
    uncategorizedSheetOpen = open;
    if (!open) {
      // Refetch queries when sheet closes
      uncategorizedCountQuery.refetch();
      categoriesWithCountsQuery.refetch();
    }
  }}
  {uncategorizedCount} />
