<script lang="ts">
import {Button} from '$ui/lib/components/ui/button';
import {CalendarDays, ChevronDown} from '$lib/components/icons';
import * as Command from '$ui/lib/components/ui/command';
import * as Popover from '$ui/lib/components/ui/popover';
import type {Option} from '$lib/utils/options';

interface Props {
  currentPeriod?: string | number;
  data: Option[];
  dateField?: string;
  enablePeriodFiltering?: boolean;
}

let {currentPeriod = $bindable(0), data, enablePeriodFiltering = false}: Props = $props();

let commandOpen = $state(false);

// Get the selected period label
const selectedPeriod = $derived.by(() => {
  const period = data.find((p) => p.key === currentPeriod);
  return period ? period.label : 'All Time';
});
</script>

<!-- Period Controls -->
{#if enablePeriodFiltering && data.length > 0}
  <div class="flex items-center gap-2">
    <CalendarDays class="text-muted-foreground h-4 w-4" />

    {#if data.length <= 3}
      <!-- Button layout for 3 or fewer options -->
      <div class="flex gap-1">
        {#each data as period}
          <Button
            variant={currentPeriod === period.key ? 'default' : 'outline'}
            size="sm"
            onclick={() => (currentPeriod = period.key)}>
            {period.label}
          </Button>
        {/each}
      </div>
    {:else}
      <!-- Command dropdown for more than 3 options -->
      <Popover.Root bind:open={commandOpen}>
        <Popover.Trigger>
          <Button variant="outline" size="sm" class="min-w-[120px] justify-between gap-2">
            <span>{selectedPeriod}</span>
            <ChevronDown class="h-3 w-3 opacity-50" />
          </Button>
        </Popover.Trigger>

        <Popover.Content class="w-48 p-0" align="start">
          <Command.Root>
            <Command.List class="max-h-48">
              {#each data as period}
                <Command.Item
                  value={period.label}
                  onSelect={() => {
                    currentPeriod = period.key;
                    commandOpen = false;
                  }}
                  class={currentPeriod === period.key ? 'bg-accent' : ''}>
                  <div class="flex w-full items-center justify-between">
                    <span>{period.label}</span>
                    {#if currentPeriod === period.key}
                      <CalendarDays class="h-3 w-3" />
                    {/if}
                  </div>
                </Command.Item>
              {/each}
            </Command.List>
          </Command.Root>
        </Popover.Content>
      </Popover.Root>
    {/if}
  </div>
{/if}
