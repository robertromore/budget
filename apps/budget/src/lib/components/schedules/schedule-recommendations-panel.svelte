<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import {
  convertPatternToSchedule,
  detectPatterns,
  dismissPattern,
  listPatterns,
} from '$lib/query/patterns';
import type { Category } from '$lib/schema/categories';
import type { DetectedPattern } from '$lib/schema/detected-patterns';
import type { Payee } from '$lib/schema/payees';
import { formatCurrency } from '$lib/utils/formatters';
import { Calendar, Check, Clock, DollarSign, LoaderCircle, RefreshCw, Sparkles, Tag, X } from '@lucide/svelte/icons';
import { toast } from '$lib/utils/toast-interceptor';

// Extended type to include relations loaded by the query
type DetectedPatternWithRelations = DetectedPattern & {
  payee?: Payee | null;
  category?: Category | null;
};

interface Props {
  accountId: number;
}

let { accountId }: Props = $props();

// Query for pending patterns
const patternsQuery = $derived(listPatterns(accountId, 'pending').options());
const patterns = $derived((patternsQuery.data ?? []) as DetectedPatternWithRelations[]);
const isLoading = $derived(patternsQuery.isLoading);

// Mutations
const detectMutation = detectPatterns.options();
const convertMutation = convertPatternToSchedule.options();
const dismissMutation = dismissPattern.options();

let isDetecting = $state(false);
let processingPatternId = $state<number | null>(null);

async function handleDetect() {
  isDetecting = true;
  try {
    const result = await detectMutation.mutateAsync({ accountId });
    if (result.length === 0) {
      toast.info('No new recurring patterns found');
    } else {
      toast.success(`Found ${result.length} recurring pattern${result.length > 1 ? 's' : ''}`);
    }
  } catch {
    toast.error('Failed to detect patterns');
  } finally {
    isDetecting = false;
  }
}

async function handleConvert(patternId: number) {
  processingPatternId = patternId;
  try {
    await convertMutation.mutateAsync({ patternId });
    // Toast handled by mutation's successMessage
  } catch {
    // Toast handled by mutation's errorMessage
  } finally {
    processingPatternId = null;
  }
}

async function handleDismiss(patternId: number) {
  processingPatternId = patternId;
  try {
    await dismissMutation.mutateAsync({ patternId });
    // Toast handled by mutation's successMessage
  } catch {
    // Toast handled by mutation's errorMessage
  } finally {
    processingPatternId = null;
  }
}

function getFrequencyLabel(pattern: DetectedPatternWithRelations): string {
  if (!pattern.patternType) return 'Unknown';

  switch (pattern.patternType) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'yearly':
      return 'Yearly';
    default:
      return pattern.patternType;
  }
}

function getPatternName(pattern: DetectedPatternWithRelations): string {
  // Prefer the payee name as it's more descriptive
  if (pattern.payee?.name) {
    return pattern.payee.name;
  }
  // Fall back to suggested config name
  if (pattern.suggestedScheduleConfig?.name) {
    return pattern.suggestedScheduleConfig.name;
  }
  // Last resort
  return 'Recurring Transaction';
}

function getConfidenceBadgeVariant(score: number): 'default' | 'secondary' | 'outline' {
  if (score >= 0.8) return 'default';
  if (score >= 0.6) return 'secondary';
  return 'outline';
}

function getConfidenceLabel(score: number): string {
  if (score >= 0.9) return 'Very High';
  if (score >= 0.8) return 'High';
  if (score >= 0.6) return 'Medium';
  return 'Low';
}
</script>

<div class="space-y-4">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center gap-2">
      <Sparkles class="text-primary h-5 w-5" />
      <h2 class="text-lg font-semibold">Schedule Recommendations</h2>
      {#if patterns.length > 0}
        <span class="text-muted-foreground text-sm">
          ({patterns.length} pattern{patterns.length !== 1 ? 's' : ''} found)
        </span>
      {/if}
    </div>
    <Button size="sm" onclick={handleDetect} disabled={isDetecting}>
      {#if isDetecting}
        <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
        Detecting...
      {:else}
        <RefreshCw class="mr-2 h-4 w-4" />
        Detect Patterns
      {/if}
    </Button>
  </div>

  <!-- Content -->
  {#if isLoading}
    <div class="flex items-center justify-center py-12">
      <div class="text-muted-foreground text-sm">Loading patterns...</div>
    </div>
  {:else if patterns.length === 0}
    <!-- Empty State -->
    <Card.Root class="border-dashed">
      <Card.Content class="flex flex-col items-center justify-center py-12">
        <div class="bg-muted mb-4 rounded-full p-3">
          <Calendar class="text-muted-foreground h-6 w-6" />
        </div>
        <h3 class="mb-2 font-semibold">No patterns detected</h3>
        <p class="text-muted-foreground mb-4 max-w-md text-center text-sm">
          Click "Detect Patterns" to analyze your transactions and find recurring expenses
          that could be turned into scheduled transactions.
        </p>
        <Button variant="outline" onclick={handleDetect} disabled={isDetecting}>
          {#if isDetecting}
            <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          {:else}
            <Sparkles class="mr-2 h-4 w-4" />
            Analyze Transactions
          {/if}
        </Button>
      </Card.Content>
    </Card.Root>
  {:else}
    <!-- Pattern Cards -->
    <div class="space-y-3">
      {#each patterns as pattern (pattern.id)}
        {@const isProcessing = processingPatternId === pattern.id}
        <Card.Root class={isProcessing ? 'opacity-50' : ''}>
          <Card.Content class="p-4">
            <div class="flex items-start justify-between gap-4">
              <!-- Pattern Info -->
              <div class="min-w-0 flex-1 space-y-2">
                <div class="flex items-center gap-2">
                  <span class="truncate font-medium">
                    {getPatternName(pattern)}
                  </span>
                  <Badge variant={getConfidenceBadgeVariant(pattern.confidenceScore)}>
                    {getConfidenceLabel(pattern.confidenceScore)}
                  </Badge>
                </div>

                <div class="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span class="flex items-center gap-1">
                    <Clock class="h-3.5 w-3.5" />
                    {getFrequencyLabel(pattern)}
                  </span>

                  {#if pattern.amountAvg}
                    <span class="flex items-center gap-1">
                      <DollarSign class="h-3.5 w-3.5" />
                      {formatCurrency(pattern.amountAvg)}
                      {#if pattern.amountMin !== pattern.amountMax}
                        <span class="text-muted-foreground/60">
                          ({formatCurrency(pattern.amountMin ?? 0)} - {formatCurrency(pattern.amountMax ?? 0)})
                        </span>
                      {/if}
                    </span>
                  {/if}

                  {#if pattern.category?.name}
                    <span class="flex items-center gap-1">
                      <Tag class="h-3.5 w-3.5" />
                      {pattern.category.name}
                    </span>
                  {/if}

                  {#if pattern.sampleTransactionIds?.length}
                    <span class="text-muted-foreground/60">
                      Based on {pattern.sampleTransactionIds.length} transactions
                    </span>
                  {/if}
                </div>

                {#if pattern.nextExpected}
                  <div class="text-muted-foreground text-sm">
                    Next expected: {new Date(pattern.nextExpected).toLocaleDateString()}
                  </div>
                {/if}
              </div>

              <!-- Actions -->
              <div class="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onclick={() => handleDismiss(pattern.id)}
                  disabled={isProcessing}
                >
                  {#if isProcessing && dismissMutation.isPending}
                    <LoaderCircle class="h-4 w-4 animate-spin" />
                  {:else}
                    <X class="h-4 w-4" />
                  {/if}
                  <span class="sr-only">Dismiss</span>
                </Button>
                <Button
                  size="sm"
                  onclick={() => handleConvert(pattern.id)}
                  disabled={isProcessing}
                >
                  {#if isProcessing && convertMutation.isPending}
                    <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
                  {:else}
                    <Check class="mr-2 h-4 w-4" />
                  {/if}
                  Create Schedule
                </Button>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  {/if}
</div>
