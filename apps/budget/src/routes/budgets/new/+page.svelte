<script lang="ts">
import {Button} from '$lib/components/ui/button';
import {ManageBudgetForm} from '$lib/components/forms';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import PiggyBank from '@lucide/svelte/icons/piggy-bank';

let {data} = $props();
</script>

<svelte:head>
  <title>New Budget - Budget App</title>
  <meta name="description" content="Create a new budget" />
</svelte:head>

<div class="container mx-auto py-6 space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" href="/budgets" class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to Budgets</span>
      </Button>
      <div>
        <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
          <PiggyBank class="h-8 w-8 text-muted-foreground" />
          New Budget
        </h1>
        <p class="text-muted-foreground mt-1">Create a new budget to track spending</p>
      </div>
    </div>
  </div>

  <!-- Form Component -->
  <ManageBudgetForm
    formData={data.form}
    accounts={data.accounts}
    categories={data.categories}
    onCancel={() => window.location.href = '/budgets'}
  />
</div>
