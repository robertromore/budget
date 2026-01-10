<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import * as Tooltip from '$lib/components/ui/tooltip';
import type { ImportRow, ValidationError } from '$lib/types/import';
import { formatDisplayValue } from '$lib/utils/formatters';
import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
import CircleAlert from '@lucide/svelte/icons/circle-alert';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import Clock from '@lucide/svelte/icons/clock';
import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
import type { Row } from '@tanstack/table-core';

interface Props {
  row: Row<ImportRow>;
}

let { row }: Props = $props();

const status = $derived(row.original.validationStatus);
const hasWarning = $derived(status === 'warning' && row.original.validationErrors);
const hasError = $derived(status === 'invalid' && row.original.validationErrors);
const hasTransferMatch = $derived(status === 'transfer_match' && row.original.transferTargetMatch);
const transferMatch = $derived(row.original.transferTargetMatch);
const warningMessages = $derived<ValidationError[]>(
  hasWarning ? row.original.validationErrors?.filter((e) => e.severity === 'warning') || [] : []
);
const errorMessages = $derived<ValidationError[]>(
  hasError ? row.original.validationErrors?.filter((e) => e.severity === 'error') || [] : []
);
const warningCount = $derived(warningMessages.length);
const errorCount = $derived(errorMessages.length);

function getStatusIcon(status: string) {
  switch (status) {
    case 'valid':
      return CircleCheck;
    case 'invalid':
      return CircleAlert;
    case 'warning':
      return TriangleAlert;
    case 'transfer_match':
      return ArrowRightLeft;
    default:
      return Clock;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'valid':
      return 'text-green-600';
    case 'invalid':
      return 'text-destructive';
    case 'warning':
      return 'text-yellow-600';
    case 'transfer_match':
      return 'text-blue-600';
    default:
      return 'text-muted-foreground';
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'valid':
      return { variant: 'default' as const, label: 'Valid' };
    case 'invalid':
      return { variant: 'destructive' as const, label: 'Invalid' };
    case 'warning':
      return { variant: 'outline' as const, label: 'Warning' };
    case 'transfer_match':
      return { variant: 'secondary' as const, label: 'Transfer' };
    default:
      return { variant: 'secondary' as const, label: 'Pending' };
  }
}

const StatusIcon = $derived(getStatusIcon(status));
const badge = $derived(getStatusBadge(status));
</script>

{#if hasTransferMatch && transferMatch}
  <Tooltip.Root>
    <Tooltip.Trigger class="flex cursor-help items-center gap-2">
      <StatusIcon class={`h-4 w-4 ${getStatusColor(status)}`} />
      <Badge variant={badge.variant} class="bg-blue-100 text-blue-800 text-xs">
        {badge.label}
      </Badge>
    </Tooltip.Trigger>
    <Tooltip.Content class="max-w-md">
      <div class="space-y-2">
        <p class="text-sm font-semibold text-blue-600">Matches Existing Transfer</p>
        <div class="space-y-1 text-xs">
          <p>
            <span class="font-medium">From:</span>
            <span class="text-muted-foreground">{transferMatch.sourceAccountName}</span>
          </p>
          {#if transferMatch.dateDifference > 0}
            <p>
              <span class="font-medium">Date difference:</span>
              <span class="text-muted-foreground">{transferMatch.dateDifference} day{transferMatch.dateDifference > 1 ? 's' : ''}</span>
            </p>
          {/if}
          <p>
            <span class="font-medium">Confidence:</span>
            <span class="text-muted-foreground capitalize">{transferMatch.confidence}</span>
          </p>
        </div>
        <p class="text-muted-foreground mt-2 text-xs italic">
          This transaction will be reconciled with the existing transfer instead of creating a duplicate.
        </p>
      </div>
    </Tooltip.Content>
  </Tooltip.Root>
{:else if hasWarning && warningMessages.length > 0}
  <Tooltip.Root>
    <Tooltip.Trigger class="flex cursor-help items-center gap-2">
      <StatusIcon class={`h-4 w-4 ${getStatusColor(status)}`} />
      <Badge variant={badge.variant} class="text-xs">
        {badge.label}
      </Badge>
      <span class="text-muted-foreground text-xs">
        ({warningCount})
      </span>
    </Tooltip.Trigger>
    <Tooltip.Content class="max-w-md">
      <div class="space-y-2">
        <p class="text-sm font-semibold">Warnings:</p>
        <ul class="space-y-1 text-xs">
          {#each warningMessages as warning}
            <li class="flex flex-col gap-1">
              <span class="font-medium">{warning.field}:</span>
              <span class="text-muted-foreground">{warning.message}</span>
              {#if warning.value !== undefined && warning.value !== null}
                <span class="text-muted-foreground whitespace-pre-wrap italic"
                  >Value: {formatDisplayValue(warning.value)}</span>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    </Tooltip.Content>
  </Tooltip.Root>
{:else if hasError && errorMessages.length > 0}
  <Tooltip.Root>
    <Tooltip.Trigger class="flex cursor-help items-center gap-2">
      <StatusIcon class={`h-4 w-4 ${getStatusColor(status)}`} />
      <Badge variant={badge.variant} class="text-xs">
        {badge.label}
      </Badge>
      <span class="text-muted-foreground text-xs">
        ({errorCount})
      </span>
    </Tooltip.Trigger>
    <Tooltip.Content class="max-w-md">
      <div class="space-y-2">
        <p class="text-destructive text-sm font-semibold">Errors:</p>
        <ul class="space-y-1 text-xs">
          {#each errorMessages as error}
            <li class="flex flex-col gap-1">
              <span class="font-medium">{error.field}:</span>
              <span class="text-muted-foreground">{error.message}</span>
              {#if error.value !== undefined && error.value !== null}
                <span class="text-muted-foreground whitespace-pre-wrap italic"
                  >Value: {formatDisplayValue(error.value)}</span>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    </Tooltip.Content>
  </Tooltip.Root>
{:else}
  <div class="flex items-center gap-2">
    <StatusIcon class={`h-4 w-4 ${getStatusColor(status)}`} />
    <Badge variant={badge.variant} class="text-xs">
      {badge.label}
    </Badge>
  </div>
{/if}
