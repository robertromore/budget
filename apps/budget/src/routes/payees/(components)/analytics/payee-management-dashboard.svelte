<script lang="ts">
import * as Card from '$lib/components/ui/card';
import * as Tabs from '$lib/components/ui/tabs';
import * as Alert from '$lib/components/ui/alert';
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import { Separator } from '$lib/components/ui/separator';

import { PayeeBulkOperationsState } from '$lib/states/ui/payee-bulk-operations.svelte';
import { PayeesState } from '$lib/states/entities/payees.svelte';

// Import all bulk operations components
import PayeeListWithSelection from '../bulk-operations/payee-list-with-selection.svelte';
import PayeeAnalyticsDashboard from './payee-analytics-dashboard.svelte';
import PayeeDuplicateDetection from '../bulk-operations/payee-duplicate-detection.svelte';
import PayeeBulkImportExport from '../bulk-operations/payee-bulk-import-export.svelte';
import PayeeKeyboardShortcuts from '../bulk-operations/payee-keyboard-shortcuts.svelte';

// Import query operations
import {
  bulkStatusChange,
  bulkCategoryAssignment,
  bulkTagManagement,
  bulkIntelligenceApplication,
  bulkExport,
  bulkImport,
  bulkCleanup,
  getDuplicates,
  getOperationHistory
} from '$lib/query/payees';

// Icons
import Users from '@lucide/svelte/icons/users';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import Settings from '@lucide/svelte/icons/settings';
import Database from '@lucide/svelte/icons/database';
import Merge from '@lucide/svelte/icons/merge';
import Keyboard from '@lucide/svelte/icons/keyboard';
import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import Clock from '@lucide/svelte/icons/clock';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Zap from '@lucide/svelte/icons/zap';
import Info from '@lucide/svelte/icons/info';

let {
  className = '',
}: {
  className?: string;
} = $props();

// Initialize states
const bulkOpsState = PayeeBulkOperationsState.set();
const payeesState = PayeesState.get();

// Local state
let activeTab = $state('list');
let duplicateDetectionOpen = $state(false);
let importExportOpen = $state(false);
let keyboardShortcutsOpen = $state(false);

// Dashboard stats
const allPayees = $derived(Array.from(payeesState.payees.values()));
const activePayees = $derived(allPayees.filter(p => p.isActive));
const inactivePayees = $derived(allPayees.filter(p => !p.isActive));
const selectedCount = $derived(bulkOpsState.selectedCount);
const hasSelection = $derived(bulkOpsState.hasSelection);

// Recent operation history
const operationHistoryQuery = getOperationHistory(5, 0).options();
const recentOperations = $derived(operationHistoryQuery.data || []);

// Payee type distribution
const payeeTypeStats = $derived(() => {
  const stats = new Map<string, number>();
  allPayees.forEach(payee => {
    const type = payee.payeeType || 'unknown';
    stats.set(type, (stats.get(type) || 0) + 1);
  });
  return Array.from(stats.entries()).sort((a, b) => b[1] - a[1]);
});

// System health indicators
const systemHealth = $derived(() => {
  const totalPayees = allPayees.length;
  const activeRate = totalPayees > 0 ? (activePayees.length / totalPayees) * 100 : 0;
  const payeesWithEmail = allPayees.filter(p => p.email).length;
  const emailCoverage = totalPayees > 0 ? (payeesWithEmail / totalPayees) * 100 : 0;
  const payeesWithType = allPayees.filter(p => p.payeeType).length;
  const typeCoverage = totalPayees > 0 ? (payeesWithType / totalPayees) * 100 : 0;

  return {
    activeRate,
    emailCoverage,
    typeCoverage,
    totalPayees,
    score: Math.round((activeRate + emailCoverage + typeCoverage) / 3)
  };
});

// Quick actions
async function openDuplicateDetection() {
  duplicateDetectionOpen = true;
}

async function openImportExport() {
  importExportOpen = true;
}

function openKeyboardShortcuts() {
  keyboardShortcutsOpen = true;
}

// Keyboard shortcut handler
function handleKeyboardShortcut(action: string) {
  switch (action) {
    case 'select-all':
      // This would be handled by the PayeeListWithSelection component
      break;
    case 'clear-selection':
      bulkOpsState.clearSelection();
      break;
    case 'invert-selection':
      // This would be handled by the PayeeListWithSelection component
      break;
    case 'find-duplicates':
      openDuplicateDetection();
      break;
    case 'import':
      openImportExport();
      break;
    case 'export':
    case 'export-all':
      openImportExport();
      break;
    case 'cancel':
      // Close any open dialogs
      duplicateDetectionOpen = false;
      importExportOpen = false;
      keyboardShortcutsOpen = false;
      break;
    default:
      // Unhandled keyboard shortcut
      break;
  }
}

// Handle completion callbacks
function handleDuplicateMergeComplete(mergedCount: number) {
  // Show success notification or refresh data
}

function handleImportComplete(importedCount: number) {
  // Show success notification or refresh data
}

// Get health score color
function getHealthScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

// Format operation type
function formatOperationType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
</script>

<div class="space-y-6 {className}">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Payee Management</h1>
      <p class="text-muted-foreground">
        Manage your payees with powerful bulk operations and intelligent tools.
      </p>
    </div>
    <div class="flex gap-2">
      <Button variant="outline" onclick={openKeyboardShortcuts}>
        <Keyboard class="h-4 w-4 mr-2" />
        Shortcuts
      </Button>
      <Button variant="outline" onclick={openDuplicateDetection}>
        <Merge class="h-4 w-4 mr-2" />
        Find Duplicates
      </Button>
      <Button variant="outline" onclick={openImportExport}>
        <Database class="h-4 w-4 mr-2" />
        Import/Export
      </Button>
    </div>
  </div>

  <!-- Dashboard Overview -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- Total Payees -->
    <Card.Root>
      <Card.Content class="p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-muted-foreground">Total Payees</p>
            <p class="text-2xl font-bold">{allPayees.length}</p>
          </div>
          <Users class="h-8 w-8 text-muted-foreground" />
        </div>
        <div class="flex items-center gap-2 mt-2">
          <Badge variant="secondary" class="text-xs">
            {activePayees.length} active
          </Badge>
          <Badge variant="outline" class="text-xs">
            {inactivePayees.length} inactive
          </Badge>
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Selected Count -->
    <Card.Root>
      <Card.Content class="p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-muted-foreground">Selected</p>
            <p class="text-2xl font-bold">{selectedCount}</p>
          </div>
          <CircleCheck class="h-8 w-8 text-muted-foreground" />
        </div>
        {#if hasSelection}
          <div class="mt-2">
            <Badge variant="default" class="text-xs">
              {Math.round((selectedCount / allPayees.length) * 100)}% of total
            </Badge>
          </div>
        {:else}
          <p class="text-xs text-muted-foreground mt-2">No payees selected</p>
        {/if}
      </Card.Content>
    </Card.Root>

    <!-- System Health -->
    <Card.Root>
      <Card.Content class="p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-muted-foreground">Data Health</p>
            <p class="text-2xl font-bold {getHealthScoreColor(systemHealth.score)}">
              {systemHealth.score}%
            </p>
          </div>
          <TrendingUp class="h-8 w-8 text-muted-foreground" />
        </div>
        <div class="space-y-1 mt-2">
          <div class="text-xs">
            <span class="text-muted-foreground">Active:</span>
            <span class="ml-1">{Math.round(systemHealth.activeRate)}%</span>
          </div>
          <div class="text-xs">
            <span class="text-muted-foreground">Email:</span>
            <span class="ml-1">{Math.round(systemHealth.emailCoverage)}%</span>
          </div>
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Recent Operations -->
    <Card.Root>
      <Card.Content class="p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-muted-foreground">Recent Ops</p>
            <p class="text-2xl font-bold">{recentOperations.length}</p>
          </div>
          <Clock class="h-8 w-8 text-muted-foreground" />
        </div>
        {#if recentOperations.length > 0}
          <div class="mt-2">
            <Badge variant="outline" class="text-xs">
              Last: {formatOperationType(recentOperations[0].operationType)}
            </Badge>
          </div>
        {:else}
          <p class="text-xs text-muted-foreground mt-2">No recent operations</p>
        {/if}
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Bulk Operations Status -->
  {#if bulkOpsState.currentOperation}
    <Alert.Root class="border-blue-200 bg-blue-50">
      <Zap class="h-4 w-4 text-blue-600" />
      <Alert.Title class="text-blue-800">Bulk Operation in Progress</Alert.Title>
      <Alert.Description class="text-blue-700">
        {bulkOpsState.getOperationSummary()}
      </Alert.Description>
    </Alert.Root>
  {/if}

  <!-- Main Content Tabs -->
  <Tabs.Root bind:value={activeTab} class="space-y-4">
    <Tabs.List class="grid w-full grid-cols-2">
      <Tabs.Trigger value="list" class="flex items-center gap-2">
        <Users class="h-4 w-4" />
        Payee List
      </Tabs.Trigger>
      <Tabs.Trigger value="analytics" class="flex items-center gap-2">
        <BarChart3 class="h-4 w-4" />
        Analytics
      </Tabs.Trigger>
    </Tabs.List>

    <!-- Payee List Tab -->
    <Tabs.Content value="list" class="space-y-4">
      <PayeeListWithSelection
        showBulkOperations={true}
        showFilters={true}
        showStats={true}
      />
    </Tabs.Content>

    <!-- Analytics Tab -->
    <Tabs.Content value="analytics" class="space-y-4">
      <!-- Quick Stats Row -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Payee Types Distribution -->
        <Card.Root>
          <Card.Header>
            <Card.Title class="text-lg">Payee Types</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="space-y-2">
              {#each payeeTypeStats.slice(0, 5) as [type, count]}
                <div class="flex items-center justify-between">
                  <span class="text-sm capitalize">{type.replace('_', ' ')}</span>
                  <div class="flex items-center gap-2">
                    <Badge variant="outline" class="text-xs">{count}</Badge>
                    <div class="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        class="h-full bg-primary rounded-full"
                        style="width: {(count / allPayees.length) * 100}%"
                      ></div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </Card.Content>
        </Card.Root>

        <!-- System Health Details -->
        <Card.Root>
          <Card.Header>
            <Card.Title class="text-lg">Data Quality</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="space-y-3">
              <div>
                <div class="flex justify-between text-sm">
                  <span>Active Rate</span>
                  <span>{Math.round(systemHealth.activeRate)}%</span>
                </div>
                <div class="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    class="h-full bg-green-500 rounded-full"
                    style="width: {systemHealth.activeRate}%"
                  ></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-sm">
                  <span>Email Coverage</span>
                  <span>{Math.round(systemHealth.emailCoverage)}%</span>
                </div>
                <div class="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    class="h-full bg-blue-500 rounded-full"
                    style="width: {systemHealth.emailCoverage}%"
                  ></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-sm">
                  <span>Type Coverage</span>
                  <span>{Math.round(systemHealth.typeCoverage)}%</span>
                </div>
                <div class="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    class="h-full bg-orange-500 rounded-full"
                    style="width: {systemHealth.typeCoverage}%"
                  ></div>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card.Root>

        <!-- Recent Operations -->
        <Card.Root>
          <Card.Header>
            <Card.Title class="text-lg">Recent Operations</Card.Title>
          </Card.Header>
          <Card.Content>
            {#if recentOperations.length > 0}
              <div class="space-y-2">
                {#each recentOperations as operation}
                  <div class="text-sm p-2 border rounded">
                    <div class="font-medium">
                      {formatOperationType(operation.operationType)}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {operation.timestamp ? new Date(operation.timestamp).toLocaleDateString() : 'Unknown date'}
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="text-center py-4 text-muted-foreground">
                <Clock class="h-8 w-8 mx-auto mb-2" />
                <p class="text-sm">No recent operations</p>
              </div>
            {/if}
          </Card.Content>
        </Card.Root>
      </div>

      <!-- Full Analytics Dashboard -->
      <PayeeAnalyticsDashboard />
    </Tabs.Content>
  </Tabs.Root>
</div>

<!-- Modals -->
<PayeeDuplicateDetection
  bind:open={duplicateDetectionOpen}
  onMergeComplete={handleDuplicateMergeComplete}
/>

<PayeeBulkImportExport
  bind:open={importExportOpen}
  selectedPayeeIds={bulkOpsState.selectedPayeeIdsArray}
  onImportComplete={handleImportComplete}
/>

<PayeeKeyboardShortcuts
  bind:open={keyboardShortcutsOpen}
  onTriggerAction={handleKeyboardShortcut}
/>