<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { cn } from '$lib/utils';
import CheckCircle from '@lucide/svelte/icons/check-circle';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';

interface Props {
  isActive: boolean;
}

let { isActive }: Props = $props();

const statusDisplay = $derived(() => {
  return {
    icon: isActive ? CheckCircle : AlertTriangle,
    color: isActive ? 'text-green-600' : 'text-orange-600',
    bgColor: isActive ? 'bg-green-50 dark:bg-green-950' : 'bg-orange-50 dark:bg-orange-950',
    label: isActive ? 'Active' : 'Inactive'
  };
});
</script>

{#snippet badgeContent()}
  {@const display = statusDisplay()}
  <Badge
    variant="outline"
    class={cn("text-xs", display.color, display.bgColor)}>
    <display.icon class="mr-1 h-3 w-3" />
    {display.label}
  </Badge>
{/snippet}

{@render badgeContent()}
