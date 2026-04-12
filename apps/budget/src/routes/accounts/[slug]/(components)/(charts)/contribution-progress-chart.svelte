<script lang="ts">
import { AnalyticsChartShell } from '$lib/components/charts';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import type { Account } from '$core/schema/accounts';
import { INVESTMENT_SUBTYPE_LABELS } from '$core/schema/accounts';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Settings from '@lucide/svelte/icons/settings';

interface Props {
  account?: Account;
}

let { account }: Props = $props();

// account.id is stable for this component's lifetime (keyed by account in the parent).
// svelte-ignore state_referenced_locally
const summaryQuery = $derived(
  account ? rpc.accounts.getContributionSummary(account.id).options() : null
);

const summary = $derived(summaryQuery?.data ?? null);
const isLoading = $derived(summaryQuery?.isLoading ?? true);

const hasLimit = $derived(summary !== null && summary.limit !== null && summary.limit > 0);
const percentUsed = $derived(hasLimit && summary ? (summary.percentUsed ?? 0) : 0);

function progressColor(pct: number): string {
  if (pct >= 100) return 'var(--chart-1)'; // fully funded
  if (pct >= 75) return 'var(--chart-3)';  // getting close
  return 'var(--chart-2)';                  // plenty of room
}

const subtypeLabel = $derived(
  account?.investmentSubtype ? (INVESTMENT_SUBTYPE_LABELS[account.investmentSubtype] ?? account.investmentSubtype) : null
);

const settingsHref = $derived(account ? `/accounts/${account.slug}/settings` : '#');

// Chart data for AnalyticsChartShell — a single-row progress dataset
const chartData = $derived(summary ? [{ label: 'Contributions', value: summary.contributed }] : []);
</script>

<AnalyticsChartShell
  data={chartData}
  supportedChartTypes={['bar']}
  defaultChartType="bar"
  emptyMessage={isLoading ? 'Loading contribution data…' : 'No contribution data available'}
  chartId="contribution-progress">
  {#snippet title()}
    {summary?.year ?? new Date().getFullYear()} Contributions
  {/snippet}

  {#snippet subtitle()}
    Year-to-date contributions{subtypeLabel ? ` · ${subtypeLabel}` : ''}
  {/snippet}

  {#snippet chart()}
    <div class="flex h-full w-full items-center justify-center px-4">
      {#if isLoading}
        <div class="w-full max-w-lg space-y-3">
          <div class="bg-muted h-4 animate-pulse rounded-full"></div>
          <div class="bg-muted h-4 w-3/4 animate-pulse rounded-full"></div>
        </div>
      {:else if !summary}
        <div class="text-muted-foreground flex flex-col items-center gap-3 text-center">
          <TrendingUp class="h-10 w-10 opacity-30" />
          <p class="text-sm">No contribution data available for this account.</p>
        </div>
      {:else if !hasLimit}
        <!-- No limit set — show contributions with prompt to set one -->
        <div class="w-full max-w-lg space-y-6">
          <div class="rounded-lg border p-6 text-center">
            <p class="text-muted-foreground text-sm">
              No annual contribution limit set for this account.
            </p>
            <p class="mt-3 text-3xl font-bold">
              {currencyFormatter.format(summary.contributed)}
            </p>
            <p class="text-muted-foreground mt-1 text-sm">contributed in {summary.year}</p>
            <a
              href={settingsHref}
              class="text-primary mt-4 inline-flex items-center gap-1 text-xs hover:underline">
              <Settings class="h-3 w-3" />
              Set a contribution limit in Financial Settings
            </a>
          </div>
        </div>
      {:else}
        <!-- Limit set — show progress bar -->
        <div class="w-full max-w-lg space-y-6">
          <div class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium">
                {currencyFormatter.format(summary.contributed)}
                <span class="text-muted-foreground font-normal">contributed</span>
              </span>
              <span class="text-muted-foreground">
                of {currencyFormatter.format(summary.limit!)} limit
              </span>
            </div>
            <div class="bg-muted h-4 w-full overflow-hidden rounded-full">
              <div
                class="h-full rounded-full transition-all duration-500"
                style="width: {Math.min(percentUsed, 100)}%; background: {progressColor(percentUsed)};"></div>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold" style="color: {progressColor(percentUsed)};">
                {percentUsed.toFixed(1)}% funded
              </span>
              {#if summary.remaining !== null && summary.remaining > 0}
                <span class="text-muted-foreground">
                  {currencyFormatter.format(summary.remaining)} remaining
                </span>
              {:else if percentUsed >= 100}
                <span class="font-medium text-green-600 dark:text-green-400">Limit reached!</span>
              {/if}
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/snippet}

  {#snippet belowChart()}
    {#if summary}
      <div class="mt-4 grid shrink-0 grid-cols-3 gap-4 border-t pt-4 text-center text-sm">
        <div>
          <p class="text-muted-foreground text-xs">Contributed</p>
          <p class="font-semibold">{currencyFormatter.format(summary.contributed)}</p>
        </div>
        <div>
          <p class="text-muted-foreground text-xs">Annual Limit</p>
          <p class="font-semibold">
            {summary.limit !== null ? currencyFormatter.format(summary.limit) : '—'}
          </p>
        </div>
        <div>
          <p class="text-muted-foreground text-xs">Remaining</p>
          <p class="font-semibold">
            {summary.remaining !== null
              ? summary.remaining > 0
                ? currencyFormatter.format(summary.remaining)
                : 'None'
              : '—'}
          </p>
        </div>
      </div>
      <p class="text-muted-foreground mt-3 shrink-0 text-center text-xs">
        Based on inbound transactions in {summary.year} · Excludes transfers
      </p>
    {/if}
  {/snippet}
</AnalyticsChartShell>
