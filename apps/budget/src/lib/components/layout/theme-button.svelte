<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Tooltip from '$lib/components/ui/tooltip';
import { themePreferences } from '$lib/stores/theme-preferences.svelte';
import Palette from '@lucide/svelte/icons/palette';
import ThemeSelector from './theme-selector.svelte';

let themeSelectorOpen = $state(false);

// Use the JS-derived value when available (for reactivity),
// but CSS variable --theme-preview-color is set by preload for initial render
const previewColor = $derived(themePreferences.previewColor);
</script>

<Tooltip.Root>
  <Tooltip.Trigger>
    {#snippet child({ props })}
      <Button {...props} variant="ghost" size="icon" onclick={() => (themeSelectorOpen = true)} class="relative" data-help-id="theme-button" data-help-title="Theme Colors">
        <Palette class="h-4 w-4" />
        <div
          class="theme-preview-pip border-background absolute top-1 left-1 h-2 w-2 rounded-full border"
          style:--pip-color={previewColor}>
        </div>
        <span class="sr-only">Change theme</span>
      </Button>
    {/snippet}
  </Tooltip.Trigger>
  <Tooltip.Content>
    Theme colors
  </Tooltip.Content>
</Tooltip.Root>

<style>
  .theme-preview-pip {
    /* Use CSS variable from preload for initial render, JS value takes over after hydration */
    background-color: var(--pip-color, var(--theme-preview-color, hsl(240 5.9% 10%)));
  }
</style>

<ThemeSelector bind:open={themeSelectorOpen} />
