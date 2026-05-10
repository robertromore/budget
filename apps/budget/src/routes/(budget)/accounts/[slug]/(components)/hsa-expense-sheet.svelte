<!--
  HSA Add/Edit Expense Sheet — opens when the parent sets `expense` to
  an existing expense (edit) or `null` while toggling `mode = 'add'`
  (new). Editing always uses the manual form; adding offers a tab
  switch between guided wizard and manual form.

  Bind `expense` (existing | null) and `mode` ('add' | 'edit' | null).
  Setting mode to a non-null value opens the sheet; the sheet clears
  both on success/cancel.
-->
<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import * as Tabs from '$lib/components/ui/tabs';
import FileText from '@lucide/svelte/icons/file-text';
import Wand from '@lucide/svelte/icons/wand';
import ExpenseWizard from './expense-wizard.svelte';
import MedicalExpenseForm from './medical-expense-form.svelte';

interface Props {
  /** HSA account id (`accountData.id` from the parent). */
  hsaAccountId: number;
  /** Existing expense being edited, or null when adding new. Bindable so the sheet can clear it on close. */
  expense: any | null;
  /** Mode toggle: 'add' or 'edit'. Bindable; null closes the sheet. */
  mode: 'add' | 'edit' | null;
}

let {
  hsaAccountId,
  expense = $bindable(null),
  mode = $bindable(null),
}: Props = $props();

let useWizard = $state(true);
const isOpen = $derived(mode !== null);
const isEditing = $derived(mode === 'edit' && expense !== null);

function close() {
  mode = null;
  expense = null;
  useWizard = true;
}

function handleOpenChange(open: boolean) {
  if (!open) close();
}
</script>

<ResponsiveSheet open={isOpen} onOpenChange={handleOpenChange}>
  {#snippet header()}
    <div class="space-y-2">
      <h2 class="text-lg font-semibold">
        {isEditing ? 'Edit Medical Expense' : 'Add Medical Expense'}
      </h2>
      <p class="text-muted-foreground text-sm">
        {isEditing
          ? 'Update the medical expense details'
          : useWizard
            ? 'Follow the guided wizard to add your expense'
            : 'Add a new medical expense to your HSA account'}
      </p>
    </div>
  {/snippet}
  {#snippet content()}
    {#if isEditing && expense}
      <MedicalExpenseForm
        {hsaAccountId}
        accountId={hsaAccountId}
        existingExpense={expense}
        onSuccess={close}
        onCancel={close} />
    {:else}
      <div class="space-y-6">
        <Tabs.Root
          value={useWizard ? 'wizard' : 'manual'}
          onValueChange={(value) => {
            useWizard = value === 'wizard';
          }}>
          <Tabs.List class="grid w-full grid-cols-2">
            <Tabs.Trigger value="wizard" class="flex items-center gap-2">
              <Wand class="h-4 w-4" />
              Guided Setup
              <Badge variant="secondary" class="text-xs">Helpful</Badge>
            </Tabs.Trigger>
            <Tabs.Trigger value="manual" class="flex items-center gap-2">
              <FileText class="h-4 w-4" />
              Manual Form
              <Badge variant="secondary" class="text-xs">Quick</Badge>
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="wizard" class="mt-6">
            <div class="bg-muted/20 border-muted mb-4 rounded-lg border p-4">
              <p class="text-muted-foreground text-sm">
                Step-by-step guided setup. We'll walk you through each option with clear
                instructions.
              </p>
            </div>
            <ExpenseWizard
              {hsaAccountId}
              accountId={hsaAccountId}
              onSuccess={close}
              onCancel={close} />
          </Tabs.Content>

          <Tabs.Content value="manual" class="mt-6">
            <div class="bg-muted/20 border-muted mb-4 rounded-lg border p-4">
              <p class="text-muted-foreground text-sm">
                Fill out the form directly if you're familiar with the options. Switch to <strong
                  >Guided Setup</strong> for step-by-step help.
              </p>
            </div>
            <MedicalExpenseForm
              {hsaAccountId}
              accountId={hsaAccountId}
              onSuccess={close}
              onCancel={close} />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    {/if}
  {/snippet}
</ResponsiveSheet>
