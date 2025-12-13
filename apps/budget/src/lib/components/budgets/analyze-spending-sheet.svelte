<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { Label } from '$lib/components/ui/label';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import * as Select from '$lib/components/ui/select';
import { generateRecommendations } from '$lib/query/budgets';
import { LoaderCircle, Sparkles, TrendingUp } from '@lucide/svelte/icons';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

let { open = $bindable(false), onOpenChange }: Props = $props();

// Analysis parameters
let selectedAccountIds = $state<number[]>([]);
let months = $state<string>('6');
let minTransactions = $state<string>('3');
let minConfidence = $state<string>('40');

const mutation = generateRecommendations.options();
const isAnalyzing = $derived(mutation.isPending);

function handleAnalyze() {
  mutation.mutate(
    {
      ...(selectedAccountIds.length > 0 && { accountIds: selectedAccountIds }),
      months: parseInt(months),
      minTransactions: parseInt(minTransactions),
      minConfidence: parseInt(minConfidence),
    },
    {
      onSuccess: (recommendations) => {
        if (recommendations.length > 0) {
          onOpenChange(false);
        }
      },
    }
  );
}
</script>

<ResponsiveSheet bind:open {onOpenChange} side="right" resizable={false}>
  {#snippet header()}
    <div>
      <h2 class="flex items-center gap-2 text-lg font-semibold">
        <Sparkles class="text-primary h-5 w-5" />
        Analyze Spending & Get Recommendations
      </h2>
      <p class="text-muted-foreground mt-1 text-sm">
        Analyze your transaction history to discover smart budget recommendations based on your
        spending patterns.
      </p>
    </div>
  {/snippet}

  {#snippet content()}
    <div class="space-y-6">
      <!-- Account Selection - Skip for now, multi-select is complex -->
      <div class="space-y-2">
        <Label>Accounts</Label>
        <p class="text-muted-foreground text-sm">All accounts will be analyzed</p>
      </div>

      <!-- Time Range -->
      <div class="space-y-2">
        <Label for="months">Analysis Period</Label>
        <Select.Root type="single" bind:value={months}>
          <Select.Trigger id="months">
            <span>{months} months</span>
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="3">3 months</Select.Item>
            <Select.Item value="6">6 months</Select.Item>
            <Select.Item value="12">12 months</Select.Item>
            <Select.Item value="24">24 months</Select.Item>
          </Select.Content>
        </Select.Root>
        <p class="text-muted-foreground text-xs">
          Longer periods provide more accurate recommendations
        </p>
      </div>

      <!-- Minimum Transactions -->
      <div class="space-y-2">
        <Label for="min-transactions">Minimum Transactions</Label>
        <Select.Root type="single" bind:value={minTransactions}>
          <Select.Trigger id="min-transactions">
            <span>{minTransactions} transactions</span>
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="2">2 transactions</Select.Item>
            <Select.Item value="3">3 transactions</Select.Item>
            <Select.Item value="5">5 transactions</Select.Item>
            <Select.Item value="10">10 transactions</Select.Item>
          </Select.Content>
        </Select.Root>
        <p class="text-muted-foreground text-xs">
          Higher values reduce noise but may miss patterns
        </p>
      </div>

      <!-- Minimum Confidence -->
      <div class="space-y-2">
        <Label for="min-confidence">Minimum Confidence</Label>
        <Select.Root type="single" bind:value={minConfidence}>
          <Select.Trigger id="min-confidence">
            <span>{minConfidence}%</span>
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="20">20% (Show all)</Select.Item>
            <Select.Item value="40">40% (Recommended)</Select.Item>
            <Select.Item value="60">60% (High confidence)</Select.Item>
            <Select.Item value="80">80% (Very high confidence)</Select.Item>
          </Select.Content>
        </Select.Root>
        <p class="text-muted-foreground text-xs">
          Higher values show only the most reliable recommendations
        </p>
      </div>

      <!-- Info Box -->
      <div class="bg-muted rounded-lg p-4">
        <div class="flex items-start gap-3">
          <TrendingUp class="text-primary mt-0.5 h-5 w-5 shrink-0" />
          <div class="space-y-1 text-sm">
            <p class="font-medium">What to expect:</p>
            <ul class="text-muted-foreground list-inside list-disc space-y-1">
              <li>Budget creation suggestions for uncovered categories</li>
              <li>Amount adjustments for over/under-budgeted categories</li>
              <li>Pattern-based insights and optimizations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  {/snippet}

  {#snippet footer()}
    <div class="flex gap-2">
      <Button
        variant="outline"
        onclick={() => onOpenChange(false)}
        disabled={isAnalyzing}
        class="flex-1">
        Cancel
      </Button>
      <Button onclick={handleAnalyze} disabled={isAnalyzing} class="flex-1">
        {#if isAnalyzing}
          <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
          Analyzing...
        {:else}
          <Sparkles class="mr-2 h-4 w-4" />
          Analyze & Generate
        {/if}
      </Button>
    </div>
  {/snippet}
</ResponsiveSheet>
