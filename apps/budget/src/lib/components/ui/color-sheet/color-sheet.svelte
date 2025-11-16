<!-- Export navigation functions for parent components -->
<script module lang="ts">
export interface ColorSheetActions {
  showAdvanced: () => void;
  showBasic: () => void;
  handleColorChange: (color: string) => void;
}
</script>

<script lang="ts">
import {StackedSheet} from '$lib/components/ui/stacked-sheet';
import {buttonVariants} from '$lib/components/ui/button';
import {Palette} from '@lucide/svelte/icons';
import type {Snippet} from 'svelte';
import {cn} from '$lib/utils';

interface Props {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onchange?: (event: CustomEvent<{value: string}>) => void;
  basicContent: Snippet;
  advancedContent: Snippet;
  class?: string;
}

let {
  value = '',
  placeholder = 'Select a color',
  disabled = false,
  open = $bindable(false),
  onOpenChange,
  onchange,
  basicContent,
  advancedContent,
  class: className = '',
}: Props = $props();

let activeSheetId = $state('basic');

// Check if color is a valid hex color
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

// Navigate to advanced sheet
export function showAdvanced() {
  activeSheetId = 'advanced';
}

// Navigate back to basic sheet
export function showBasic() {
  activeSheetId = 'basic';
}

// Handle color change events from child components
export function handleColorChange(color: string) {
  if (onchange) {
    const event = new CustomEvent('change', {detail: {value: color}});
    onchange(event);
  }
}

// Handle sheet changes
function handleSheetChange(sheetId: string) {
  activeSheetId = sheetId;
}

// Create sheets configuration
const sheets = [
  {
    id: 'basic',
    title: 'Color Picker',
    content: basicContent,
  },
  {
    id: 'advanced',
    title: 'Advanced Color Picker',
    content: advancedContent,
  },
];
</script>

<StackedSheet
  {sheets}
  bind:activeSheetId
  bind:open
  {onOpenChange}
  side="right"
  offsetDistance={20}
  class="sm:max-w-md {className}"
  onSheetChange={handleSheetChange}>
  {#snippet trigger()}
    <div class={cn(buttonVariants({variant: 'outline'}), 'justify-start', className)}>
      <div class="flex items-center gap-2">
        {#if value && isValidHexColor(value)}
          <div
            class="border-border h-5 w-5 flex-shrink-0 rounded-md border"
            style="background-color: {value}">
          </div>
          <span class="font-mono text-sm uppercase">{value}</span>
        {:else}
          <Palette class="text-muted-foreground h-4 w-4" />
          <span class="text-muted-foreground">{placeholder}</span>
        {/if}
      </div>
    </div>
  {/snippet}
</StackedSheet>
