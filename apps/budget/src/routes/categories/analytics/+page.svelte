<script lang="ts">
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import PieChart from '@lucide/svelte/icons/pie-chart';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import {CategoriesState} from '$lib/states/entities/categories.svelte';

const categoriesState = $derived(CategoriesState.get());
const categories = $derived(Array.from(categoriesState.categories.values()));
</script>

<svelte:head>
  <title>Category Analytics - Budget App</title>
  <meta name="description" content="View category analytics and spending breakdown" />
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
          <BarChart3 class="h-8 w-8 text-muted-foreground" />
          Category Analytics
        </h1>
        <p class="text-muted-foreground mt-1">Overview of all category spending and trends</p>
      </div>
    </div>
  </div>

  <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
    <!-- Total Categories Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title class="flex items-center gap-2 text-sm font-medium">
          <PieChart class="h-4 w-4" />
          Total Categories
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{categories.length}</div>
        <p class="text-xs text-muted-foreground mt-1">Active categories</p>
      </Card.Content>
    </Card.Root>

    <!-- Total Spending Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title class="flex items-center gap-2 text-sm font-medium">
          <DollarSign class="h-4 w-4" />
          Total Spending
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">Coming soon</div>
        <p class="text-xs text-muted-foreground mt-1">All categories</p>
      </Card.Content>
    </Card.Root>

    <!-- Top Category Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title class="flex items-center gap-2 text-sm font-medium">
          <TrendingUp class="h-4 w-4" />
          Top Category
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">Coming soon</div>
        <p class="text-xs text-muted-foreground mt-1">Highest spending</p>
      </Card.Content>
    </Card.Root>

    <!-- Average per Category Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title class="flex items-center gap-2 text-sm font-medium">
          <BarChart3 class="h-4 w-4" />
          Average per Category
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">Coming soon</div>
        <p class="text-xs text-muted-foreground mt-1">Monthly average</p>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Category Breakdown Chart -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Category Spending Breakdown</Card.Title>
      <Card.Description>
        Compare spending across all categories
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="h-64 flex items-center justify-center text-muted-foreground">
        Chart integration coming soon
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Spending Trends -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Category Trends Over Time</Card.Title>
      <Card.Description>
        Monthly spending trends by category
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="h-64 flex items-center justify-center text-muted-foreground">
        Chart integration coming soon
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Category List with Stats -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Category Statistics</Card.Title>
      <Card.Description>
        Detailed breakdown by category
      </Card.Description>
    </Card.Header>
    <Card.Content>
      {#if categories.length > 0}
        <div class="space-y-4">
          {#each categories as category}
            <div class="flex items-center justify-between p-3 rounded-lg border">
              <div class="flex-1">
                <a href="/categories/{category.slug}" class="font-medium hover:text-primary">
                  {category.name}
                </a>
                {#if category.notes}
                  <p class="text-sm text-muted-foreground">{category.notes.substring(0, 60)}{category.notes.length > 60 ? '...' : ''}</p>
                {/if}
              </div>
              <div class="text-right">
                <div class="font-medium">Coming soon</div>
                <p class="text-xs text-muted-foreground">Total spent</p>
              </div>
              <Button variant="ghost" size="sm" href="/categories/{category.slug}/analytics" class="ml-4">
                <BarChart3 class="h-4 w-4" />
              </Button>
            </div>
          {/each}
        </div>
      {:else}
        <div class="text-center text-muted-foreground py-8">
          No categories found. Create your first category to start tracking spending.
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
</div>