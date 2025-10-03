<script lang="ts">
import {Button} from '$lib/components/ui/button';
import * as Form from '$lib/components/ui/form';
import * as Select from '$lib/components/ui/select';
import {Input} from '$lib/components/ui/input';
import {Label} from '$lib/components/ui/label';
import {Textarea} from '$lib/components/ui/textarea';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import {createBudgetGroup, updateBudgetGroup, listBudgetGroups} from '$lib/query/budgets';
import type {BudgetGroup} from '$lib/schema/budgets';

let {
  budgetGroup,
  onSuccess,
  onCancel,
}: {
  budgetGroup?: BudgetGroup | undefined;
  onSuccess?: () => void;
  onCancel?: () => void;
} = $props();

const isUpdate = $derived(budgetGroup !== undefined);

// Form state
let name = $state(budgetGroup?.name || '');
let description = $state(budgetGroup?.description || '');
let parentId = $state<number | null>(budgetGroup?.parentId || null);
let spendingLimit = $state<number | null>(budgetGroup?.spendingLimit || null);

// Query for available parent groups
const groupsQuery = listBudgetGroups().options();
const groups = $derived(groupsQuery.data || []);

// Filter out current group and its descendants to prevent circular references
const availableParentGroups = $derived.by(() => {
  if (!isUpdate) return groups;

  // When editing, exclude self and any descendants
  const excludedIds = new Set([budgetGroup!.id]);
  const findDescendants = (gid: number) => {
    groups.forEach(g => {
      if (g.parentId === gid && !excludedIds.has(g.id)) {
        excludedIds.add(g.id);
        findDescendants(g.id);
      }
    });
  };
  findDescendants(budgetGroup!.id);

  return groups.filter(g => !excludedIds.has(g.id));
});

const createMutation = createBudgetGroup.options();
const updateMutation = updateBudgetGroup.options();

const isFormValid = $derived(name.trim().length >= 2);

async function handleSubmit() {
  if (!isFormValid) return;

  const input = {
    name: name.trim(),
    description: description.trim() || null,
    parentId: parentId,
    spendingLimit: spendingLimit,
  };

  try {
    if (isUpdate) {
      await updateMutation.mutateAsync({
        id: budgetGroup!.id,
        ...input,
      });
    } else {
      await createMutation.mutateAsync(input);
    }
    onSuccess?.();
  } catch (error) {
    console.error('Failed to save budget group:', error);
  }
}

const selectedParentGroup = $derived.by(() => {
  if (!parentId) return null;
  return availableParentGroups.find(g => g.id === parentId) || null;
});
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
  <div class="space-y-2">
    <Label for="name">Group Name</Label>
    <Input
      id="name"
      bind:value={name}
      placeholder="e.g., Housing, Transportation"
      required
      minlength="2"
      maxlength="80"
    />
    <p class="text-sm text-muted-foreground">
      A descriptive name for organizing your budgets
    </p>
  </div>

  <div class="space-y-2">
    <Label for="description">Description (Optional)</Label>
    <Textarea
      id="description"
      bind:value={description}
      placeholder="Additional details about this budget group"
      rows="3"
      maxlength="500"
    />
  </div>

  <div class="space-y-2">
    <Label for="parent">Parent Group (Optional)</Label>
    <Select.Root
      selected={selectedParentGroup ? {
        value: String(selectedParentGroup.id),
        label: selectedParentGroup.name
      } : undefined}
      onSelectedChange={(selected) => {
        parentId = selected && selected.value !== "none" ? Number(selected.value) : null;
      }}
    >
      <Select.Trigger id="parent">
        <Select.Value placeholder="None (top-level group)" />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="none" label="None (top-level group)">
          None (top-level group)
        </Select.Item>
        {#each availableParentGroups as group}
          <Select.Item value={String(group.id)} label={group.name}>
            {group.name}
          </Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
    <p class="text-sm text-muted-foreground">
      Organize groups hierarchically for better budget management
    </p>
  </div>

  <div class="space-y-2">
    <Label for="spending-limit">Spending Limit (Optional)</Label>
    <NumericInput
      id="spending-limit"
      bind:value={spendingLimit}
      placeholder="No limit"
      min={0}
      step={0.01}
    />
    <p class="text-sm text-muted-foreground">
      Optional overall spending limit for all budgets in this group
    </p>
  </div>

  <div class="flex gap-2 justify-end pt-4">
    {#if onCancel}
      <Button type="button" variant="outline" onclick={onCancel}>
        Cancel
      </Button>
    {/if}
    <Button
      type="submit"
      disabled={!isFormValid || createMutation.isPending || updateMutation.isPending}
    >
      {isUpdate ? 'Update' : 'Create'} Group
    </Button>
  </div>
</form>
