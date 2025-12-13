<script lang="ts">
import { Button } from '$lib/components/ui/button/index.js';
import * as Tooltip from '$lib/components/ui/tooltip';
import Monitor from '@lucide/svelte/icons/monitor';
import Moon from '@lucide/svelte/icons/moon';
import Sun from '@lucide/svelte/icons/sun';
import { setMode, userPrefersMode } from 'mode-watcher';

const currentMode = $derived(userPrefersMode.current);

const modeLabels = {
  light: 'Light mode',
  dark: 'Dark mode',
  system: 'System theme',
};

function cycleMode() {
  const current = userPrefersMode.current;
  if (current === 'light') {
    setMode('dark');
  } else if (current === 'dark') {
    setMode('system');
  } else {
    setMode('light');
  }
}
</script>

<Tooltip.Root>
  <Tooltip.Trigger>
    {#snippet child({ props })}
      <Button {...props} onclick={cycleMode} variant="ghost" size="icon" class="h-8 w-8">
        {#if currentMode === 'light'}
          <Sun class="h-4 w-4" />
        {:else if currentMode === 'dark'}
          <Moon class="h-4 w-4" />
        {:else}
          <Monitor class="h-4 w-4" />
        {/if}
        <span class="sr-only">Toggle theme (current: {currentMode})</span>
      </Button>
    {/snippet}
  </Tooltip.Trigger>
  <Tooltip.Content>
    {modeLabels[currentMode ?? 'system']}
  </Tooltip.Content>
</Tooltip.Root>
