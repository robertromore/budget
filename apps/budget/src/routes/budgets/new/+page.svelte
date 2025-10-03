<script lang="ts">
import {Button} from '$lib/components/ui/button';
import {BudgetWizard, WizardFormWrapper, budgetWizardStore} from '$lib/components/wizard';
import {ManageBudgetForm} from '$lib/components/forms';
import {createBudget} from '$lib/query/budgets';
import type {CreateBudgetRequest} from '$lib/server/domains/budgets/services';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import PiggyBank from '@lucide/svelte/icons/piggy-bank';
import {goto} from '$app/navigation';

let {data} = $props();

async function handleComplete(budgetData: CreateBudgetRequest | Record<string, any>) {
  try {
    const result = await createBudget.execute(budgetData as CreateBudgetRequest);
    if (result.data) {
      goto(`/budgets/${result.data.id}`);
    }
  } catch (error) {
    console.error('Failed to create budget:', error);
  }
}
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

  <!-- Budget Creation Form with Manual/Wizard Toggle -->
  <WizardFormWrapper
    title="Create Budget"
    subtitle="Choose between manual form entry or step-by-step wizard"
    wizardStore={budgetWizardStore}
    onComplete={handleComplete}
    onCancel={() => goto('/budgets')}
    defaultMode="wizard"
    persistenceKey="budget-creation-wizard"
  >
    {#snippet formContent()}
      <ManageBudgetForm
        formData={data.form}
        accounts={data.accounts}
        categories={data.categories}
        onCancel={() => goto('/budgets')}
      />
    {/snippet}

    {#snippet wizardContent()}
      <BudgetWizard
        accounts={data.accounts}
        categories={data.categories}
        onComplete={handleComplete}
      />
    {/snippet}
  </WizardFormWrapper>
</div>
