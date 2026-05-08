<script lang="ts">
import { Button } from '$lib/components/ui/button';
import type { DashboardWidget } from '$core/schema/dashboards';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Calendar from '@lucide/svelte/icons/calendar';
import Download from '@lucide/svelte/icons/download';
import Tag from '@lucide/svelte/icons/tag';
import Target from '@lucide/svelte/icons/target';
import Upload from '@lucide/svelte/icons/upload';
import Users from '@lucide/svelte/icons/users';

let { config }: { config: DashboardWidget } = $props();

type Action = { href: string; label: string; icon: typeof CreditCard };

const allActions: Action[] = [
  { href: '/accounts', label: 'Accounts', icon: CreditCard },
  { href: '/payees', label: 'Payees', icon: Users },
  { href: '/schedules', label: 'Schedules', icon: Calendar },
  { href: '/categories', label: 'Categories', icon: Tag },
  { href: '/budgets', label: 'Budgets', icon: Target },
  { href: '/import/bulk', label: 'Bulk Import', icon: Upload },
  { href: '/transactions/export', label: 'Export', icon: Download },
];

const visibleActions = $derived.by(() => {
  switch (config.size) {
    case 'small':
      return allActions.slice(0, 2);
    case 'medium':
      return allActions.slice(0, 3);
    case 'large':
      return allActions.slice(0, 5);
    default:
      return allActions;
  }
});

const gridClass = $derived(
  config.size === 'full' ? 'grid-cols-2' : config.size === 'large' ? 'grid-cols-2' : 'grid-cols-1'
);
</script>

<div class="grid gap-2 {gridClass}">
  {#each visibleActions as action}
    <Button variant="outline" href={action.href} class="justify-start" size="sm">
      <action.icon class="mr-2 h-4 w-4"></action.icon>
      {action.label}
    </Button>
  {/each}
</div>
