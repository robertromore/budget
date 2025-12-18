<script lang="ts">
import Button from '$lib/components/ui/button/button.svelte';
import Calendar from '@lucide/svelte/icons/calendar';
import CalendarClock from '@lucide/svelte/icons/calendar-clock';
import Square from '@lucide/svelte/icons/square';
import SquareCheck from '@lucide/svelte/icons/square-check';

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
    class="hover:bg-muted-foreground/20 h-10 w-10 p-1 transition-colors [&_svg]:size-auto">
    {#if value === 'cleared'}
      <SquareCheck
        class="fill-primary text-primary-foreground hover:fill-primary/90 size-2 transition-colors"
        strokeWidth={1.2}
        size={32} />
    {:else}
      <Square
        strokeWidth={1.2}
        size={32}
        class="text-muted-foreground hover:text-foreground size-2 transition-colors" />
    {/if}
  </Button>
{:else if value === 'scheduled' && onScheduleClick}
  <Button
    onclick={onScheduleClick}
    variant="ghost"
    class="hover:bg-primary/10 h-10 w-10 p-1 transition-colors">
    <Calendar class="text-primary hover:text-primary/80 size-2 transition-colors" size={22} />
  </Button>
{:else}
  <div class="flex h-10 w-10 items-center justify-center">
    {#if value === 'scheduled'}
      <Calendar class="text-primary size-2" size={22} />
    {:else}
      <CalendarClock class="text-muted-foreground size-2" size={22} />
    {/if}
  </div>
{/if}
