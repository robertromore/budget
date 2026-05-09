<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import type { BudgetWithRelations } from '$core/server/domains/budgets';
import { resolveBudgetProgressStatus } from '$lib/utils/budget-status';

/**
 * Unified status pill for the budgets table. Shows the *health* of an
 * active budget (On Track / Approaching / Over Budget / Setup Needed)
 * and falls back to the operational status (Paused / Archived /
 * Inactive) when the budget isn't active. A separate "Active" pill is
 * redundant — if a budget is active, users care whether it's healthy,
 * not merely whether it exists.
 */
interface Props {
  budget: BudgetWithRelations;
}

let { budget }: Props = $props();

const health = $derived(resolveBudgetProgressStatus(budget));

const display = $derived.by(() => {
  // `resolveBudgetProgressStatus` returns 'paused' for any non-active
  // budget — expand that into the real operational status so the pill
  // distinguishes Paused vs Archived vs Inactive.
  if (health === 'paused') {
    const raw = budget.status;
    const label = raw.charAt(0).toUpperCase() + raw.slice(1);
    return { label, className: 'bg-muted text-muted-foreground hover:bg-muted' };
  }
  switch (health) {
    case 'over':
      return {
        label: 'Over Budget',
        className:
          'bg-destructive/10 text-destructive hover:bg-destructive/15 border border-destructive/20',
      };
    case 'approaching':
      return {
        label: 'Approaching',
        className:
          'bg-budget-warning/15 text-budget-warning-foreground border border-budget-warning/30 hover:bg-budget-warning/20',
      };
    case 'setup_needed':
      return {
        label: 'Setup Needed',
        className: 'bg-info-bg text-info-fg hover:bg-info-bg/80',
      };
    case 'on_track':
    default:
      return {
        label: 'On Track',
        className:
          'bg-budget-success/15 text-budget-success-foreground border border-budget-success/30 hover:bg-budget-success/20',
      };
  }
});
</script>

<Badge variant="outline" class={display.className}>
  {display.label}
</Badge>
