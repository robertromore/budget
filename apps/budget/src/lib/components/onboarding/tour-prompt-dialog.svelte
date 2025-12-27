<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Button } from '$lib/components/ui/button';
import { spotlightTour } from '$lib/states/ui/spotlight-tour.svelte';
import { demoMode } from '$lib/states/ui/demo-mode.svelte';
import { MAIN_TOUR_STEPS } from '$lib/constants/tour-steps';
import { trpc } from '$lib/trpc/client';
import Map from '@lucide/svelte/icons/map';
import Sparkles from '@lucide/svelte/icons/sparkles';

interface Props {
  open: boolean;
  onClose: () => void;
}

let { open = $bindable(), onClose }: Props = $props();

// Track if we're closing the dialog programmatically (via button click)
// to avoid double-saving when onOpenChange fires
let closingProgrammatically = $state(false);

async function handleStartTour() {
  closingProgrammatically = true;
  open = false;
  onClose();

  // Start the tour with completion callback
  await spotlightTour.start(MAIN_TOUR_STEPS, {
    onComplete: async (result) => {
      closingProgrammatically = false;
      // Persist to backend
      try {
        if (result.completed) {
          await trpc().onboardingRoutes.completeTour.mutate();
          // Show the continuation dialog to offer account page demo
          demoMode.showContinuationDialog();
        } else if (result.skipped) {
          await trpc().onboardingRoutes.skipTour.mutate();
        }
      } catch (error) {
        console.error('Failed to persist tour completion:', error);
      }
    },
  });
}

async function handleSkipTour() {
  closingProgrammatically = true;
  open = false;
  onClose();
  await persistSkip();
}

async function handleDialogClose() {
  // When dialog is closed without clicking a button (e.g., escape key, click outside),
  // treat it as a skip so the modal doesn't reappear
  if (!closingProgrammatically) {
    await persistSkip();
  }
  closingProgrammatically = false;
  onClose();
}

async function persistSkip() {
  try {
    await trpc().onboardingRoutes.skipTour.mutate();
  } catch (error) {
    console.error('Failed to persist tour skip:', error);
  }
}
</script>

<AlertDialog.Root bind:open onOpenChange={(isOpen) => { if (!isOpen) handleDialogClose(); }}>
  <AlertDialog.Content class="max-w-md">
    <AlertDialog.Header>
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Map class="h-7 w-7 text-primary" />
      </div>
      <AlertDialog.Title class="text-center text-xl">
        Take a Quick Tour?
      </AlertDialog.Title>
      <AlertDialog.Description class="text-center">
        Your account is all set up! Would you like a quick tour to learn where
        everything is? It only takes about 2 minutes.
      </AlertDialog.Description>
    </AlertDialog.Header>

    <div class="my-4 rounded-lg bg-muted/50 p-4">
      <div class="flex items-start gap-3">
        <Sparkles class="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
        <div class="text-sm">
          <p class="font-medium">What you'll learn:</p>
          <ul class="text-muted-foreground mt-1 list-inside list-disc space-y-0.5">
            <li>Navigate the sidebar and main features</li>
            <li>View and manage your accounts</li>
            <li>Create budgets and schedules</li>
            <li>Import transactions from your bank</li>
          </ul>
        </div>
      </div>
    </div>

    <AlertDialog.Footer class="flex-col gap-2 sm:flex-row">
      <Button variant="outline" class="w-full sm:w-auto" onclick={handleSkipTour}>
        Skip for Now
      </Button>
      <Button class="w-full sm:w-auto" onclick={handleStartTour}>
        <Map class="mr-2 h-4 w-4" />
        Start Tour
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
