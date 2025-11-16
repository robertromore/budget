<script lang="ts">
import { ResponsiveSheet } from '$lib/components/ui/responsive-sheet';
import ManageBudgetGroupForm from '$lib/components/forms/manage-budget-group-form.svelte';
import type { BudgetGroup } from '$lib/schema/budgets';

let {
  open = $bindable(false),
  budgetGroup,
}: {
  open?: boolean;
  budgetGroup?: BudgetGroup | undefined;
} = $props();

const isUpdate = $derived(budgetGroup !== undefined);

function handleSuccess() {
  open = false;
}

function handleCancel() {
  open = false;
}
</script>

<ResponsiveSheet bind:open>
  {#snippet header()}
    <div class="space-y-1">
      <h2 class="text-lg font-semibold">
        {isUpdate ? 'Edit Budget Group' : 'Create Budget Group'}
      </h2>
      <p class="text-muted-foreground text-sm">
        {isUpdate
          ? 'Update the budget group details below'
          : 'Create a new budget group to organize your budgets'}
      </p>
    </div>
  {/snippet}

  {#snippet content()}
    <ManageBudgetGroupForm {budgetGroup} onSuccess={handleSuccess} onCancel={handleCancel} />
  {/snippet}
</ResponsiveSheet>
