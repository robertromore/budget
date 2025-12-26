<script lang="ts">
import { Label } from '$lib/components/ui/label';
import { Checkbox } from '$lib/components/ui/checkbox';
import { onboardingWizardStore } from '$lib/stores/onboarding-wizard.svelte';
import {
  SPENDING_AREA_LABELS,
  type SpendingArea,
} from '$lib/types/onboarding';
import Home from '@lucide/svelte/icons/home';
import Car from '@lucide/svelte/icons/car';
import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
import Utensils from '@lucide/svelte/icons/utensils';
import Film from '@lucide/svelte/icons/film';
import HeartPulse from '@lucide/svelte/icons/heart-pulse';
import GraduationCap from '@lucide/svelte/icons/graduation-cap';
import User from '@lucide/svelte/icons/user';
import Cat from '@lucide/svelte/icons/cat';
import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
import Plane from '@lucide/svelte/icons/plane';
import Heart from '@lucide/svelte/icons/heart';
import Briefcase from '@lucide/svelte/icons/briefcase';

const formData = $derived(onboardingWizardStore.typedFormData);

const spendingAreas: { area: SpendingArea; icon: typeof Home }[] = [
  { area: 'housing', icon: Home },
  { area: 'transportation', icon: Car },
  { area: 'food-groceries', icon: ShoppingCart },
  { area: 'food-dining', icon: Utensils },
  { area: 'entertainment', icon: Film },
  { area: 'healthcare', icon: HeartPulse },
  { area: 'education', icon: GraduationCap },
  { area: 'personal-care', icon: User },
  { area: 'pets', icon: Cat },
  { area: 'shopping', icon: ShoppingBag },
  { area: 'travel', icon: Plane },
  { area: 'giving', icon: Heart },
  { area: 'business', icon: Briefcase },
];
</script>

<div class="space-y-6">
  <div>
    <Label class="text-base font-medium">What do you typically spend money on?</Label>
    <p class="text-muted-foreground mt-1 text-sm">
      Select all that apply. We'll create categories for each spending area.
    </p>
  </div>

  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
    {#each spendingAreas as { area, icon: Icon }}
      {@const isSelected = formData.spendingAreas?.includes(area) ?? false}
      <div
        class="border-border hover:border-primary flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors {isSelected ? 'border-primary bg-primary/5' : ''}"
        role="button"
        tabindex="0"
        onclick={() => onboardingWizardStore.toggleSpendingArea(area)}
        onkeydown={(e) => e.key === 'Enter' && onboardingWizardStore.toggleSpendingArea(area)}>
        <Icon class="h-6 w-6 {isSelected ? 'text-primary' : 'text-muted-foreground'}" />
        <Label class="cursor-pointer text-sm">
          {SPENDING_AREA_LABELS[area]}
        </Label>
        <Checkbox checked={isSelected} class="sr-only" />
      </div>
    {/each}
  </div>

  {#if (formData.spendingAreas?.length ?? 0) === 0}
    <p class="text-destructive text-sm">Please select at least one spending area.</p>
  {:else}
    <p class="text-muted-foreground text-sm">
      {formData.spendingAreas?.length} spending area{formData.spendingAreas?.length === 1 ? '' : 's'} selected
    </p>
  {/if}
</div>
