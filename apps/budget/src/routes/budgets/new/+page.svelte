<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { ManageBudgetForm } from '$lib/components/forms';
import { Button } from '$lib/components/ui/button';
import { getBudgetTemplateById } from '$lib/constants/budget-templates';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import PiggyBank from '@lucide/svelte/icons/piggy-bank';

import { browser } from '$app/environment';

let { data } = $props();

// Get returnTo parameter from URL
const returnTo = $derived(page.url.searchParams.get('returnTo') || '/budgets');

// Check for template ID in URL params and get template from constants
const templateId = $state(
  browser ? new URLSearchParams(window.location.search).get('templateId') : null
);
const selectedTemplate = $derived(templateId ? getBudgetTemplateById(templateId) : null);

// Merge template data with form data when template is loaded
const formData = $derived.by(() => {
  if (selectedTemplate && data.form) {
    // Merge template values into form data
    return {
      ...data.form,
      data: {
        ...data.form.data,
        name: selectedTemplate.name,
        description: selectedTemplate.description || '',
        type: selectedTemplate.type,
        scope: selectedTemplate.scope,
        enforcementLevel: selectedTemplate.enforcementLevel,
        allocatedAmount: selectedTemplate.suggestedAmount || 0,
        ...((selectedTemplate.metadata as Record<string, any>) || {}),
      },
    };
  }
  return data.form;
});
</script>

<svelte:head>
  <title>New Budget - Budget App</title>
  <meta name="description" content="Create a new budget" />
</svelte:head>

<div class="container mx-auto space-y-6 py-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" href={returnTo} class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back</span>
      </Button>
      <div>
        <h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <PiggyBank class="text-muted-foreground h-8 w-8" />
          New Budget
        </h1>
        <p class="text-muted-foreground mt-1">Create a new budget to track spending</p>
      </div>
    </div>
  </div>

  <!-- Budget Creation Form -->
  {#if selectedTemplate}
    <p class="text-muted-foreground text-sm">Using template: {selectedTemplate.name}</p>
  {/if}

  <ManageBudgetForm
    formData={formData}
    accounts={data.accounts}
    categories={data.categories}
    schedules={data.schedules}
    onCancel={() => goto(returnTo)} />
</div>
