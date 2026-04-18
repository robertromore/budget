<script lang="ts">
  import type {
    FloorPlanWizardFootprint,
    FloorPlanWizardInput,
    FloorPlanWizardTemplate,
  } from "$lib/stores/floor-plan.svelte";

  let {
    open = false,
    hasExistingNodes = false,
    oncancel,
    ongenerate,
  }: {
    open?: boolean;
    hasExistingNodes?: boolean;
    oncancel: () => void;
    ongenerate: (input: FloorPlanWizardInput) => void;
  } = $props();

  const STEP_TITLES = ["Basics", "Rooms", "Review"] as const;

  let stepIndex = $state(0);
  let template = $state<FloorPlanWizardTemplate>("single-family");
  let footprint = $state<FloorPlanWizardFootprint>("standard");
  let levels = $state(2);
  let bedrooms = $state(3);
  let bathrooms = $state(2);
  let includeGarage = $state(true);
  let includeDining = $state(true);
  let includeOffice = $state(false);
  let furnished = $state(false);
  let replaceExisting = $state(false);

  let lastOpen = false;
  $effect(() => {
    if (open && !lastOpen) {
      stepIndex = 0;
      replaceExisting = hasExistingNodes;
    }
    lastOpen = open;
  });

  $effect(() => {
    if (template === "studio") {
      levels = 1;
      bedrooms = Math.min(bedrooms, 1);
      includeDining = false;
      includeOffice = false;
      includeGarage = false;
      return;
    }
    if (template === "apartment") {
      includeGarage = false;
    }
  });

  const canContinue = $derived.by(() => {
    if (stepIndex === 0) return levels >= 1 && levels <= 4;
    if (stepIndex === 1) return bedrooms >= 0 && bathrooms >= 1;
    return true;
  });

  const summary = $derived.by(() => {
    const templateLabel =
      template === "single-family"
        ? "Single-family"
        : template === "apartment"
          ? "Apartment"
          : "Studio";
    const footprintLabel =
      footprint === "compact" ? "Compact" : footprint === "standard" ? "Standard" : "Large";
    const features: string[] = [];
    if (includeDining) features.push("Dining room");
    if (includeOffice) features.push("Office");
    if (includeGarage) features.push("Garage");
    if (furnished) features.push("Starter furniture");
    return {
      templateLabel,
      footprintLabel,
      features,
    };
  });

  function clampCount(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Math.round(value)));
  }

  function updateLevels(value: string): void {
    levels = clampCount(Number.parseInt(value, 10), 1, 4);
  }

  function updateBedrooms(value: string): void {
    const maxBedrooms = template === "studio" ? 1 : 8;
    bedrooms = clampCount(Number.parseInt(value, 10), 0, maxBedrooms);
  }

  function updateBathrooms(value: string): void {
    bathrooms = clampCount(Number.parseInt(value, 10), 1, 6);
  }

  function goBack(): void {
    stepIndex = Math.max(0, stepIndex - 1);
  }

  function goNext(): void {
    if (!canContinue) return;
    stepIndex = Math.min(STEP_TITLES.length - 1, stepIndex + 1);
  }

  function generate(): void {
    if (!canContinue) return;
    ongenerate({
      template,
      footprint,
      levels,
      bedrooms,
      bathrooms,
      includeGarage,
      includeDining,
      includeOffice,
      furnished,
      replaceExisting,
    });
  }

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) oncancel();
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="fp-wizard-title"
    onclick={handleBackdropClick}
  >
    <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl dark:bg-zinc-900">
      <div class="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 id="fp-wizard-title" class="text-lg font-semibold">Starter Floor Plan Wizard</h2>
          <p class="text-muted-foreground mt-1 text-sm">
            Answer a few questions and generate a default floor plan scaffold.
          </p>
        </div>
        <button
          class="text-muted-foreground hover:bg-accent rounded px-2 py-1 text-sm"
          onclick={oncancel}
          aria-label="Close wizard"
        >
          Close
        </button>
      </div>

      <div class="mb-4 flex items-center gap-2 text-xs">
        {#each STEP_TITLES as title, index}
          <div
            class="rounded px-2 py-1 font-medium {index === stepIndex
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'}"
          >
            {index + 1}. {title}
          </div>
        {/each}
      </div>

      {#if stepIndex === 0}
        <div class="space-y-5">
          <div>
            <p class="mb-2 text-sm font-medium">Template</p>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                class="rounded border px-3 py-2 text-left text-sm transition-colors {template === 'single-family'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'hover:bg-accent'}"
                onclick={() => (template = "single-family")}
              >
                <span class="font-medium">Single-family</span>
                <p class="text-muted-foreground mt-1 text-xs">Balanced layout with shared and private rooms.</p>
              </button>
              <button
                class="rounded border px-3 py-2 text-left text-sm transition-colors {template === 'apartment'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'hover:bg-accent'}"
                onclick={() => (template = "apartment")}
              >
                <span class="font-medium">Apartment</span>
                <p class="text-muted-foreground mt-1 text-xs">Compact shared living with fewer extras.</p>
              </button>
              <button
                class="rounded border px-3 py-2 text-left text-sm transition-colors {template === 'studio'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'hover:bg-accent'}"
                onclick={() => (template = "studio")}
              >
                <span class="font-medium">Studio</span>
                <p class="text-muted-foreground mt-1 text-xs">Single open space with minimal partitions.</p>
              </button>
            </div>
          </div>

          <div>
            <p class="mb-2 text-sm font-medium">Footprint</p>
            <div class="flex flex-wrap gap-2">
              <button
                class="rounded border px-3 py-1.5 text-sm transition-colors {footprint === 'compact'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'hover:bg-accent'}"
                onclick={() => (footprint = "compact")}
              >
                Compact
              </button>
              <button
                class="rounded border px-3 py-1.5 text-sm transition-colors {footprint === 'standard'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'hover:bg-accent'}"
                onclick={() => (footprint = "standard")}
              >
                Standard
              </button>
              <button
                class="rounded border px-3 py-1.5 text-sm transition-colors {footprint === 'large'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'hover:bg-accent'}"
                onclick={() => (footprint = "large")}
              >
                Large
              </button>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium" for="wizard-levels">Levels</label>
            <input
              id="wizard-levels"
              type="number"
              min="1"
              max="4"
              class="w-28 rounded border bg-background px-2 py-1 text-sm"
              value={levels}
              disabled={template === "studio"}
              oninput={(event) => updateLevels((event.currentTarget as HTMLInputElement).value)}
            />
            {#if template === "studio"}
              <p class="text-muted-foreground mt-1 text-xs">Studios are generated as single-level plans.</p>
            {:else}
              <p class="text-muted-foreground mt-1 text-xs">
                Architectural storeys stacked on the current floor plan. To add
                a separate floor partition (e.g. basement), close the wizard,
                switch floors using the Floor picker, and run the wizard again.
              </p>
            {/if}
          </div>
        </div>
      {:else if stepIndex === 1}
        <div class="space-y-5">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label class="text-sm">
              <span class="mb-1 block font-medium">Bedrooms</span>
              <input
                type="number"
                min="0"
                max={template === "studio" ? 1 : 8}
                class="w-full rounded border bg-background px-2 py-1"
                value={bedrooms}
                oninput={(event) => updateBedrooms((event.currentTarget as HTMLInputElement).value)}
              />
            </label>
            <label class="text-sm">
              <span class="mb-1 block font-medium">Bathrooms</span>
              <input
                type="number"
                min="1"
                max="6"
                class="w-full rounded border bg-background px-2 py-1"
                value={bathrooms}
                oninput={(event) => updateBathrooms((event.currentTarget as HTMLInputElement).value)}
              />
            </label>
          </div>

          <div>
            <p class="mb-2 text-sm font-medium">Extras</p>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label class="hover:bg-accent/70 flex items-center gap-2 rounded border px-3 py-2 text-sm">
                <input type="checkbox" checked={includeDining} disabled={template === "studio"} onchange={(e) => (includeDining = (e.currentTarget as HTMLInputElement).checked)} />
                Dining room
              </label>
              <label class="hover:bg-accent/70 flex items-center gap-2 rounded border px-3 py-2 text-sm">
                <input type="checkbox" checked={includeOffice} disabled={template === "studio"} onchange={(e) => (includeOffice = (e.currentTarget as HTMLInputElement).checked)} />
                Office
              </label>
              <label class="hover:bg-accent/70 flex items-center gap-2 rounded border px-3 py-2 text-sm">
                <input type="checkbox" checked={includeGarage} disabled={template !== "single-family"} onchange={(e) => (includeGarage = (e.currentTarget as HTMLInputElement).checked)} />
                Garage
              </label>
            </div>
          </div>
        </div>
      {:else}
        <div class="space-y-5">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label class="hover:bg-accent/70 flex items-center gap-2 rounded border px-3 py-2 text-sm">
              <input type="checkbox" checked={furnished} onchange={(e) => (furnished = (e.currentTarget as HTMLInputElement).checked)} />
              Add starter furniture
            </label>
            <label class="hover:bg-accent/70 flex items-center gap-2 rounded border px-3 py-2 text-sm {hasExistingNodes
              ? ''
              : 'opacity-60'}">
              <input
                type="checkbox"
                checked={replaceExisting}
                disabled={!hasExistingNodes}
                onchange={(e) => (replaceExisting = (e.currentTarget as HTMLInputElement).checked)}
              />
              Replace existing nodes
            </label>
          </div>

          <div class="rounded border bg-muted/30 p-3 text-sm">
            <p class="font-medium">Summary</p>
            <ul class="text-muted-foreground mt-2 space-y-1 text-sm">
              <li>Template: {summary.templateLabel}</li>
              <li>Footprint: {summary.footprintLabel}</li>
              <li>Levels: {levels}</li>
              <li>Bedrooms: {bedrooms}</li>
              <li>Bathrooms: {bathrooms}</li>
              <li>Features: {summary.features.length > 0 ? summary.features.join(", ") : "None"}</li>
              <li>Replace existing: {replaceExisting ? "Yes" : "No"}</li>
            </ul>
          </div>
        </div>
      {/if}

      <div class="mt-6 flex items-center justify-between">
        <button
          class="rounded border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-40"
          onclick={goBack}
          disabled={stepIndex === 0}
        >
          Back
        </button>

        {#if stepIndex < STEP_TITLES.length - 1}
          <button
            class="bg-primary text-primary-foreground rounded px-3 py-1.5 text-sm disabled:opacity-40"
            onclick={goNext}
            disabled={!canContinue}
          >
            Next
          </button>
        {:else}
          <button
            class="bg-primary text-primary-foreground rounded px-3 py-1.5 text-sm disabled:opacity-40"
            onclick={generate}
            disabled={!canContinue}
          >
            Generate Floor Plan
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
