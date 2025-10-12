<script lang="ts">
import * as Dialog from '$lib/components/ui/dialog';
import * as Card from '$lib/components/ui/card';
import * as Progress from '$lib/components/ui/progress';
import * as Alert from '$lib/components/ui/alert';
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import { Separator } from '$lib/components/ui/separator';
import { ScrollArea } from '$lib/components/ui/scroll-area';

import { PayeeBulkOperationsState, type BulkOperationResult } from '$lib/states/ui/payee-bulk-operations.svelte';

// Icons
import CircleCheck from '@lucide/svelte/icons/circle-check';
import XCircle from '@lucide/svelte/icons/x-circle';
import CircleAlert from '@lucide/svelte/icons/circle-alert';
import Clock from '@lucide/svelte/icons/clock';
import Download from '@lucide/svelte/icons/download';
import LoaderCircle from '@lucide/svelte/icons/loader-circle';
import Users from '@lucide/svelte/icons/users';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import X from '@lucide/svelte/icons/x';
import Eye from '@lucide/svelte/icons/eye';
import EyeOff from '@lucide/svelte/icons/eye-off';

let {
  open = $bindable(false),
  onCancel,
  onClose,
  onRetryFailed,
  onExportResults,
  showAdvancedDetails = true,
}: {
  open: boolean;
  onCancel?: () => void;
  onClose?: () => void;
  onRetryFailed?: (failedResults: BulkOperationResult[]) => void;
  onExportResults?: (results: BulkOperationResult[]) => void;
  showAdvancedDetails?: boolean;
} = $props();

const bulkOpsState = PayeeBulkOperationsState.get();

// Local state
let showErrorDetails = $state(false);
let expandedErrorId = $state<number | null>(null);

// Progress data
const currentOperation = $derived.by(() => bulkOpsState.currentOperation);
const isRunning = $derived.by(() => bulkOpsState.isOperationRunning);

// Progress calculations
const progressPercentage = $derived.by(() => {
  if (!currentOperation) return 0;
  const { completed, failed, total } = currentOperation;
  return Math.round(((completed + failed) / total) * 100);
});

const successRate = $derived.by(() => {
  if (!currentOperation || currentOperation.completed === 0) return 0;
  const { completed, failed } = currentOperation;
  return Math.round((completed / (completed + failed)) * 100);
});

const estimatedTimeRemaining = $derived.by(() => {
  return bulkOpsState.getEstimatedTimeRemaining();
});

const operationSummary = $derived.by(() => {
  return bulkOpsState.getOperationSummary();
});

// Results filtering
const successfulResults = $derived.by(() => {
  return currentOperation?.results.filter(r => r.success) || [];
});

const failedResults = $derived.by(() => {
  return currentOperation?.results.filter(r => !r.success) || [];
});

const canRetryFailed = $derived.by(() => {
  return failedResults.length > 0 && !isRunning && onRetryFailed;
});

const canExportResults = $derived.by(() => {
  return currentOperation?.results.length > 0 && onExportResults;
});

// Format time remaining
function formatTimeRemaining(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s remaining`;
  }
  return `${seconds}s remaining`;
}

// Get operation type display name
function getOperationDisplayName(operation: string): string {
  const displayNames: Record<string, string> = {
    'bulk_delete': 'Bulk Delete',
    'bulk_status_change': 'Status Update',
    'bulk_category_assignment': 'Category Assignment',
    'bulk_tag_management': 'Tag Management',
    'bulk_intelligence_application': 'Intelligence Application',
    'bulk_export': 'Export',
    'bulk_import': 'Import',
    'bulk_cleanup': 'Cleanup',
    'merge_duplicates': 'Merge Duplicates',
  };
  return displayNames[operation] || operation.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Get result type icon and color
function getResultIcon(success: boolean) {
  return success ? CircleCheck : XCircle;
}

function getResultColor(success: boolean): string {
  return success ? 'text-green-500' : 'text-red-500';
}

// Handle actions
function handleCancel() {
  if (onCancel) {
    onCancel();
  }
  bulkOpsState.cancelOperation();
}

function handleClose() {
  if (onClose) {
    onClose();
  }
  open = false;
  bulkOpsState.clearOperationResults();
}

function handleRetryFailed() {
  if (onRetryFailed && failedResults.length > 0) {
    onRetryFailed(failedResults);
  }
}

function handleExportResults() {
  if (onExportResults && currentOperation?.results) {
    onExportResults(currentOperation.results);
  }
}

function toggleErrorDetails() {
  showErrorDetails = !showErrorDetails;
}

function toggleExpandedError(payeeId: number) {
  expandedErrorId = expandedErrorId === payeeId ? null : payeeId;
}
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-4xl max-h-[90vh] overflow-hidden">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        {#if isRunning}
          <LoaderCircle class="h-5 w-5 animate-spin" />
        {:else if currentOperation}
          {#if failedResults.length === 0}
            <CircleCheck class="h-5 w-5 text-green-500" />
          {:else if successfulResults.length === 0}
            <XCircle class="h-5 w-5 text-red-500" />
          {:else}
            <CircleAlert class="h-5 w-5 text-orange-500" />
          {/if}
        {/if}
        {currentOperation ? getOperationDisplayName(currentOperation.operation) : 'Bulk Operation'}
      </Dialog.Title>
      <Dialog.Description>
        {#if isRunning}
          Operation in progress...
        {:else if currentOperation}
          Operation completed
        {:else}
          No operation data available
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    {#if currentOperation}
      <div class="space-y-6">
        <!-- Progress Overview -->
        <Card.Root>
          <Card.Header>
            <Card.Title class="text-lg">Progress Overview</Card.Title>
          </Card.Header>
          <Card.Content class="space-y-4">
            <!-- Progress Bar -->
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span>{operationSummary}</span>
                <span>{progressPercentage}%</span>
              </div>
              <Progress.Root
                value={progressPercentage}
                class="h-2"
              />
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-green-500">{currentOperation.completed}</div>
                <div class="text-sm text-muted-foreground">Successful</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-red-500">{currentOperation.failed}</div>
                <div class="text-sm text-muted-foreground">Failed</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold">{currentOperation.total}</div>
                <div class="text-sm text-muted-foreground">Total</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-500">{successRate}%</div>
                <div class="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>

            <!-- Time Information -->
            {#if isRunning && estimatedTimeRemaining}
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock class="h-4 w-4" />
                {formatTimeRemaining(estimatedTimeRemaining)}
              </div>
            {:else if currentOperation.startTime && currentOperation.endTime}
              {@const duration = currentOperation.endTime.getTime() - currentOperation.startTime.getTime()}
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock class="h-4 w-4" />
                Completed in {Math.round(duration / 1000)}s
              </div>
            {/if}
          </Card.Content>
        </Card.Root>

        {#if showAdvancedDetails}
          <!-- Results Summary -->
          <Card.Root>
            <Card.Header>
              <Card.Title class="text-lg flex items-center justify-between">
                Results
                <div class="flex gap-2">
                  {#if failedResults.length > 0}
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={toggleErrorDetails}
                      class="h-8"
                    >
                      {#if showErrorDetails}
                        <EyeOff class="h-4 w-4 mr-2" />
                        Hide Errors
                      {:else}
                        <Eye class="h-4 w-4 mr-2" />
                        Show Errors
                      {/if}
                    </Button>
                  {/if}
                </div>
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <ScrollArea class="h-[300px]">
                <div class="space-y-2">
                  {#if showErrorDetails && failedResults.length > 0}
                    <!-- Error Results -->
                    <div class="space-y-2">
                      <h4 class="font-medium text-red-600 flex items-center gap-2">
                        <XCircle class="h-4 w-4" />
                        Failed Operations ({failedResults.length})
                      </h4>
                      {#each failedResults as result}
                        <div class="border border-red-200 rounded-lg p-3 bg-red-50">
                          <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                              <XCircle class="h-4 w-4 text-red-500" />
                              <span class="font-medium">Payee ID: {result.payeeId}</span>
                              {#if result.details?.payeeName}
                                <Badge variant="outline">{result.details.payeeName}</Badge>
                              {/if}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onclick={() => toggleExpandedError(result.payeeId)}
                              class="h-6 px-2"
                            >
                              {expandedErrorId === result.payeeId ? 'Less' : 'More'}
                            </Button>
                          </div>
                          {#if result.error}
                            <p class="text-sm text-red-600 mt-1">{result.error}</p>
                          {/if}
                          {#if expandedErrorId === result.payeeId && result.details}
                            <div class="mt-2 text-xs text-muted-foreground">
                              <pre class="whitespace-pre-wrap">{JSON.stringify(result.details, null, 2)}</pre>
                            </div>
                          {/if}
                        </div>
                      {/each}
                    </div>

                    <Separator />
                  {/if}

                  <!-- Success Results (condensed view) -->
                  {#if successfulResults.length > 0}
                    <div class="space-y-2">
                      <h4 class="font-medium text-green-600 flex items-center gap-2">
                        <CircleCheck class="h-4 w-4" />
                        Successful Operations ({successfulResults.length})
                      </h4>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {#each successfulResults.slice(0, 10) as result}
                          <div class="flex items-center gap-2 text-sm p-2 border border-green-200 rounded bg-green-50">
                            <CircleCheck class="h-3 w-3 text-green-500" />
                            <span>Payee ID: {result.payeeId}</span>
                            {#if result.details?.payeeName}
                              <Badge variant="outline" class="text-xs">{result.details.payeeName}</Badge>
                            {/if}
                          </div>
                        {/each}
                      </div>
                      {#if successfulResults.length > 10}
                        <p class="text-sm text-muted-foreground text-center">
                          ... and {successfulResults.length - 10} more successful operations
                        </p>
                      {/if}
                    </div>
                  {/if}
                </div>
              </ScrollArea>
            </Card.Content>
          </Card.Root>
        {/if}

        <!-- Completion Actions -->
        {#if !isRunning}
          <Card.Root>
            <Card.Header>
              <Card.Title class="text-lg">Actions</Card.Title>
            </Card.Header>
            <Card.Content>
              <div class="flex flex-wrap gap-2">
                {#if canRetryFailed}
                  <Button
                    variant="outline"
                    onclick={handleRetryFailed}
                    class="flex items-center gap-2"
                  >
                    <TrendingUp class="h-4 w-4" />
                    Retry Failed ({failedResults.length})
                  </Button>
                {/if}

                {#if canExportResults}
                  <Button
                    variant="outline"
                    onclick={handleExportResults}
                    class="flex items-center gap-2"
                  >
                    <Download class="h-4 w-4" />
                    Export Results
                  </Button>
                {/if}

                <Button
                  variant="secondary"
                  onclick={handleClose}
                  class="flex items-center gap-2"
                >
                  <CircleCheck class="h-4 w-4" />
                  Close
                </Button>
              </div>
            </Card.Content>
          </Card.Root>
        {/if}

        <!-- Status Alerts -->
        {#if !isRunning && currentOperation}
          {#if failedResults.length === 0}
            <Alert.Root class="border-green-200 bg-green-50">
              <CircleCheck class="h-4 w-4 text-green-600" />
              <Alert.Title class="text-green-800">Operation Completed Successfully</Alert.Title>
              <Alert.Description class="text-green-700">
                All {currentOperation.completed} operations were completed successfully.
              </Alert.Description>
            </Alert.Root>
          {:else if successfulResults.length === 0}
            <Alert.Root class="border-red-200 bg-red-50">
              <XCircle class="h-4 w-4 text-red-600" />
              <Alert.Title class="text-red-800">Operation Failed</Alert.Title>
              <Alert.Description class="text-red-700">
                All {currentOperation.failed} operations failed. Please review the errors and try again.
              </Alert.Description>
            </Alert.Root>
          {:else}
            <Alert.Root class="border-orange-200 bg-orange-50">
              <CircleAlert class="h-4 w-4 text-orange-600" />
              <Alert.Title class="text-orange-800">Operation Partially Completed</Alert.Title>
              <Alert.Description class="text-orange-700">
                {currentOperation.completed} operations succeeded, {currentOperation.failed} failed.
                {#if canRetryFailed}
                  You can retry the failed operations.
                {/if}
              </Alert.Description>
            </Alert.Root>
          {/if}
        {/if}
      </div>
    {:else}
      <div class="text-center py-8">
        <Users class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p class="text-muted-foreground">No operation data available</p>
      </div>
    {/if}

    <!-- Footer with Cancel/Close -->
    <Dialog.Footer>
      {#if isRunning}
        <Button variant="destructive" onclick={handleCancel}>
          Cancel Operation
        </Button>
      {:else}
        <Button variant="outline" onclick={handleClose}>
          <X class="h-4 w-4 mr-2" />
          Close
        </Button>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
