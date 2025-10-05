<script lang="ts">
import * as Table from '$lib/components/ui/table';
import * as Card from '$lib/components/ui/card';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Input } from '$lib/components/ui/input';
import { Separator } from '$lib/components/ui/separator';

import { PayeeBulkOperationsState } from '$lib/states/ui/payee-bulk-operations.svelte';
import { PayeesState } from '$lib/states/entities/payees.svelte';
import PayeeBulkOperationsToolbar from './payee-bulk-operations-toolbar.svelte';
import PayeeBulkOperationsProgress from './payee-bulk-operations-progress.svelte';
import PayeeBulkOperationsConfirmation, { type ConfirmationOptions } from './payee-bulk-operations-confirmation.svelte';
import type { Payee } from '$lib/schema/payees';
import { currencyFormatter } from '$lib/utils/formatters';
import { formatDateDisplay } from '$lib/utils/dates';

// Bulk operation mutations
import {
  bulkStatusChange,
  bulkCategoryAssignment,
  bulkTagManagement,
  bulkIntelligenceApplication,
  bulkExport,
  bulkImport,
  bulkCleanup,
  deletePayee,
  getDuplicates,
  mergeDuplicates,
  undoOperation
} from '$lib/query/payees';

// Icons
import Building from '@lucide/svelte/icons/building';
import User from '@lucide/svelte/icons/user';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Phone from '@lucide/svelte/icons/phone';
import Mail from '@lucide/svelte/icons/mail';
import Globe from '@lucide/svelte/icons/globe';
import Calendar from '@lucide/svelte/icons/calendar';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
import Eye from '@lucide/svelte/icons/eye';
import Edit from '@lucide/svelte/icons/edit';
import Trash2 from '@lucide/svelte/icons/trash-2';
import Search from '@lucide/svelte/icons/search';
import Filter from '@lucide/svelte/icons/filter';
import SortAsc from '@lucide/svelte/icons/sort-asc';
import SortDesc from '@lucide/svelte/icons/sort-desc';
import CheckSquare from '@lucide/svelte/icons/check-square';
import Square from '@lucide/svelte/icons/square';

let {
  showBulkOperations = true,
  showFilters = true,
  showStats = true,
  pageSize = 50,
  onPayeeView,
  onPayeeEdit,
  onPayeeDelete,
  className = '',
}: {
  showBulkOperations?: boolean;
  showFilters?: boolean;
  showStats?: boolean;
  pageSize?: number;
  onPayeeView?: (payee: Payee) => void;
  onPayeeEdit?: (payee: Payee) => void;
  onPayeeDelete?: (payee: Payee) => void;
  className?: string;
} = $props();

const bulkOpsState = PayeeBulkOperationsState.get();
const payeesState = PayeesState.get();

// Local state
let searchQuery = $state('');
let filterType = $state<string>('all');
let filterStatus = $state<string>('all');
let sortField = $state<keyof Payee>('name');
let sortDirection = $state<'asc' | 'desc'>('asc');
let currentPage = $state(0);
let progressDialogOpen = $state(false);
let confirmationDialogOpen = $state(false);
let confirmationOptions = $state<ConfirmationOptions | null>(null);

// Get payees
const allPayees = $derived(Array.from(payeesState.payees.values()));

// Filtering and sorting
const filteredPayees = $derived(() => {
  let filtered = allPayees;

  // Text search
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(payee =>
      payee.name?.toLowerCase().includes(query) ||
      payee.notes?.toLowerCase().includes(query) ||
      payee.payeeType?.toLowerCase().includes(query) ||
      payee.email?.toLowerCase().includes(query) ||
      payee.website?.toLowerCase().includes(query)
    );
  }

  // Type filter
  if (filterType !== 'all') {
    filtered = filtered.filter(payee => payee.payeeType === filterType);
  }

  // Status filter
  if (filterStatus !== 'all') {
    const isActive = filterStatus === 'active';
    filtered = filtered.filter(payee => payee.isActive === isActive);
  }

  // Sort
  filtered.sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    let comparison = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return filtered;
});

// Pagination
const paginatedPayees = $derived(() => {
  const start = currentPage * pageSize;
  return filteredPayees.slice(start, start + pageSize);
});

const totalPages = $derived(Math.ceil(filteredPayees.length / pageSize));

// Selection state
const selectedCount = $derived(bulkOpsState.selectedCount);
const hasSelection = $derived(bulkOpsState.hasSelection);

// Get payee type options for filter
const payeeTypeOptions = $derived(() => {
  const types = new Set(allPayees.map(p => p.payeeType).filter(Boolean));
  return Array.from(types).sort();
});

// Mutation hooks
const bulkStatusChangeMutation = bulkStatusChange();
const bulkCategoryAssignmentMutation = bulkCategoryAssignment();
const bulkTagManagementMutation = bulkTagManagement();
const bulkIntelligenceApplicationMutation = bulkIntelligenceApplication();
const bulkExportMutation = bulkExport();
const bulkImportMutation = bulkImport();
const bulkCleanupMutation = bulkCleanup();
const deletePayeeMutation = deletePayee();
const mergeDuplicatesMutation = mergeDuplicates();
const undoOperationMutation = undoOperation();

// Get payee type icon
function getPayeeTypeIcon(payeeType?: string | null) {
  switch (payeeType) {
    case 'merchant':
    case 'utility':
    case 'employer':
    case 'government':
      return Building;
    case 'financial_institution':
      return CreditCard;
    case 'individual':
    default:
      return User;
  }
}

// Get payee type color
function getPayeeTypeColor(payeeType?: string | null): string {
  switch (payeeType) {
    case 'merchant': return 'text-blue-500';
    case 'utility': return 'text-green-500';
    case 'employer': return 'text-purple-500';
    case 'financial_institution': return 'text-orange-500';
    case 'government': return 'text-red-500';
    case 'individual': return 'text-gray-500';
    default: return 'text-gray-500';
  }
}

// Selection handlers
function handleSelectAll() {
  const filteredIds = filteredPayees.map(p => p.id);
  if (bulkOpsState.selectedPayeeIdsArray.length === filteredIds.length) {
    bulkOpsState.clearSelection();
  } else {
    bulkOpsState.selectAllFiltered(filteredIds);
  }
}

function handleSelectPayee(payeeId: number, event: Event) {
  const isCtrlClick = (event as MouseEvent).ctrlKey || (event as MouseEvent).metaKey;
  const isShiftClick = (event as MouseEvent).shiftKey;

  bulkOpsState.selectPayee(payeeId, isCtrlClick || isShiftClick);
}

// Sorting
function handleSort(field: keyof Payee) {
  if (sortField === field) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortField = field;
    sortDirection = 'asc';
  }
}

// Individual payee actions
function handlePayeeView(payee: Payee) {
  if (onPayeeView) {
    onPayeeView(payee);
  }
}

function handlePayeeEdit(payee: Payee) {
  if (onPayeeEdit) {
    onPayeeEdit(payee);
  }
}

async function handlePayeeDelete(payee: Payee) {
  confirmationOptions = {
    type: 'delete',
    payeeIds: [payee.id],
    title: 'Delete Payee',
    description: `Are you sure you want to delete "${payee.name}"?`,
    confirmText: 'Delete',
    destructiveLevel: 'medium',
    showAffectedPayees: true,
    showImpactWarning: true,
  };
  confirmationDialogOpen = true;
}

// Bulk operation handlers
async function handleBulkDelete(payeeIds: number[]) {
  confirmationOptions = {
    type: 'delete',
    payeeIds,
    title: 'Delete Payees',
    description: `Are you sure you want to delete ${payeeIds.length} payee${payeeIds.length > 1 ? 's' : ''}?`,
    confirmText: 'Delete All',
    destructiveLevel: payeeIds.length > 10 ? 'high' : 'medium',
    showAffectedPayees: true,
    showImpactWarning: true,
    requiresTyping: payeeIds.length > 20,
    expectedText: payeeIds.length > 20 ? 'DELETE' : undefined,
  };
  confirmationDialogOpen = true;
}

async function handleBulkStatusChange(payeeIds: number[], status: 'active' | 'inactive') {
  const operationId = bulkOpsState.startOperation(`bulk_status_change_${status}`, payeeIds.length);
  progressDialogOpen = true;

  try {
    const result = await bulkStatusChangeMutation.mutateAsync({ payeeIds, status });

    // Process results
    result.results?.forEach((r: any) => {
      bulkOpsState.updateOperationProgress({
        payeeId: r.payeeId,
        success: r.success,
        error: r.error,
        details: r.details,
      });
    });

    bulkOpsState.completeOperation();
  } catch (error) {
    console.error('Bulk status change failed:', error);
    bulkOpsState.cancelOperation();
  }
}

async function handleBulkCategoryAssignment(payeeIds: number[], categoryId: number) {
  const operationId = bulkOpsState.startOperation('bulk_category_assignment', payeeIds.length);
  progressDialogOpen = true;

  try {
    const result = await bulkCategoryAssignmentMutation.mutateAsync({
      payeeIds,
      categoryId,
      overwriteExisting: false
    });

    result.results?.forEach((r: any) => {
      bulkOpsState.updateOperationProgress({
        payeeId: r.payeeId,
        success: r.success,
        error: r.error,
        details: r.details,
      });
    });

    bulkOpsState.completeOperation();
  } catch (error) {
    console.error('Bulk category assignment failed:', error);
    bulkOpsState.cancelOperation();
  }
}

async function handleBulkTagManagement(payeeIds: number[], tags: string[], operation: 'add' | 'remove' | 'replace') {
  const operationId = bulkOpsState.startOperation('bulk_tag_management', payeeIds.length);
  progressDialogOpen = true;

  try {
    const result = await bulkTagManagementMutation.mutateAsync({ payeeIds, tags, operation });

    result.results?.forEach((r: any) => {
      bulkOpsState.updateOperationProgress({
        payeeId: r.payeeId,
        success: r.success,
        error: r.error,
        details: r.details,
      });
    });

    bulkOpsState.completeOperation();
  } catch (error) {
    console.error('Bulk tag management failed:', error);
    bulkOpsState.cancelOperation();
  }
}

async function handleBulkIntelligenceApplication(payeeIds: number[], options: any) {
  const operationId = bulkOpsState.startOperation('bulk_intelligence_application', payeeIds.length);
  progressDialogOpen = true;

  try {
    const result = await bulkIntelligenceApplicationMutation.mutateAsync({ payeeIds, options });

    result.results?.forEach((r: any) => {
      bulkOpsState.updateOperationProgress({
        payeeId: r.payeeId,
        success: r.success,
        error: r.error,
        details: r.details,
      });
    });

    bulkOpsState.completeOperation();
  } catch (error) {
    console.error('Bulk intelligence application failed:', error);
    bulkOpsState.cancelOperation();
  }
}

async function handleBulkExport(payeeIds: number[], format: 'csv' | 'json') {
  try {
    const result = await bulkExportMutation.mutateAsync({
      payeeIds,
      format,
      includeTransactionStats: true,
      includeContactInfo: true,
      includeIntelligenceData: false
    });

    // Download the file
    const blob = new Blob([result.data], {
      type: format === 'csv' ? 'text/csv' : 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payees_export_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
  }
}

async function handleBulkImport(file: File) {
  try {
    const content = await file.text();
    const format = file.name.endsWith('.json') ? 'json' : 'csv';

    const operationId = bulkOpsState.startOperation('bulk_import', 1);
    progressDialogOpen = true;

    const result = await bulkImportMutation.mutateAsync({
      data: content,
      format,
      options: {
        skipDuplicates: true,
        updateExisting: false,
        applyIntelligentDefaults: true,
        validateContactInfo: true
      }
    });

    bulkOpsState.updateOperationProgress({
      payeeId: 0,
      success: result.success,
      error: result.error,
      details: result.summary,
    });

    bulkOpsState.completeOperation();
  } catch (error) {
    console.error('Import failed:', error);
    bulkOpsState.cancelOperation();
  }
}

async function handleDuplicateDetection() {
  // This would open a separate duplicate detection interface
}

async function handleUndo() {
  const latestOperation = bulkOpsState.getLatestUndoOperation();
  if (latestOperation) {
    try {
      await undoOperationMutation.mutateAsync({
        operationId: latestOperation.id,
        operationType: latestOperation.operationType as any
      });
      bulkOpsState.removeUndoOperation(latestOperation.id);
    } catch (error) {
      console.error('Undo failed:', error);
    }
  }
}

// Confirmation dialog handler
async function handleConfirmation() {
  if (!confirmationOptions) return;

  try {
    switch (confirmationOptions.type) {
      case 'delete':
        if (confirmationOptions.payeeIds?.length === 1) {
          // Single payee delete
          await deletePayeeMutation.mutateAsync(confirmationOptions.payeeIds[0]);
          if (onPayeeDelete) {
            const payee = allPayees.find(p => p.id === confirmationOptions.payeeIds![0]);
            if (payee) onPayeeDelete(payee);
          }
        } else if (confirmationOptions.payeeIds) {
          // Bulk delete - this would use the bulk delete endpoint
          // For now, we'll delete individually
          for (const id of confirmationOptions.payeeIds) {
            await deletePayeeMutation.mutateAsync(id);
          }
          bulkOpsState.clearSelection();
        }
        break;
    }

    confirmationDialogOpen = false;
    confirmationOptions = null;
  } catch (error) {
    console.error('Confirmation action failed:', error);
  }
}

// Clear selection when filters change
$effect(() => {
  if (searchQuery || filterType !== 'all' || filterStatus !== 'all') {
    bulkOpsState.clearSelection();
  }
});
</script>

<div class="space-y-4 {className}">
  <!-- Filters and Search -->
  {#if showFilters}
    <Card.Root>
      <Card.Content class="p-4">
        <div class="flex flex-col lg:flex-row gap-4">
          <!-- Search -->
          <div class="flex-1">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                bind:value={searchQuery}
                placeholder="Search payees..."
                class="pl-10"
              />
            </div>
          </div>

          <!-- Filters -->
          <div class="flex gap-2">
            <select bind:value={filterType} class="px-3 py-2 border rounded-md text-sm">
              <option value="all">All Types</option>
              {#each payeeTypeOptions as type}
                <option value={type}>{type.replace('_', ' ')}</option>
              {/each}
            </select>

            <select bind:value={filterStatus} class="px-3 py-2 border rounded-md text-sm">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Stats -->
  {#if showStats}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card.Root>
        <Card.Content class="p-4 text-center">
          <div class="text-2xl font-bold">{allPayees.length}</div>
          <div class="text-sm text-muted-foreground">Total Payees</div>
        </Card.Content>
      </Card.Root>
      <Card.Root>
        <Card.Content class="p-4 text-center">
          <div class="text-2xl font-bold">{filteredPayees.length}</div>
          <div class="text-sm text-muted-foreground">Filtered</div>
        </Card.Content>
      </Card.Root>
      <Card.Root>
        <Card.Content class="p-4 text-center">
          <div class="text-2xl font-bold">{selectedCount}</div>
          <div class="text-sm text-muted-foreground">Selected</div>
        </Card.Content>
      </Card.Root>
      <Card.Root>
        <Card.Content class="p-4 text-center">
          <div class="text-2xl font-bold">{allPayees.filter(p => p.isActive).length}</div>
          <div class="text-sm text-muted-foreground">Active</div>
        </Card.Content>
      </Card.Root>
    </div>
  {/if}

  <!-- Bulk Operations Toolbar -->
  {#if showBulkOperations}
    <PayeeBulkOperationsToolbar
      payees={allPayees}
      filteredPayees={filteredPayees}
      onBulkDelete={handleBulkDelete}
      onBulkAssignCategory={handleBulkCategoryAssignment}
      onBulkStatusChange={handleBulkStatusChange}
      onBulkTagManagement={handleBulkTagManagement}
      onBulkExport={handleBulkExport}
      onBulkImport={handleBulkImport}
      onDuplicateDetection={handleDuplicateDetection}
      onBulkIntelligenceApplication={handleBulkIntelligenceApplication}
      onUndo={handleUndo}
    />
  {/if}

  <!-- Payee Table -->
  <Card.Root>
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head class="w-12">
            <Checkbox
              checked={selectedCount > 0 && selectedCount === filteredPayees.length}
              indeterminate={selectedCount > 0 && selectedCount < filteredPayees.length}
              onCheckedChange={handleSelectAll}
              aria-label="Select all payees"
            />
          </Table.Head>
          <Table.Head class="cursor-pointer" onclick={() => handleSort('name')}>
            <div class="flex items-center gap-1">
              Name
              {#if sortField === 'name'}
                {#if sortDirection === 'asc'}
                  <SortAsc class="h-4 w-4" />
                {:else}
                  <SortDesc class="h-4 w-4" />
                {/if}
              {/if}
            </div>
          </Table.Head>
          <Table.Head>Type</Table.Head>
          <Table.Head>Contact</Table.Head>
          <Table.Head class="cursor-pointer" onclick={() => handleSort('isActive')}>
            <div class="flex items-center gap-1">
              Status
              {#if sortField === 'isActive'}
                {#if sortDirection === 'asc'}
                  <SortAsc class="h-4 w-4" />
                {:else}
                  <SortDesc class="h-4 w-4" />
                {/if}
              {/if}
            </div>
          </Table.Head>
          <Table.Head class="w-16">Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each paginatedPayees as payee (payee.id)}
          {@const isSelected = bulkOpsState.isSelected(payee.id)}
          {@const Icon = getPayeeTypeIcon(payee.payeeType)}
          <Table.Row
            class="cursor-pointer {isSelected ? 'bg-accent' : ''}"
            onclick={(e) => handleSelectPayee(payee.id, e)}
          >
            <Table.Cell>
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => bulkOpsState.togglePayee(payee.id)}
                onclick={(e) => e.stopPropagation()}
              />
            </Table.Cell>
            <Table.Cell>
              <div class="flex items-center gap-2">
                <Icon class="h-4 w-4 {getPayeeTypeColor(payee.payeeType)}" />
                <div>
                  <div class="font-medium">{payee.name}</div>
                  {#if payee.notes}
                    <div class="text-sm text-muted-foreground truncate max-w-xs">{payee.notes}</div>
                  {/if}
                </div>
              </div>
            </Table.Cell>
            <Table.Cell>
              {#if payee.payeeType}
                <Badge variant="outline" class="text-xs">
                  {payee.payeeType.replace('_', ' ')}
                </Badge>
              {/if}
            </Table.Cell>
            <Table.Cell>
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                {#if payee.email}
                  <Mail class="h-3 w-3" />
                {/if}
                {#if payee.phone}
                  <Phone class="h-3 w-3" />
                {/if}
                {#if payee.website}
                  <Globe class="h-3 w-3" />
                {/if}
              </div>
            </Table.Cell>
            <Table.Cell>
              <Badge variant={payee.isActive ? 'default' : 'secondary'} class="text-xs">
                {payee.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button variant="ghost" size="sm" class="h-8 w-8 p-0" onclick={(e) => e.stopPropagation()}>
                    <MoreHorizontal class="h-4 w-4" />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  <DropdownMenu.Item onclick={() => handlePayeeView(payee)}>
                    <Eye class="h-4 w-4 mr-2" />
                    View
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onclick={() => handlePayeeEdit(payee)}>
                    <Edit class="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item
                    onclick={() => handlePayeeDelete(payee)}
                    class="text-red-600"
                  >
                    <Trash2 class="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="flex items-center justify-between p-4">
        <div class="text-sm text-muted-foreground">
          Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, filteredPayees.length)} of {filteredPayees.length} payees
        </div>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 0}
            onclick={() => currentPage = Math.max(0, currentPage - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages - 1}
            onclick={() => currentPage = Math.min(totalPages - 1, currentPage + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    {/if}
  </Card.Root>
</div>

<!-- Progress Dialog -->
<PayeeBulkOperationsProgress
  bind:open={progressDialogOpen}
  onCancel={() => bulkOpsState.cancelOperation()}
  onClose={() => progressDialogOpen = false}
/>

<!-- Confirmation Dialog -->
<PayeeBulkOperationsConfirmation
  bind:open={confirmationDialogOpen}
  options={confirmationOptions}
  onConfirm={handleConfirmation}
  onCancel={() => {
    confirmationDialogOpen = false;
    confirmationOptions = null;
  }}
/>