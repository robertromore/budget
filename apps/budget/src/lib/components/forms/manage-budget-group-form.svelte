<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Select from '$lib/components/ui/select';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Textarea } from '$lib/components/ui/textarea';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import { createBudgetGroup, updateBudgetGroup, listBudgetGroups } from '$lib/query/budgets';
import type { BudgetGroup } from '$lib/schema/budgets';
import { createTransformAccessors } from '$lib/utils/bind-helpers';

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
let spendingLimitValue = $state<number>(budgetGroup?.spendingLimit || 0);

// Computed spending limit (null when 0)
const spendingLimit = $derived(spendingLimitValue > 0 ? spendingLimitValue : null);

// Parent ID accessor - transforms between string (for Select) and number|null (for form state)
const parentIdAccessors = createTransformAccessors(
  () => (parentId === null ? 'none' : String(parentId)),
  (value: string) => {
    parentId = value === 'none' ? null : Number(value);
  }
);

// Query for available parent groups
const groupsQuery = listBudgetGroups().options();
const groups = $derived(groupsQuery.data || []);

// Filter out current group and its descendants to prevent circular references
const availableParentGroups = $derived.by(() => {
  if (!isUpdate) return groups;

  // When editing, exclude self and any descendants
  const excludedIds = new Set([budgetGroup!.id]);
  const findDescendants = (gid: number) => {
    groups.forEach((g) => {
      if (g.parentId === gid && !excludedIds.has(g.id)) {
        excludedIds.add(g.id);
        findDescendants(g.id);
      }
    });
  };
  findDescendants(budgetGroup!.id);

  return groups.filter((g) => !excludedIds.has(g.id));
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
</script>

<form
  onsubmit={(e) => {
    e.preventDefault();
    handleSubmit();
  }}
  class="space-y-4">
  <div class="space-y-2">
    <Label for="name">Group Name</Label>
    <Input
      id="name"
      bind:value={name}
      placeholder="e.g., Housing, Transportation"
      required
      minlength={2}
      maxlength={80} />
    <p class="text-muted-foreground text-sm">A descriptive name for organizing your budgets</p>
  </div>

  <div class="space-y-2">
    <Label for="description">Description (Optional)</Label>
    <Textarea
      id="description"
      bind:value={description}
      placeholder="Additional details about this budget group"
      rows={3}
      maxlength={500} />
  </div>

  <div class="space-y-2">
    <Label for="parent">Parent Group (Optional)</Label>
    <Select.Root type="single" bind:value={parentIdAccessors.get, parentIdAccessors.set}>
      <Select.Trigger id="parent">
        <span>
          {#if parentId === null}
            None (top-level group)
          {:else}
            {availableParentGroups.find((g) => g.id === parentId)?.name || 'Select parent group'}
          {/if}
        </span>
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="none">None (top-level group)</Select.Item>
        {#each availableParentGroups as group}
          <Select.Item value={String(group.id)}>
            {group.name}
          </Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
    <p class="text-muted-foreground text-sm">
      Organize groups hierarchically for better budget management
    </p>
  </div>

  <div class="space-y-2">
    <Label for="spending-limit">Spending Limit (Optional)</Label>
    <NumericInput id="spending-limit" bind:value={spendingLimitValue} />
    <p class="text-muted-foreground text-sm">
      Optional overall spending limit for all budgets in this group (set to 0 for no limit)
    </p>
  </div>

  <div class="flex justify-end gap-2 pt-4">
    {#if onCancel}
      <Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
    {/if}
    <Button
      type="submit"
      disabled={!isFormValid || createMutation.isPending || updateMutation.isPending}>
      {isUpdate ? 'Update' : 'Create'} Group
    </Button>
  </div>
</form>
