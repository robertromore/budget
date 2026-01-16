<script lang="ts">
import { goto, invalidateAll } from '$app/navigation';
import { accountKeys, cachePatterns, categoryKeys } from '$lib/query';
import { WizardStep, WizardProgress } from '$lib/components/wizard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
import { Button } from '$lib/components/ui/button';
import { onboardingWizardStore, ONBOARDING_STEPS } from '$lib/stores/onboarding-wizard.svelte';
import { trpc } from '$lib/trpc/client';
import { toast } from '$lib/utils/toast-interceptor';
import { onMount } from 'svelte';

// Import wizard step components
import {
  IncomeStep,
  HouseholdStep,
  AccountsStep,
  SpendingStep,
  DebtStep,
  PreferencesStep,
  ReviewStep,
} from './wizard-steps';

import Sparkles from '@lucide/svelte/icons/sparkles';
import Loader2 from '@lucide/svelte/icons/loader-2';

interface Props {
  onComplete?: () => void;
}

let { onComplete }: Props = $props();

let isSubmitting = $state(false);
let submitError = $state<string | null>(null);

const currentStep = $derived(onboardingWizardStore.currentStep);
const isReviewStep = $derived(currentStep?.id === 'review');
const canComplete = $derived(onboardingWizardStore.validateStep('review', onboardingWizardStore.formData));

onMount(() => {
  // Initialize the wizard
  onboardingWizardStore.initializeOnboarding();
});

async function handleComplete() {
  if (!canComplete || isSubmitting) return;

  try {
    isSubmitting = true;
    submitError = null;

    // Get complete form data
    const formData = onboardingWizardStore.getCompleteFormData();

    // Submit to API
    const result = await trpc().onboardingRoutes.completeWizard.mutate(formData);

    // Show success message
    toast.success('Setup complete!', {
      description: `Created ${result.accountsCreated} accounts and ${result.categoriesSeeded} categories.`,
    });

    // Clear saved progress
    onboardingWizardStore.clearSavedProgress();

    // Invalidate TanStack Query caches so the layout effects update states
    cachePatterns.invalidatePrefix(accountKeys.all());
    cachePatterns.invalidatePrefix(categoryKeys.all());

    // Invalidate SvelteKit load functions
    await invalidateAll();

    // Call completion callback or redirect
    if (onComplete) {
      onComplete();
    } else {
      // Navigate to main app with tour flag
      goto('/?tour=start');
    }
  } catch (error) {
    console.error('Failed to complete onboarding:', error);
    submitError = error instanceof Error ? error.message : 'Failed to complete setup';
    toast.error('Setup failed', { description: submitError });
  } finally {
    isSubmitting = false;
  }
}

function handleSkipWizard() {
  // Allow skipping but still redirect to app
  onboardingWizardStore.clearSavedProgress();
  goto('/');
}
</script>

<div class="min-h-screen bg-gradient-to-br from-background to-muted/20 px-4 py-8">
  <div class="mx-auto w-full max-w-4xl">
    <!-- Header -->
    <div class="mb-8 text-center">
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Sparkles class="h-7 w-7 text-primary" />
      </div>
      <h1 class="text-2xl font-bold sm:text-3xl">Welcome to Budget</h1>
      <p class="text-muted-foreground mt-2">
        Let's set up your financial profile to get you started.
      </p>
    </div>

    <!-- Progress -->
    <div class="mb-8">
      <WizardProgress wizardStore={onboardingWizardStore} />
    </div>

    <!-- Main Card -->
    <Card class="shadow-lg">
      <CardHeader>
        <CardTitle>{currentStep?.title ?? 'Getting Started'}</CardTitle>
        <CardDescription>{currentStep?.description}</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <!-- Step Content -->
        <WizardStep
          wizardStore={onboardingWizardStore}
          stepId="income"
          showNavigation={!isReviewStep}>
          <IncomeStep />
        </WizardStep>

        <WizardStep
          wizardStore={onboardingWizardStore}
          stepId="household"
          showNavigation={!isReviewStep}>
          <HouseholdStep />
        </WizardStep>

        <WizardStep
          wizardStore={onboardingWizardStore}
          stepId="accounts"
          showNavigation={!isReviewStep}>
          <AccountsStep />
        </WizardStep>

        <WizardStep
          wizardStore={onboardingWizardStore}
          stepId="spending"
          showNavigation={!isReviewStep}>
          <SpendingStep />
        </WizardStep>

        <WizardStep
          wizardStore={onboardingWizardStore}
          stepId="debt"
          showNavigation={!isReviewStep}>
          <DebtStep />
        </WizardStep>

        <WizardStep
          wizardStore={onboardingWizardStore}
          stepId="preferences"
          showNavigation={!isReviewStep}>
          <PreferencesStep />
        </WizardStep>

        <WizardStep
          wizardStore={onboardingWizardStore}
          stepId="review"
          showNavigation={false}>
          <ReviewStep />

          <!-- Custom navigation for review step -->
          <div class="mt-6 flex items-center justify-between border-t pt-4">
            <Button
              variant="outline"
              onclick={() => onboardingWizardStore.previousStep()}
              disabled={isSubmitting}>
              Previous
            </Button>

            <Button
              onclick={handleComplete}
              disabled={!canComplete || isSubmitting}
              class="min-w-[140px]">
              {#if isSubmitting}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              {:else}
                Complete Setup
              {/if}
            </Button>
          </div>

          {#if submitError}
            <p class="mt-4 text-center text-sm text-destructive">{submitError}</p>
          {/if}
        </WizardStep>
      </CardContent>
    </Card>

    <!-- Skip Option -->
    <div class="mt-6 text-center">
      <Button
        variant="link"
        onclick={handleSkipWizard}
        disabled={isSubmitting}
        class="text-muted-foreground">
        Skip for now and set up later
      </Button>
    </div>
  </div>
</div>
