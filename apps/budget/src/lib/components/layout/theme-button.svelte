<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Tooltip from '$lib/components/ui/tooltip';
import { themePreferences } from '$lib/stores/theme-preferences.svelte';
import Palette from '@lucide/svelte/icons/palette';
import ThemeSelector from './theme-selector.svelte';

let themeSelectorOpen = $state(false);

const previewColor = $derived(themePreferences.previewColor);
</script>

<Tooltip.Root>
  <Tooltip.Trigger>
    {#snippet child({ props })}
      <Button {...props} variant="ghost" size="icon" onclick={() => (themeSelectorOpen = true)} class="relative">
        <Palette class="h-4 w-4" />
        <div
          class="border-background absolute top-1 left-1 h-2 w-2 rounded-full border"
          style:background-color={previewColor}>
        </div>
        <span class="sr-only">Change theme</span>
      </Button>
    {/snippet}
  </Tooltip.Trigger>
  <Tooltip.Content>
    Theme colors
  </Tooltip.Content>
</Tooltip.Root>

<ThemeSelector bind:open={themeSelectorOpen} />
