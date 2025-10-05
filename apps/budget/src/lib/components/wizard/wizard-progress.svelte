<script lang="ts">
  import { Check, Circle, CircleDot } from "@lucide/svelte/icons";
  import { cn } from "$lib/utils";
  import type { WizardStore } from "$lib/stores/wizardStore.svelte";

  interface Props {
    wizardStore: WizardStore;
    class?: string;
  }

  let { wizardStore, class: className }: Props = $props();

  const steps = $derived(wizardStore.steps);
  const currentStepIndex = $derived(wizardStore.currentStepIndex);
  const progress = $derived(wizardStore.progress);

  function getStepStatus(stepIndex: number) {
    const step = steps[stepIndex];
    if (!step) return "upcoming";

    if (step.isValid) return "completed";
    if (step.isVisited) return "current";
    return "upcoming";
  }

  function getStepIcon(stepIndex: number) {
    const status = getStepStatus(stepIndex);
    switch (status) {
      case "completed": return Check;
      case "current": return CircleDot;
      default: return Circle;
    }
  }

  function getStepClasses(stepIndex: number) {
    const status = getStepStatus(stepIndex);
    const isCurrentStep = stepIndex === currentStepIndex;

    const baseClasses = "flex items-center gap-2 text-sm font-medium transition-colors";

    switch (status) {
      case "completed":
        return cn(baseClasses, "text-green-600 dark:text-green-400");
      case "current":
        return cn(baseClasses, isCurrentStep ? "text-primary" : "text-muted-foreground");
      default:
        return cn(baseClasses, "text-muted-foreground");
    }
  }

  function getIconClasses(stepIndex: number) {
    const status = getStepStatus(stepIndex);
    const baseClasses = "h-4 w-4 transition-colors";

    switch (status) {
      case "completed":
        return cn(baseClasses, "text-green-600 dark:text-green-400");
      case "current":
        return cn(baseClasses, "text-primary");
      default:
        return cn(baseClasses, "text-muted-foreground");
    }
  }

  function getConnectorClasses(stepIndex: number) {
    if (stepIndex === steps.length - 1) return "hidden";

    const currentStatus = getStepStatus(stepIndex);
    const nextStatus = getStepStatus(stepIndex + 1);

    const baseClasses = "flex-1 h-px transition-colors";

    if (currentStatus === "completed" || nextStatus === "completed") {
      return cn(baseClasses, "bg-green-300 dark:bg-green-600");
    } else if (currentStatus === "current" || nextStatus === "current") {
      return cn(baseClasses, "bg-primary/30");
    } else {
      return cn(baseClasses, "bg-muted-foreground/20");
    }
  }
</script>

<div class="space-y-4 mt-6 mb-8 bg-muted/20 border-2 border-border rounded-lg p-6 {className}">
  <!-- Progress Bar -->
  <div class="rounded-lg p-4 bg-muted/30">
    <div class="space-y-2">
      <div class="flex justify-between items-center">
        <span class="text-sm font-medium text-muted-foreground">
          Step {currentStepIndex + 1} of {steps.length}
        </span>
        <span class="text-sm font-medium text-muted-foreground">
          {Math.round(progress)}% Complete
        </span>
      </div>
      <div class="h-2 bg-muted rounded-full overflow-hidden">
        <div
          class="h-full bg-primary transition-all duration-300 ease-out"
          style="width: {progress}%"
        ></div>
      </div>
    </div>
  </div>

  <!-- Step Indicators -->
  <div class="flex items-center gap-2">
    {#each steps as step, index}
      {@const Icon = getStepIcon(index)}

      <button
        type="button"
        onclick={() => wizardStore.goToStep(index)}
        disabled={!step.isVisited && index !== currentStepIndex}
        class={cn(
          getStepClasses(index),
          "hover:text-primary disabled:cursor-not-allowed disabled:hover:text-current",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md p-1"
        )}
        title={step.description}
      >
        <Icon class={getIconClasses(index)} />
        <span class="hidden sm:inline">{step.title}</span>
      </button>

      <!-- Connector Line -->
      <div class={getConnectorClasses(index)}></div>
    {/each}
  </div>
</div>