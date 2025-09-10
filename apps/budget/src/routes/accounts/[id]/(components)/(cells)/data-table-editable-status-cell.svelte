<script lang="ts">
import CalendarClock from '@lucide/svelte/icons/calendar-clock';
import Button from '$lib/components/ui/button/button.svelte';
import {cn} from '$lib/utils';
import SquareCheck from '@lucide/svelte/icons/square-check';
import Square from '@lucide/svelte/icons/square';

let {
  value = $bindable(),
  onUpdateValue,
}: {
  value: string;
  onUpdateValue?: (newValue: unknown) => void;
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
    class="[&_svg]:size-auto">
    {#if value === 'cleared'}
      <SquareCheck
        class={cn(value === 'cleared' ? 'fill-primary' : 'fill-foreground', 'text-white')}
        strokeWidth={1.5}
        size={22} />
    {:else}
      <Square strokeWidth={1.5} size={20} class="text-gray-400" />
    {/if}
  </Button>
{:else}
  <CalendarClock color="gray" size="14" />
{/if}
