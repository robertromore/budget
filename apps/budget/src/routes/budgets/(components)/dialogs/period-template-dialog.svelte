<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import BudgetPeriodTemplateForm from "$lib/components/budgets/budget-period-template-form.svelte";
  import type {BudgetPeriodTemplate} from "$lib/schema/budgets";
  import {toast} from "svelte-sonner";

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    budgetId: number;
    onSuccess?: (template: BudgetPeriodTemplate) => void;
  }

  let {
    open = $bindable(false),
    onOpenChange,
    budgetId,
    onSuccess,
  }: Props = $props();

  function handleSuccess(template: BudgetPeriodTemplate) {
    toast.success("Period template created successfully!");
    open = false;
    onSuccess?.(template);
  }

  function handleCancel() {
    open = false;
  }

  function handleOpenChange(newOpen: boolean) {
    open = newOpen;
    onOpenChange?.(newOpen);
  }
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>Configure Period Template</Dialog.Title>
      <Dialog.Description>
        Set up automated budget period generation. Choose how often periods should be created
        (weekly, monthly, quarterly, or yearly) and see a preview of upcoming periods.
      </Dialog.Description>
    </Dialog.Header>

    <div class="py-4">
      <BudgetPeriodTemplateForm
        {budgetId}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  </Dialog.Content>
</Dialog.Root>
