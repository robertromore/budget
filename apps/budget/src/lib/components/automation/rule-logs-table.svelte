<!--
  Rule Logs Table

  Displays execution history for automation rules.
-->
<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Collapsible from '$lib/components/ui/collapsible';
import * as Table from '$lib/components/ui/table';
import type { AutomationRuleLog } from '$core/schema/automation-rules';
import { cn } from '$lib/utils';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
import Check from '@lucide/svelte/icons/check';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import Clock from '@lucide/svelte/icons/clock';
import History from '@lucide/svelte/icons/history';
import X from '@lucide/svelte/icons/x';

interface Props {
  logs: AutomationRuleLog[];
  isLoading?: boolean;
  showRuleName?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

let {
  logs,
  isLoading = false,
  showRuleName = false,
  onLoadMore,
  hasMore = false,
}: Props = $props();

// Track expanded rows
let expandedRows = $state<Set<number>>(new Set());

function toggleRow(id: number) {
  if (expandedRows.has(id)) {
    expandedRows.delete(id);
  } else {
    expandedRows.add(id);
  }
  expandedRows = new Set(expandedRows);
}

// Format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// Get status badge
function getStatusBadge(status: string) {
  switch (status) {
    case 'success':
      return {
        icon: Check,
        label: 'Success',
        class: 'bg-success-bg text-success-fg',
      };
    case 'failed':
      return {
        icon: X,
        label: 'Failed',
        class: 'bg-danger-bg text-danger-fg',
      };
    case 'skipped':
      return {
        icon: AlertTriangle,
        label: 'Skipped',
        class: 'bg-warning-bg text-warning-fg',
      };
    default:
      return { icon: Clock, label: status, class: 'bg-muted' };
  }
}
</script>

<div class="space-y-4">
  {#if isLoading && logs.length === 0}
    <div class="space-y-2">
      {#each { length: 5 } as _, i (i)}
        <div class="bg-muted h-12 animate-pulse rounded-md"></div>
      {/each}
    </div>
  {:else if logs.length === 0}
    <div class="rounded-lg border border-dashed py-12 text-center">
      <History class="text-muted-foreground/50 mx-auto mb-3 h-10 w-10" />
      <h3 class="text-lg font-medium">No execution logs</h3>
      <p class="text-muted-foreground mt-1 text-sm">
        Logs will appear here when rules are triggered.
      </p>
    </div>
  {:else}
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head class="w-[40px]"></Table.Head>
          <Table.Head>Time</Table.Head>
          {#if showRuleName}
            <Table.Head>Rule</Table.Head>
          {/if}
          <Table.Head>Event</Table.Head>
          <Table.Head>Entity</Table.Head>
          <Table.Head>Status</Table.Head>
          <Table.Head class="text-right">Duration</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each logs as log (log.id)}
          {@const statusBadge = getStatusBadge(log.status)}
          {@const StatusIcon = statusBadge.icon}
          <Table.Row class="hover:bg-muted/50 cursor-pointer" onclick={() => toggleRow(log.id)}>
            <Table.Cell>
              <ChevronDown
                class={cn(
                  'text-muted-foreground h-4 w-4 transition-transform',
                  expandedRows.has(log.id) && 'rotate-180'
                )} />
            </Table.Cell>
            <Table.Cell class="font-mono text-xs">
              {formatDate(log.createdAt)}
            </Table.Cell>
            {#if showRuleName}
              <Table.Cell>
                <span class="text-sm">Rule #{log.ruleId}</span>
              </Table.Cell>
            {/if}
            <Table.Cell>
              <Badge variant="outline" class="text-xs font-normal">
                {log.triggerEvent}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              <span class="text-sm">
                {log.entityType}
                {#if log.entityId}
                  <span class="text-muted-foreground">#{log.entityId}</span>
                {/if}
              </span>
            </Table.Cell>
            <Table.Cell>
              <Badge class={cn('gap-1', statusBadge.class)}>
                <StatusIcon class="h-3 w-3" />
                {statusBadge.label}
              </Badge>
            </Table.Cell>
            <Table.Cell class="text-right font-mono text-xs">
              {log.executionTimeMs ? `${log.executionTimeMs}ms` : '-'}
            </Table.Cell>
          </Table.Row>

          <!-- Expanded Details -->
          {#if expandedRows.has(log.id)}
            <Table.Row>
              <Table.Cell colspan={showRuleName ? 7 : 6} class="bg-muted/30 p-4">
                <div class="space-y-3 text-sm">
                  <!-- Conditions -->
                  <div>
                    <span class="font-medium">Conditions Matched:</span>
                    <span class="ml-2">
                      {log.conditionsMatched ? 'Yes' : 'No'}
                    </span>
                  </div>

                  <!-- Actions Executed -->
                  {#if log.actionsExecuted && log.actionsExecuted.length > 0}
                    <div>
                      <span class="font-medium">Actions Executed:</span>
                      <ul class="mt-1 space-y-1 pl-4">
                        {#each log.actionsExecuted as action, i (i)}
                          <li class="flex items-center gap-2">
                            {#if action.success}
                              <Check class="h-3 w-3 text-success" />
                            {:else}
                              <X class="h-3 w-3 text-destructive" />
                            {/if}
                            <span>{action.actionType}</span>
                            {#if action.error}
                              <span class="text-destructive text-xs">({action.error})</span>
                            {/if}
                          </li>
                        {/each}
                      </ul>
                    </div>
                  {/if}

                  <!-- Error Message -->
                  {#if log.errorMessage}
                    <div class="bg-destructive/10 text-destructive rounded-md p-2">
                      <span class="font-medium">Error:</span>
                      <span class="ml-2">{log.errorMessage}</span>
                    </div>
                  {/if}

                  <!-- Entity Snapshot -->
                  {#if log.entitySnapshot}
                    <Collapsible.Root>
                      <Collapsible.Trigger>
                        {#snippet child({ props })}
                          <Button variant="ghost" size="sm" {...props}>
                            <ChevronDown class="mr-1 h-3 w-3" />
                            View Entity Snapshot
                          </Button>
                        {/snippet}
                      </Collapsible.Trigger>
                      <Collapsible.Content>
                        <pre
                          class="bg-muted mt-2 overflow-auto rounded-md p-2 text-xs">{JSON.stringify(
                            log.entitySnapshot,
                            null,
                            2
                          )}</pre>
                      </Collapsible.Content>
                    </Collapsible.Root>
                  {/if}
                </div>
              </Table.Cell>
            </Table.Row>
          {/if}
        {/each}
      </Table.Body>
    </Table.Root>

    {#if hasMore}
      <div class="flex justify-center">
        <Button variant="outline" onclick={onLoadMore} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load More'}
        </Button>
      </div>
    {/if}
  {/if}
</div>
