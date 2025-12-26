<script lang="ts">
import { goto } from "$app/navigation";
import { Button } from "$lib/components/ui/button";
import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
import { Kbd } from "$lib/components/ui/kbd";
import * as Tooltip from "$lib/components/ui/tooltip";
import { UNIFIED_TOUR_STEPS } from "$lib/constants/tour-steps";
import { demoMode } from "$lib/states/ui/demo-mode.svelte";
import { helpMode } from "$lib/states/ui/help.svelte";
import { spotlightTour } from "$lib/states/ui/spotlight-tour.svelte";
import { trpc } from "$lib/trpc/client";
import { cn } from "$lib/utils";
import CircleHelp from "@lucide/svelte/icons/circle-help";
import GraduationCap from "@lucide/svelte/icons/graduation-cap";
import Navigation from "@lucide/svelte/icons/navigation";
import Settings from "@lucide/svelte/icons/settings";

const isHelpActive = $derived(helpMode.isActive);
const isTourActive = $derived(spotlightTour.isActive);

// Dropdown state
let dropdownOpen = $state(false);

// Handle starting the unified tour
async function handleStartTour() {
  // Close dropdown
  dropdownOpen = false;

  // Activate demo mode for account page sections
  demoMode.activate();
  demoMode.startTour();

  await spotlightTour.start(UNIFIED_TOUR_STEPS, {
    onComplete: async (result) => {
      if (result.completed) {
        await trpc().onboardingRoutes.completeTour.mutate();
      } else if (result.skipped) {
        await trpc().onboardingRoutes.skipTour.mutate();
      }

      // Clean up demo mode
      demoMode.endTour();
      demoMode.deactivate();
    },
  });
}

// Handle running the setup wizard
function handleRunWizard() {
  goto("/onboarding?reset=true");
}
</script>

<DropdownMenu.Root bind:open={dropdownOpen}>
  <Tooltip.Root disableHoverableContent delayDuration={300} open={dropdownOpen ? false : undefined}>
    <Tooltip.Trigger>
      {#snippet child({ props: tooltipProps })}
        <DropdownMenu.Trigger>
          {#snippet child({ props: dropdownProps })}
            <Button
              {...tooltipProps}
              {...dropdownProps}
              variant="ghost"
              size="icon"
              aria-label="Help menu"
              data-help-id="help-button"
              data-help-title="Help Menu"
              data-help-description="Access help features, restart the guided tour, run the setup wizard, or try the account page demo with sample data."
              class={cn(
                "relative h-8 w-8",
                (isHelpActive || isTourActive) && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <CircleHelp class="h-4 w-4" />
              {#if isHelpActive || isTourActive}
                <span
                  class="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500"
                ></span>
              {/if}
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content>
      <p>
        Help
        <Kbd class="ml-2">{navigator?.platform?.includes("Mac") ? "⌘" : "Ctrl"}⇧/</Kbd>
      </p>
    </Tooltip.Content>
  </Tooltip.Root>
  <DropdownMenu.Content align="end" class="w-56">
    <DropdownMenu.Group>
      <DropdownMenu.Item
        onclick={() => helpMode.toggle()}
        class="gap-2"
      >
        <GraduationCap class="h-4 w-4" />
        <span>{isHelpActive ? "Exit Help Mode" : "Enter Help Mode"}</span>
        <Kbd class="ml-auto">{navigator?.platform?.includes("Mac") ? "⌘" : "Ctrl"}⇧/</Kbd>
      </DropdownMenu.Item>
    </DropdownMenu.Group>
    <DropdownMenu.Separator />
    <DropdownMenu.Group>
      <DropdownMenu.Item
        onclick={handleStartTour}
        class="gap-2"
        disabled={isTourActive}
      >
        <Navigation class="h-4 w-4" />
        <span>Start App Tour</span>
      </DropdownMenu.Item>
      <DropdownMenu.Item
        onclick={handleRunWizard}
        class="gap-2"
      >
        <Settings class="h-4 w-4" />
        <span>Run Setup Wizard</span>
      </DropdownMenu.Item>
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu.Root>
