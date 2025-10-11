<script lang="ts">
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import * as Select from '$lib/components/ui/select';
import * as Dialog from '$lib/components/ui/dialog';
import { Button } from '$lib/components/ui/button';
import { Separator } from '$lib/components/ui/separator';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Checkbox } from '$lib/components/ui/checkbox';

import { PayeeBulkOperationsState } from '$lib/states/ui/payee-bulk-operations.svelte';
import { CategoriesState } from '$lib/states/entities/categories.svelte';
import type { Payee } from '$lib/schema/payees';

// Icons
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import Trash2 from '@lucide/svelte/icons/trash-2';
import Tag from '@lucide/svelte/icons/tag';
import ToggleLeft from '@lucide/svelte/icons/toggle-left';
import Copy from '@lucide/svelte/icons/copy';
import Download from '@lucide/svelte/icons/download';
import Upload from '@lucide/svelte/icons/upload';
import Merge from '@lucide/svelte/icons/merge';
import Brain from '@lucide/svelte/icons/brain';
import Undo from '@lucide/svelte/icons/undo';
import X from '@lucide/svelte/icons/x';
import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
import UserCheck from '@lucide/svelte/icons/user-check';
import UserX from '@lucide/svelte/icons/user-x';

let {
  payees = [],
  filteredPayees = [],
  onBulkDelete,
  onBulkAssignCategory,
  onBulkStatusChange,
  onBulkTagManagement,
  onBulkExport,
  onBulkImport,
  onDuplicateDetection,
  onBulkIntelligenceApplication,
  onUndo,
  showAdvancedOptions = true,
  className = '',
}: {
  payees: Payee[];
  filteredPayees: Payee[];
  onBulkDelete?: (payeeIds: number[]) => Promise<void>;
  onBulkAssignCategory?: (payeeIds: number[], categoryId: number) => Promise<void>;
  onBulkStatusChange?: (payeeIds: number[], status: 'active' | 'inactive') => Promise<void>;
  onBulkTagManagement?: (payeeIds: number[], tags: string[], operation: 'add' | 'remove' | 'replace') => Promise<void>;
  onBulkExport?: (payeeIds: number[], format: 'csv' | 'json') => Promise<void>;
  onBulkImport?: (file: File) => Promise<void>;
  onDuplicateDetection?: () => Promise<void>;
  onBulkIntelligenceApplication?: (payeeIds: number[], options: any) => Promise<void>;
  onUndo?: () => Promise<void>;
  showAdvancedOptions?: boolean;
  className?: string;
} = $props();

const bulkOpsState = PayeeBulkOperationsState.get();
const categoriesState = CategoriesState.get();

// Local state for dialogs and forms
let categoryAssignmentDialogOpen = $state(false);
let tagManagementDialogOpen = $state(false);
let intelligenceDialogOpen = $state(false);
let exportDialogOpen = $state(false);

// Form state for dialogs
let selectedCategoryId = $state<string>('');
let tagOperationType = $state<'add' | 'remove' | 'replace'>('add');
let newTags = $state('');
let exportFormat = $state<'csv' | 'json'>('csv');
let includeInactiveInExport = $state(false);
let fileInputRef = $state<HTMLInputElement | null>(null);
let intelligenceOptions = $state({
  applyCategory: true,
  applyBudget: true,
  confidenceThreshold: 0.7,
  overwriteExisting: false
});

// Get categories for selection
const categoryOptions = $derived.by(() => {
  const categories = categoriesState?.categories || new Map();
  return Array.from(categories.values()).map(cat => ({
    label: cat.name,
    value: cat.id.toString()
  }));
});

// Selection helpers
const allPayeeIds = $derived(payees.map(p => p.id));
const filteredPayeeIds = $derived(filteredPayees.map(p => p.id));
const selectedCount = $derived(bulkOpsState.selectedCount);
const hasSelection = $derived(bulkOpsState.hasSelection);
const allSelected = $derived(
  filteredPayeeIds.length > 0 &&
  filteredPayeeIds.every(id => bulkOpsState.isSelected(id))
);
const someSelected = $derived(
  filteredPayeeIds.some(id => bulkOpsState.isSelected(id)) && !allSelected
);

// Selection handlers
function handleSelectAll() {
  if (allSelected) {
    bulkOpsState.clearSelection();
  } else {
    bulkOpsState.selectAllFiltered(filteredPayeeIds);
  }
}

function handleClearSelection() {
  bulkOpsState.clearSelection();
}

// Operation handlers
async function handleBulkDelete() {
  if (!hasSelection || !onBulkDelete) return;

  const validIds = bulkOpsState.getValidPayeesForOperation(payees, 'delete');
  if (validIds.length === 0) return;

  await onBulkDelete(validIds);
  bulkOpsState.clearSelection();
}

async function handleBulkStatusChange(status: 'active' | 'inactive') {
  if (!hasSelection || !onBulkStatusChange) return;

  const operationType = status === 'active' ? 'activate' : 'deactivate';
  const validIds = bulkOpsState.getValidPayeesForOperation(payees, operationType);
  if (validIds.length === 0) return;

  await onBulkStatusChange(validIds, status);
  bulkOpsState.clearSelection();
}

async function handleCategoryAssignment() {
  if (!selectedCategoryId || !onBulkAssignCategory) return;

  const categoryId = parseInt(selectedCategoryId);
  const validIds = bulkOpsState.getValidPayeesForOperation(payees, 'assign_category');

  await onBulkAssignCategory(validIds, categoryId);

  categoryAssignmentDialogOpen = false;
  selectedCategoryId = '';
  bulkOpsState.clearSelection();
}

async function handleTagManagement() {
  if (!newTags.trim() || !onBulkTagManagement) return;

  const tags = newTags.split(',').map(tag => tag.trim()).filter(Boolean);
  const selectedIds = bulkOpsState.selectedPayeeIdsArray;

  await onBulkTagManagement(selectedIds, tags, tagOperationType);

  tagManagementDialogOpen = false;
  newTags = '';
  bulkOpsState.clearSelection();
}

async function handleBulkExport() {
  if (!onBulkExport) return;

  const payeeIdsToExport = hasSelection
    ? bulkOpsState.selectedPayeeIdsArray
    : (includeInactiveInExport ? allPayeeIds : filteredPayeeIds);

  await onBulkExport(payeeIdsToExport, exportFormat);

  exportDialogOpen = false;
  if (hasSelection) bulkOpsState.clearSelection();
}

async function handleIntelligenceApplication() {
  if (!onBulkIntelligenceApplication) return;

  const selectedIds = bulkOpsState.selectedPayeeIdsArray;
  await onBulkIntelligenceApplication(selectedIds, intelligenceOptions);

  intelligenceDialogOpen = false;
  bulkOpsState.clearSelection();
}

// Keyboard shortcuts effect
// Keyboard shortcuts handler
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'a':
        if (filteredPayeeIds.length > 0) {
          e.preventDefault();
          bulkOpsState.selectAllFiltered(filteredPayeeIds);
        }
        break;
      case 'd':
        e.preventDefault();
        bulkOpsState.clearSelection();
        break;
    }
  }

  if (e.key === 'Delete' && hasSelection) {
    e.preventDefault();
    handleBulkDelete();
  }
};
</script>

<svelte:window on:keydown={handleKeyDown} />

<div class="flex items-center gap-2 p-3 bg-muted/50 border rounded-lg {className}">
  <!-- Selection controls -->
  <div class="flex items-center gap-2">
    <Checkbox
      checked={allSelected}
      indeterminate={someSelected}
      onCheckedChange={handleSelectAll}
      aria-label="Select all payees"
    />

    <span class="text-sm text-muted-foreground">
      {#if hasSelection}
        {selectedCount} selected
      {:else}
        {filteredPayeeIds.length} payees
      {/if}
    </span>

    {#if hasSelection}
      <Button
        variant="ghost"
        size="sm"
        onclick={handleClearSelection}
        class="h-6 px-2 text-xs"
      >
        <X class="h-3 w-3 mr-1" />
        Clear
      </Button>
    {/if}
  </div>

  {#if hasSelection}
    <Separator orientation="vertical" class="h-6" />

    <!-- Primary actions -->
    <div class="flex items-center gap-1">
      <!-- Delete -->
      <Button
        variant="destructive"
        size="sm"
        onclick={handleBulkDelete}
        disabled={!onBulkDelete}
        class="h-8"
      >
        <Trash2 class="h-4 w-4 mr-2" />
        Delete ({selectedCount})
      </Button>

      <!-- Category assignment -->
      <Button
        variant="outline"
        size="sm"
        onclick={() => categoryAssignmentDialogOpen = true}
        disabled={!onBulkAssignCategory}
        class="h-8"
      >
        <Tag class="h-4 w-4 mr-2" />
        Category
      </Button>

      <!-- Status toggle -->
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="outline" size="sm" class="h-8">
            <ToggleLeft class="h-4 w-4 mr-2" />
            Status
            <ChevronDown class="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="start">
          <DropdownMenu.Item onclick={() => handleBulkStatusChange('active')}>
            <UserCheck class="h-4 w-4 mr-2" />
            Activate
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => handleBulkStatusChange('inactive')}>
            <UserX class="h-4 w-4 mr-2" />
            Deactivate
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>

    {#if showAdvancedOptions}
      <Separator orientation="vertical" class="h-6" />

      <!-- Advanced operations -->
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button variant="outline" size="sm" class="h-8">
            <MoreHorizontal class="h-4 w-4 mr-2" />
            More
            <ChevronDown class="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="start" class="w-48">
          <DropdownMenu.Label>Bulk Operations</DropdownMenu.Label>
          <DropdownMenu.Separator />

          <DropdownMenu.Item onclick={() => tagManagementDialogOpen = true}>
            <Tag class="h-4 w-4 mr-2" />
            Manage Tags
          </DropdownMenu.Item>

          <DropdownMenu.Item onclick={() => intelligenceDialogOpen = true}>
            <Brain class="h-4 w-4 mr-2" />
            Apply Intelligence
          </DropdownMenu.Item>

          <DropdownMenu.Separator />

          <DropdownMenu.Item onclick={() => exportDialogOpen = true}>
            <Download class="h-4 w-4 mr-2" />
            Export Selected
          </DropdownMenu.Item>

          <DropdownMenu.Item onclick={() => bulkOpsState.copyPayees(bulkOpsState.selectedPayeeIdsArray)}>
            <Copy class="h-4 w-4 mr-2" />
            Copy to Clipboard
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {/if}
  {:else}
    <Separator orientation="vertical" class="h-6" />

    <!-- Global operations when no selection -->
    <div class="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onclick={() => onDuplicateDetection?.()}
        disabled={!onDuplicateDetection}
        class="h-8"
      >
        <Merge class="h-4 w-4 mr-2" />
        Find Duplicates
      </Button>

      <Button
        variant="outline"
        size="sm"
        onclick={() => exportDialogOpen = true}
        disabled={!onBulkExport}
        class="h-8"
      >
        <Download class="h-4 w-4 mr-2" />
        Export All
      </Button>

      <input
        type="file"
        accept=".csv,.json"
        style="display: none"
        onchange={(e) => {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];
          if (file && onBulkImport) {
            onBulkImport(file);
          }
        }}
        bind:this={fileInputRef}
      />

      <Button
        variant="outline"
        size="sm"
        onclick={() => fileInputRef?.click()}
        disabled={!onBulkImport}
        class="h-8"
      >
        <Upload class="h-4 w-4 mr-2" />
        Import
      </Button>
    </div>
  {/if}

  <!-- Undo button -->
  {#if bulkOpsState.getLatestUndoOperation()}
    <Separator orientation="vertical" class="h-6" />
    <Button
      variant="outline"
      size="sm"
      onclick={() => onUndo?.()}
      disabled={!onUndo}
      class="h-8"
    >
      <Undo class="h-4 w-4 mr-2" />
      Undo
    </Button>
  {/if}
</div>

<!-- Category Assignment Dialog -->
<Dialog.Root bind:open={categoryAssignmentDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Assign Category</Dialog.Title>
      <Dialog.Description>
        Assign a category to {selectedCount} selected payees.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4">
      <div class="space-y-2">
        <Label for="category-select">Category</Label>
        <Select.Root type="single" bind:value={selectedCategoryId}>
          <Select.Trigger>
            <span>{selectedCategoryId ? categoryOptions.find(opt => opt.value === selectedCategoryId)?.label : "Select a category"}</span>
          </Select.Trigger>
          <Select.Content>
            {#each categoryOptions as category}
              <Select.Item value={category.value}>{category.label}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => categoryAssignmentDialogOpen = false}>
        Cancel
      </Button>
      <Button onclick={handleCategoryAssignment} disabled={!selectedCategoryId}>
        Assign Category
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Tag Management Dialog -->
<Dialog.Root bind:open={tagManagementDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Manage Tags</Dialog.Title>
      <Dialog.Description>
        Add, remove, or replace tags for {selectedCount} selected payees.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4">
      <div class="space-y-2">
        <Label for="tag-operation">Operation</Label>
        <Select.Root type="single" bind:value={tagOperationType}>
          <Select.Trigger>
            <span>{tagOperationType === 'add' ? 'Add tags' : tagOperationType === 'remove' ? 'Remove tags' : 'Replace all tags'}</span>
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="add">Add tags</Select.Item>
            <Select.Item value="remove">Remove tags</Select.Item>
            <Select.Item value="replace">Replace all tags</Select.Item>
          </Select.Content>
        </Select.Root>
      </div>

      <div class="space-y-2">
        <Label for="tags-input">Tags (comma-separated)</Label>
        <Input
          id="tags-input"
          bind:value={newTags}
          placeholder="urgent, business, subscription"
        />
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => tagManagementDialogOpen = false}>
        Cancel
      </Button>
      <Button onclick={handleTagManagement} disabled={!newTags.trim()}>
        Apply Changes
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Intelligence Application Dialog -->
<Dialog.Root bind:open={intelligenceDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Apply Intelligence</Dialog.Title>
      <Dialog.Description>
        Apply smart defaults and recommendations to {selectedCount} selected payees.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4">
      <div class="flex items-center space-x-2">
        <Checkbox bind:checked={intelligenceOptions.applyCategory} />
        <Label>Apply category recommendations</Label>
      </div>

      <div class="flex items-center space-x-2">
        <Checkbox bind:checked={intelligenceOptions.applyBudget} />
        <Label>Apply budget recommendations</Label>
      </div>

      <div class="flex items-center space-x-2">
        <Checkbox bind:checked={intelligenceOptions.overwriteExisting} />
        <Label>Overwrite existing values</Label>
      </div>

      <div class="space-y-2">
        <Label for="confidence-threshold">Confidence Threshold</Label>
        <Input
          type="number"
          min="0"
          max="1"
          step="0.1"
          bind:value={intelligenceOptions.confidenceThreshold}
        />
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => intelligenceDialogOpen = false}>
        Cancel
      </Button>
      <Button onclick={handleIntelligenceApplication}>
        Apply Intelligence
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Export Dialog -->
<Dialog.Root bind:open={exportDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Export Payees</Dialog.Title>
      <Dialog.Description>
        Export {hasSelection ? `${selectedCount} selected` : 'all'} payees to a file.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4">
      <div class="space-y-2">
        <Label for="export-format">Format</Label>
        <Select.Root type="single" bind:value={exportFormat}>
          <Select.Trigger>
            <span>{exportFormat === 'csv' ? 'CSV' : 'JSON'}</span>
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="csv">CSV</Select.Item>
            <Select.Item value="json">JSON</Select.Item>
          </Select.Content>
        </Select.Root>
      </div>

      {#if !hasSelection}
        <div class="flex items-center space-x-2">
          <Checkbox bind:checked={includeInactiveInExport} />
          <Label>Include inactive payees</Label>
        </div>
      {/if}
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => exportDialogOpen = false}>
        Cancel
      </Button>
      <Button onclick={handleBulkExport}>
        Export
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
