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

$inspect('BudgetNew data:', data);
$inspect('BudgetNew form.data:', data.form.data);

// Set up mutation during component initialization
const createBudgetMutation = createBudget.options();

async function handleComplete(budgetData: CreateBudgetRequest | Record<string, any>) {
  try {
    // Cast to Record to access wizard-specific fields
    const wizardData = budgetData as Record<string, any>;

    // Transform flat form data to CreateBudgetRequest with nested metadata
    const metadata: Record<string, any> = {
      defaultPeriod: {
        type: wizardData['periodType'] || 'monthly',
        startDay: wizardData['startDay'] || 1,
      },
    };

    if (wizardData['allocatedAmount'] !== undefined) {
      metadata['allocatedAmount'] = wizardData['allocatedAmount'];
    }

    const transformedData: CreateBudgetRequest = {
      name: wizardData['name'],
      description: wizardData['description'] || null,
      type: wizardData['type'],
      scope: wizardData['scope'],
      status: wizardData['status'] || 'active',
      enforcementLevel: wizardData['enforcementLevel'] || 'warning',
      metadata,
      accountIds: wizardData['accountIds'] || [],
      categoryIds: wizardData['categoryIds'] || [],
    };

    const result = await createBudgetMutation.mutateAsync(transformedData);
    if (result) {
      goto(`/budgets/${result.id}`);
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
        initialData={data.form.data}
        accounts={data.accounts}
        categories={data.categories}
        onComplete={handleComplete}
      />
    {/snippet}
  </WizardFormWrapper>
</div>
