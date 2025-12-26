<script lang="ts">
import { Label } from '$lib/components/ui/label';
import { Input } from '$lib/components/ui/input';
import * as RadioGroup from '$lib/components/ui/radio-group';
import { onboardingWizardStore } from '$lib/stores/onboarding-wizard.svelte';
import {
  INCOME_SOURCE_LABELS,
  INCOME_FREQUENCY_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  type IncomeSource,
  type IncomeFrequency,
  type EmploymentStatus,
} from '$lib/types/onboarding';

const formData = $derived(onboardingWizardStore.typedFormData);

const incomeSources: IncomeSource[] = ['salary', 'freelance', 'multiple', 'investment', 'retirement', 'other'];
const incomeFrequencies: IncomeFrequency[] = ['weekly', 'biweekly', 'semimonthly', 'monthly', 'irregular'];
const employmentStatuses: EmploymentStatus[] = ['employed', 'self-employed', 'retired', 'student', 'unemployed', 'other'];

// Dynamic label for income amount based on frequency
const incomeAmountLabel = $derived.by(() => {
  switch (formData.incomeFrequency) {
    case 'weekly':
      return 'weekly paycheck';
    case 'biweekly':
      return 'bi-weekly paycheck';
    case 'semimonthly':
      return 'semi-monthly paycheck';
    case 'monthly':
      return 'monthly income';
    case 'irregular':
      return 'average monthly income';
    default:
      return 'paycheck';
  }
});
</script>

<div class="space-y-8">
  <!-- Income Source -->
  <div class="space-y-3">
    <Label class="text-base font-medium">Primary Income Source</Label>
    <RadioGroup.Root
      value={formData.incomeSource}
      onValueChange={(v) => v && onboardingWizardStore.setIncomeSource(v as IncomeSource)}
      class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {#each incomeSources as source}
        <div class="flex items-center space-x-2">
          <RadioGroup.Item value={source} id={`income-${source}`} />
          <Label for={`income-${source}`} class="cursor-pointer text-sm">
            {INCOME_SOURCE_LABELS[source]}
          </Label>
        </div>
      {/each}
    </RadioGroup.Root>
  </div>

  <!-- Income Frequency -->
  <div class="space-y-3">
    <Label class="text-base font-medium">How often do you get paid?</Label>
    <RadioGroup.Root
      value={formData.incomeFrequency}
      onValueChange={(v) => v && onboardingWizardStore.setIncomeFrequency(v as IncomeFrequency)}
      class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {#each incomeFrequencies as freq}
        <div class="flex items-center space-x-2">
          <RadioGroup.Item value={freq} id={`freq-${freq}`} />
          <Label for={`freq-${freq}`} class="cursor-pointer text-sm">
            {INCOME_FREQUENCY_LABELS[freq]}
          </Label>
        </div>
      {/each}
    </RadioGroup.Root>
  </div>

  <!-- Primary Income Amount (Optional) -->
  <div class="space-y-3">
    <Label for="income-amount" class="text-base font-medium">
      How much is your {incomeAmountLabel}? <span class="text-muted-foreground text-sm">(optional)</span>
    </Label>
    <p class="text-muted-foreground text-sm">
      Enter your take-home pay (after taxes). This helps us suggest appropriate budget amounts.
    </p>
    <div class="flex items-center gap-2">
      <span class="text-muted-foreground">$</span>
      <Input
        id="income-amount"
        type="number"
        placeholder="e.g., 3500"
        value={formData.primaryIncomeAmount ?? ''}
        oninput={(e) => {
          const val = e.currentTarget.value;
          onboardingWizardStore.setPrimaryIncomeAmount(val ? parseFloat(val) : undefined);
        }}
        class="max-w-xs"
      />
    </div>
  </div>

  <!-- Employment Status -->
  <div class="space-y-3">
    <Label class="text-base font-medium">Employment Status</Label>
    <RadioGroup.Root
      value={formData.employmentStatus}
      onValueChange={(v) => v && onboardingWizardStore.setEmploymentStatus(v as EmploymentStatus)}
      class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {#each employmentStatuses as status}
        <div class="flex items-center space-x-2">
          <RadioGroup.Item value={status} id={`emp-${status}`} />
          <Label for={`emp-${status}`} class="cursor-pointer text-sm">
            {EMPLOYMENT_STATUS_LABELS[status]}
          </Label>
        </div>
      {/each}
    </RadioGroup.Root>
  </div>
</div>
