<script lang="ts">
import { Badge } from '$lib/components/ui/badge';

interface Props {
  priority: string | null;
}

let { priority }: Props = $props();

const getPriorityColor = (priority: string | null) => {
  switch (priority) {
    case 'essential':
      return 'bg-danger-bg text-danger-fg';
    case 'important':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200';
    case 'discretionary':
      return 'bg-info-bg text-info-fg';
    case 'luxury':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
    default:
      return '';
  }
};

const formatPriority = (priority: string | null) => {
  if (!priority) return null;
  return priority.charAt(0).toUpperCase() + priority.slice(1);
};
</script>

{#if priority}
  <Badge variant="outline" class="text-xs {getPriorityColor(priority)}">
    {formatPriority(priority)}
  </Badge>
{:else}
  <span class="text-muted-foreground">—</span>
{/if}
