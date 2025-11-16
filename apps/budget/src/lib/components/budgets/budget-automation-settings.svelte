<script lang="ts">
import * as Card from '$lib/components/ui/card';
import {Switch} from '$lib/components/ui/switch';
import {Label} from '$lib/components/ui/label';
import * as Select from '$lib/components/ui/select';
import {Button} from '$lib/components/ui/button';
import {Badge} from '$lib/components/ui/badge';
import {Sparkles, Settings2, Save, RotateCcw} from '@lucide/svelte/icons';
import type {BudgetAutomationSettings} from '$lib/schema/budget-automation-settings';

interface Props {
  settings: BudgetAutomationSettings;
  onSave: (settings: Partial<BudgetAutomationSettings>) => Promise<void>;
  onReset?: () => void;
}

let {settings, onSave, onReset}: Props = $props();

// Local state for editing
let localSettings = $state({
  autoCreateGroups: settings.autoCreateGroups,
  autoAssignToGroups: settings.autoAssignToGroups,
  autoAdjustGroupLimits: settings.autoAdjustGroupLimits,
  requireConfirmationThreshold: settings.requireConfirmationThreshold,
  enableSmartGrouping: settings.enableSmartGrouping,
  groupingStrategy: settings.groupingStrategy,
  minSimilarityScore: settings.minSimilarityScore,
  minGroupSize: settings.minGroupSize,
});

let isSaving = $state(false);
let saveError = $state<string | null>(null);

// Track if settings have changed
const hasChanges = $derived(
  localSettings.autoCreateGroups !== settings.autoCreateGroups ||
    localSettings.autoAssignToGroups !== settings.autoAssignToGroups ||
    localSettings.autoAdjustGroupLimits !== settings.autoAdjustGroupLimits ||
    localSettings.requireConfirmationThreshold !== settings.requireConfirmationThreshold ||
    localSettings.enableSmartGrouping !== settings.enableSmartGrouping ||
    localSettings.groupingStrategy !== settings.groupingStrategy ||
    localSettings.minSimilarityScore !== settings.minSimilarityScore ||
    localSettings.minGroupSize !== settings.minGroupSize
);

async function handleSave() {
  isSaving = true;
  saveError = null;

  try {
    await onSave(localSettings);
  } catch (error) {
    saveError = error instanceof Error ? error.message : 'Failed to save settings';
  } finally {
    isSaving = false;
  }
}

function handleReset() {
  localSettings = {
    autoCreateGroups: settings.autoCreateGroups,
    autoAssignToGroups: settings.autoAssignToGroups,
    autoAdjustGroupLimits: settings.autoAdjustGroupLimits,
    requireConfirmationThreshold: settings.requireConfirmationThreshold,
    enableSmartGrouping: settings.enableSmartGrouping,
    groupingStrategy: settings.groupingStrategy,
    minSimilarityScore: settings.minSimilarityScore,
    minGroupSize: settings.minGroupSize,
  };
  saveError = null;
  onReset?.();
}
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <Settings2 class="text-primary h-6 w-6" />
      <div>
        <h2 class="text-2xl font-semibold">Budget Group Automation</h2>
        <p class="text-muted-foreground text-sm">
          Configure how budget groups are automatically managed
        </p>
      </div>
    </div>
    {#if hasChanges}
      <Badge variant="secondary">Unsaved changes</Badge>
    {/if}
  </div>

  <!-- Automation Toggles -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Automation Features</Card.Title>
      <Card.Description>Enable or disable automatic budget group operations</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-6">
      <!-- Auto-create groups -->
      <div class="flex items-start justify-between">
        <div class="flex-1 space-y-1">
          <Label for="auto-create-groups" class="text-base font-medium">Auto-create groups</Label>
          <p class="text-muted-foreground text-sm">
            Automatically create budget groups when similar budgets are detected
          </p>
        </div>
        <Switch id="auto-create-groups" bind:checked={localSettings.autoCreateGroups} />
      </div>

      <!-- Auto-assign to groups -->
      <div class="flex items-start justify-between">
        <div class="flex-1 space-y-1">
          <Label for="auto-assign-groups" class="text-base font-medium">Auto-assign budgets</Label>
          <p class="text-muted-foreground text-sm">
            Automatically add new budgets to matching groups
          </p>
        </div>
        <Switch id="auto-assign-groups" bind:checked={localSettings.autoAssignToGroups} />
      </div>

      <!-- Auto-adjust limits -->
      <div class="flex items-start justify-between">
        <div class="flex-1 space-y-1">
          <Label for="auto-adjust-limits" class="text-base font-medium">
            Auto-adjust spending limits
          </Label>
          <p class="text-muted-foreground text-sm">
            Automatically update group spending limits based on usage patterns
          </p>
        </div>
        <Switch id="auto-adjust-limits" bind:checked={localSettings.autoAdjustGroupLimits} />
      </div>

      <!-- Enable smart grouping -->
      <div class="flex items-start justify-between">
        <div class="flex-1 space-y-1">
          <Label for="enable-smart-grouping" class="text-base font-medium">
            Enable smart grouping
          </Label>
          <p class="text-muted-foreground text-sm">
            Use AI-powered pattern detection to suggest budget groups
          </p>
        </div>
        <Switch id="enable-smart-grouping" bind:checked={localSettings.enableSmartGrouping} />
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Automation Thresholds -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Automation Thresholds</Card.Title>
      <Card.Description>Control when automations should require confirmation</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-6">
      <!-- Confirmation threshold -->
      <div class="space-y-3">
        <Label for="confirmation-threshold" class="text-base font-medium">
          Require confirmation for priority
        </Label>
        <Select.Root type="single" bind:value={localSettings.requireConfirmationThreshold}>
          <Select.Trigger id="confirmation-threshold" class="w-full">
            {localSettings.requireConfirmationThreshold === 'high'
              ? 'High priority only'
              : localSettings.requireConfirmationThreshold === 'medium'
                ? 'Medium priority and above'
                : 'All priorities'}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="high">High priority only</Select.Item>
            <Select.Item value="medium">Medium priority and above</Select.Item>
            <Select.Item value="low">All priorities</Select.Item>
          </Select.Content>
        </Select.Root>
        <p class="text-muted-foreground text-sm">
          Lower priority automations will always execute without confirmation
        </p>
      </div>

      <!-- Grouping strategy -->
      <div class="space-y-3">
        <Label for="grouping-strategy" class="text-base font-medium">Grouping strategy</Label>
        <Select.Root type="single" bind:value={localSettings.groupingStrategy}>
          <Select.Trigger id="grouping-strategy" class="w-full">
            {localSettings.groupingStrategy === 'category-based'
              ? 'Category-based'
              : localSettings.groupingStrategy === 'account-based'
                ? 'Account-based'
                : localSettings.groupingStrategy === 'spending-pattern'
                  ? 'Spending pattern'
                  : 'Hybrid (recommended)'}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="category-based">Category-based</Select.Item>
            <Select.Item value="account-based">Account-based</Select.Item>
            <Select.Item value="spending-pattern">Spending pattern</Select.Item>
            <Select.Item value="hybrid">Hybrid (recommended)</Select.Item>
          </Select.Content>
        </Select.Root>
        <p class="text-muted-foreground text-sm">
          Hybrid uses multiple signals for the most accurate grouping suggestions
        </p>
      </div>

      <!-- Min similarity score -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <Label for="min-similarity" class="text-base font-medium">Minimum confidence</Label>
          <Badge variant="outline">{localSettings.minSimilarityScore}%</Badge>
        </div>
        <input
          id="min-similarity"
          type="range"
          min="50"
          max="95"
          step="5"
          bind:value={localSettings.minSimilarityScore}
          class="bg-secondary accent-primary h-2 w-full cursor-pointer appearance-none rounded-lg" />
        <p class="text-muted-foreground text-sm">
          Higher values mean fewer but more accurate automations
        </p>
      </div>

      <!-- Min group size -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <Label for="min-group-size" class="text-base font-medium">Minimum group size</Label>
          <Badge variant="outline">{localSettings.minGroupSize} budgets</Badge>
        </div>
        <input
          id="min-group-size"
          type="range"
          min="2"
          max="10"
          step="1"
          bind:value={localSettings.minGroupSize}
          class="bg-secondary accent-primary h-2 w-full cursor-pointer appearance-none rounded-lg" />
        <p class="text-muted-foreground text-sm">
          Only suggest groups with at least this many budgets
        </p>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Save Actions -->
  <div class="flex items-center gap-3">
    <Button onclick={handleSave} disabled={!hasChanges || isSaving} class="gap-2">
      {#if isSaving}
        <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24">
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
            fill="none" />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Saving...
      {:else}
        <Save class="h-4 w-4" />
        Save Changes
      {/if}
    </Button>

    <Button variant="outline" onclick={handleReset} disabled={!hasChanges} class="gap-2">
      <RotateCcw class="h-4 w-4" />
      Reset
    </Button>
  </div>

  <!-- Error message -->
  {#if saveError}
    <div
      class="text-destructive bg-destructive/10 border-destructive/20 rounded-md border p-3 text-sm">
      {saveError}
    </div>
  {/if}

  <!-- Info card -->
  <Card.Root class="bg-muted/50">
    <Card.Content class="pt-6">
      <div class="flex gap-3">
        <Sparkles class="text-primary mt-0.5 h-5 w-5 flex-shrink-0" />
        <div class="space-y-1">
          <p class="text-sm font-medium">How automation works</p>
          <p class="text-muted-foreground text-sm">
            When analyzing your spending, the system will detect patterns and suggest budget groups.
            If automation is enabled and confidence is high enough, groups will be created
            automatically. You can always review and rollback automated actions in the Activity Log.
          </p>
        </div>
      </div>
    </Card.Content>
  </Card.Root>
</div>
