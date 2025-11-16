<script lang="ts">
import {Badge} from '$lib/components/ui/badge';

interface Props {
  priority: string | null;
}

let {priority}: Props = $props();

const getPriorityColor = (priority: string | null) => {
  switch (priority) {
    case 'essential':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
    case 'important':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200';
    case 'discretionary':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
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
