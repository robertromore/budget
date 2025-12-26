<script lang="ts">
import { goto } from '$app/navigation';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Button } from '$lib/components/ui/button';
import { ACCOUNT_PAGE_TOUR_STEPS } from '$lib/constants/tour-steps';
import { demoMode } from '$lib/states/ui/demo-mode.svelte';
import { spotlightTour } from '$lib/states/ui/spotlight-tour.svelte';
import Check from '@lucide/svelte/icons/check';
import Play from '@lucide/svelte/icons/play';
import Wallet from '@lucide/svelte/icons/wallet';

interface Props {
  open: boolean;
  onClose: () => void;
}

let { open = $bindable(), onClose }: Props = $props();

// Track previous open state to detect when dialog is closed
let prevOpen = $state(open);

// Sync with parent when dialog is closed via AlertDialog internals (e.g., clicking outside)
$effect(() => {
  if (prevOpen && !open) {
    onClose();
  }
  prevOpen = open;
});

async function handleContinueToAccountDemo() {
  open = false;
  onClose();

  // Activate demo mode
  demoMode.activate();

  // Navigate to the demo account
  await goto('/accounts/demo-checking');

  // Start the account page tour
  demoMode.startTour();
  await spotlightTour.start(ACCOUNT_PAGE_TOUR_STEPS, {
    onComplete: async (result) => {
      if (result.completed || result.skipped) {
        demoMode.endTour();
      }
    },
  });
}

function handleFinish() {
  open = false;
  onClose();
}
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content class="max-w-md">
    <AlertDialog.Header>
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30">
        <Check class="h-7 w-7 text-green-600 dark:text-green-400" />
      </div>
      <AlertDialog.Title class="text-center text-xl">
        Tour Complete!
      </AlertDialog.Title>
      <AlertDialog.Description class="text-center">
        Great job! You've completed the main tour and learned the basics of navigation.
      </AlertDialog.Description>
    </AlertDialog.Header>

    <div class="my-4 rounded-lg bg-muted/50 p-4">
      <div class="flex items-start gap-3">
        <Wallet class="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
        <div class="text-sm">
          <p class="font-medium">Want to learn more?</p>
          <p class="text-muted-foreground mt-1">
            Continue with the Account Page Demo to see how to manage transactions,
            import data, and explore all the features with sample data.
          </p>
        </div>
      </div>
    </div>

    <AlertDialog.Footer class="flex-col gap-2 sm:flex-row">
      <Button variant="outline" class="w-full sm:w-auto" onclick={handleFinish}>
        I'm Done
      </Button>
      <Button class="w-full sm:w-auto" onclick={handleContinueToAccountDemo}>
        <Play class="mr-2 h-4 w-4" />
        Continue to Demo
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
