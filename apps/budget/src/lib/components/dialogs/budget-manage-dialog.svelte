<script lang="ts">
  import * as Sheet from '$lib/components/ui/sheet';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import * as Select from '$lib/components/ui/select';
  import { Label } from '$lib/components/ui/label';
  import { Badge } from '$lib/components/ui/badge';
  import { Separator } from '$lib/components/ui/separator';
  import type { UseBoolean } from '$lib/hooks/ui/use-boolean.svelte';
  import type { UseNumber } from '$lib/hooks/ui/use-number.svelte';
  import { managingBudgetId, newBudgetDialog } from '$lib/states/ui/global.svelte';
  import { BudgetsState } from '$lib/states/budgets.svelte';
  import { createBudget, updateBudget } from '$lib/query/budgets';

  // Create mutation instances during component initialization
  const createBudgetMutation = createBudget.options();
  const updateBudgetMutation = updateBudget.options();
  import type { Budget } from '$lib/schema/budgets';
  import { Wallet, Target, Calendar, Repeat, Info } from '@lucide/svelte';

  const dialogOpen: UseBoolean = $derived(newBudgetDialog);
  const budgetId: UseNumber = $derived(managingBudgetId);
  const budgetsState = BudgetsState.get();

  // Form state
  let formData = $state({
    name: '',
    description: '',
    type: 'account-monthly' as Budget['type'],
    scope: 'account' as Budget['scope'],
    status: 'active' as Budget['status'],
    enforcementLevel: 'warning' as Budget['enforcementLevel'],
  });

  // Form validation
  let errors = $state({
    name: '',
    type: '',
    scope: '',
  });

  let isSubmitting = $state(false);

  // Get existing budget when editing
  const existingBudget = $derived.by(() => {
    if (budgetId.current === 0) return null;
    return budgetsState.getById(budgetId.current);
  });

  // Reset form when dialog opens/closes or budget changes
  $effect(() => {
    if (dialogOpen.current) {
      if (existingBudget) {
        formData = {
          name: existingBudget.name,
          description: existingBudget.description || '',
          type: existingBudget.type,
          scope: existingBudget.scope,
          status: existingBudget.status,
          enforcementLevel: existingBudget.enforcementLevel,
        };
      } else {
        formData = {
          name: '',
          description: '',
          type: 'account-monthly',
          scope: 'account',
          status: 'active',
          enforcementLevel: 'warning',
        };
      }
      // Clear errors
      errors = { name: '', type: '', scope: '' };
    }
  });

  // Budget type options with descriptions
  const budgetTypes = [
    {
      value: 'account-monthly',
      label: 'Monthly Budget',
      icon: Calendar,
      description: 'Set monthly spending limits per account',
      color: 'hsl(var(--blue))'
    },
    {
      value: 'category-envelope',
      label: 'Envelope Budget',
      icon: Wallet,
      description: 'YNAB-style category allocation with rollover',
      color: 'hsl(var(--green))'
    },
    {
      value: 'goal-based',
      label: 'Goal Budget',
      icon: Target,
      description: 'Track progress toward savings or spending goals',
      color: 'hsl(var(--purple))'
    },
    {
      value: 'scheduled-expense',
      label: 'Scheduled Budget',
      icon: Repeat,
      description: 'Plan for recurring expenses and schedules',
      color: 'hsl(var(--orange))'
    },
  ];

  const scopeOptions = [
    { value: 'account', label: 'Account-level', description: 'Apply to specific accounts' },
    { value: 'category', label: 'Category-level', description: 'Apply to specific categories' },
    { value: 'global', label: 'Global', description: 'Apply across all accounts and categories' },
    { value: 'mixed', label: 'Mixed', description: 'Custom account and category combinations' },
  ];

  const enforcementOptions = [
    { value: 'none', label: 'Tracking Only', description: 'Track spending without restrictions' },
    { value: 'warning', label: 'Warning', description: 'Show warnings when approaching limits' },
    { value: 'strict', label: 'Strict', description: 'Block transactions when over budget' },
  ];

  function validateForm(): boolean {
    errors = { name: '', type: '', scope: '' };
    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = 'Budget name is required';
      isValid = false;
    }

    if (!formData.type) {
      errors.type = 'Budget type is required';
      isValid = false;
    }

    if (!formData.scope) {
      errors.scope = 'Budget scope is required';
      isValid = false;
    }

    return isValid;
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (!validateForm()) return;

    isSubmitting = true;
    try {
      if (existingBudget) {
        // Update existing budget
        await $updateBudgetMutation.mutateAsync({
          id: existingBudget.id,
          data: {
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            type: formData.type,
            scope: formData.scope,
            status: formData.status,
            enforcementLevel: formData.enforcementLevel,
          }
        });
      } else {
        // Create new budget
        await $createBudgetMutation.mutateAsync({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          type: formData.type,
          scope: formData.scope,
          status: formData.status,
          enforcementLevel: formData.enforcementLevel,
        });
      }

      dialogOpen.current = false;
    } catch (error) {
      console.error('Failed to save budget:', error);
      // In a real app, show a toast notification
      alert('Failed to save budget. Please try again.');
    } finally {
      isSubmitting = false;
    }
  }

  function handleCancel() {
    dialogOpen.current = false;
  }

  function getBudgetTypeInfo(type: string) {
    return budgetTypes.find(t => t.value === type) || budgetTypes[0];
  }
</script>

<Sheet.Root bind:open={dialogOpen.current}>
  <Sheet.Content preventScroll={false} class="overflow-auto sm:max-w-2xl">
    <Sheet.Header class="pb-6">
      <Sheet.Title class="text-2xl font-semibold">
        {existingBudget ? 'Edit Budget' : 'Create Budget'}
      </Sheet.Title>
      <Sheet.Description class="text-base text-muted-foreground">
        {existingBudget
          ? 'Update your budget settings and preferences'
          : 'Set up a new budget to track your spending and achieve your financial goals'
        }
      </Sheet.Description>
    </Sheet.Header>

    <form onsubmit={handleSubmit} class="space-y-10">
      <!-- Basic Information -->
      <section class="space-y-8">
        <div>
          <h3 class="text-lg font-medium text-foreground mb-3">Basic Information</h3>
          <p class="text-sm text-muted-foreground">Enter the basic details for your budget.</p>
        </div>

        <div class="grid gap-8">
          <div class="space-y-3">
            <Label for="budget-name" class="text-sm font-medium">Budget Name *</Label>
            <Input
              id="budget-name"
              bind:value={formData.name}
              placeholder="e.g., Monthly Groceries, Emergency Fund"
              class={`h-11 ${errors.name ? 'border-destructive' : ''}`}
            />
            {#if errors.name}
              <p class="text-sm text-destructive">{errors.name}</p>
            {/if}
          </div>

          <div class="space-y-4">
            <Label for="budget-description" class="text-sm font-medium">Description</Label>
            <Textarea
              id="budget-description"
              bind:value={formData.description}
              placeholder="Optional description of what this budget covers..."
              rows={3}
              class="resize-none"
            />
            <p class="text-xs text-muted-foreground">Help you remember what this budget is for.</p>
          </div>
        </div>
      </section>

      <Separator class="my-10" />

      <!-- Budget Type -->
      <section class="space-y-8">
        <div>
          <h3 class="text-lg font-medium text-foreground mb-3">Budget Type</h3>
          <p class="text-sm text-muted-foreground">Choose how you want to manage this budget.</p>
        </div>
        <div class="space-y-6">
          <div class="space-y-3">
            <Label class="text-sm font-medium">Budget Type *</Label>
            <Select.Root bind:value={formData.type}>
              <Select.Trigger class={`h-11 ${errors.type ? 'border-destructive' : ''}`}>
                <div class="flex items-center gap-3">
                  {#snippet typeDisplay()}
                    {@const typeInfo = getBudgetTypeInfo(formData.type)}
                    <typeInfo.icon class="h-5 w-5" style="color: {typeInfo.color}" />
                    <span class="font-medium">{typeInfo.label}</span>
                  {/snippet}
                  {@render typeDisplay()}
                </div>
              </Select.Trigger>
              <Select.Content>
                {#each budgetTypes as type}
                  <Select.Item value={type.value}>
                    <div class="flex items-start gap-3 py-3">
                      <type.icon class="h-5 w-5 mt-0.5 flex-shrink-0" style="color: {type.color}" />
                      <div class="flex flex-col gap-1">
                        <span class="font-medium">{type.label}</span>
                        <span class="text-sm text-muted-foreground leading-relaxed">{type.description}</span>
                      </div>
                    </div>
                  </Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
            {#if errors.type}
              <p class="text-sm text-destructive">{errors.type}</p>
            {/if}
          </div>

          {#snippet typeInfo()}
            {@const selectedType = getBudgetTypeInfo(formData.type)}
            <div class="p-4 rounded-lg bg-accent/50 border">
              <div class="flex items-start gap-3">
                <Info class="h-5 w-5 mt-0.5 text-accent-foreground/70 flex-shrink-0" />
                <div class="text-sm text-accent-foreground">
                  <div class="font-medium mb-1">{selectedType.label}</div>
                  <div class="text-accent-foreground/80">{selectedType.description}</div>
                </div>
              </div>
            </div>
          {/snippet}
          {@render typeInfo()}
        </div>
      </section>

      <Separator class="my-10" />

      <!-- Budget Configuration -->
      <section class="space-y-8">
        <div>
          <h3 class="text-lg font-medium text-foreground mb-3">Budget Configuration</h3>
          <p class="text-sm text-muted-foreground">Configure how your budget behaves and where it applies.</p>
        </div>

        <div class="grid gap-8">
          <div class="space-y-4">
            <Label class="text-sm font-medium">Budget Scope *</Label>
            <Select.Root bind:value={formData.scope}>
              <Select.Trigger class={`h-11 ${errors.scope ? 'border-destructive' : ''}`}>
                <span class="capitalize font-medium">{formData.scope} level</span>
              </Select.Trigger>
              <Select.Content>
                {#each scopeOptions as scope}
                  <Select.Item value={scope.value}>
                    <div class="flex flex-col gap-1 py-2">
                      <span class="font-medium">{scope.label}</span>
                      <span class="text-sm text-muted-foreground">{scope.description}</span>
                    </div>
                  </Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
            {#if errors.scope}
              <p class="text-sm text-destructive">{errors.scope}</p>
            {/if}
          </div>

          <div class="space-y-4">
            <Label class="text-sm font-medium">Enforcement Level</Label>
            <Select.Root bind:value={formData.enforcementLevel}>
              <Select.Trigger class="h-11">
                {@const enforcement = enforcementOptions.find(e => e.value === formData.enforcementLevel)}
                <span class="font-medium">{enforcement?.label || 'Warning'}</span>
              </Select.Trigger>
              <Select.Content>
                {#each enforcementOptions as enforcement}
                  <Select.Item value={enforcement.value}>
                    <div class="flex flex-col gap-1 py-2">
                      <span class="font-medium">{enforcement.label}</span>
                      <span class="text-sm text-muted-foreground">{enforcement.description}</span>
                    </div>
                  </Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>

        <div class="space-y-4">
          <Label class="text-sm font-medium">Status</Label>
          <Select.Root bind:value={formData.status}>
            <Select.Trigger class="h-11">
              <div class="flex items-center gap-3">
                <Badge variant={formData.status === 'active' ? 'default' : 'secondary'} class="text-xs">
                  {formData.status}
                </Badge>
                <span class="capitalize font-medium">{formData.status}</span>
              </div>
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="active">
                <div class="flex items-center gap-3 py-2">
                  <Badge variant="default" class="text-xs">active</Badge>
                  <div class="flex flex-col">
                    <span class="font-medium">Active</span>
                    <span class="text-sm text-muted-foreground">Budget is currently in use</span>
                  </div>
                </div>
              </Select.Item>
              <Select.Item value="inactive">
                <div class="flex items-center gap-3 py-2">
                  <Badge variant="secondary" class="text-xs">inactive</Badge>
                  <div class="flex flex-col">
                    <span class="font-medium">Inactive</span>
                    <span class="text-sm text-muted-foreground">Budget is paused</span>
                  </div>
                </div>
              </Select.Item>
              <Select.Item value="archived">
                <div class="flex items-center gap-3 py-2">
                  <Badge variant="outline" class="text-xs">archived</Badge>
                  <div class="flex flex-col">
                    <span class="font-medium">Archived</span>
                    <span class="text-sm text-muted-foreground">Budget is for reference only</span>
                  </div>
                </div>
              </Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
        </div>
      </section>

      <!-- Form Actions -->
      <div class="flex gap-4 pt-10 border-t mt-10">
        <Button type="button" variant="outline" onclick={handleCancel} class="flex-1 h-11">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} class="flex-1 h-11">
          {isSubmitting ? 'Saving...' : existingBudget ? 'Update Budget' : 'Create Budget'}
        </Button>
      </div>
    </form>
  </Sheet.Content>
</Sheet.Root>