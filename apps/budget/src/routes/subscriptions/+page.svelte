<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Empty from '$lib/components/ui/empty';
import { Badge } from '$lib/components/ui/badge';
import { Progress } from '$lib/components/ui/progress';
import { Skeleton } from '$lib/components/ui/skeleton';
import * as Tooltip from '$lib/components/ui/tooltip';
import * as Tabs from '$lib/components/ui/tabs';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { SubscriptionFormDialog } from '$lib/components/subscriptions';
import { rpc } from '$lib/query';
import type { SubscriptionWithRelations } from '$lib/schema/subscriptions-table';
import type { DetectionResult, TransactionBasedDetectionResult } from '$lib/server/domains/subscriptions';
import { currencyFormatter } from '$lib/utils/formatters';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
import ArrowRight from '@lucide/svelte/icons/arrow-right';
import Bell from '@lucide/svelte/icons/bell';
import Calendar from '@lucide/svelte/icons/calendar';
import Check from '@lucide/svelte/icons/check';
import CreditCard from '@lucide/svelte/icons/credit-card';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import Lightbulb from '@lucide/svelte/icons/lightbulb';
import PiggyBank from '@lucide/svelte/icons/piggy-bank';
import Plus from '@lucide/svelte/icons/plus';
import RefreshCw from '@lucide/svelte/icons/refresh-cw';
import Search from '@lucide/svelte/icons/search';
import Trash2 from '@lucide/svelte/icons/trash-2';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import X from '@lucide/svelte/icons/x';

// Queries - .options() already returns createQuery result
const subscriptionsQuery = rpc.subscriptions.getAll().options();
const analyticsQuery = rpc.subscriptions.getAnalytics().options();
const detectionsQuery = rpc.subscriptions.detectSubscriptions({ minConfidence: 0.5 }).options();
const transactionDetectionsQuery = rpc.subscriptions.detectFromTransactions({
  months: 6,
  minConfidence: 50,
  minPredictability: 60,
}).options();
const alertsQuery = rpc.subscriptions.getAlerts().options();
const upcomingQuery = rpc.subscriptions.getUpcomingRenewals(14).options();

// Mutations - .options() already returns createMutation result
const confirmMutation = rpc.subscriptions.confirm.options();
const rejectMutation = rpc.subscriptions.reject.options();
const deleteMutation = rpc.subscriptions.remove.options();
const dismissAlertMutation = rpc.subscriptions.dismissAlert.options();

// Derived data - access query results directly (no $ prefix needed)
const subscriptions = $derived(subscriptionsQuery.data ?? []);
const analytics = $derived(analyticsQuery.data);
const detections = $derived((detectionsQuery.data ?? []).filter((d) => !d.isAlreadyTracked));
const transactionDetections = $derived(
  (transactionDetectionsQuery.data ?? []).filter((d) => !d.isAlreadyTracked)
);
const alerts = $derived(alertsQuery.data ?? []);
const upcomingRenewals = $derived(upcomingQuery.data ?? []);
const isLoading = $derived(subscriptionsQuery.isLoading || analyticsQuery.isLoading);

// UI state
let formDialogOpen = $state(false);
let editingSubscription = $state<SubscriptionWithRelations | undefined>(undefined);
let deleteConfirmOpen = $state(false);
let subscriptionToDelete = $state<SubscriptionWithRelations | null>(null);
let activeTab = $state('subscriptions');

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

// Status colors
const statusConfig: Record<string, { color: string; label: string }> = {
  active: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', label: 'Active' },
  trial: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', label: 'Trial' },
  paused: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', label: 'Paused' },
  cancelled: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', label: 'Cancelled' },
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

function openAddDialog() {
  editingSubscription = undefined;
  formDialogOpen = true;
}

function openEditDialog(subscription: SubscriptionWithRelations) {
  editingSubscription = subscription;
  formDialogOpen = true;
}

function confirmDelete(subscription: SubscriptionWithRelations) {
  subscriptionToDelete = subscription;
  deleteConfirmOpen = true;
}

async function handleDelete() {
  if (!subscriptionToDelete) return;
  await deleteMutation.mutateAsync(subscriptionToDelete.id);
  deleteConfirmOpen = false;
  subscriptionToDelete = null;
}

async function handleConfirmDetection(detection: DetectionResult) {
  await confirmMutation.mutateAsync({
    payeeId: detection.payeeId,
    name: detection.suggestedName,
    type: detection.subscriptionType,
    billingCycle: detection.billingCycle,
    amount: detection.estimatedAmount,
  });
}

async function handleConfirmTransactionDetection(detection: TransactionBasedDetectionResult) {
  await confirmMutation.mutateAsync({
    payeeId: detection.payeeId,
    name: detection.payeeName,
    type: detection.subscriptionType,
    billingCycle: detection.billingCycle,
    amount: detection.estimatedAmount,
    accountId: detection.accountId,
    renewalDate: detection.suggestedRenewalDate,
  });
}

async function handleRejectDetection(detection: DetectionResult) {
  await rejectMutation.mutateAsync({ payeeId: detection.payeeId });
}

async function handleRejectTransactionDetection(detection: TransactionBasedDetectionResult) {
  await rejectMutation.mutateAsync({ payeeId: detection.payeeId });
}

async function handleDismissAlert(alertId: number) {
  await dismissAlertMutation.mutateAsync({ alertId });
}

function refreshData() {
  subscriptionsQuery.refetch();
  analyticsQuery.refetch();
  detectionsQuery.refetch();
  transactionDetectionsQuery.refetch();
  alertsQuery.refetch();
  upcomingQuery.refetch();
}
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
      <Button variant="outline" onclick={refreshData} disabled={isLoading}>
        <RefreshCw class="mr-2 h-4 w-4 {isLoading ? 'animate-spin' : ''}" />
        Refresh
      </Button>
      <Button onclick={openAddDialog}>
        <Plus class="mr-2 h-4 w-4" />
        Add Subscription
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
        {#if isLoading}
          <Skeleton class="h-8 w-16" />
        {:else}
          <div class="text-2xl font-bold">{analytics?.totalSubscriptions ?? 0}</div>
          <p class="text-muted-foreground text-xs">
            {analytics?.activeSubscriptions ?? 0} active
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
        {#if isLoading}
          <Skeleton class="h-8 w-24" />
        {:else}
          <div class="text-2xl font-bold">
            {currencyFormatter.format(analytics?.totalMonthlyCost ?? 0)}
          </div>
          <p class="text-muted-foreground text-xs">
            Avg: {currencyFormatter.format(analytics?.averageSubscriptionCost ?? 0)}
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
        {#if isLoading}
          <Skeleton class="h-8 w-28" />
        {:else}
          <div class="text-2xl font-bold">
            {currencyFormatter.format(analytics?.totalAnnualCost ?? 0)}
          </div>
          <p class="text-muted-foreground text-xs">Projected yearly spend</p>
        {/if}
      </Card.Content>
    </Card.Root>

    <!-- Alerts / Upcoming -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Upcoming Renewals</Card.Title>
        <Bell class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        {#if isLoading}
          <Skeleton class="h-8 w-20" />
        {:else}
          <div class="text-2xl font-bold">{analytics?.upcomingRenewals ?? 0}</div>
          <p class="text-muted-foreground text-xs">
            In the next 7 days
            {#if (analytics?.trialEnding ?? 0) > 0}
              <span class="text-amber-600"> ({analytics?.trialEnding} trial ending)</span>
            {/if}
          </p>
        {/if}
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Main Content Tabs -->
  <Tabs.Root bind:value={activeTab}>
    <Tabs.List>
      <Tabs.Trigger value="subscriptions">
        Subscriptions ({subscriptions.length})
      </Tabs.Trigger>
      {#if transactionDetections.length > 0}
        <Tabs.Trigger value="analyzed">
          Analyzed ({transactionDetections.length})
        </Tabs.Trigger>
      {/if}
      {#if detections.length > 0}
        <Tabs.Trigger value="detected">
          Detected ({detections.length})
        </Tabs.Trigger>
      {/if}
      {#if alerts.length > 0}
        <Tabs.Trigger value="alerts">
          Alerts ({alerts.length})
        </Tabs.Trigger>
      {/if}
      {#if upcomingRenewals.length > 0}
        <Tabs.Trigger value="upcoming">Upcoming</Tabs.Trigger>
      {/if}
    </Tabs.List>

    <!-- Subscriptions Tab -->
    <Tabs.Content value="subscriptions" class="mt-4">
      {#if isLoading}
        <Card.Root>
          <Card.Header>
            <Card.Title>Loading Subscriptions...</Card.Title>
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
      {:else if subscriptions.length === 0}
        <Empty.Empty>
          <Empty.EmptyMedia variant="icon">
            <CreditCard class="size-6" />
          </Empty.EmptyMedia>
          <Empty.EmptyHeader>
            <Empty.EmptyTitle>No Subscriptions Yet</Empty.EmptyTitle>
            <Empty.EmptyDescription>
              Add your first subscription to start tracking your recurring expenses.
            </Empty.EmptyDescription>
          </Empty.EmptyHeader>
          <Empty.EmptyContent>
            <Button onclick={openAddDialog}>
              <Plus class="mr-2 h-4 w-4" />
              Add Subscription
            </Button>
          </Empty.EmptyContent>
        </Empty.Empty>
      {:else}
        <Card.Root>
          <Card.Header>
            <Card.Title>Your Subscriptions</Card.Title>
            <Card.Description>
              Manage your {subscriptions.length} tracked subscription{subscriptions.length !== 1 ? 's' : ''}
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <div class="space-y-3">
              {#each subscriptions as subscription}
                {@const typeConfig = subscriptionTypeConfig[subscription.type] ?? subscriptionTypeConfig.other}
                {@const statusCfg = statusConfig[subscription.status] ?? statusConfig.active}
                {@const billingLabel = billingCycleLabels[subscription.billingCycle] ?? 'Monthly'}

                <div
                  class="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
                >
                  <button
                    type="button"
                    class="flex flex-1 items-center gap-4 text-left"
                    onclick={() => openEditDialog(subscription)}
                  >
                    <!-- Type Badge Icon -->
                    <div class="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                      <RefreshCw class="text-muted-foreground h-5 w-5" />
                    </div>

                    <!-- Subscription Info -->
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="font-medium">{subscription.name}</span>
                        <Badge variant="outline" class={typeConfig.color}>
                          {typeConfig.label}
                        </Badge>
                        <Badge variant="outline" class={statusCfg.color}>
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <div class="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                        <span>{billingLabel}</span>
                        {#if subscription.payee}
                          <span class="text-muted-foreground/50">•</span>
                          <span class="truncate">{subscription.payee.name}</span>
                        {/if}
                        {#if subscription.renewalDate}
                          <span class="text-muted-foreground/50">•</span>
                          <span>Renews: {new Date(subscription.renewalDate).toLocaleDateString()}</span>
                        {/if}
                      </div>
                    </div>

                    <!-- Cost -->
                    <div class="text-right">
                      <div class="font-semibold">{currencyFormatter.format(subscription.amount)}</div>
                      <div class="text-muted-foreground text-xs">per {subscription.billingCycle}</div>
                    </div>
                  </button>

                  <!-- Actions -->
                  <div class="ml-4 flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onclick={() => confirmDelete(subscription)}
                    >
                      <Trash2 class="h-4 w-4" />
                    </Button>
                    <ArrowRight class="text-muted-foreground h-4 w-4" />
                  </div>
                </div>
              {/each}
            </div>
          </Card.Content>
        </Card.Root>
      {/if}
    </Tabs.Content>

    <!-- Transaction-Analyzed Subscriptions Tab -->
    <Tabs.Content value="analyzed" class="mt-4">
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Search class="h-5 w-5 text-blue-500" />
            Transaction Analysis
          </Card.Title>
          <Card.Description>
            Found {transactionDetections.length} recurring payment{transactionDetections.length !== 1 ? 's' : ''} by analyzing your transaction history
          </Card.Description>
        </Card.Header>
        <Card.Content>
          {#if transactionDetectionsQuery.isLoading}
            <div class="space-y-4">
              {#each Array(3) as _}
                <div class="flex items-center justify-between rounded-lg border p-4">
                  <div class="flex items-center gap-4">
                    <Skeleton class="h-10 w-10 rounded-lg" />
                    <div class="space-y-2">
                      <Skeleton class="h-4 w-32" />
                      <Skeleton class="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton class="h-8 w-24" />
                </div>
              {/each}
            </div>
          {:else}
            <div class="space-y-3">
              {#each transactionDetections as detection}
                {@const typeConfig = subscriptionTypeConfig[detection.subscriptionType] ?? subscriptionTypeConfig.other}
                {@const confidence = Math.round(detection.detectionConfidence * 100)}
                {@const billingLabel = billingCycleLabels[detection.billingCycle] ?? 'Monthly'}

                <div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div class="flex items-start gap-4">
                      <div class="bg-blue-100 dark:bg-blue-900/50 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                        <RefreshCw class="h-5 w-5 text-blue-600" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="font-medium">{detection.payeeName}</span>
                          <Badge variant="outline" class={typeConfig.color}>
                            {typeConfig.label}
                          </Badge>
                        </div>
                        <div class="text-muted-foreground mt-1 space-y-1 text-sm">
                          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span class="font-medium text-foreground">
                              {currencyFormatter.format(detection.estimatedAmount)}/{billingLabel.toLowerCase()}
                            </span>
                            <span class="text-muted-foreground/50">•</span>
                            <span>{detection.transactionCount} transactions</span>
                            <span class="text-muted-foreground/50">•</span>
                            <span>Every ~{Math.round(detection.intervalDays)} days</span>
                          </div>
                          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <Tooltip.Provider>
                              <Tooltip.Root>
                                <Tooltip.Trigger class="inline-flex items-center gap-1">
                                  <span class="text-blue-600 dark:text-blue-400">{confidence}% confidence</span>
                                </Tooltip.Trigger>
                                <Tooltip.Content side="bottom" class="max-w-xs">
                                  <div class="space-y-2 text-xs">
                                    {#each detection.detectionMethods as method}
                                      <div>
                                        <p class="font-medium capitalize">{method.method.replace('_', ' ')}: {Math.round(method.confidence * 100)}%</p>
                                        {#each method.evidence as ev}
                                          <p class="text-muted-foreground">{ev}</p>
                                        {/each}
                                      </div>
                                    {/each}
                                  </div>
                                </Tooltip.Content>
                              </Tooltip.Root>
                            </Tooltip.Provider>
                            <span class="text-muted-foreground/50">•</span>
                            <span>{Math.round(detection.predictability)}% predictable</span>
                            {#if detection.categoryName}
                              <span class="text-muted-foreground/50">•</span>
                              <span>{detection.categoryName}</span>
                            {/if}
                          </div>
                          {#if detection.accountName}
                            <div class="text-xs text-muted-foreground">
                              Account: {detection.accountName}
                            </div>
                          {/if}
                        </div>
                      </div>
                    </div>
                    <div class="flex shrink-0 items-center gap-2 sm:ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onclick={() => handleRejectTransactionDetection(detection)}
                        disabled={rejectMutation.isPending}
                      >
                        <X class="mr-1 h-4 w-4" />
                        Ignore
                      </Button>
                      <Button
                        size="sm"
                        onclick={() => handleConfirmTransactionDetection(detection)}
                        disabled={confirmMutation.isPending}
                      >
                        <Check class="mr-1 h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    </Tabs.Content>

    <!-- Detected Subscriptions Tab -->
    <Tabs.Content value="detected" class="mt-4">
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Lightbulb class="h-5 w-5 text-amber-500" />
            Detected Subscriptions
          </Card.Title>
          <Card.Description>
            We've detected {detections.length} potential subscription{detections.length !== 1 ? 's' : ''} from your transactions
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="space-y-3">
            {#each detections as detection}
              {@const typeConfig = subscriptionTypeConfig[detection.subscriptionType] ?? subscriptionTypeConfig.other}
              {@const confidence = Math.round(detection.detectionConfidence * 100)}

              <div class="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                <div class="flex items-center gap-4">
                  <div class="bg-amber-100 dark:bg-amber-900/50 flex h-10 w-10 items-center justify-center rounded-lg">
                    <Search class="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{detection.suggestedName || detection.payeeName}</span>
                      <Badge variant="outline" class={typeConfig.color}>
                        {typeConfig.label}
                      </Badge>
                    </div>
                    <div class="text-muted-foreground mt-1 text-sm">
                      {confidence}% confidence
                      {#if detection.estimatedAmount > 0}
                        • ~{currencyFormatter.format(detection.estimatedAmount)}/{detection.billingCycle}
                      {/if}
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => handleRejectDetection(detection)}
                    disabled={rejectMutation.isPending}
                  >
                    <X class="mr-1 h-4 w-4" />
                    Ignore
                  </Button>
                  <Button
                    size="sm"
                    onclick={() => handleConfirmDetection(detection)}
                    disabled={confirmMutation.isPending}
                  >
                    <Check class="mr-1 h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    </Tabs.Content>

    <!-- Alerts Tab -->
    <Tabs.Content value="alerts" class="mt-4">
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Bell class="h-5 w-5 text-blue-500" />
            Subscription Alerts
          </Card.Title>
          <Card.Description>
            Important notifications about your subscriptions
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="space-y-3">
            {#each alerts as alert}
              {@const alertTypeLabels: Record<string, { icon: typeof AlertTriangle; color: string; label: string }> = {
                renewal_upcoming: { icon: Calendar, color: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900', label: 'Upcoming Renewal' },
                price_increase: { icon: TrendingDown, color: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900', label: 'Price Increase' },
                trial_ending: { icon: AlertTriangle, color: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900', label: 'Trial Ending' },
                payment_failed: { icon: AlertTriangle, color: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900', label: 'Payment Issue' },
                duplicate_detected: { icon: AlertTriangle, color: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900', label: 'Possible Duplicate' },
                unused: { icon: PiggyBank, color: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900', label: 'Unused Subscription' },
                confirmation_needed: { icon: Search, color: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-900', label: 'Needs Confirmation' },
              }}
              {@const config = alertTypeLabels[alert.alertType] ?? alertTypeLabels.renewal_upcoming}
              {@const AlertIcon = config.icon}

              <div class="flex items-center justify-between rounded-lg border p-4 {config.color}">
                <div class="flex items-center gap-3">
                  <AlertIcon class="h-5 w-5" />
                  <div>
                    <p class="font-medium">{config.label}</p>
                    <p class="text-muted-foreground text-sm">
                      {alert.subscription?.name ?? 'Unknown subscription'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => handleDismissAlert(alert.id)}
                  disabled={dismissAlertMutation.isPending}
                >
                  Dismiss
                </Button>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    </Tabs.Content>

    <!-- Upcoming Renewals Tab -->
    <Tabs.Content value="upcoming" class="mt-4">
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Calendar class="h-5 w-5" />
            Upcoming Renewals
          </Card.Title>
          <Card.Description>
            Subscriptions renewing in the next 14 days
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="space-y-3">
            {#each upcomingRenewals as subscription}
              {@const daysUntil = subscription.renewalDate
                ? Math.ceil((new Date(subscription.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : 0}

              <div class="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p class="font-medium">{subscription.name}</p>
                  <p class="text-muted-foreground text-sm">
                    Renews {subscription.renewalDate ? new Date(subscription.renewalDate).toLocaleDateString() : 'soon'}
                    {#if daysUntil > 0}
                      <span class="text-amber-600">({daysUntil} day{daysUntil !== 1 ? 's' : ''})</span>
                    {:else if daysUntil === 0}
                      <span class="text-red-600">(Today!)</span>
                    {/if}
                  </p>
                </div>
                <div class="text-right">
                  <div class="font-semibold">{currencyFormatter.format(subscription.amount)}</div>
                </div>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    </Tabs.Content>
  </Tabs.Root>

  <!-- Category Breakdown -->
  {#if analytics?.byType && Object.keys(analytics.byType).length > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title>Subscriptions by Category</Card.Title>
        <Card.Description>Breakdown of your subscriptions by type</Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {#each Object.entries(analytics.byType) as [category, data]}
            {@const typeConfig = subscriptionTypeConfig[category] ?? subscriptionTypeConfig.other}
            <div class="flex items-center justify-between rounded-lg border p-3">
              <div class="flex items-center gap-2">
                <Badge variant="outline" class={typeConfig.color}>
                  {typeConfig.label}
                </Badge>
              </div>
              <div class="text-right">
                <span class="text-sm font-medium">{data.count}</span>
                <span class="text-muted-foreground text-xs ml-1">
                  ({currencyFormatter.format(data.monthlyCost)}/mo)
                </span>
              </div>
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>

<!-- Form Dialog -->
<SubscriptionFormDialog
  bind:open={formDialogOpen}
  subscription={editingSubscription}
  onSaved={() => {
    formDialogOpen = false;
    editingSubscription = undefined;
  }}
/>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteConfirmOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Subscription?</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete "{subscriptionToDelete?.name}"? This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={() => (subscriptionToDelete = null)}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={handleDelete}>Delete</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
