<script lang="ts">
import { goto } from '$app/navigation';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Empty from '$lib/components/ui/empty';
import { Badge } from '$lib/components/ui/badge';
import { Progress } from '$lib/components/ui/progress';
import { Skeleton } from '$lib/components/ui/skeleton';
import * as Tooltip from '$lib/components/ui/tooltip';
import { rpc } from '$lib/query';
import type { Payee } from '$lib/schema';
import { PayeesState } from '$lib/states/entities/payees.svelte';
import { currencyFormatter } from '$lib/utils/formatters';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
import ArrowRight from '@lucide/svelte/icons/arrow-right';
import Calendar from '@lucide/svelte/icons/calendar';
import CreditCard from '@lucide/svelte/icons/credit-card';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import Lightbulb from '@lucide/svelte/icons/lightbulb';
import PiggyBank from '@lucide/svelte/icons/piggy-bank';
import RefreshCw from '@lucide/svelte/icons/refresh-cw';
import Search from '@lucide/svelte/icons/search';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import TrendingUp from '@lucide/svelte/icons/trending-up';

// Type for subscription detection result
interface SubscriptionDetection {
  payeeId: number;
  detectionConfidence: number;
  subscriptionType: string;
  suggestedMetadata?: {
    baseCost?: number;
    billingCycle?: string;
  };
  detectionMethods?: Array<{ method: string; confidence: number; evidence: string[] }>;
  riskFactors?: Array<{ type: string; severity: string; description: string }>;
}

// Extended subscription with payee data
interface EnrichedSubscription extends SubscriptionDetection {
  payee?: Payee;
  payeeName: string;
  payeeSlug: string;
}

// Get payees state
const payeesState = $derived(PayeesState.get());
const allPayees = $derived(Array.from(payeesState.payees.values()));

// Detect subscriptions for all payees
const detectionQuery = rpc.payees.detectSubscriptions(undefined, false, 0.3).options();
const detectedSubscriptions = $derived(detectionQuery.data ?? []);
const isLoadingDetection = $derived(detectionQuery.isLoading);

// Get bulk analysis
const analysisQuery = rpc.payees.getSubscriptionAnalysis(undefined, {
  includeCostBreakdown: true,
  includeUsageMetrics: true,
  includeOptimizationSuggestions: true,
  timeframeDays: 365
}).options();
const subscriptionAnalysis = $derived(analysisQuery.data);
const isLoadingAnalysis = $derived(analysisQuery.isLoading);

// Merge detected subscriptions with payee data
const enrichedSubscriptions = $derived.by((): EnrichedSubscription[] => {
  const subs = detectedSubscriptions as SubscriptionDetection[];
  return subs.map(sub => {
    const payee = allPayees.find(p => p.id === sub.payeeId);
    return {
      ...sub,
      payee,
      payeeName: payee?.name ?? 'Unknown',
      payeeSlug: payee?.slug ?? '',
    };
  }).filter(sub => sub.detectionConfidence >= 0.5);
});

// Sort by confidence
const sortedSubscriptions = $derived<EnrichedSubscription[]>(
  [...enrichedSubscriptions].sort((a, b) => b.detectionConfidence - a.detectionConfidence)
);

// Summary stats
const totalSubscriptions = $derived(sortedSubscriptions.length);
const totalMonthlyCost = $derived(
  subscriptionAnalysis?.totalMonthlyCost ??
  sortedSubscriptions.reduce((sum, sub) => {
    const cost = sub.suggestedMetadata?.baseCost ?? 0;
    const cycle = sub.suggestedMetadata?.billingCycle ?? 'monthly';
    // Normalize to monthly
    switch (cycle) {
      case 'annual': return sum + cost / 12;
      case 'quarterly': return sum + cost / 3;
      case 'semi_annual': return sum + cost / 6;
      case 'weekly': return sum + cost * 4.33;
      case 'daily': return sum + cost * 30;
      default: return sum + cost;
    }
  }, 0)
);
const totalAnnualCost = $derived(totalMonthlyCost * 12);
const potentialSavings = $derived(subscriptionAnalysis?.savingsOpportunities?.totalPotentialSavings ?? 0);

// Subscription type colors and labels
const subscriptionTypeConfig: Record<string, { color: string; label: string }> = {
  entertainment: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', label: 'Entertainment' },
  utilities: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', label: 'Utilities' },
  software: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', label: 'Software' },
  membership: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', label: 'Membership' },
  communication: { color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300', label: 'Communication' },
  finance: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', label: 'Finance' },
  shopping: { color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300', label: 'Shopping' },
  health: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', label: 'Health' },
  education: { color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300', label: 'Education' },
  other: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300', label: 'Other' },
};

// Billing cycle labels
const billingCycleLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
  irregular: 'Irregular',
};

const viewPayeeDetails = (slug: string) => {
  goto(`/payees/${slug}`);
};

const refreshData = () => {
  detectionQuery.refetch();
  analysisQuery.refetch();
};
</script>

<svelte:head>
  <title>Subscriptions - Budget App</title>
  <meta name="description" content="Track and manage your recurring subscriptions" />
</svelte:head>

<div class="container mx-auto space-y-6 py-6">
  <!-- Page Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="flex items-center gap-3 text-2xl font-bold tracking-tight">
        <RefreshCw class="text-muted-foreground h-6 w-6" />
        Subscriptions
      </h1>
      <p class="text-muted-foreground mt-1">
        Track and manage your recurring subscriptions and services
      </p>
    </div>
    <div class="flex items-center gap-2">
      <Button variant="outline" onclick={refreshData} disabled={isLoadingDetection || isLoadingAnalysis}>
        <RefreshCw class="mr-2 h-4 w-4 {isLoadingDetection || isLoadingAnalysis ? 'animate-spin' : ''}" />
        Refresh
      </Button>
    </div>
  </div>

  <!-- Summary Cards -->
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <!-- Total Subscriptions -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Total Subscriptions</Card.Title>
        <CreditCard class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        {#if isLoadingDetection}
          <Skeleton class="h-8 w-16" />
        {:else}
          <div class="text-2xl font-bold">{totalSubscriptions}</div>
          <p class="text-muted-foreground text-xs">
            Detected recurring payments
          </p>
        {/if}
      </Card.Content>
    </Card.Root>

    <!-- Monthly Cost -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Monthly Cost</Card.Title>
        <DollarSign class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        {#if isLoadingDetection}
          <Skeleton class="h-8 w-24" />
        {:else}
          <div class="text-2xl font-bold">{currencyFormatter.format(totalMonthlyCost)}</div>
          <p class="text-muted-foreground text-xs">
            Estimated monthly spend
          </p>
        {/if}
      </Card.Content>
    </Card.Root>

    <!-- Annual Cost -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Annual Cost</Card.Title>
        <Calendar class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        {#if isLoadingDetection}
          <Skeleton class="h-8 w-28" />
        {:else}
          <div class="text-2xl font-bold">{currencyFormatter.format(totalAnnualCost)}</div>
          <p class="text-muted-foreground text-xs">
            Projected yearly spend
          </p>
        {/if}
      </Card.Content>
    </Card.Root>

    <!-- Savings Opportunities -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Potential Savings</Card.Title>
        <PiggyBank class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        {#if isLoadingAnalysis}
          <Skeleton class="h-8 w-20" />
        {:else}
          <div class="text-2xl font-bold text-green-600 dark:text-green-400">
            {currencyFormatter.format(potentialSavings)}
          </div>
          <p class="text-muted-foreground text-xs">
            Identified savings opportunities
          </p>
        {/if}
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Subscriptions List -->
  {#if isLoadingDetection}
    <Card.Root>
      <Card.Header>
        <Card.Title>Detecting Subscriptions...</Card.Title>
        <Card.Description>
          Analyzing your transaction patterns to identify recurring payments
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="space-y-4">
          {#each Array(3) as _}
            <div class="flex items-center justify-between rounded-lg border p-4">
              <div class="flex items-center gap-4">
                <Skeleton class="h-10 w-10 rounded-lg" />
                <div class="space-y-2">
                  <Skeleton class="h-4 w-32" />
                  <Skeleton class="h-3 w-24" />
                </div>
              </div>
              <Skeleton class="h-6 w-20" />
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {:else if sortedSubscriptions.length === 0}
    <Empty.Empty>
      <Empty.EmptyMedia variant="icon">
        <Search class="size-6" />
      </Empty.EmptyMedia>
      <Empty.EmptyHeader>
        <Empty.EmptyTitle>No Subscriptions Detected</Empty.EmptyTitle>
        <Empty.EmptyDescription>
          We couldn't detect any recurring subscription payments. As you add more transactions, we'll automatically identify subscription patterns.
        </Empty.EmptyDescription>
      </Empty.EmptyHeader>
      <Empty.EmptyContent>
        <Button href="/import">
          Import Transactions
        </Button>
      </Empty.EmptyContent>
    </Empty.Empty>
  {:else}
    <Card.Root>
      <Card.Header>
        <Card.Title>Detected Subscriptions</Card.Title>
        <Card.Description>
          Based on your transaction patterns, we've identified {sortedSubscriptions.length} recurring subscription{sortedSubscriptions.length !== 1 ? 's' : ''}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="space-y-3">
          {#each sortedSubscriptions as subscription}
            {@const typeConfig = subscriptionTypeConfig[subscription.subscriptionType] ?? subscriptionTypeConfig.other}
            {@const billingCycle = subscription.suggestedMetadata?.billingCycle ?? 'monthly'}
            {@const billingLabel = billingCycleLabels[billingCycle] ?? 'Monthly'}
            {@const cost = subscription.suggestedMetadata?.baseCost ?? 0}
            {@const confidence = Math.round(subscription.detectionConfidence * 100)}

            <button
              type="button"
              class="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors"
              onclick={() => viewPayeeDetails(subscription.payeeSlug)}
            >
              <div class="flex items-center gap-4">
                <!-- Type Badge Icon -->
                <div class="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                  <RefreshCw class="text-muted-foreground h-5 w-5" />
                </div>

                <!-- Subscription Info -->
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{subscription.payeeName}</span>
                    <Badge variant="outline" class={typeConfig.color}>
                      {typeConfig.label}
                    </Badge>
                  </div>
                  <div class="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                    <span>{billingLabel}</span>
                    <span class="text-muted-foreground/50">•</span>
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <span class="flex items-center gap-1">
                          {confidence}% confidence
                          {#if confidence < 70}
                            <AlertTriangle class="h-3 w-3 text-amber-500" />
                          {/if}
                        </span>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        <p>Detection confidence based on transaction patterns</p>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </div>
                </div>
              </div>

              <!-- Cost & Actions -->
              <div class="flex items-center gap-4">
                <div class="text-right">
                  <div class="font-semibold">{currencyFormatter.format(cost)}</div>
                  <div class="text-muted-foreground text-xs">per {subscription.suggestedMetadata?.billingCycle ?? 'month'}</div>
                </div>
                <ArrowRight class="text-muted-foreground h-4 w-4" />
              </div>
            </button>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Optimization Suggestions -->
    {#if subscriptionAnalysis?.savingsOpportunities?.recommendations?.length}
      {@const recommendations = subscriptionAnalysis.savingsOpportunities.recommendations}
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Lightbulb class="h-5 w-5 text-amber-500" />
            Savings Opportunities
          </Card.Title>
          <Card.Description>
            Ways to optimize your subscription spending
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="space-y-3">
            {#each recommendations as rec}
              <div class="flex items-start justify-between rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
                <div class="flex items-start gap-3">
                  <TrendingDown class="mt-0.5 h-5 w-5 text-green-600" />
                  <div>
                    <p class="font-medium text-green-900 dark:text-green-100">{rec.description}</p>
                    <p class="text-muted-foreground mt-1 text-sm">
                      Affects {rec.affectedSubscriptions} subscription{rec.affectedSubscriptions !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" class="border-green-600 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                  Save {currencyFormatter.format(rec.savings)}/yr
                </Badge>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Underutilized Subscriptions -->
    {#if subscriptionAnalysis?.underutilizedSubscriptions?.length}
      {@const underutilizedSubscriptions = subscriptionAnalysis.underutilizedSubscriptions}
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <AlertTriangle class="h-5 w-5 text-amber-500" />
            Underutilized Subscriptions
          </Card.Title>
          <Card.Description>
            Subscriptions that may not be providing good value
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="space-y-3">
            {#each underutilizedSubscriptions as sub}
              {@const utilizationPercent = Math.round((sub.utilizationScore ?? 0) * 100)}
              <div class="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                <div class="flex items-center gap-4">
                  <div>
                    <p class="font-medium">{sub.name}</p>
                    <p class="text-muted-foreground text-sm">{sub.recommendation}</p>
                  </div>
                </div>
                <div class="flex items-center gap-4">
                  <div class="w-24">
                    <div class="mb-1 flex justify-between text-xs">
                      <span>Usage</span>
                      <span>{utilizationPercent}%</span>
                    </div>
                    <Progress value={utilizationPercent} class="h-2" />
                  </div>
                  <Badge variant="outline" class="border-amber-600 text-amber-700 dark:text-amber-300">
                    {currencyFormatter.format(sub.cost)}/mo
                  </Badge>
                </div>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Categories Breakdown -->
    {#if subscriptionAnalysis?.subscriptionsByCategory}
      <Card.Root>
        <Card.Header>
          <Card.Title>Subscriptions by Category</Card.Title>
          <Card.Description>
            Breakdown of your subscriptions by type
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {#each Object.entries(subscriptionAnalysis.subscriptionsByCategory) as [category, count]}
              {@const typeConfig = subscriptionTypeConfig[category] ?? subscriptionTypeConfig.other}
              <div class="flex items-center justify-between rounded-lg border p-3">
                <div class="flex items-center gap-2">
                  <Badge variant="outline" class={typeConfig.color}>
                    {typeConfig.label}
                  </Badge>
                </div>
                <span class="text-muted-foreground text-sm">{count} subscription{count !== 1 ? 's' : ''}</span>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}
  {/if}
</div>
