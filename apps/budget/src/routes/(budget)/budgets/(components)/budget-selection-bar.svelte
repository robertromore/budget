<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import type { BudgetWithRelations } from '$core/server/domains/budgets';
import Archive from '@lucide/svelte/icons/archive';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import CirclePause from '@lucide/svelte/icons/circle-pause';
import CirclePlay from '@lucide/svelte/icons/circle-play';
import Download from '@lucide/svelte/icons/download';
import Trash2 from '@lucide/svelte/icons/trash-2';
import X from '@lucide/svelte/icons/x';

type StatusChange = 'active' | 'inactive' | 'archived';

interface Props {
  /** Budgets currently selected and visible in the filtered list. */
  selected: BudgetWithRelations[];
  /** Budgets selected but hidden by the active filter/search. */
  hiddenCount: number;
  onChangeStatus: (status: StatusChange) => void;
  onArchive: () => void;
  onDelete: () => void;
  onExport: () => void;
  onClear: () => void;
}

let {
  selected,
  hiddenCount,
  onChangeStatus,
  onArchive,
  onDelete,
  onExport,
  onClear,
}: Props = $props();

const count = $derived(selected.length);
const isEmpty = $derived(count === 0);

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    onClear();
  }
}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if !isEmpty}
  <div
    class="animate-in slide-in-from-bottom-4 fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]"
    role="region"
    aria-label="Bulk actions for selected budgets">
    <div
      class="bg-background/95 supports-[backdrop-filter]:bg-background/80 flex max-w-full items-center gap-2 rounded-full border px-3 py-2 shadow-lg backdrop-blur sm:gap-3 sm:px-4"
      aria-live="polite">
      <div class="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
        <span class="tabular-nums">
          {count}
          {count === 1 ? 'budget' : 'budgets'} selected
        </span>
        {#if hiddenCount > 0}
          <span class="text-muted-foreground text-xs">
            · {hiddenCount} hidden by filter
          </span>
        {/if}
      </div>

      <div class="bg-border h-5 w-px" aria-hidden="true"></div>

      <div class="flex items-center gap-1">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <Button {...props} variant="ghost" size="sm" class="h-8">
                Status
                <ChevronDown class="ml-1 h-3 w-3" />
              </Button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Item onclick={() => onChangeStatus('active')}>
              <CirclePlay class="mr-2 h-4 w-4" />
              Activate
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={() => onChangeStatus('inactive')}>
              <CirclePause class="mr-2 h-4 w-4" />
              Pause
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        <Button variant="ghost" size="sm" class="h-8" onclick={onExport}>
          <Download class="mr-1.5 h-4 w-4" />
          <span class="hidden sm:inline">Export</span>
        </Button>

        <Button variant="ghost" size="sm" class="h-8" onclick={onArchive}>
          <Archive class="mr-1.5 h-4 w-4" />
          <span class="hidden sm:inline">Archive</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          class="text-destructive hover:text-destructive h-8"
          onclick={onDelete}>
          <Trash2 class="mr-1.5 h-4 w-4" />
          <span class="hidden sm:inline">Delete</span>
        </Button>
      </div>

      <div class="bg-border h-5 w-px" aria-hidden="true"></div>

      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8 rounded-full"
        aria-label="Clear selection (Esc)"
        title="Clear selection (Esc)"
        onclick={onClear}>
        <X class="h-4 w-4" />
      </Button>
    </div>
  </div>
{/if}
