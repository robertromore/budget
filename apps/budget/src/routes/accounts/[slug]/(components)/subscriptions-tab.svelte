<!--
  Subscriptions Tab

  Displays subscriptions that have transactions in this specific account.
-->
<script lang="ts">
import { goto } from '$app/navigation';
import { Badge } from '$lib/components/ui/badge';
import * as Card from '$lib/components/ui/card';
import * as Empty from '$lib/components/ui/empty';
import { Skeleton } from '$lib/components/ui/skeleton';
import { rpc } from '$lib/query';
import { currencyFormatter } from '$lib/utils/formatters';
import ArrowRight from '@lucide/svelte/icons/arrow-right';
import CreditCard from '@lucide/svelte/icons/credit-card';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import RefreshCw from '@lucide/svelte/icons/refresh-cw';
import Search from '@lucide/svelte/icons/search';

interface Props {
  accountId: number;
  accountSlug: string;
}

let { accountId, accountSlug }: Props = $props();

// Query subscriptions for this account
const subscriptionsQuery = $derived(rpc.payees.getSubscriptionsForAccount(accountId).options());
const subscriptionsData = $derived(subscriptionsQuery.data);
const isLoading = $derived(subscriptionsQuery.isLoading);

// Subscription type styling
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

const billingCycleLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
  irregular: 'Irregular',
};

function viewPayeeDetails(slug: string) {
  goto(`/payees/${slug}`);
}
</script>

<div class="space-y-6">
  {#if isLoading}
    <!-- Loading State -->
    <div class="grid gap-4 md:grid-cols-3">
      {#each { length: 3 } as _, i (i)}
        <Card.Root>
          <Card.Header class="pb-2">
            <Skeleton class="h-4 w-24" />
          </Card.Header>
          <Card.Content>
            <Skeleton class="h-8 w-16" />
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
    <Card.Root>
      <Card.Content class="pt-6">
        <div class="space-y-3">
          {#each { length: 4 } as _, i (i)}
            <Skeleton class="h-16 w-full rounded-lg" />
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {:else if !subscriptionsData || subscriptionsData.subscriptions.length === 0}
    <!-- Empty State -->
    <Empty.Empty>
      <Empty.EmptyMedia variant="icon">
        <Search class="size-6" />
      </Empty.EmptyMedia>
      <Empty.EmptyHeader>
        <Empty.EmptyTitle>No Subscriptions Found</Empty.EmptyTitle>
        <Empty.EmptyDescription>
          No recurring subscription payments detected in this account. As you add more
          transactions, we'll automatically identify subscription patterns.
        </Empty.EmptyDescription>
      </Empty.EmptyHeader>
    </Empty.Empty>
  {:else}
    <!-- Summary Cards -->
    <div class="grid gap-4 md:grid-cols-3">
      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">Subscriptions</Card.Title>
          <CreditCard class="text-muted-foreground h-4 w-4" />
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">{subscriptionsData.summary.totalCount}</div>
          <p class="text-muted-foreground text-xs">Detected in this account</p>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">Monthly Cost</Card.Title>
          <DollarSign class="text-muted-foreground h-4 w-4" />
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">
            {currencyFormatter.format(subscriptionsData.summary.totalMonthlyCost)}
          </div>
          <p class="text-muted-foreground text-xs">Estimated monthly spend</p>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">Annual Cost</Card.Title>
          <DollarSign class="text-muted-foreground h-4 w-4" />
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">
            {currencyFormatter.format(subscriptionsData.summary.totalAnnualCost)}
          </div>
          <p class="text-muted-foreground text-xs">Projected yearly spend</p>
        </Card.Content>
      </Card.Root>
    </div>

    <!-- Subscriptions List -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Subscriptions in this Account</Card.Title>
        <Card.Description>
          {subscriptionsData.subscriptions.length} recurring payment{subscriptionsData.subscriptions.length !== 1 ? 's' : ''} detected
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="space-y-3">
          {#each subscriptionsData.subscriptions as subscription (subscription.payeeId)}
            {@const typeConfig = subscriptionTypeConfig[subscription.subscriptionType] ?? subscriptionTypeConfig.other}
            {@const billingLabel = billingCycleLabels[subscription.billingCycle] ?? 'Monthly'}

            <button
              type="button"
              class="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors"
              onclick={() => viewPayeeDetails(subscription.payeeSlug)}
            >
              <div class="flex items-center gap-4">
                <div class="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                  <RefreshCw class="text-muted-foreground h-5 w-5" />
                </div>

                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{subscription.payeeName}</span>
                    <Badge variant="outline" class={typeConfig.color}>
                      {typeConfig.label}
                    </Badge>
                  </div>
                  <div class="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span>{billingLabel}</span>
                    <span class="text-muted-foreground/50">·</span>
                    <span>{subscription.transactionCount} transactions</span>
                    <span class="text-muted-foreground/50">·</span>
                    <span>{Math.round(subscription.detectionConfidence * 100)}% confidence</span>
                    {#if subscription.budgetName}
                      <span class="text-muted-foreground/50">·</span>
                      <span class="text-primary/80">{subscription.budgetName}</span>
                    {/if}
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-4">
                <div class="text-right">
                  <div class="font-semibold">{currencyFormatter.format(subscription.baseCost)}</div>
                  <div class="text-muted-foreground text-xs">per {subscription.billingCycle}</div>
                </div>
                <ArrowRight class="text-muted-foreground h-4 w-4" />
              </div>
            </button>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
