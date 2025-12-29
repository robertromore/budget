<!--
  Automation Tab

  Displays automation rules that apply to this account and allows creating new rules.
-->
<script lang="ts">
import { goto } from '$app/navigation';
import { RuleBuilder } from '$lib/components/automation/rule-builder';
import { createAccountScopedRuleConfig } from '$lib/components/automation/rule-builder/utils';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import { Switch } from '$lib/components/ui/switch';
import { Textarea } from '$lib/components/ui/textarea';
import { rpc } from '$lib/query';
import type { AutomationRule } from '$lib/schema/automation-rules';
import type { FlowState } from '$lib/types/automation';
import Plus from '@lucide/svelte/icons/plus';
import Save from '@lucide/svelte/icons/save';
import Zap from '@lucide/svelte/icons/zap';
import { toast } from 'svelte-sonner';
import AccountAutomationEmptyState from './account-automation-empty-state.svelte';
import { RuleCard } from '$lib/components/automation';

interface Props {
  accountId: number;
  accountSlug: string;
}

let { accountId, accountSlug }: Props = $props();

// Query rules for this account
const rulesQuery = $derived(rpc.automation.getByAccountId(accountId).options());
const rules = $derived((rulesQuery.data ?? []) as AutomationRule[]);
const isLoading = $derived(rulesQuery.isLoading);

// Mutations
const createMutation = rpc.automation.createRule.options();
const updateMutation = rpc.automation.updateRule.options();
const enableMutation = rpc.automation.enableRule.options();
const disableMutation = rpc.automation.disableRule.options();
const duplicateMutation = rpc.automation.duplicateRule.options();
const deleteMutation = rpc.automation.deleteRule.options();

// Sheet state for create/edit
let sheetOpen = $state(false);
let editingRule = $state<AutomationRule | null>(null);

// Form state
let name = $state('');
let description = $state('');
let isEnabled = $state(true);
let priority = $state(0);
let stopOnMatch = $state(true);
let runOnce = $state(false);

// Rule builder reference
let ruleBuilder = $state<RuleBuilder | null>(null);

// Delete confirmation state
let deleteDialogOpen = $state(false);
let ruleToDelete = $state<number | null>(null);

const isSaving = $derived(createMutation.isPending || updateMutation.isPending);

function resetForm() {
  name = '';
  description = '';
  isEnabled = true;
  priority = 0;
  stopOnMatch = true;
  runOnce = false;
  editingRule = null;
}

function handleCreateNew() {
  resetForm();
  sheetOpen = true;
}

function handleEdit(id: number) {
  const rule = rules.find(r => r.id === id);
  if (!rule) return;

  editingRule = rule;
  name = rule.name;
  description = rule.description || '';
  isEnabled = rule.isEnabled;
  priority = rule.priority;
  stopOnMatch = rule.stopOnMatch ?? true;
  runOnce = rule.runOnce ?? false;
  sheetOpen = true;
}

async function handleSave() {
  if (!name.trim()) {
    toast.error('Please enter a rule name');
    return;
  }

  const result = ruleBuilder?.save();
  if (!result?.success || !result.ruleConfig || !result.flowState) {
    toast.error('Please fix the validation errors before saving');
    return;
  }

  try {
    if (editingRule) {
      // Update existing rule
      await updateMutation.mutateAsync({
        id: editingRule.id,
        name: name.trim(),
        description: description.trim() || null,
        isEnabled,
        priority,
        stopOnMatch,
        runOnce,
        trigger: result.ruleConfig.trigger,
        conditions: result.ruleConfig.conditions,
        actions: result.ruleConfig.actions,
        flowState: result.flowState,
      });
      toast.success('Rule updated successfully');
    } else {
      // Create new rule
      await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        isEnabled,
        priority,
        stopOnMatch,
        runOnce,
        trigger: result.ruleConfig.trigger,
        conditions: result.ruleConfig.conditions,
        actions: result.ruleConfig.actions,
        flowState: result.flowState,
      });
      toast.success('Rule created successfully');
    }

    sheetOpen = false;
    resetForm();
  } catch (error) {
    console.error('Failed to save rule:', error);
    toast.error(editingRule ? 'Failed to update rule' : 'Failed to create rule');
  }
}

async function handleToggleEnabled(id: number, enabled: boolean) {
  try {
    if (enabled) {
      await enableMutation.mutateAsync(id);
    } else {
      await disableMutation.mutateAsync(id);
    }
  } catch (error) {
    toast.error('Failed to update rule status');
  }
}

async function handleDuplicate(id: number) {
  try {
    const newRule = await duplicateMutation.mutateAsync({ id });
    toast.success('Rule duplicated');
    // Open the new rule for editing
    handleEdit(newRule.id);
  } catch (error) {
    toast.error('Failed to duplicate rule');
  }
}

function handleDelete(id: number) {
  ruleToDelete = id;
  deleteDialogOpen = true;
}

async function confirmDelete() {
  if (ruleToDelete === null) return;

  try {
    await deleteMutation.mutateAsync(ruleToDelete);
    toast.success('Rule deleted');
  } catch (error) {
    toast.error('Failed to delete rule');
  } finally {
    deleteDialogOpen = false;
    ruleToDelete = null;
  }
}

function handleViewLogs(id: number) {
  goto(`/automation/${id}/logs`);
}

// Get initial rule config for the builder
const initialRuleConfig = $derived.by(() => {
  if (editingRule) {
    return {
      trigger: editingRule.trigger,
      conditions: editingRule.conditions,
      actions: editingRule.actions,
    };
  }
  return createAccountScopedRuleConfig(accountId);
});

const initialFlowState = $derived.by(() => {
  if (editingRule?.flowState) {
    return editingRule.flowState as FlowState;
  }
  return null;
});
</script>

<div class="space-y-4">
  {#if isLoading}
    <div class="grid gap-4 md:grid-cols-2">
      {#each { length: 3 } as _, i (i)}
        <div class="h-40 animate-pulse rounded-lg bg-muted" />
      {/each}
    </div>
  {:else if rules.length === 0}
    <AccountAutomationEmptyState onCreateNew={handleCreateNew} />
  {:else}
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold">Automation Rules</h2>
        <p class="text-sm text-muted-foreground">
          {rules.filter(r => r.isEnabled).length} active, {rules.filter(r => !r.isEnabled).length} paused
        </p>
      </div>
      <Button onclick={handleCreateNew}>
        <Plus class="mr-2 h-4 w-4" />
        New Rule
      </Button>
    </div>

    <!-- Rules List -->
    <div class="grid gap-4 md:grid-cols-2">
      {#each rules as rule (rule.id)}
        <RuleCard
          {rule}
          onToggleEnabled={handleToggleEnabled}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onViewLogs={handleViewLogs}
        />
      {/each}
    </div>
  {/if}
</div>

<!-- Create/Edit Rule Sheet -->
<ResponsiveSheet bind:open={sheetOpen} defaultWidth={1000} minWidth={800} maxWidth={1400}>
  {#snippet header()}
    <div class="flex items-center gap-3">
      <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900">
        <Zap class="h-5 w-5 text-amber-600 dark:text-amber-400" />
      </div>
      <div>
        <h2 class="text-lg font-semibold tracking-tight">
          {editingRule ? 'Edit Automation Rule' : 'New Automation Rule'}
        </h2>
        <p class="text-muted-foreground text-sm">
          {editingRule ? 'Update the automation rule' : 'Create a rule for this account'}
        </p>
      </div>
    </div>
  {/snippet}

  {#snippet content()}
    <div class="flex-1 space-y-6 overflow-y-auto">
      <!-- Rule Settings -->
      <Card.Root>
        <Card.Header>
          <Card.Title>Rule Settings</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="grid gap-6 md:grid-cols-2">
            <div class="space-y-2">
              <Label for="name">Name</Label>
              <Input
                id="name"
                bind:value={name}
                placeholder="e.g., Auto-categorize groceries"
              />
            </div>

            <div class="space-y-2">
              <Label for="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                bind:value={priority}
                min={-1000}
                max={1000}
              />
              <p class="text-xs text-muted-foreground">
                Higher priority rules run first (-1000 to 1000)
              </p>
            </div>

            <div class="space-y-2 md:col-span-2">
              <Label for="description">Description (optional)</Label>
              <Textarea
                id="description"
                bind:value={description}
                placeholder="Describe what this rule does..."
                rows={2}
              />
            </div>

            <div class="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label>Enabled</Label>
                <p class="text-sm text-muted-foreground">
                  Rule will start running immediately when saved
                </p>
              </div>
              <Switch bind:checked={isEnabled} />
            </div>

            <div class="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label>Stop on Match</Label>
                <p class="text-sm text-muted-foreground">
                  Don't run lower priority rules after this one matches
                </p>
              </div>
              <Switch bind:checked={stopOnMatch} />
            </div>
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Rule Builder -->
      <Card.Root>
        <Card.Header>
          <Card.Title>Rule Flow</Card.Title>
          <Card.Description>
            Build your rule by connecting triggers, conditions, and actions
          </Card.Description>
        </Card.Header>
        <Card.Content>
          {#key editingRule?.id ?? 'new'}
            <RuleBuilder
              bind:this={ruleBuilder}
              entityType="transaction"
              initialRuleConfig={initialRuleConfig}
              initialFlowState={initialFlowState}
              compact
            />
          {/key}
        </Card.Content>
      </Card.Root>
    </div>
  {/snippet}

  {#snippet footer()}
    <div class="flex gap-2 px-3 py-3">
      <Button variant="outline" onclick={() => { sheetOpen = false; resetForm(); }}>
        Cancel
      </Button>
      <Button onclick={handleSave} disabled={isSaving} class="flex-1">
        <Save class="mr-2 h-4 w-4" />
        {isSaving ? 'Saving...' : (editingRule ? 'Update Rule' : 'Create Rule')}
      </Button>
    </div>
  {/snippet}
</ResponsiveSheet>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Rule</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete this automation rule? This action cannot be undone.
        All execution logs for this rule will also be deleted.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onclick={confirmDelete}
      >
        Delete
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
