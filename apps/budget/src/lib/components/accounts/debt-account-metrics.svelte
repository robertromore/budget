<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Progress } from '$lib/components/ui/progress';
import { accountKeys } from '$lib/query/accounts';
import type { Account } from '$lib/schema/accounts';
import { trpc } from '$lib/trpc/client';
import type { TransactionsFormat } from '$lib/types';
import { formatCurrency, formatPercentage } from '$lib/utils/account-display';
import {
  AVAILABLE_METRICS,
  calculateAllMetrics,
  getEnabledMetrics,
  type MetricId,
} from '$lib/utils/credit-card-metrics';
import { formatDayOrdinal } from '$lib/utils/date-formatters';
import Calendar from '@lucide/svelte/icons/calendar';
import CalendarDays from '@lucide/svelte/icons/calendar-days';
import CircleAlert from '@lucide/svelte/icons/circle-alert';
import Clock from '@lucide/svelte/icons/clock';
import CreditCard from '@lucide/svelte/icons/credit-card';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import Hash from '@lucide/svelte/icons/hash';
import HelpCircle from '@lucide/svelte/icons/help-circle';
import Percent from '@lucide/svelte/icons/percent';
import Settings from '@lucide/svelte/icons/settings';
import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
import Target from '@lucide/svelte/icons/target';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Wallet from '@lucide/svelte/icons/wallet';
import { useQueryClient } from '@tanstack/svelte-query';
import type { Component } from 'svelte';
import { toast } from '$lib/utils/toast-interceptor';
import TopCategoriesView from '../../../routes/accounts/[slug]/(components)/(charts)/top-categories-view.svelte';
import ConfigureMetricsDialog from './configure-metrics-dialog.svelte';

let { account, transactions = [] } = $props<{
  account: Account;
  transactions?: TransactionsFormat[];
}>();

let showConfigDialog = $state(false);
const queryClient = useQueryClient();

// Handle metric configuration save
async function handleSaveMetrics(enabledMetrics: MetricId[]) {
  try {
    await trpc().accountRoutes.updateEnabledMetrics.mutate({
      accountId: account.id,
      enabledMetrics,
    });

    // Invalidate the account detail query to refetch with new data
    await queryClient.invalidateQueries({
      queryKey: accountKeys.detailBySlug(account.slug),
    });

    toast.success('Metrics configuration updated');
  } catch (error) {
    console.error('Failed to update metrics:', error);
    toast.error('Failed to update metrics configuration');
  }
}

const isCreditCard = $derived(account.accountType === 'credit_card');
const calculatedMetrics = $derived(isCreditCard ? calculateAllMetrics(account) : null);
const enabledMetricIds = $derived(isCreditCard ? getEnabledMetrics(account) : []);

// Get the metric definitions for enabled metrics
const enabledMetrics = $derived(
  enabledMetricIds
    .map((id) => AVAILABLE_METRICS.find((m) => m.id === id))
    .filter((m): m is (typeof AVAILABLE_METRICS)[number] => m !== undefined)
);

// Icon mapping
const iconMap: Record<string, Component> = {
  CreditCard,
  TrendingUp,
  TrendingDown,
  CircleAlert,
  DollarSign,
  Percent,
  Calendar,
  Clock,
  Wallet,
  Target,
  ShoppingCart,
  Hash,
  CalendarDays,
  HelpCircle,
};

// Helper to get icon component from name
function getIconComponent(iconName: string): Component {
  return iconMap[iconName] || HelpCircle;
}

// Helper to render metric value
function renderMetricValue(
  metricId: MetricId,
  calculatedMetrics: ReturnType<typeof calculateAllMetrics>
) {
  switch (metricId) {
    case 'availableCredit':
      return calculatedMetrics.availableCredit !== undefined
        ? formatCurrency(calculatedMetrics.availableCredit)
        : 'N/A';
    case 'creditUtilization':
      return calculatedMetrics.creditUtilization !== undefined
        ? formatPercentage(calculatedMetrics.creditUtilization)
        : 'N/A';
    case 'overLimit':
      return calculatedMetrics.isOverLimit
        ? formatCurrency(
            (calculatedMetrics.currentBalance || 0) - (calculatedMetrics.creditLimit || 0)
          )
        : null;
    case 'minimumPayment':
      return account.minimumPayment ? formatCurrency(account.minimumPayment) : 'N/A';
    case 'interestRate':
      return account.interestRate ? formatPercentage(account.interestRate) : 'N/A';
    case 'paymentDueDate':
      return calculatedMetrics.nextPaymentDue
        ? new Date(calculatedMetrics.nextPaymentDue).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })
        : 'N/A';
    case 'daysUntilDue':
      return calculatedMetrics.daysUntilDue !== undefined
        ? `${calculatedMetrics.daysUntilDue} days`
        : 'N/A';
    case 'currentBalance':
      return formatCurrency(calculatedMetrics.currentBalance || 0);
    case 'creditLimit':
      return calculatedMetrics.creditLimit ? formatCurrency(calculatedMetrics.creditLimit) : 'N/A';
    case 'monthlySpending':
      return calculatedMetrics.monthlySpending !== undefined
        ? formatCurrency(calculatedMetrics.monthlySpending)
        : 'N/A';
    case 'transactionCount':
      return calculatedMetrics.transactionCount !== undefined
        ? calculatedMetrics.transactionCount.toString()
        : 'N/A';
    case 'interestCharges':
      return calculatedMetrics.estimatedInterestThisMonth !== undefined
        ? formatCurrency(calculatedMetrics.estimatedInterestThisMonth)
        : 'N/A';
    case 'payoffTimeline':
      return calculatedMetrics.payoffMonths !== undefined
        ? `${calculatedMetrics.payoffMonths} months`
        : 'N/A';
    default:
      return 'N/A';
  }
}

// Helper to get additional description text
function getMetricDescription(
  metricId: MetricId,
  calculatedMetrics: ReturnType<typeof calculateAllMetrics>
) {
  switch (metricId) {
    case 'availableCredit':
      return `${formatCurrency(calculatedMetrics.currentBalance || 0)} of ${formatCurrency(calculatedMetrics.creditLimit || 0)} used`;
    case 'creditUtilization':
      const util = calculatedMetrics.creditUtilization || 0;
      return util < 30 ? 'Excellent' : util < 70 ? 'Good' : 'High usage';
    case 'overLimit':
      return 'Balance exceeds credit limit';
    case 'minimumPayment':
      return account.paymentDueDay
        ? `Due on the ${formatDayOrdinal(account.paymentDueDay)} of each month`
        : 'Monthly payment';
    case 'interestRate':
      return 'APR';
    case 'paymentDueDate':
      return calculatedMetrics.nextPaymentDue ? 'Next payment due' : '';
    case 'payoffTimeline':
      return 'At minimum payment';
    default:
      return '';
  }
}

// Helper to determine card styling based on metric
function getMetricCardClass(
  metricId: MetricId,
  calculatedMetrics: ReturnType<typeof calculateAllMetrics>
) {
  if (metricId === 'overLimit' && calculatedMetrics.isOverLimit) {
    return 'border-red-600 bg-red-50 dark:bg-red-950';
  }
  return '';
}

function getMetricValueClass(
  metricId: MetricId,
  calculatedMetrics: ReturnType<typeof calculateAllMetrics>
) {
  if (metricId === 'availableCredit') {
    const available = calculatedMetrics.availableCredit || 0;
    return available > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  }
  if (metricId === 'creditUtilization') {
    const util = calculatedMetrics.creditUtilization || 0;
    return util < 30
      ? 'text-green-600 dark:text-green-400'
      : util < 70
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-red-600 dark:text-red-400';
  }
  if (metricId === 'overLimit') {
    return 'text-red-600 dark:text-red-400';
  }
  return '';
}
</script>

{#if isCreditCard && calculatedMetrics}
  <div class="space-y-4">
    <!-- Header with Configure button -->
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">Credit Card Metrics</h3>
      <Button variant="outline" size="sm" onclick={() => (showConfigDialog = true)}>
        <Settings class="mr-2 h-4 w-4" />
        Configure Metrics
      </Button>
    </div>

    <!-- Metrics Grid -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {#each enabledMetrics as metric}
        {@const metricValue = renderMetricValue(metric.id, calculatedMetrics)}
        {@const Icon = getIconComponent(metric.icon)}

        {#if metricValue !== null && (metric.id !== 'overLimit' || calculatedMetrics.isOverLimit)}
          <Card.Root class={getMetricCardClass(metric.id, calculatedMetrics)}>
            <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
              <Card.Title
                class="text-sm font-medium {metric.id === 'overLimit'
                  ? 'text-red-600 dark:text-red-400'
                  : ''}">
                {metric.label}
              </Card.Title>
              <Icon
                class="h-4 w-4 {metric.id === 'overLimit'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-muted-foreground'}" />
            </Card.Header>
            <Card.Content>
              <div class="text-2xl font-bold {getMetricValueClass(metric.id, calculatedMetrics)}">
                {metricValue}
              </div>

              {#if metric.id === 'creditUtilization' && calculatedMetrics.creditUtilization !== undefined}
                <Progress value={calculatedMetrics.creditUtilization} class="mt-2" />
              {/if}

              {@const description = getMetricDescription(metric.id, calculatedMetrics)}
              {#if description}
                <p
                  class="mt-1 text-xs {metric.id === 'overLimit'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-muted-foreground'}">
                  {description}
                </p>
              {/if}
            </Card.Content>
          </Card.Root>
        {/if}
      {/each}
    </div>

    <!-- Top Spending Categories -->
    {#if transactions.length > 0 && enabledMetricIds.includes('topCategories')}
      <div class="mt-6">
        <TopCategoriesView {transactions} />
      </div>
    {/if}
  </div>

  <!-- Configuration Dialog -->
  <ConfigureMetricsDialog {account} bind:open={showConfigDialog} onSave={handleSaveMetrics} />
{/if}
