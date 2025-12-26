<script lang="ts">
import { Label } from '$lib/components/ui/label';
import * as Select from '$lib/components/ui/select';
import { onboardingWizardStore } from '$lib/stores/onboarding-wizard.svelte';
import Globe from '@lucide/svelte/icons/globe';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import Calendar from '@lucide/svelte/icons/calendar';

const formData = $derived(onboardingWizardStore.typedFormData);

const currencies = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (\u20ac)' },
  { value: 'GBP', label: 'British Pound (\xa3)' },
  { value: 'CAD', label: 'Canadian Dollar (C$)' },
  { value: 'AUD', label: 'Australian Dollar (A$)' },
  { value: 'JPY', label: 'Japanese Yen (\xa5)' },
];

const locales = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-CA', label: 'English (Canada)' },
  { value: 'en-AU', label: 'English (Australia)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'es-MX', label: 'Spanish (Mexico)' },
  { value: 'fr-FR', label: 'French (France)' },
  { value: 'de-DE', label: 'German (Germany)' },
  { value: 'ja-JP', label: 'Japanese (Japan)' },
];

const dateFormats: { value: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'; label: string; example: string }[] = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/31/2024' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '31/12/2024' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2024-12-31' },
];
</script>

<div class="space-y-8">
  <!-- Currency -->
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <DollarSign class="h-5 w-5 text-muted-foreground" />
      <Label class="text-base font-medium">Currency</Label>
    </div>
    <p class="text-muted-foreground text-sm">
      Select your primary currency for budgeting.
    </p>
    <Select.Root type="single" value={formData.currency} onValueChange={(v) => v && onboardingWizardStore.setCurrency(v)}>
      <Select.Trigger class="w-full max-w-xs">
        {currencies.find(c => c.value === formData.currency)?.label ?? 'Select currency'}
      </Select.Trigger>
      <Select.Content>
        {#each currencies as currency}
          <Select.Item value={currency.value}>{currency.label}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>

  <!-- Locale -->
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <Globe class="h-5 w-5 text-muted-foreground" />
      <Label class="text-base font-medium">Language & Region</Label>
    </div>
    <p class="text-muted-foreground text-sm">
      Affects number formatting and display language.
    </p>
    <Select.Root type="single" value={formData.locale} onValueChange={(v) => v && onboardingWizardStore.setLocale(v)}>
      <Select.Trigger class="w-full max-w-xs">
        {locales.find(l => l.value === formData.locale)?.label ?? 'Select locale'}
      </Select.Trigger>
      <Select.Content>
        {#each locales as locale}
          <Select.Item value={locale.value}>{locale.label}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>

  <!-- Date Format -->
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <Calendar class="h-5 w-5 text-muted-foreground" />
      <Label class="text-base font-medium">Date Format</Label>
    </div>
    <p class="text-muted-foreground text-sm">
      Choose how dates are displayed throughout the app.
    </p>
    <div class="grid gap-3 sm:grid-cols-3">
      {#each dateFormats as format}
        {@const isSelected = formData.dateFormat === format.value}
        <button
          type="button"
          class="border-border hover:border-primary flex flex-col items-center gap-1 rounded-lg border p-4 transition-colors {isSelected ? 'border-primary bg-primary/5' : ''}"
          onclick={() => onboardingWizardStore.setDateFormat(format.value)}>
          <span class="font-medium">{format.label}</span>
          <span class="text-muted-foreground text-xs">{format.example}</span>
        </button>
      {/each}
    </div>
  </div>
</div>
