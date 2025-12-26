<script lang="ts">
import { Label } from '$lib/components/ui/label';
import { Checkbox } from '$lib/components/ui/checkbox';
import * as RadioGroup from '$lib/components/ui/radio-group';
import { onboardingWizardStore } from '$lib/stores/onboarding-wizard.svelte';
import {
  HOUSEHOLD_TYPE_LABELS,
  FINANCIAL_GOAL_LABELS,
  type HouseholdType,
  type FinancialGoal,
} from '$lib/types/onboarding';
import Home from '@lucide/svelte/icons/home';
import Users from '@lucide/svelte/icons/users';
import Target from '@lucide/svelte/icons/target';

const formData = $derived(onboardingWizardStore.typedFormData);

const householdTypes: HouseholdType[] = ['single', 'couple', 'family-small', 'family-large'];
const financialGoals: FinancialGoal[] = ['emergency-fund', 'pay-debt', 'budget-better', 'save-for-goal', 'invest', 'reduce-spending'];

const householdIcons: Record<HouseholdType, string> = {
  single: 'Single person',
  couple: '2 people',
  'family-small': '3-4 people',
  'family-large': '5+ people',
};
</script>

<div class="space-y-8">
  <!-- Household Type -->
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <Home class="h-5 w-5 text-muted-foreground" />
      <Label class="text-base font-medium">Household Type</Label>
    </div>
    <p class="text-muted-foreground text-sm">
      This helps us tailor category suggestions for your situation.
    </p>
    <RadioGroup.Root
      value={formData.householdType}
      onValueChange={(v) => v && onboardingWizardStore.setHouseholdType(v as HouseholdType)}
      class="grid grid-cols-2 gap-4">
      {#each householdTypes as type}
        <div
          class="border-border hover:border-primary flex cursor-pointer items-center space-x-3 rounded-lg border p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <RadioGroup.Item value={type} id={`household-${type}`} />
          <div>
            <Label for={`household-${type}`} class="cursor-pointer font-medium">
              {HOUSEHOLD_TYPE_LABELS[type]}
            </Label>
            <p class="text-muted-foreground text-xs">{householdIcons[type]}</p>
          </div>
        </div>
      {/each}
    </RadioGroup.Root>
  </div>

  <!-- Financial Goals -->
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <Target class="h-5 w-5 text-muted-foreground" />
      <Label class="text-base font-medium">Financial Goals</Label>
    </div>
    <p class="text-muted-foreground text-sm">
      Select all that apply. We'll create relevant budgets and categories.
    </p>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each financialGoals as goal}
        {@const isSelected = formData.financialGoals?.includes(goal) ?? false}
        <div
          class="border-border hover:border-primary flex cursor-pointer items-center space-x-3 rounded-lg border p-4 transition-colors {isSelected ? 'border-primary bg-primary/5' : ''}"
          role="button"
          tabindex="0"
          onclick={() => onboardingWizardStore.toggleFinancialGoal(goal)}
          onkeydown={(e) => e.key === 'Enter' && onboardingWizardStore.toggleFinancialGoal(goal)}>
          <Checkbox checked={isSelected} />
          <Label class="cursor-pointer text-sm">
            {FINANCIAL_GOAL_LABELS[goal]}
          </Label>
        </div>
      {/each}
    </div>
    {#if (formData.financialGoals?.length ?? 0) === 0}
      <p class="text-destructive text-sm">Please select at least one goal.</p>
    {/if}
  </div>
</div>
