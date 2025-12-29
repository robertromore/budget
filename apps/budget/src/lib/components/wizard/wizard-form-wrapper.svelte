<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Tabs from '$lib/components/ui/tabs';
import type { WizardStore } from '$lib/stores/wizardStore.svelte';
import { cn } from '$lib/utils';
import { FileText, RotateCcw, Wand } from '@lucide/svelte/icons';
import type { Snippet } from 'svelte';
import WizardProgress from './wizard-progress.svelte';

interface Props {
  title: string;
  subtitle?: string;
  wizardStore: WizardStore;
  formContent: Snippet;
  wizardContent: Snippet;
  onComplete?: (formData: Record<string, any>) => Promise<void>;
  onCancel?: () => void;
  class?: string;
  defaultMode?: 'manual' | 'wizard';
  persistenceKey?: string;
  currentFormData?: Record<string, any>;
  showWizardActions?: boolean;
  showWizardPrevious?: boolean;
  currentMode?: 'manual' | 'wizard';
}

let {
  title,
  subtitle,
  wizardStore,
  formContent,
  wizardContent,
  onComplete,
  onCancel,
  class: className,
  defaultMode = 'manual',
  persistenceKey,
  currentFormData,
  showWizardActions = true,
  showWizardPrevious = false,
  currentMode = $bindable(defaultMode),
}: Props = $props();
let isSubmitting = $state(false);

const progress = $derived(wizardStore.progress);
const isCompleting = $derived(wizardStore.isCompleting);
const formData = $derived(wizardStore.formData);
const currentStepIndex = $derived(wizardStore.currentStepIndex);

// Load saved progress if persistence key is provided
$effect(() => {
  if (persistenceKey) {
    wizardStore.loadFromLocalStorage(persistenceKey);
  }
});

// Auto-save wizard progress
$effect(() => {
  if (persistenceKey && currentMode === 'wizard') {
    wizardStore.saveToLocalStorage(persistenceKey);
  }
});

// Scroll to top when wizard step changes
$effect(() => {
  if (currentMode === 'wizard') {
    currentStepIndex;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

function handleModeChange(mode: string) {
  if (mode === 'manual' || mode === 'wizard') {
    currentMode = mode;

    // If switching to wizard mode, initialize with current form data
    if (mode === 'wizard') {
      const dataToUse = currentFormData || {};

      // Handle persistence if enabled
      if (persistenceKey) {
        const restored = wizardStore.loadFromLocalStorage(persistenceKey);
        if (!restored) {
          // Re-initialize the wizard with current form data
          const currentSteps = wizardStore.steps;
          wizardStore.initialize(currentSteps, dataToUse);
        }
      } else {
        // No persistence - always use current form data
        const currentSteps = wizardStore.steps;
        wizardStore.initialize(currentSteps, dataToUse);
      }
    }
  }
}

function resetWizard() {
  wizardStore.reset();
  if (persistenceKey) {
    wizardStore.clearFromLocalStorage(persistenceKey);
  }
}

async function handleComplete() {
  if (!onComplete || isSubmitting) return;

  try {
    isSubmitting = true;
    wizardStore.startCompleting();

    await onComplete(formData);

    // Clear saved progress on successful completion
    if (persistenceKey) {
      wizardStore.clearFromLocalStorage(persistenceKey);
    }
  } catch (error) {
    console.error('Error completing wizard:', error);
  } finally {
    isSubmitting = false;
    wizardStore.stopCompleting();
  }
}

function handleCancel() {
  if (onCancel) {
    onCancel();
  }
  resetWizard();
}

function handlePrevious() {
  wizardStore.previousStep();
}

// Get mode-specific classes
function getModeClasses(mode: 'manual' | 'wizard') {
  const baseClasses = 'flex items-center gap-2';
  const isActive = currentMode === mode;
  return cn(baseClasses, isActive ? 'text-foreground' : 'text-muted-foreground');
}
</script>

<div class="space-y-6">
  <div class="space-y-4">
    <div class="space-y-1">
      <h1 class="text-foreground text-2xl font-semibold">{title}</h1>
      {#if subtitle}
        <p class="text-muted-foreground">{subtitle}</p>
      {/if}
    </div>

    <!-- Mode Switcher -->
    <Tabs.Root value={currentMode} onValueChange={handleModeChange}>
      <Tabs.List class="grid w-full grid-cols-2">
        <Tabs.Trigger value="wizard" class={getModeClasses('wizard')}>
          <Wand class="h-4 w-4" />
          Guided Setup
          <Badge variant="secondary" class="text-xs">Helpful</Badge>
        </Tabs.Trigger>
        <Tabs.Trigger value="manual" class={getModeClasses('manual')}>
          <FileText class="h-4 w-4" />
          Manual Form
          <Badge variant="secondary" class="text-xs">Quick</Badge>
        </Tabs.Trigger>
      </Tabs.List>

      <!-- Manual Form Mode -->
      <Tabs.Content value="manual" class="mt-6">
        <div class="bg-muted/20 border-muted mb-4 rounded-lg border p-4">
          <p class="text-muted-foreground text-sm">
            Fill out the form directly if you're familiar with the options. Switch to <strong
              >Guided Setup</strong> for step-by-step help.
          </p>
        </div>

        {#if formContent}
          {@render formContent()}
        {/if}
      </Tabs.Content>

      <!-- Wizard Mode -->
      <Tabs.Content value="wizard" class="mt-6">
        <!-- Wizard Controls -->
        <div
          class="bg-muted/20 border-muted flex items-center justify-between rounded-lg border p-4">
          <div class="space-y-1">
            <p class="text-foreground text-sm font-medium">Step-by-step guided setup</p>
            <p class="text-muted-foreground text-xs">
              We'll walk you through each option with explanations
            </p>
          </div>

          <div class="flex items-center gap-2">
            {#if progress > 0}
              <Button
                variant="ghost"
                size="sm"
                onclick={resetWizard}
                disabled={isSubmitting || isCompleting}
                class="text-xs">
                <RotateCcw class="mr-1 h-3 w-3" />
                Reset
              </Button>
            {/if}

            {#if persistenceKey}
              <Badge variant="outline" class="text-xs">Auto-saved</Badge>
            {/if}
          </div>
        </div>

        <!-- Progress Indicator -->
        <WizardProgress {wizardStore} />

        <!-- Wizard Content -->
        <div class="min-h-[400px]">
          {#if wizardContent}
            {@render wizardContent()}
          {/if}
        </div>

        <!-- Wizard Actions -->
        {#if showWizardActions && wizardStore.isLastStep && wizardStore.canGoNext}
          <div class="border-t pt-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                {#if showWizardPrevious && !wizardStore.isFirstStep}
                  <Button
                    variant="outline"
                    onclick={handlePrevious}
                    disabled={isSubmitting || isCompleting}>
                    Previous
                  </Button>
                {/if}
                <Button
                  variant="outline"
                  onclick={handleCancel}
                  disabled={isSubmitting || isCompleting}>
                  Cancel
                </Button>
              </div>

              <Button
                onclick={handleComplete}
                disabled={isSubmitting || isCompleting || !wizardStore.canGoNext}
                class="min-w-[120px]">
                {#if isSubmitting}
                  <div
                    class="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2">
                  </div>
                  Creating...
                {:else}
                  Complete Setup
                {/if}
              </Button>
            </div>
          </div>
        {/if}
      </Tabs.Content>
    </Tabs.Root>
  </div>
</div>
