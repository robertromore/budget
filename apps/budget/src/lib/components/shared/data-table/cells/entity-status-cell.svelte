<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { cn } from '$lib/utils';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

interface Props {
  isActive: boolean;
}

let { isActive }: Props = $props();

const statusDisplay = $derived(() => {
  return {
    icon: isActive ? CircleCheck : TriangleAlert,
    color: isActive ? 'text-success' : 'text-orange-600',
    bgColor: isActive ? 'bg-success-bg' : 'bg-orange-50 dark:bg-orange-950',
    label: isActive ? 'Active' : 'Inactive',
  };
});
</script>

{#snippet badgeContent()}
  {@const display = statusDisplay()}
  <Badge variant="outline" class={cn('text-xs', display.color, display.bgColor)}>
    <display.icon class="mr-1 h-3 w-3" />
    {display.label}
  </Badge>
{/snippet}

{@render badgeContent()}
