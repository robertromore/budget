<script lang="ts">
/**
 * Demo Mode Banner
 *
 * Displays a fixed banner at the bottom of the screen when demo mode is active,
 * clearly indicating that the user is viewing demonstration data that won't be saved.
 */
import { demoMode } from '$lib/states/ui/demo-mode.svelte';
import { Button } from '$lib/components/ui/button';
import { Info, X } from '@lucide/svelte/icons';
import { goto } from '$app/navigation';

function handleExitDemo() {
  // Navigate away from demo account first
  goto('/').then(() => {
    demoMode.deactivate();
  });
}
</script>

{#if demoMode.isActive}
  <div
    class="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform"
    role="status"
    aria-live="polite"
  >
    <div
      class="bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg"
    >
      <Info class="text-amber-600 dark:text-amber-400 h-5 w-5 flex-shrink-0" />

      <div class="flex items-center gap-2">
        <span class="text-amber-800 dark:text-amber-200 font-medium">Demo Mode</span>
        <span class="text-amber-700 dark:text-amber-300 hidden sm:inline">
          — This is demonstration data. Changes won't be saved.
        </span>
        <span class="text-amber-700 dark:text-amber-300 sm:hidden">
          — Demo data only
        </span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        class="text-amber-700 hover:text-amber-900 hover:bg-amber-100 dark:text-amber-300 dark:hover:text-amber-100 dark:hover:bg-amber-900 ml-2"
        onclick={handleExitDemo}
      >
        <X class="mr-1 h-4 w-4" />
        Exit Demo
      </Button>
    </div>
  </div>
{/if}
