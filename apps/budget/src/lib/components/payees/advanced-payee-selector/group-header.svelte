<script lang="ts">
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import {Badge} from '$lib/components/ui/badge';
import {cn} from '$lib/utils';

let {
  label,
  count,
  isExpanded = true,
  onToggle,
  class: className
}: {
  label: string;
  count: number;
  isExpanded?: boolean;
  onToggle?: () => void;
  class?: string;
} = $props();
</script>

<button
  type="button"
  onclick={onToggle}
  class={cn(
    'sticky top-0 z-10 w-full flex items-center justify-between px-3 py-2 text-sm font-medium',
    'bg-muted/50 backdrop-blur-sm hover:bg-muted/70 transition-colors',
    'border-b border-border',
    className
  )}
>
  <div class="flex items-center gap-2">
    <ChevronDown
      class={cn(
        'h-4 w-4 transition-transform',
        !isExpanded && '-rotate-90'
      )}
    />
    <span>{label}</span>
    <Badge variant="secondary" class="text-xs px-1.5 py-0">
      {count}
    </Badge>
  </div>
</button>
