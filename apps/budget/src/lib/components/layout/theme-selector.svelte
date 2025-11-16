<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { ResponsiveSheet } from '$lib/components/ui/responsive-sheet';
import { ScrollArea } from '$lib/components/ui/scroll-area';
import { Separator } from '$lib/components/ui/separator';
import ColorPicker from '$lib/components/ui/color-picker/color-picker.svelte';
import Check from '@lucide/svelte/icons/check';
import { THEME_PRESETS, getThemePreviewColor } from '$lib/config/theme-presets';
import { themePreferences } from '$lib/stores/theme-preferences.svelte';

interface Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

let { open = $bindable(false), onOpenChange }: Props = $props();

// State for custom color picker
let showCustomPicker = $state(false);
let customColorValue = $state(themePreferences.custom || '#3b82f6');

const handlePresetSelect = (presetName: string) => {
  themePreferences.setPreset(presetName);
  if (onOpenChange) {
    onOpenChange(false);
  } else {
    open = false;
  }
};

const handleCustomColorSelect = (color: string) => {
  customColorValue = color;
};

const handleCustomColorApply = () => {
  themePreferences.setCustom(customColorValue);
  showCustomPicker = false;
  if (onOpenChange) {
    onOpenChange(false);
  } else {
    open = false;
  }
};

const currentTheme = $derived(themePreferences.theme);
const isCustom = $derived(themePreferences.isCustom);
</script>

<ResponsiveSheet bind:open {onOpenChange}>
  {#snippet header()}
    <div>
      <h2 class="text-lg font-semibold">Theme</h2>
      <p class="text-sm text-muted-foreground">
        Choose a theme for your dashboard
      </p>
    </div>
  {/snippet}

  {#snippet content()}
    <div class="flex flex-col gap-4">
      {#if !showCustomPicker}
        <!-- Preset Themes Grid -->
        <div>
          <h3 class="text-sm font-medium mb-3">Preset Themes</h3>
          <ScrollArea class="h-[400px] -mx-6 px-6">
            <div class="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 gap-3 pb-4">
              {#each THEME_PRESETS as preset}
                {@const isSelected = currentTheme === preset.name}
                {@const previewColor = getThemePreviewColor(preset)}

                <button
                  type="button"
                  onclick={() => handlePresetSelect(preset.name)}
                  class="group relative flex flex-col items-start gap-2 rounded-lg border-2 p-3 hover:border-primary transition-colors"
                  class:border-primary={isSelected}
                  class:border-muted={!isSelected}
                >
                  {#if isSelected}
                    <div class="absolute top-2 right-2">
                      <div class="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check class="h-3 w-3" />
                      </div>
                    </div>
                  {/if}

                  <div class="flex items-center gap-2">
                    <div
                      class="h-6 w-6 rounded-md border"
                      style:background-color={previewColor}
                    ></div>
                    <span class="text-sm font-medium">{preset.label}</span>
                  </div>
                </button>
              {/each}
            </div>
          </ScrollArea>
        </div>

        <Separator />

        <!-- Custom Color Option -->
        <div>
          <h3 class="text-sm font-medium mb-3">Custom</h3>
          <button
            type="button"
            onclick={() => showCustomPicker = true}
            class="group relative flex w-full flex-col items-start gap-2 rounded-lg border-2 p-3 hover:border-primary transition-colors"
            class:border-primary={isCustom}
            class:border-muted={!isCustom}
          >
            {#if isCustom}
              <div class="absolute top-2 right-2">
                <div class="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check class="h-3 w-3" />
                </div>
              </div>
            {/if}

            <div class="flex items-center gap-2">
              <div
                class="h-6 w-6 rounded-md border"
                style:background-color={isCustom && themePreferences.custom ? themePreferences.custom : customColorValue}
              ></div>
              <span class="text-sm font-medium">Custom Color</span>
            </div>
          </button>
        </div>
      {:else}
        <!-- Custom Color Picker -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium">Choose Custom Color</h3>
            <Button
              variant="ghost"
              size="sm"
              onclick={() => showCustomPicker = false}
            >
              Back
            </Button>
          </div>

          <ColorPicker
            value={customColorValue}
            onchange={(e) => handleCustomColorSelect(e.detail.value)}
          />

          <div class="flex gap-2">
            <Button
              variant="outline"
              class="flex-1"
              onclick={() => showCustomPicker = false}
            >
              Cancel
            </Button>
            <Button
              class="flex-1"
              onclick={handleCustomColorApply}
            >
              Apply
            </Button>
          </div>
        </div>
      {/if}
    </div>
  {/snippet}
</ResponsiveSheet>
