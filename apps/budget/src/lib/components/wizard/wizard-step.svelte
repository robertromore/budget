<script lang="ts">
import {Button} from '$lib/components/ui/button';
import {ChevronLeft, ChevronRight, SkipForward} from '@lucide/svelte/icons';
import {cn} from '$lib/utils';
import type {Snippet} from 'svelte';
import type {WizardStore} from '$lib/stores/wizardStore.svelte';

interface Props {
  wizardStore: WizardStore;
  stepId: string;
  title?: string;
  description?: string;
  children?: Snippet;
  helpContent?: Snippet;
  class?: string;
  showNavigation?: boolean;
  onNext?: () => Promise<void> | void;
  onPrevious?: () => Promise<void> | void;
  onSkip?: () => Promise<void> | void;
}

let {
  wizardStore,
  stepId,
  title,
  description,
  children,
  helpContent,
  class: className,
  showNavigation = true,
  onNext,
  onPrevious,
  onSkip,
}: Props = $props();

const currentStep = $derived(wizardStore.currentStep);
const canGoNext = $derived(wizardStore.canGoNext);
const canGoPrevious = $derived(wizardStore.canGoPrevious);
const isLastStep = $derived(wizardStore.isLastStep);
const isFirstStep = $derived(wizardStore.isFirstStep);
const isCompleting = $derived(wizardStore.isCompleting);

let isProcessing = $state(false);

const isCurrentStep = $derived(currentStep?.id === stepId);
const stepInfo = $derived(wizardStore.steps.find((s) => s.id === stepId));
const isOptional = $derived(stepInfo?.isOptional || false);

async function handleNext() {
  if (isProcessing || !canGoNext) return;

  try {
    isProcessing = true;

    if (onNext) {
      await onNext();
    }

    if (isLastStep) {
      // This is the final step - don't auto-advance
      return;
    }

    wizardStore.nextStep();
  } catch (error) {
    console.error('Error proceeding to next step:', error);
  } finally {
    isProcessing = false;
  }
}

async function handlePrevious() {
  if (isProcessing || !canGoPrevious) return;

  try {
    isProcessing = true;

    if (onPrevious) {
      await onPrevious();
    }

    wizardStore.previousStep();
  } catch (error) {
    console.error('Error going to previous step:', error);
  } finally {
    isProcessing = false;
  }
}

async function handleSkip() {
  if (isProcessing || !isOptional) return;

  try {
    isProcessing = true;

    if (onSkip) {
      await onSkip();
    }

    wizardStore.skipStep();
  } catch (error) {
    console.error('Error skipping step:', error);
  } finally {
    isProcessing = false;
  }
}

// Validate step when it becomes current
$effect(() => {
  if (isCurrentStep) {
    wizardStore.validateCurrentStep();
  }
});
</script>

{#if isCurrentStep}
  <div class={cn('space-y-6', className)}>
    <!-- Step Header -->
    <div class="space-y-2">
      {#if title}
        <h2 class="text-foreground text-2xl font-semibold">
          {title}
        </h2>
      {/if}

      {#if description}
        <p class="text-muted-foreground">
          {description}
        </p>
      {/if}

      {#if isOptional}
        <div class="flex items-center gap-2">
          <span
            class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            Optional Step
          </span>
        </div>
      {/if}
    </div>

    <!-- Step Content -->
    <div class="space-y-4">
      {#if children}
        {@render children()}
      {/if}
    </div>

    <!-- Help Content -->
    {#if helpContent}
      <div class="bg-muted/30 border-muted rounded-lg border p-4">
        <h4 class="text-foreground mb-2 font-medium">Need Help?</h4>
        {@render helpContent()}
      </div>
    {/if}

    <!-- Validation Errors -->
    {#if wizardStore.validationErrors[stepId]?.length > 0}
      <div class="bg-destructive/10 border-destructive/20 rounded-lg border p-4">
        <h4 class="text-destructive mb-2 font-medium">Please fix the following:</h4>
        <ul class="text-destructive list-inside list-disc space-y-1 text-sm">
          {#each wizardStore.validationErrors[stepId] as error}
            <li>{error}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <!-- Navigation -->
    {#if showNavigation}
      <div class="flex items-center justify-between border-t pt-4">
        <!-- Previous Button -->
        <Button
          variant="outline"
          onclick={handlePrevious}
          disabled={!canGoPrevious || isProcessing || isCompleting}
          class="flex items-center gap-2">
          <ChevronLeft class="h-4 w-4" />
          Previous
        </Button>

        <!-- Skip/Next Buttons -->
        <div class="flex items-center gap-2">
          {#if isOptional}
            <Button
              variant="ghost"
              onclick={handleSkip}
              disabled={isProcessing || isCompleting}
              class="flex items-center gap-2">
              <SkipForward class="h-4 w-4" />
              Skip
            </Button>
          {/if}

          <Button
            onclick={handleNext}
            disabled={!canGoNext || isProcessing || isCompleting}
            class="flex items-center gap-2">
            {#if isProcessing}
              <div
                class="border-background border-t-foreground h-4 w-4 animate-spin rounded-full border-2">
              </div>
              Processing...
            {:else if isLastStep}
              Complete
            {:else}
              Next
              <ChevronRight class="h-4 w-4" />
            {/if}
          </Button>
        </div>
      </div>
    {/if}
  </div>
{/if}
