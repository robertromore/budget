<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Progress } from '$lib/components/ui/progress';
import * as Select from '$lib/components/ui/select';
import * as Tabs from '$lib/components/ui/tabs';

import { trpc } from '$lib/trpc/client';
import { formatDateDisplay } from '$lib/utils/dates';
import { currencyFormatter, formatPercentRaw } from '$lib/utils/formatters';
// Icons
import Activity from '@lucide/svelte/icons/activity';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import Brain from '@lucide/svelte/icons/brain';
import Calendar from '@lucide/svelte/icons/calendar';
import CircleAlert from '@lucide/svelte/icons/circle-alert';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import LoaderCircle from '@lucide/svelte/icons/loader-circle';
import RefreshCw from '@lucide/svelte/icons/refresh-cw';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Target from '@lucide/svelte/icons/target';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Users from '@lucide/svelte/icons/users';

let {
  payeeId,
  showOverallAnalytics = false,
  timeframe = '12',
}: {
  payeeId?: number;
  showOverallAnalytics?: boolean;
  timeframe?: string;
} = $props();

// Local state
let activeTab = $state('overview');
let selectedTimeframe = $state(timeframe);
let isLoading = $state(false);
let analytics = $state<any>(null);
let mlInsights = $state<any>(null);
let recommendations = $state<any>(null);
let performanceMetrics = $state<any>(null);

// Timeframe options
const timeframeOptions = [
  { value: '3', label: 'Last 3 months' },
  { value: '6', label: 'Last 6 months' },
  { value: '12', label: 'Last 12 months' },
  { value: '24', label: 'Last 24 months' },
  { value: 'all', label: 'All time' },
];

// Load analytics data
async function loadAnalytics() {
  isLoading = true;
  try {
    if (showOverallAnalytics) {
      // Load overall payee analytics
      const [overallAnalytics, mlDashboard, learningMetrics] = await Promise.all([
        trpc().payeeRoutes.analytics.query(),
        trpc().payeeRoutes.mlInsightsDashboard.query({ filters: {} }),
        trpc().payeeRoutes.getLearningMetrics.query({
          timeframeMonths: selectedTimeframe === 'all' ? undefined : parseInt(selectedTimeframe),
        }),
      ]);

      analytics = overallAnalytics;
      mlInsights = mlDashboard;
      performanceMetrics = learningMetrics;
    } else if (payeeId) {
      // Load individual payee analytics
      const [payeeAnalytics, intelligence, suggestions, stats] = await Promise.all([
        trpc().payeeRoutes.getContactAnalytics.query({ payeeId }),
        trpc().payeeRoutes.intelligence.query({ id: payeeId }),
        trpc().payeeRoutes.suggestions.query({ id: payeeId }),
        trpc().payeeRoutes.stats.query({ id: payeeId }),
      ]);

      analytics = { payeeAnalytics, intelligence, suggestions, stats };
    }
  } catch (error) {
    console.error('Failed to load analytics:', error);
  } finally {
    isLoading = false;
  }
}

// Load ML insights
async function loadMLInsights() {
  if (!payeeId) return;

  try {
    const [unifiedRecommendations, crossSystemLearning, behaviorChanges] = await Promise.all([
      trpc().payeeRoutes.unifiedMLRecommendations.query({
        payeeId,
        context: {
          riskTolerance: 0.5,
        },
      }),
      trpc().payeeRoutes.crossSystemLearning.query({ id: payeeId }),
      trpc().payeeRoutes.detectBehaviorChanges.query({
        payeeId,
        lookbackMonths: parseInt(selectedTimeframe) || 6,
      }),
    ]);

    mlInsights = {
      unifiedRecommendations,
      crossSystemLearning,
      behaviorChanges,
    };
  } catch (error) {
    console.error('Failed to load ML insights:', error);
  }
}

// Load recommendations
async function loadRecommendations() {
  if (!payeeId) return;

  try {
    const [budgetOptimization, actionableInsights, categoryRecommendation] = await Promise.all([
      trpc().payeeRoutes.budgetOptimizationAnalysis.query({ id: payeeId }),
      trpc().payeeRoutes.actionableInsights.query({
        payeeId,
        insightTypes: ['optimization', 'prediction', 'automation'],
      }),
      trpc().payeeRoutes.getCategoryRecommendation.query({
        payeeId,
      }),
    ]);

    recommendations = {
      budgetOptimization,
      actionableInsights,
      categoryRecommendation,
    };
  } catch (error) {
    console.error('Failed to load recommendations:', error);
  }
}

// Handle timeframe change
function handleTimeframeChange(newTimeframe: string) {
  selectedTimeframe = newTimeframe;
  loadAnalytics();
  if (payeeId) {
    loadMLInsights();
    loadRecommendations();
  }
}

// Initial load
$effect(() => {
  loadAnalytics();
  if (payeeId) {
    loadMLInsights();
    loadRecommendations();
  }
});

// Chart configurations
const chartConfig = {
  spending: {
    label: 'Spending',
    color: 'hsl(var(--chart-1))',
  },
  income: {
    label: 'Income',
    color: 'hsl(var(--chart-2))',
  },
  transactions: {
    label: 'Transactions',
    color: 'hsl(var(--chart-3))',
  },
};
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-2xl font-bold tracking-tight">
        {showOverallAnalytics ? 'Payee Analytics Dashboard' : 'Payee Performance Analytics'}
      </h2>
      <p class="text-muted-foreground">
        {showOverallAnalytics
          ? 'Comprehensive insights across all payees with ML-powered recommendations'
          : 'Detailed performance metrics and ML insights for this payee'}
      </p>
    </div>

    <div class="flex items-center gap-2">
      <!-- Timeframe Selector -->
      <Select.Root type="single" bind:value={selectedTimeframe}>
        <Select.Trigger class="w-40">
          <span>{timeframeOptions.find((opt) => opt.value === selectedTimeframe)?.label}</span>
        </Select.Trigger>
        <Select.Content>
          {#each timeframeOptions as option}
            <Select.Item value={option.value}>{option.label}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>

      <Button variant="outline" size="sm" onclick={loadAnalytics} disabled={isLoading}>
        {#if isLoading}
          <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
        {:else}
          <RefreshCw class="mr-2 h-4 w-4" />
        {/if}
        Refresh
      </Button>
    </div>
  </div>

  {#if isLoading}
    <div class="flex items-center justify-center py-12">
      <LoaderCircle class="h-8 w-8 animate-spin" />
    </div>
  {:else}
    <Tabs.Root value={activeTab} onValueChange={(tab) => (activeTab = tab)} class="w-full">
      <Tabs.List class="grid w-full grid-cols-4">
        <Tabs.Trigger value="overview" class="flex items-center gap-2">
          <BarChart3 class="h-4 w-4" />
          Overview
        </Tabs.Trigger>
        <Tabs.Trigger value="ml-insights" class="flex items-center gap-2">
          <Brain class="h-4 w-4" />
          ML Insights
        </Tabs.Trigger>
        <Tabs.Trigger value="recommendations" class="flex items-center gap-2">
          <Target class="h-4 w-4" />
          Recommendations
        </Tabs.Trigger>
        <Tabs.Trigger value="performance" class="flex items-center gap-2">
          <Activity class="h-4 w-4" />
          Performance
        </Tabs.Trigger>
      </Tabs.List>

      <!-- Overview Tab -->
      <Tabs.Content value="overview" class="space-y-6">
        {#if showOverallAnalytics && analytics}
          <!-- Overall Analytics Cards -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card.Root>
              <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                <Card.Title class="text-sm font-medium">Total Payees</Card.Title>
                <Users class="text-muted-foreground h-4 w-4" />
              </Card.Header>
              <Card.Content>
                <div class="text-2xl font-bold">{analytics.totalPayees || 0}</div>
                <p class="text-muted-foreground text-xs">
                  {analytics.activePayees || 0} active
                </p>
              </Card.Content>
            </Card.Root>

            <Card.Root>
              <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                <Card.Title class="text-sm font-medium">Total Spending</Card.Title>
                <DollarSign class="text-muted-foreground h-4 w-4" />
              </Card.Header>
              <Card.Content>
                <div class="text-2xl font-bold">
                  {currencyFormatter.format(analytics.totalSpending || 0)}
                </div>
                <p class="text-muted-foreground text-xs">
                  {analytics.spendingTrend > 0 ? '+' : ''}{formatPercentRaw(analytics.spendingTrend ?? 0, 1)}
                  from last period
                </p>
              </Card.Content>
            </Card.Root>

            <Card.Root>
              <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                <Card.Title class="text-sm font-medium">Avg Transaction</Card.Title>
                <TrendingUp class="text-muted-foreground h-4 w-4" />
              </Card.Header>
              <Card.Content>
                <div class="text-2xl font-bold">
                  {currencyFormatter.format(analytics.avgTransactionAmount || 0)}
                </div>
                <p class="text-muted-foreground text-xs">
                  Across {analytics.totalTransactions || 0} transactions
                </p>
              </Card.Content>
            </Card.Root>

            <Card.Root>
              <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                <Card.Title class="text-sm font-medium">ML Accuracy</Card.Title>
                <Brain class="text-muted-foreground h-4 w-4" />
              </Card.Header>
              <Card.Content>
                <div class="text-2xl font-bold">
                  {Math.round((analytics.mlAccuracy || 0) * 100)}%
                </div>
                <p class="text-muted-foreground text-xs">Category prediction accuracy</p>
              </Card.Content>
            </Card.Root>
          </div>

          <!-- Top Payees -->
          {#if analytics.topPayees}
            <Card.Root>
              <Card.Header>
                <Card.Title>Top Payees by Spending</Card.Title>
                <Card.Description
                  >Highest spending payees in the selected timeframe</Card.Description>
              </Card.Header>
              <Card.Content>
                <div class="space-y-4">
                  {#each analytics.topPayees.slice(0, 10) as payee, index}
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div
                          class="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p class="font-medium">{payee.name}</p>
                          <p class="text-muted-foreground text-sm">
                            {payee.transactionCount} transactions
                          </p>
                        </div>
                      </div>
                      <div class="text-right">
                        <p class="font-medium">{currencyFormatter.format(payee.totalSpent)}</p>
                        <p class="text-muted-foreground text-sm">
                          {currencyFormatter.format(payee.avgAmount)} avg
                        </p>
                      </div>
                    </div>
                  {/each}
                </div>
              </Card.Content>
            </Card.Root>
          {/if}
        {:else if analytics}
          <!-- Individual Payee Analytics -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card.Root>
              <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                <Card.Title class="text-sm font-medium">Total Spent</Card.Title>
                <DollarSign class="text-muted-foreground h-4 w-4" />
              </Card.Header>
              <Card.Content>
                <div class="text-2xl font-bold">
                  {currencyFormatter.format(analytics.stats?.totalSpent || 0)}
                </div>
                <p class="text-muted-foreground text-xs">
                  Across {analytics.stats?.transactionCount || 0} transactions
                </p>
              </Card.Content>
            </Card.Root>

            <Card.Root>
              <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                <Card.Title class="text-sm font-medium">Average Amount</Card.Title>
                <TrendingUp class="text-muted-foreground h-4 w-4" />
              </Card.Header>
              <Card.Content>
                <div class="text-2xl font-bold">
                  {currencyFormatter.format(analytics.stats?.avgAmount || 0)}
                </div>
                <p class="text-muted-foreground text-xs">
                  {analytics.stats?.frequency || 'Unknown'} frequency
                </p>
              </Card.Content>
            </Card.Root>

            <Card.Root>
              <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                <Card.Title class="text-sm font-medium">Last Transaction</Card.Title>
                <Calendar class="text-muted-foreground h-4 w-4" />
              </Card.Header>
              <Card.Content>
                <div class="text-2xl font-bold">
                  {analytics.stats?.lastTransactionDate
                    ? formatDateDisplay(analytics.stats.lastTransactionDate, 'short')
                    : 'N/A'}
                </div>
                <p class="text-muted-foreground text-xs">Most recent activity</p>
              </Card.Content>
            </Card.Root>

            <Card.Root>
              <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                <Card.Title class="text-sm font-medium">Prediction Confidence</Card.Title>
                <Brain class="text-muted-foreground h-4 w-4" />
              </Card.Header>
              <Card.Content>
                <div class="text-2xl font-bold">
                  {Math.round((analytics.intelligence?.confidence || 0) * 100)}%
                </div>
                <p class="text-muted-foreground text-xs">ML model confidence</p>
              </Card.Content>
            </Card.Root>
          </div>

          <!-- Intelligence Overview -->
          {#if analytics.intelligence}
            <Card.Root>
              <Card.Header>
                <Card.Title class="flex items-center gap-2">
                  <Brain class="h-5 w-5" />
                  AI Intelligence Summary
                </Card.Title>
              </Card.Header>
              <Card.Content class="space-y-4">
                {#if analytics.intelligence.categoryRecommendation}
                  <div class="flex items-center gap-2 rounded-lg bg-blue-50 p-3">
                    <CircleCheck class="h-4 w-4 text-blue-500" />
                    <span class="text-sm">
                      <strong>Category:</strong>
                      {analytics.intelligence.categoryRecommendation.name}
                      ({Math.round(analytics.intelligence.categoryRecommendation.confidence * 100)}%
                      confidence)
                    </span>
                  </div>
                {/if}
                {#if analytics.intelligence.frequencyPrediction}
                  <div class="flex items-center gap-2 rounded-lg bg-green-50 p-3">
                    <Calendar class="h-4 w-4 text-green-500" />
                    <span class="text-sm">
                      <strong>Frequency:</strong>
                      {analytics.intelligence.frequencyPrediction}
                    </span>
                  </div>
                {/if}
                {#if analytics.intelligence.riskLevel}
                  <div class="flex items-center gap-2 rounded-lg bg-orange-50 p-3">
                    <CircleAlert class="h-4 w-4 text-orange-500" />
                    <span class="text-sm">
                      <strong>Risk Level:</strong>
                      {analytics.intelligence.riskLevel}
                    </span>
                  </div>
                {/if}
              </Card.Content>
            </Card.Root>
          {/if}
        {/if}
      </Tabs.Content>

      <!-- ML Insights Tab -->
      <Tabs.Content value="ml-insights" class="space-y-6">
        {#if mlInsights}
          <!-- Unified ML Recommendations -->
          {#if mlInsights.unifiedRecommendations}
            <Card.Root>
              <Card.Header>
                <Card.Title class="flex items-center gap-2">
                  <Sparkles class="h-5 w-5" />
                  Unified ML Recommendations
                </Card.Title>
                <Card.Description>
                  Cross-system AI recommendations based on comprehensive analysis
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <div class="space-y-4">
                  {#if mlInsights.unifiedRecommendations.categoryRecommendation}
                    <div class="rounded-lg border p-4">
                      <h4 class="mb-2 font-medium">Category Recommendation</h4>
                      <div class="flex items-center justify-between">
                        <span>{mlInsights.unifiedRecommendations.categoryRecommendation.name}</span>
                        <Badge variant="secondary">
                          {Math.round(
                            mlInsights.unifiedRecommendations.categoryRecommendation.confidence *
                              100
                          )}% confidence
                        </Badge>
                      </div>
                      <Progress
                        value={mlInsights.unifiedRecommendations.categoryRecommendation.confidence *
                          100}
                        class="mt-2" />
                    </div>
                  {/if}

                  {#if mlInsights.unifiedRecommendations.budgetRecommendation}
                    <div class="rounded-lg border p-4">
                      <h4 class="mb-2 font-medium">Budget Recommendation</h4>
                      <div class="flex items-center justify-between">
                        <span
                          >{currencyFormatter.format(
                            mlInsights.unifiedRecommendations.budgetRecommendation.amount
                          )}/month</span>
                        <Badge variant="secondary">
                          {mlInsights.unifiedRecommendations.budgetRecommendation.reasoning}
                        </Badge>
                      </div>
                    </div>
                  {/if}

                  {#if mlInsights.unifiedRecommendations.automationSuggestions}
                    <div class="rounded-lg border p-4">
                      <h4 class="mb-2 font-medium">Automation Suggestions</h4>
                      <div class="space-y-2">
                        {#each mlInsights.unifiedRecommendations.automationSuggestions as suggestion}
                          <div class="flex items-center gap-2">
                            <CircleCheck class="h-4 w-4 text-green-500" />
                            <span class="text-sm">{suggestion.description}</span>
                            <Badge variant="outline">{suggestion.impact}</Badge>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}
                </div>
              </Card.Content>
            </Card.Root>
          {/if}

          <!-- Cross-System Learning -->
          {#if mlInsights.crossSystemLearning}
            <Card.Root>
              <Card.Header>
                <Card.Title>Cross-System Learning Analysis</Card.Title>
                <Card.Description>
                  How different ML systems learn and improve from this payee's data
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div class="bg-muted/50 rounded-lg p-4 text-center">
                    <Brain class="mx-auto mb-2 h-6 w-6 text-blue-500" />
                    <div class="text-lg font-bold">
                      {Math.round((mlInsights.crossSystemLearning.categoryAccuracy || 0) * 100)}%
                    </div>
                    <div class="text-muted-foreground text-sm">Category Accuracy</div>
                  </div>
                  <div class="bg-muted/50 rounded-lg p-4 text-center">
                    <Target class="mx-auto mb-2 h-6 w-6 text-green-500" />
                    <div class="text-lg font-bold">
                      {Math.round((mlInsights.crossSystemLearning.budgetAccuracy || 0) * 100)}%
                    </div>
                    <div class="text-muted-foreground text-sm">Budget Accuracy</div>
                  </div>
                  <div class="bg-muted/50 rounded-lg p-4 text-center">
                    <Activity class="mx-auto mb-2 h-6 w-6 text-purple-500" />
                    <div class="text-lg font-bold">
                      {mlInsights.crossSystemLearning.improvementRate || 0}%
                    </div>
                    <div class="text-muted-foreground text-sm">Improvement Rate</div>
                  </div>
                </div>
              </Card.Content>
            </Card.Root>
          {/if}

          <!-- Behavior Changes -->
          {#if mlInsights.behaviorChanges}
            <Card.Root>
              <Card.Header>
                <Card.Title>Behavior Change Detection</Card.Title>
                <Card.Description>
                  Detected changes in spending patterns and transaction behavior
                </Card.Description>
              </Card.Header>
              <Card.Content>
                {#if mlInsights.behaviorChanges.changes && mlInsights.behaviorChanges.changes.length > 0}
                  <div class="space-y-3">
                    {#each mlInsights.behaviorChanges.changes as change}
                      <div class="flex items-start gap-3 rounded-lg border p-3">
                        <div class="mt-0.5">
                          {#if change.type === 'increase'}
                            <TrendingUp class="h-4 w-4 text-green-500" />
                          {:else if change.type === 'decrease'}
                            <TrendingDown class="h-4 w-4 text-red-500" />
                          {:else}
                            <CircleAlert class="h-4 w-4 text-orange-500" />
                          {/if}
                        </div>
                        <div class="flex-1">
                          <p class="text-sm font-medium">{change.description}</p>
                          <p class="text-muted-foreground text-xs">
                            Detected on {formatDateDisplay(change.detectedDate, 'short')}
                            • Confidence: {Math.round(change.confidence * 100)}%
                          </p>
                        </div>
                        <Badge
                          variant={change.impact === 'high'
                            ? 'destructive'
                            : change.impact === 'medium'
                              ? 'secondary'
                              : 'outline'}>
                          {change.impact}
                        </Badge>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <p class="text-muted-foreground py-4 text-center text-sm">
                    No significant behavior changes detected in the selected timeframe.
                  </p>
                {/if}
              </Card.Content>
            </Card.Root>
          {/if}
        {:else}
          <Card.Root>
            <Card.Content class="py-8 text-center">
              <Brain class="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <p class="text-muted-foreground text-sm">
                ML insights will be displayed here when available.
              </p>
            </Card.Content>
          </Card.Root>
        {/if}
      </Tabs.Content>

      <!-- Recommendations Tab -->
      <Tabs.Content value="recommendations" class="space-y-6">
        {#if recommendations}
          <!-- Budget Optimization -->
          {#if recommendations.budgetOptimization}
            <Card.Root>
              <Card.Header>
                <Card.Title class="flex items-center gap-2">
                  <Target class="h-5 w-5" />
                  Budget Optimization Analysis
                </Card.Title>
                <Card.Description>
                  AI-powered recommendations for optimizing budget allocation
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <div class="space-y-4">
                  {#if recommendations.budgetOptimization.currentEfficiency}
                    <div class="bg-muted/50 flex items-center justify-between rounded-lg p-3">
                      <span class="text-sm font-medium">Current Budget Efficiency</span>
                      <div class="flex items-center gap-2">
                        <Progress
                          value={recommendations.budgetOptimization.currentEfficiency * 100}
                          class="w-20" />
                        <span class="text-sm"
                          >{Math.round(
                            recommendations.budgetOptimization.currentEfficiency * 100
                          )}%</span>
                      </div>
                    </div>
                  {/if}

                  {#if recommendations.budgetOptimization.recommendations}
                    <div class="space-y-2">
                      {#each recommendations.budgetOptimization.recommendations as recommendation}
                        <div class="flex items-start gap-3 rounded-lg border p-3">
                          <Sparkles class="mt-0.5 h-4 w-4 text-blue-500" />
                          <div class="flex-1">
                            <p class="text-sm font-medium">{recommendation.title}</p>
                            <p class="text-muted-foreground text-xs">
                              {recommendation.description}
                            </p>
                          </div>
                          {#if recommendation.potentialSavings}
                            <Badge variant="secondary">
                              Save {currencyFormatter.format(recommendation.potentialSavings)}
                            </Badge>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              </Card.Content>
            </Card.Root>
          {/if}

          <!-- Actionable Insights -->
          {#if recommendations.actionableInsights}
            <Card.Root>
              <Card.Header>
                <Card.Title>Actionable Insights</Card.Title>
                <Card.Description>
                  Immediate actions you can take to improve financial efficiency
                </Card.Description>
              </Card.Header>
              <Card.Content>
                {#if recommendations.actionableInsights.insights && recommendations.actionableInsights.insights.length > 0}
                  <div class="space-y-3">
                    {#each recommendations.actionableInsights.insights as insight}
                      <div class="flex items-start gap-3 rounded-lg border p-3">
                        <div class="mt-0.5">
                          {#if insight.type === 'optimization'}
                            <TrendingUp class="h-4 w-4 text-green-500" />
                          {:else if insight.type === 'prediction'}
                            <Brain class="h-4 w-4 text-blue-500" />
                          {:else if insight.type === 'automation'}
                            <Target class="h-4 w-4 text-purple-500" />
                          {:else}
                            <CircleAlert class="h-4 w-4 text-orange-500" />
                          {/if}
                        </div>
                        <div class="flex-1">
                          <p class="text-sm font-medium">{insight.title}</p>
                          <p class="text-muted-foreground text-xs">{insight.description}</p>
                          {#if insight.action}
                            <Button variant="outline" size="sm" class="mt-2">
                              {insight.action}
                            </Button>
                          {/if}
                        </div>
                        <Badge
                          variant={insight.priority === 'high'
                            ? 'destructive'
                            : insight.priority === 'medium'
                              ? 'secondary'
                              : 'outline'}>
                          {insight.priority}
                        </Badge>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <p class="text-muted-foreground py-4 text-center text-sm">
                    No actionable insights available at this time.
                  </p>
                {/if}
              </Card.Content>
            </Card.Root>
          {/if}

          <!-- Category Recommendation -->
          {#if recommendations.categoryRecommendation}
            <Card.Root>
              <Card.Header>
                <Card.Title>Category Recommendation</Card.Title>
                <Card.Description>
                  AI-suggested category based on transaction patterns
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <div class="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p class="font-medium">{recommendations.categoryRecommendation.category}</p>
                    <p class="text-muted-foreground text-sm">
                      {recommendations.categoryRecommendation.reasoning}
                    </p>
                  </div>
                  <div class="text-right">
                    <Badge variant="secondary">
                      {Math.round(recommendations.categoryRecommendation.confidence * 100)}%
                      confidence
                    </Badge>
                    <Progress
                      value={recommendations.categoryRecommendation.confidence * 100}
                      class="mt-2 w-20" />
                  </div>
                </div>
              </Card.Content>
            </Card.Root>
          {/if}
        {:else}
          <Card.Root>
            <Card.Content class="py-8 text-center">
              <Target class="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <p class="text-muted-foreground text-sm">
                Recommendations will be displayed here when available.
              </p>
            </Card.Content>
          </Card.Root>
        {/if}
      </Tabs.Content>

      <!-- Performance Tab -->
      <Tabs.Content value="performance" class="space-y-6">
        {#if performanceMetrics}
          <!-- Learning Performance Metrics -->
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card.Root>
              <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                <Card.Title class="text-sm font-medium">Learning Rate</Card.Title>
                <Brain class="text-muted-foreground h-4 w-4" />
              </Card.Header>
              <Card.Content>
                <div class="text-2xl font-bold">{performanceMetrics.learningRate || 0}%</div>
                <p class="text-muted-foreground text-xs">Model improvement over time</p>
              </Card.Content>
            </Card.Root>

            <Card.Root>
              <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                <Card.Title class="text-sm font-medium">Accuracy Score</Card.Title>
                <CircleCheck class="text-muted-foreground h-4 w-4" />
              </Card.Header>
              <Card.Content>
                <div class="text-2xl font-bold">
                  {Math.round((performanceMetrics.accuracy || 0) * 100)}%
                </div>
                <p class="text-muted-foreground text-xs">Overall prediction accuracy</p>
              </Card.Content>
            </Card.Root>

            <Card.Root>
              <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                <Card.Title class="text-sm font-medium">Corrections</Card.Title>
                <CircleAlert class="text-muted-foreground h-4 w-4" />
              </Card.Header>
              <Card.Content>
                <div class="text-2xl font-bold">{performanceMetrics.totalCorrections || 0}</div>
                <p class="text-muted-foreground text-xs">Manual corrections processed</p>
              </Card.Content>
            </Card.Root>

            <Card.Root>
              <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
                <Card.Title class="text-sm font-medium">Confidence</Card.Title>
                <TrendingUp class="text-muted-foreground h-4 w-4" />
              </Card.Header>
              <Card.Content>
                <div class="text-2xl font-bold">
                  {Math.round((performanceMetrics.avgConfidence || 0) * 100)}%
                </div>
                <p class="text-muted-foreground text-xs">Average model confidence</p>
              </Card.Content>
            </Card.Root>
          </div>

          <!-- Performance Trends -->
          {#if performanceMetrics.trends}
            <Card.Root>
              <Card.Header>
                <Card.Title>Performance Trends</Card.Title>
                <Card.Description>
                  ML model performance over the selected timeframe
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <!-- Accuracy Trend -->
                  <div>
                    <h4 class="mb-3 font-medium">Accuracy Trend</h4>
                    <div class="space-y-2">
                      {#each performanceMetrics.trends.accuracy as point}
                        <div class="flex items-center justify-between">
                          <span class="text-muted-foreground text-sm">{point.period}</span>
                          <div class="flex items-center gap-2">
                            <Progress value={point.value * 100} class="w-20" />
                            <span class="text-sm">{Math.round(point.value * 100)}%</span>
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>

                  <!-- Correction Rate -->
                  <div>
                    <h4 class="mb-3 font-medium">Correction Rate</h4>
                    <div class="space-y-2">
                      {#each performanceMetrics.trends.corrections as point}
                        <div class="flex items-center justify-between">
                          <span class="text-muted-foreground text-sm">{point.period}</span>
                          <div class="flex items-center gap-2">
                            <Progress value={point.rate * 100} class="w-20" />
                            <span class="text-sm">{point.count} corrections</span>
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                </div>
              </Card.Content>
            </Card.Root>
          {/if}

          <!-- Model Insights -->
          {#if performanceMetrics.insights}
            <Card.Root>
              <Card.Header>
                <Card.Title>Model Performance Insights</Card.Title>
                <Card.Description>Understanding how the AI learns and improves</Card.Description>
              </Card.Header>
              <Card.Content>
                <div class="space-y-3">
                  {#each performanceMetrics.insights as insight}
                    <div class="bg-muted/50 flex items-start gap-3 rounded-lg p-3">
                      <Brain class="mt-0.5 h-4 w-4 text-blue-500" />
                      <div class="flex-1">
                        <p class="text-sm font-medium">{insight.title}</p>
                        <p class="text-muted-foreground text-xs">{insight.description}</p>
                      </div>
                      {#if insight.impact}
                        <Badge variant="outline">{insight.impact}</Badge>
                      {/if}
                    </div>
                  {/each}
                </div>
              </Card.Content>
            </Card.Root>
          {/if}
        {:else}
          <Card.Root>
            <Card.Content class="py-8 text-center">
              <Activity class="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <p class="text-muted-foreground text-sm">
                Performance metrics will be displayed here when available.
              </p>
            </Card.Content>
          </Card.Root>
        {/if}
      </Tabs.Content>
    </Tabs.Root>
  {/if}
</div>
