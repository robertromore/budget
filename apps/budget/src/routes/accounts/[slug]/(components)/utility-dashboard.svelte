<script lang="ts">
import { rpc } from '$lib/query';
import * as Card from '$lib/components/ui/card';
import { formatCurrency, formatPercentRaw } from '$lib/utils/formatters';
import { USAGE_UNIT_LABELS } from '$lib/schema/utility-usage';
import type { Account } from '$lib/schema';
import Zap from '@lucide/svelte/icons/zap';
import Droplets from '@lucide/svelte/icons/droplets';
import Flame from '@lucide/svelte/icons/flame';
import Wifi from '@lucide/svelte/icons/wifi';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import Activity from '@lucide/svelte/icons/activity';
import Calendar from '@lucide/svelte/icons/calendar';
import UsageTrendsChart from './(charts)/usage-trends-chart.svelte';
import CostTrendsChart from './(charts)/cost-trends-chart.svelte';

interface Props {
  account: Account;
}

let { account }: Props = $props();

const accountId = $derived(account.id);

// Query data
const analyticsQuery = rpc.utility.getUsageAnalytics(accountId).options();
const analytics = $derived(analyticsQuery.data);

const usageRecordsQuery = rpc.utility.getUsageRecords(accountId).options();
const usageRecords = $derived(usageRecordsQuery.data ?? []);

// Get the most recent usage record
const latestRecord = $derived(usageRecords[0] ?? null);

// Get utility subtype icon
const utilityIcon = $derived.by(() => {
  switch (account.utilitySubtype) {
    case 'electric':
      return Zap;
    case 'water':
      return Droplets;
    case 'gas':
      return Flame;
    case 'internet':
      return Wifi;
    default:
      return Activity;
  }
});

// Format usage amount with unit
function formatUsage(amount: number | null | undefined, unit: string | null | undefined): string {
  if (amount == null) return 'N/A';
  const unitInfo = unit ? USAGE_UNIT_LABELS[unit as keyof typeof USAGE_UNIT_LABELS] : null;
  const unitLabel = unitInfo?.shortLabel || unit || '';
  return `${amount.toLocaleString()} ${unitLabel}`;
}

// Calculate usage change percentage
const usageChange = $derived.by(() => {
  if (!analytics?.averageDailyUsage || usageRecords.length < 2) return null;
  const latest = usageRecords[0]?.usageAmount;
  const previous = usageRecords[1]?.usageAmount;
  if (!latest || !previous) return null;
  return ((latest - previous) / previous) * 100;
});

// Get trend direction
const trendDirection = $derived.by(() => {
  if (usageChange == null) return 'neutral';
  return usageChange > 0 ? 'up' : usageChange < 0 ? 'down' : 'neutral';
});
</script>

<div class="space-y-6">
  <!-- Stats Cards -->
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
    <!-- Current Period Usage -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Current Usage</Card.Title>
        <svelte:component this={utilityIcon} class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">
          {formatUsage(latestRecord?.usageAmount, latestRecord?.usageUnit)}
        </div>
        <div class="text-muted-foreground flex items-center text-xs">
          {#if trendDirection === 'up'}
            <TrendingUp class="text-destructive mr-1 h-3 w-3" />
            <span class="text-destructive">{formatPercentRaw(usageChange ?? 0, 1)} vs last period</span>
          {:else if trendDirection === 'down'}
            <TrendingDown class="mr-1 h-3 w-3 text-green-500" />
            <span class="text-green-500">{formatPercentRaw(Math.abs(usageChange ?? 0), 1)} vs last period</span>
          {:else}
            <span>No previous data</span>
          {/if}
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Cost Per Unit -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Cost Per Unit</Card.Title>
        <DollarSign class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">
          {formatCurrency(latestRecord?.ratePerUnit ?? 0)}
        </div>
        <p class="text-muted-foreground text-xs">
          per {latestRecord?.usageUnit ? USAGE_UNIT_LABELS[latestRecord.usageUnit as keyof typeof USAGE_UNIT_LABELS]?.shortLabel : 'unit'}
        </p>
      </Card.Content>
    </Card.Root>

    <!-- Average Daily Usage -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Daily Average</Card.Title>
        <Activity class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">
          {analytics?.averageDailyUsage?.toFixed(2) ?? 'N/A'}
        </div>
        <p class="text-muted-foreground text-xs">
          per day (12-month avg)
        </p>
      </Card.Content>
    </Card.Root>

    <!-- Total YTD -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">YTD Total</Card.Title>
        <Calendar class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">
          {formatCurrency(analytics?.totalCost ?? 0)}
        </div>
        <p class="text-muted-foreground text-xs">
          {analytics?.totalUsage?.toLocaleString() ?? 0} {latestRecord?.usageUnit ? USAGE_UNIT_LABELS[latestRecord.usageUnit as keyof typeof USAGE_UNIT_LABELS]?.shortLabel : 'units'} used
        </p>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Charts -->
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <UsageTrendsChart {accountId} />
    <CostTrendsChart {accountId} />
  </div>

  <!-- Provider Info -->
  {#if account.utilityProvider}
    <Card.Root>
      <Card.Header>
        <Card.Title>Account Information</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p class="text-muted-foreground text-sm">Provider</p>
            <p class="font-medium">{account.utilityProvider}</p>
          </div>
          {#if account.utilityAccountNumber}
            <div>
              <p class="text-muted-foreground text-sm">Account Number</p>
              <p class="font-medium">{account.utilityAccountNumber}</p>
            </div>
          {/if}
          {#if account.utilityServiceAddress}
            <div class="sm:col-span-2">
              <p class="text-muted-foreground text-sm">Service Address</p>
              <p class="font-medium">{account.utilityServiceAddress}</p>
            </div>
          {/if}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Recent Bills -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Recent Bills</Card.Title>
      <Card.Description>
        Your last {Math.min(usageRecords.length, 6)} billing periods
      </Card.Description>
    </Card.Header>
    <Card.Content>
      {#if usageRecords.length === 0}
        <div class="text-muted-foreground py-8 text-center">
          <svelte:component this={utilityIcon} class="mx-auto mb-2 h-8 w-8" />
          <p>No usage records yet</p>
          <p class="text-sm">Import your utility statements to start tracking usage</p>
        </div>
      {:else}
        <div class="space-y-4">
          {#each usageRecords.slice(0, 6) as record}
            <div class="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0">
              <div class="flex-1">
                <p class="font-medium">
                  {new Date(record.periodStart).toLocaleDateString()} - {new Date(record.periodEnd).toLocaleDateString()}
                </p>
                <p class="text-muted-foreground text-sm">
                  {formatUsage(record.usageAmount, record.usageUnit)}
                </p>
              </div>
              <div class="text-right">
                <p class="font-semibold">{formatCurrency(record.totalAmount ?? 0)}</p>
                {#if record.ratePerUnit}
                  <p class="text-muted-foreground text-xs">
                    {formatCurrency(record.ratePerUnit)}/{record.usageUnit ? USAGE_UNIT_LABELS[record.usageUnit as keyof typeof USAGE_UNIT_LABELS]?.shortLabel : 'unit'}
                  </p>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
