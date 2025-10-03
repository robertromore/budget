<script lang="ts">
import * as Dialog from '$lib/components/ui/dialog';
import ManageBudgetGroupForm from '$lib/components/forms/manage-budget-group-form.svelte';
import type {BudgetGroup} from '$lib/schema/budgets';

let {
  open = $bindable(false),
  budgetGroup,
}: {
  open?: boolean;
  budgetGroup?: BudgetGroup;
} = $props();

const isUpdate = $derived(budgetGroup !== undefined);

function handleSuccess() {
  open = false;
}

function handleCancel() {
  open = false;
}
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>
        {isUpdate ? 'Edit Budget Group' : 'Create Budget Group'}
      </Dialog.Title>
      <Dialog.Description>
        {isUpdate
          ? 'Update the budget group details below'
          : 'Create a new budget group to organize your budgets'}
      </Dialog.Description>
    </Dialog.Header>

    <div class="py-4">
      <ManageBudgetGroupForm
        {budgetGroup}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  </Dialog.Content>
</Dialog.Root>
