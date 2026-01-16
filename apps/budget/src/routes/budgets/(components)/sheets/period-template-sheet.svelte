<script lang="ts">
import BudgetPeriodTemplateForm from '$lib/components/budgets/budget-period-template-form.svelte';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import * as Sheet from '$lib/components/ui/sheet';
import type { BudgetPeriodTemplate } from '$lib/schema/budgets';
import { toast } from '$lib/utils/toast-interceptor';

interface Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  budgetId: number;
  defaultAllocatedAmount?: number;
  onSuccess?: (template: BudgetPeriodTemplate) => void;
}

let {
  open = $bindable(false),
  onOpenChange,
  budgetId,
  defaultAllocatedAmount,
  onSuccess,
}: Props = $props();

function handleSuccess(template: BudgetPeriodTemplate) {
  toast.success('Period template created successfully!');
  open = false;
  onSuccess?.(template);
}

function handleCancel() {
  open = false;
}
</script>

<ResponsiveSheet bind:open {onOpenChange}>
  {#snippet header()}
    <Sheet.Title>Configure Period Template</Sheet.Title>
    <Sheet.Description>
      Budget periods are time windows (like January 2025, Q1 2025, or Week 1) that organize your
      spending into manageable chunks. This automation creates these periods on a schedule—weekly,
      monthly, quarterly, or yearly—so you can track spending patterns over time, compare
      period-to-period performance, and maintain consistent budgeting habits without manual setup.
    </Sheet.Description>
  {/snippet}

  {#snippet content()}
    <BudgetPeriodTemplateForm
      {budgetId}
      {...defaultAllocatedAmount !== undefined ? { defaultAllocatedAmount } : {}}
      onSuccess={handleSuccess}
      onCancel={handleCancel} />
  {/snippet}
</ResponsiveSheet>
