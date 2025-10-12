<script lang="ts">
import {goto} from '$app/navigation';
import {page} from '$app/state';
import {Button, buttonVariants} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import {Separator} from '$lib/components/ui/separator';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import SquarePen from '@lucide/svelte/icons/square-pen';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import Tag from '@lucide/svelte/icons/tag';
import Trash2 from '@lucide/svelte/icons/trash-2';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Receipt from '@lucide/svelte/icons/receipt';
import Wallet from '@lucide/svelte/icons/wallet';
import type {PageData} from './$types';
import {CategoriesState} from '$lib/states/entities/categories.svelte';
import {formatCurrency} from '$lib/utils/formatters';

let {data}: {data: PageData} = $props();

const slug = $derived(page.params['slug']);
const category = $derived(data.category);
const categoriesState = CategoriesState.get();

let deleteDialogOpen = $state(false);
let isDeleting = $state(false);

const handleDelete = async () => {
  if (isDeleting || !category) return;

  isDeleting = true;
  try {
    await categoriesState.deleteCategory(category.id);
    deleteDialogOpen = false;
    goto('/categories');
  } catch (error) {
    console.error('Failed to delete category:', error);
    isDeleting = false;
  }
};
</script>

<svelte:head>
  <title>{category?.name || 'Category'} - Budget App</title>
  <meta name="description" content="View category details" />
</svelte:head>

<div class="container mx-auto py-6 space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" href="/categories" class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to Categories</span>
      </Button>
      {#if category}
        <div>
          <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Tag class="h-8 w-8 text-muted-foreground" />
            {category.name}
          </h1>
          <p class="text-muted-foreground mt-1">Category details and statistics</p>
        </div>
      {/if}
    </div>
    {#if category}
      <div class="flex items-center gap-2">
        <Button variant="outline" href="/categories/{slug}/analytics">
          <BarChart3 class="mr-2 h-4 w-4" />
          View Analytics
        </Button>
        <Button variant="outline" href="/categories/{slug}/edit">
          <SquarePen class="mr-2 h-4 w-4" />
          Edit
        </Button>
        <Button variant="destructive" onclick={() => deleteDialogOpen = true}>
          <Trash2 class="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>
    {/if}
  </div>

  {#if category}
    <div class="grid gap-6 md:grid-cols-2">
      <!-- Basic Information Card -->
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Tag class="h-5 w-5" />
            Basic Information
          </Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
          <div>
            <div class="text-sm text-muted-foreground">Name</div>
            <div class="font-medium">{category.name}</div>
          </div>

          {#if category.notes}
            <Separator />
            <div>
              <div class="text-sm text-muted-foreground">Notes</div>
              <div class="text-sm mt-1">{category.notes}</div>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>

      <!-- Statistics Card -->
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <TrendingUp class="h-5 w-5" />
            Statistics
          </Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="text-sm text-muted-foreground">Total Transactions</div>
            <div class="font-medium">Coming soon</div>
          </div>

          <Separator />

          <div class="flex items-center justify-between">
            <div class="text-sm text-muted-foreground">Total Amount</div>
            <div class="font-medium">Coming soon</div>
          </div>

          <Separator />

          <div class="flex items-center justify-between">
            <div class="text-sm text-muted-foreground">Average Transaction</div>
            <div class="font-medium">Coming soon</div>
          </div>
        </Card.Content>
      </Card.Root>
    </div>

    <!-- Budget Allocations Card -->
    {#if category.budgets && category.budgets.length > 0}
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Wallet class="h-5 w-5" />
            Budget Allocations
          </Card.Title>
          <Card.Description>
            Envelope allocations for this category across budgets
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="space-y-4">
            {#each category.budgets as budget}
              <div class="rounded-lg border p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <a
                    href="/budgets/{budget.budgetSlug}"
                    class="font-medium hover:underline"
                  >
                    {budget.budgetName}
                  </a>
                  <span class="text-xs px-2 py-1 rounded-full bg-muted">
                    {budget.status}
                  </span>
                </div>

                <Separator />

                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div class="text-muted-foreground">Allocated</div>
                    <div class="font-medium">{formatCurrency(budget.allocatedAmount)}</div>
                  </div>
                  <div>
                    <div class="text-muted-foreground">Spent</div>
                    <div class="font-medium">{formatCurrency(budget.spentAmount)}</div>
                  </div>
                  <div>
                    <div class="text-muted-foreground">Available</div>
                    <div class="font-medium" class:text-green-600={budget.availableAmount > 0} class:text-red-600={budget.availableAmount < 0}>
                      {formatCurrency(budget.availableAmount)}
                    </div>
                  </div>
                  <div>
                    <div class="text-muted-foreground">Rollover</div>
                    <div class="font-medium">{formatCurrency(budget.rolloverAmount)}</div>
                  </div>
                </div>

                {#if budget.deficitAmount !== 0}
                  <div class="pt-2 border-t">
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-muted-foreground">Deficit</span>
                      <span class="font-medium text-red-600">{formatCurrency(budget.deficitAmount)}</span>
                    </div>
                  </div>
                {/if}

                {#if budget.lastCalculated}
                  <div class="text-xs text-muted-foreground">
                    Last calculated: {new Date(budget.lastCalculated).toLocaleString()}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Recent Transactions Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Receipt class="h-5 w-5" />
          Recent Transactions
        </Card.Title>
        <Card.Description>
          Transactions using this category
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="text-center text-muted-foreground py-8">
          Transaction integration coming soon
        </div>
      </Card.Content>
    </Card.Root>
  {:else}
    <Card.Root class="max-w-4xl">
      <Card.Content class="py-8 text-center text-muted-foreground">
        Category not found
      </Card.Content>
    </Card.Root>
  {/if}
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Category</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete "{category?.name}"? This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={handleDelete} disabled={isDeleting} class={buttonVariants({variant: 'destructive'})}>
        {isDeleting ? 'Deleting...' : 'Delete'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
