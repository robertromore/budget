<script lang="ts">
import { Label } from '$lib/components/ui/label';
import { Checkbox } from '$lib/components/ui/checkbox';
import { onboardingWizardStore } from '$lib/stores/onboarding-wizard.svelte';
import {
  ACCOUNT_TYPE_LABELS,
  type AccountToTrack,
} from '$lib/types/onboarding';
import Landmark from '@lucide/svelte/icons/landmark';
import PiggyBank from '@lucide/svelte/icons/piggy-bank';
import CreditCard from '@lucide/svelte/icons/credit-card';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import HeartPulse from '@lucide/svelte/icons/heart-pulse';
import FileText from '@lucide/svelte/icons/file-text';
import Home from '@lucide/svelte/icons/home';
import Zap from '@lucide/svelte/icons/zap';

const formData = $derived(onboardingWizardStore.typedFormData);

const accountTypes: { type: AccountToTrack; icon: typeof Landmark; description: string }[] = [
  { type: 'checking', icon: Landmark, description: 'Primary bank account for daily transactions' },
  { type: 'savings', icon: PiggyBank, description: 'Savings accounts for goals and emergencies' },
  { type: 'credit-card', icon: CreditCard, description: 'Credit cards to track spending and debt' },
  { type: 'investment', icon: TrendingUp, description: 'Brokerage and investment accounts' },
  { type: 'hsa', icon: HeartPulse, description: 'Health Savings or Flexible Spending Account' },
  { type: 'loan', icon: FileText, description: 'Student loans, auto loans, personal loans' },
  { type: 'mortgage', icon: Home, description: 'Home mortgage tracking' },
  { type: 'utility', icon: Zap, description: 'Track utility bills and usage (electric, gas, water)' },
];
</script>

<div class="space-y-6">
  <div>
    <Label class="text-base font-medium">What types of accounts do you want to track?</Label>
    <p class="text-muted-foreground mt-1 text-sm">
      Select the types of accounts you'd like to manage. We'll create starter accounts for each.
    </p>
  </div>

  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each accountTypes as { type, icon: Icon, description }}
      {@const isSelected = formData.accountsToTrack?.includes(type) ?? false}
      <div
        class="border-border hover:border-primary flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors {isSelected ? 'border-primary bg-primary/5' : ''}"
        role="button"
        tabindex="0"
        onclick={() => onboardingWizardStore.toggleAccountType(type)}
        onkeydown={(e) => e.key === 'Enter' && onboardingWizardStore.toggleAccountType(type)}>
        <Checkbox checked={isSelected} class="mt-1" />
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <Icon class="h-4 w-4 text-muted-foreground" />
            <Label class="cursor-pointer font-medium">
              {ACCOUNT_TYPE_LABELS[type]}
            </Label>
          </div>
          <p class="text-muted-foreground mt-1 text-xs">
            {description}
          </p>
        </div>
      </div>
    {/each}
  </div>

  {#if (formData.accountsToTrack?.length ?? 0) === 0}
    <p class="text-destructive text-sm">Please select at least one account type.</p>
  {:else}
    <p class="text-muted-foreground text-sm">
      {formData.accountsToTrack?.length} account type{formData.accountsToTrack?.length === 1 ? '' : 's'} selected
    </p>
  {/if}
</div>
