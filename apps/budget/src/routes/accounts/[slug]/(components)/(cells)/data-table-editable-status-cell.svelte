<script lang="ts">
import Button from '$lib/components/ui/button/button.svelte';
import Calendar from '@lucide/svelte/icons/calendar';
import CalendarClock from '@lucide/svelte/icons/calendar-clock';
import Check from '@lucide/svelte/icons/check';
import Circle from '@lucide/svelte/icons/circle';

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
    class="group/status hover:bg-muted h-10 w-10 p-1 transition-colors">
    {#if value === 'cleared'}
      <Check
        class="text-success size-5 transition-colors"
        strokeWidth={2.5} />
    {:else}
      <Circle
        strokeWidth={1.5}
        class="text-muted-foreground/40 group-hover/status:text-muted-foreground size-5 transition-colors" />
    {/if}
  </Button>
{:else if value === 'scheduled' && onScheduleClick}
  <Button
    onclick={onScheduleClick}
    variant="ghost"
    class="hover:bg-primary/10 h-10 w-10 p-1 transition-colors">
    <Calendar class="text-primary hover:text-primary/80 size-5 transition-colors" />
  </Button>
{:else}
  <div class="flex h-10 w-10 items-center justify-center">
    {#if value === 'scheduled'}
      <Calendar class="text-primary size-5" />
    {:else}
      <CalendarClock class="text-muted-foreground size-5" />
    {/if}
  </div>
{/if}
