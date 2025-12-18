<script lang="ts">
import { goto } from '$app/navigation';
import { ManageBudgetForm } from '$lib/components/forms';
import { Button } from '$lib/components/ui/button';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import PiggyBank from '@lucide/svelte/icons/piggy-bank';

let { data } = $props();
</script>

<svelte:head>
  <title>Edit Budget - Budget App</title>
  <meta name="description" content="Edit budget details" />
</svelte:head>

<div class="container mx-auto space-y-6 py-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" href="/budgets/{data.budgetSlug}" class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to Budget</span>
      </Button>
      <div>
        <h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <PiggyBank class="text-muted-foreground h-8 w-8" />
          Edit Budget
        </h1>
        <p class="text-muted-foreground mt-1">Update budget configuration and settings</p>
      </div>
    </div>
  </div>

  <!-- Form Component -->
  <ManageBudgetForm
    formData={data.form}
    accounts={data.accounts}
    categories={data.categories}
    budgetId={data.budgetId}
    onCancel={() => goto(`/budgets/${data.budgetSlug}`)} />
</div>
