<script lang="ts">
import { Label } from '$lib/components/ui/label';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { onboardingWizardStore } from '$lib/stores/onboarding-wizard.svelte';
import {
  INCOME_SOURCE_LABELS,
  INCOME_FREQUENCY_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  HOUSEHOLD_TYPE_LABELS,
  FINANCIAL_GOAL_LABELS,
  ACCOUNT_TYPE_LABELS,
  SPENDING_AREA_LABELS,
  DEBT_TYPE_LABELS,
} from '$lib/types/onboarding';
import Edit from '@lucide/svelte/icons/edit';
import Check from '@lucide/svelte/icons/check';
import Sparkles from '@lucide/svelte/icons/sparkles';

const formData = $derived(onboardingWizardStore.typedFormData);
const isComplete = $derived(onboardingWizardStore.validateStep('review', onboardingWizardStore.formData));

function goToStep(index: number) {
  onboardingWizardStore.goToStep(index);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="text-center">
    <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
      <Sparkles class="h-6 w-6 text-primary" />
    </div>
    <h3 class="text-lg font-semibold">Review Your Setup</h3>
    <p class="text-muted-foreground mt-1 text-sm">
      Here's what we'll set up for you. Click any section to make changes.
    </p>
  </div>

  <!-- Summary Sections -->
  <div class="grid gap-4 sm:grid-cols-2">
    <!-- Income -->
    <div class="group relative rounded-lg border p-4">
      <button
        type="button"
        class="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100"
        onclick={() => goToStep(0)}>
        <Edit class="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </button>
      <Label class="text-sm font-medium text-muted-foreground">Income</Label>
      <div class="mt-2 space-y-1">
        <p>{INCOME_SOURCE_LABELS[formData.incomeSource!]} · {INCOME_FREQUENCY_LABELS[formData.incomeFrequency!]}</p>
        <p class="text-muted-foreground text-sm">{EMPLOYMENT_STATUS_LABELS[formData.employmentStatus!]}</p>
        {#if formData.primaryIncomeAmount}
          <p class="text-muted-foreground text-sm">~{formatCurrency(formData.primaryIncomeAmount)} per period</p>
        {/if}
      </div>
    </div>

    <!-- Household & Goals -->
    <div class="group relative rounded-lg border p-4">
      <button
        type="button"
        class="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100"
        onclick={() => goToStep(1)}>
        <Edit class="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </button>
      <Label class="text-sm font-medium text-muted-foreground">Household & Goals</Label>
      <div class="mt-2 space-y-2">
        <p>{HOUSEHOLD_TYPE_LABELS[formData.householdType!]}</p>
        <div class="flex flex-wrap gap-1">
          {#each formData.financialGoals ?? [] as goal}
            <Badge variant="secondary" class="text-xs">{FINANCIAL_GOAL_LABELS[goal]}</Badge>
          {/each}
        </div>
      </div>
    </div>

    <!-- Accounts -->
    <div class="group relative rounded-lg border p-4">
      <button
        type="button"
        class="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100"
        onclick={() => goToStep(2)}>
        <Edit class="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </button>
      <Label class="text-sm font-medium text-muted-foreground">Accounts to Create</Label>
      <div class="mt-2 flex flex-wrap gap-1">
        {#each formData.accountsToTrack ?? [] as account}
          <Badge variant="outline" class="text-xs">{ACCOUNT_TYPE_LABELS[account]}</Badge>
        {/each}
      </div>
    </div>

    <!-- Spending Categories -->
    <div class="group relative rounded-lg border p-4">
      <button
        type="button"
        class="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100"
        onclick={() => goToStep(3)}>
        <Edit class="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </button>
      <Label class="text-sm font-medium text-muted-foreground">Spending Categories</Label>
      <div class="mt-2 flex flex-wrap gap-1">
        {#each formData.spendingAreas ?? [] as area}
          <Badge variant="outline" class="text-xs">{SPENDING_AREA_LABELS[area]}</Badge>
        {/each}
      </div>
    </div>

    <!-- Debt (if any) -->
    {#if formData.hasDebt && (formData.debtOverview?.length ?? 0) > 0}
      <div class="group relative rounded-lg border p-4">
        <button
          type="button"
          class="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100"
          onclick={() => goToStep(4)}>
          <Edit class="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </button>
        <Label class="text-sm font-medium text-muted-foreground">Debt Tracking</Label>
        <div class="mt-2 space-y-1">
          {#each formData.debtOverview ?? [] as debt}
            <p class="text-sm">
              {DEBT_TYPE_LABELS[debt.type]}: {formatCurrency(debt.approximateAmount)}
              {#if debt.interestRate}
                <span class="text-muted-foreground">({debt.interestRate}% APR)</span>
              {/if}
            </p>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Preferences -->
    <div class="group relative rounded-lg border p-4">
      <button
        type="button"
        class="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100"
        onclick={() => goToStep(5)}>
        <Edit class="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </button>
      <Label class="text-sm font-medium text-muted-foreground">Preferences</Label>
      <div class="mt-2 text-sm">
        <p>{formData.currency} · {formData.locale} · {formData.dateFormat}</p>
      </div>
    </div>
  </div>

  <!-- What happens next -->
  <div class="bg-primary/5 rounded-lg border border-primary/20 p-4">
    <h4 class="font-medium">What happens when you complete setup:</h4>
    <ul class="mt-2 space-y-1 text-sm text-muted-foreground">
      <li class="flex items-center gap-2">
        <Check class="h-4 w-4 text-green-500" />
        Create {formData.accountsToTrack?.length ?? 0} starter accounts
      </li>
      <li class="flex items-center gap-2">
        <Check class="h-4 w-4 text-green-500" />
        Set up {formData.spendingAreas?.length ?? 0}+ spending categories
      </li>
      <li class="flex items-center gap-2">
        <Check class="h-4 w-4 text-green-500" />
        Configure your currency and date preferences
      </li>
      <li class="flex items-center gap-2">
        <Check class="h-4 w-4 text-green-500" />
        Start a guided tour of the app
      </li>
    </ul>
  </div>

  {#if !isComplete}
    <p class="text-destructive text-center text-sm">
      Please complete all required steps before finishing.
    </p>
  {/if}
</div>
