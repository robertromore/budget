<script lang="ts">
import * as Select from '$lib/components/ui/select';
import {CHART_COLOR_SCHEMES, getColorSchemesByCategory} from '$lib/utils/chart-colors';

interface Props {
  selectedScheme: string;
}

let {selectedScheme = $bindable('default')}: Props = $props();

const colorSchemes = CHART_COLOR_SCHEMES;
const colorSchemesByCategory = getColorSchemesByCategory();
const selectedColorScheme = $derived.by(() => {
  return colorSchemes[selectedScheme] || colorSchemes['default'];
});
</script>

<div class="flex items-center gap-2">
  <label for="color-selector" class="text-sm font-medium">Colors:</label>
  <Select.Root type="single" bind:value={selectedScheme}>
    <Select.Trigger class="w-[160px]">
      <div class="flex items-center gap-2">
        <div class="flex gap-0.5">
          {#each selectedColorScheme!.colors.slice(0, 4) as color}
            <div
              class="border-border/30 size-2.5 rounded-full border"
              style="background-color: {color}">
            </div>
          {/each}
        </div>
        <span>{selectedColorScheme!.name}</span>
      </div>
    </Select.Trigger>
    <Select.Content>
      {#each Object.entries(colorSchemesByCategory) as [categoryName, schemes]}
        {#if schemes.length > 0}
          <!-- Category Header -->
          <div
            class="text-muted-foreground border-b px-2 py-1 text-xs font-medium tracking-wide uppercase">
            {categoryName}
          </div>

          <!-- Schemes in Category -->
          {#each schemes as scheme}
            {@const schemeKey =
              Object.entries(colorSchemes).find(([, s]) => s === scheme)?.[0] || ''}
            <Select.Item value={schemeKey}>
              <div class="flex items-center gap-3">
                <div class="flex gap-1">
                  {#each scheme.colors.slice(0, 4) as color}
                    <div
                      class="border-border/30 h-3 w-3 rounded-full border"
                      style="background-color: {color}">
                    </div>
                  {/each}
                </div>
                <div class="flex flex-col">
                  <span>{scheme.name}</span>
                  <span class="text-muted-foreground text-xs">{scheme.description}</span>
                </div>
              </div>
            </Select.Item>
          {/each}
        {/if}
      {/each}
    </Select.Content>
  </Select.Root>
</div>
