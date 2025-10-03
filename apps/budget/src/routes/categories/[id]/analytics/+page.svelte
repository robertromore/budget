<script lang="ts">
import {page} from '$app/state';
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import Calendar from '@lucide/svelte/icons/calendar';
import type {PageData} from './$types';

let {data}: {data: PageData} = $props();

const categoryId = $derived(Number(page.params.id));
const category = $derived(data.category);
</script>

<svelte:head>
  <title>{category?.name || 'Category'} Analytics - Budget App</title>
  <meta name="description" content="View category analytics and spending insights" />
</svelte:head>

<div class="container mx-auto py-6 space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" href="/categories/{categoryId}" class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to Category</span>
      </Button>
      {#if category}
        <div>
          <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 class="h-8 w-8 text-muted-foreground" />
            {category.name} Analytics
          </h1>
          <p class="text-muted-foreground mt-1">Spending trends and insights</p>
        </div>
      {/if}
    </div>
  </div>

  {#if category}
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
          <p class="text-xs text-muted-foreground mt-1">All time</p>
        </Card.Content>
      </Card.Root>

      <!-- Monthly Average Card -->
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2 text-sm font-medium">
            <Calendar class="h-4 w-4" />
            Monthly Average
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">Coming soon</div>
          <p class="text-xs text-muted-foreground mt-1">Last 12 months</p>
        </Card.Content>
      </Card.Root>

      <!-- Transaction Count Card -->
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2 text-sm font-medium">
            <BarChart3 class="h-4 w-4" />
            Transactions
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">Coming soon</div>
          <p class="text-xs text-muted-foreground mt-1">Total count</p>
        </Card.Content>
      </Card.Root>

      <!-- Trend Card -->
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2 text-sm font-medium">
            <TrendingUp class="h-4 w-4" />
            Trend
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">Coming soon</div>
          <p class="text-xs text-muted-foreground mt-1">vs last month</p>
        </Card.Content>
      </Card.Root>
    </div>

    <!-- Spending Over Time Chart -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Spending Over Time</Card.Title>
        <Card.Description>
          Monthly spending trend for this category
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="h-64 flex items-center justify-center text-muted-foreground">
          Chart integration coming soon
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Top Payees -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Top Payees</Card.Title>
        <Card.Description>
          Most frequent payees in this category
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="text-center text-muted-foreground py-8">
          Payee integration coming soon
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