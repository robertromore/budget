<script lang="ts">
import CalendarClock from '@lucide/svelte/icons/calendar-clock';
import Button from '$lib/components/ui/button/button.svelte';
import SquareCheck from '@lucide/svelte/icons/square-check';
import Square from '@lucide/svelte/icons/square';
import Calendar from '@lucide/svelte/icons/calendar';

let {
  value = $bindable(),
  onUpdateValue,
  onScheduleClick,
}: {
  value: string;
  onUpdateValue?: (newValue: unknown) => void;
  onScheduleClick?: (() => void) | undefined;
} = $props();

const handleSubmit = (new_value: string) => {
  if (onUpdateValue) {
    onUpdateValue(new_value);
  }
};
</script>

{#if value === 'cleared' || value === 'pending'}
  <Button
    onclick={() => handleSubmit(value == 'cleared' ? 'pending' : 'cleared')}
    variant="ghost"
    class="h-10 w-10 p-1 hover:bg-muted-foreground/20 transition-colors [&_svg]:size-auto">
    {#if value === 'cleared'}
      <SquareCheck
        class="fill-green-600 text-white hover:fill-green-700 transition-colors"
        strokeWidth={1.2}
        size={32} />
    {:else}
      <Square
        strokeWidth={1.2}
        size={32}
        class="text-muted-foreground hover:text-foreground transition-colors" />
    {/if}
  </Button>
{:else}
  {#if value === 'scheduled' && onScheduleClick}
    <Button
      onclick={onScheduleClick}
      variant="ghost"
      class="h-10 w-10 p-1 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
      <Calendar class="text-blue-600 hover:text-blue-700 transition-colors" size={22} />
    </Button>
  {:else}
    <div class="flex items-center justify-center h-10 w-10">
      {#if value === 'scheduled'}
        <Calendar class="text-blue-600" size={22} />
      {:else}
        <CalendarClock class="text-muted-foreground" size={22} />
      {/if}
    </div>
  {/if}
{/if}
