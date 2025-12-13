<script lang="ts">
import type { DetectedPattern } from '$lib/schema/detected-patterns';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import Calendar from '@lucide/svelte/icons/calendar';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import Check from '@lucide/svelte/icons/check';
import X from '@lucide/svelte/icons/x';
import { convertPatternToSchedule, dismissPattern } from '$lib/query/patterns';
import { getConfidenceColor } from '$lib/utils/confidence-colors';
import { formatCurrency } from '$lib/utils/formatters';
import { parseISOString, formatDateDisplay } from '$lib/utils/dates';

interface PatternCardProps {
  pattern: DetectedPattern;
  onConvert?: ((scheduleId: number) => void) | undefined;
  onDismiss?: (() => void) | undefined;
}

let { pattern, onConvert, onDismiss }: PatternCardProps = $props();

const convertMutation = convertPatternToSchedule.options();
const dismissMutation = dismissPattern.options();

const patternTypeColors = {
  daily: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  weekly: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  monthly: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  yearly: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
} as const;

const confidenceColor = $derived(getConfidenceColor(pattern.confidenceScore));

const isProcessing = $derived(convertMutation.isPending || dismissMutation.isPending);

// Generate descriptive title from pattern data
const patternTitle = $derived.by(() => {
  const payeeName = (pattern as any).payee?.name || 'Unknown Payee';
  const frequencyMap = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
  };
  const frequencyLabel = frequencyMap[pattern.patternType] || 'Recurring';
  return `${payeeName} - ${frequencyLabel}`;
});

async function handleConvert() {
  const result = await convertMutation.mutateAsync({ patternId: pattern.id });
  if (result && onConvert) {
    onConvert(result);
  }
}

async function handleDismiss() {
  await dismissMutation.mutateAsync({ patternId: pattern.id });
  if (onDismiss) {
    onDismiss();
  }
}
</script>

<Card class="relative overflow-hidden">
  <div class="absolute top-0 left-0 h-full w-1" style="background: hsl(var(--primary) / 0.5)"></div>

  <CardHeader>
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1">
        <CardTitle class="text-lg">
          {patternTitle}
        </CardTitle>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline" class={patternTypeColors[pattern.patternType]}>
            <Calendar class="mr-1 h-3 w-3"></Calendar>
            {pattern.patternType.charAt(0).toUpperCase() + pattern.patternType.slice(1)}
          </Badge>
          <Badge variant="outline" class={confidenceColor}>
            <TrendingUp class="mr-1 h-3 w-3"></TrendingUp>
            {pattern.confidenceScore}% confidence
          </Badge>
          {#if pattern.sampleTransactionIds?.length}
            <Badge variant="secondary">
              {pattern.sampleTransactionIds.length} transaction{pattern.sampleTransactionIds
                .length !== 1
                ? 's'
                : ''}
            </Badge>
          {/if}
        </div>
      </div>
    </div>
  </CardHeader>

  <CardContent class="space-y-4">
    <div class="grid gap-3 sm:grid-cols-2">
      <div class="flex items-center gap-2 text-sm">
        <DollarSign class="text-muted-foreground h-4 w-4"></DollarSign>
        <div>
          <div class="text-muted-foreground">Amount</div>
          {#if pattern.amountMin !== null && pattern.amountMax !== null}
            <div class="font-medium">
              {formatCurrency(pattern.amountMin)} - {formatCurrency(pattern.amountMax)}
            </div>
          {:else if pattern.amountAvg !== null}
            <div class="font-medium">{formatCurrency(pattern.amountAvg)}</div>
          {/if}
        </div>
      </div>

      <div class="flex items-center gap-2 text-sm">
        <Calendar class="text-muted-foreground h-4 w-4"></Calendar>
        <div>
          <div class="text-muted-foreground">Frequency</div>
          {#if pattern.intervalDays !== null}
            <div class="font-medium">
              Every {pattern.intervalDays} day{pattern.intervalDays !== 1 ? 's' : ''}
            </div>
          {/if}
        </div>
      </div>
    </div>

    {#if pattern.lastOccurrence}
      {@const lastDate = parseISOString(pattern.lastOccurrence)}
      {#if lastDate}
        <div class="text-muted-foreground text-sm">
          Last occurrence: {formatDateDisplay(lastDate, 'medium')}
        </div>
      {/if}
    {/if}

    {#if pattern.nextExpected}
      {@const nextDate = parseISOString(pattern.nextExpected)}
      {#if nextDate}
        <div class="text-sm">
          <span class="text-muted-foreground">Next expected:</span>
          <span class="ml-1 font-medium">
            {formatDateDisplay(nextDate, 'medium')}
          </span>
        </div>
      {/if}
    {/if}

    <div class="flex gap-2 pt-2">
      <Button
        size="sm"
        onclick={handleConvert}
        disabled={isProcessing || pattern.status === 'converted'}
        class="flex-1">
        <Check class="mr-1 h-4 w-4"></Check>
        {pattern.status === 'converted' ? 'Converted' : 'Create Schedule'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onclick={handleDismiss}
        disabled={isProcessing || pattern.status === 'dismissed'}
        class="flex-1">
        <X class="mr-1 h-4 w-4"></X>
        Dismiss
      </Button>
    </div>
  </CardContent>
</Card>
