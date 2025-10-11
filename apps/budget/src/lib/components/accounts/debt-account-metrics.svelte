<script lang="ts">
import type {Account} from '$lib/schema/accounts';
import {calculateDebtMetrics, formatCurrency, formatPercentage} from '$lib/utils/account-display';
import * as Card from '$lib/components/ui/card';
import {Progress} from '$lib/components/ui/progress';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import CreditCard from '@lucide/svelte/icons/credit-card';
import AlertCircle from '@lucide/svelte/icons/alert-circle';

let {account} = $props<{account: Account}>();

const metrics = $derived(calculateDebtMetrics(account));
const isCreditCard = $derived(account.accountType === 'credit_card');
const isLoan = $derived(account.accountType === 'loan');
</script>

{#if metrics}
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {#if isCreditCard && metrics.availableCredit !== undefined}
      <!-- Available Credit -->
      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">Available Credit</Card.Title>
          <CreditCard class="h-4 w-4 text-muted-foreground"></CreditCard>
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold {metrics.availableCredit > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
            {formatCurrency(metrics.availableCredit)}
          </div>
          <p class="text-xs text-muted-foreground">
            {formatCurrency(account.balance ? Math.abs(account.balance) : 0)} of {formatCurrency(account.debtLimit || 0)} used
          </p>
        </Card.Content>
      </Card.Root>

      <!-- Credit Utilization -->
      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">Credit Utilization</Card.Title>
          <TrendingUp class="h-4 w-4 text-muted-foreground"></TrendingUp>
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold" class:text-green-600={metrics.creditUtilization! < 30} class:text-yellow-600={metrics.creditUtilization! >= 30 && metrics.creditUtilization! < 70} class:text-red-600={metrics.creditUtilization! >= 70} class:dark:text-green-400={metrics.creditUtilization! < 30} class:dark:text-yellow-400={metrics.creditUtilization! >= 30 && metrics.creditUtilization! < 70} class:dark:text-red-400={metrics.creditUtilization! >= 70}>
            {formatPercentage(metrics.creditUtilization!)}
          </div>
          <Progress value={metrics['creditUtilization']} class="mt-2" />
          <p class="mt-1 text-xs text-muted-foreground">
            {metrics.creditUtilization! < 30 ? 'Excellent' : metrics.creditUtilization! < 70 ? 'Good' : 'High usage'}
          </p>
        </Card.Content>
      </Card.Root>

      <!-- Over Limit Warning -->
      {#if metrics.isOverLimit}
        <Card.Root class="border-red-600 bg-red-50 dark:bg-red-950">
          <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
            <Card.Title class="text-sm font-medium text-red-600 dark:text-red-400">Over Limit</Card.Title>
            <AlertCircle class="h-4 w-4 text-red-600 dark:text-red-400"></AlertCircle>
          </Card.Header>
          <Card.Content>
            <div class="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency((account.balance ? Math.abs(account.balance) : 0) - (account.debtLimit || 0))}
            </div>
            <p class="text-xs text-red-600 dark:text-red-400">
              Balance exceeds credit limit
            </p>
          </Card.Content>
        </Card.Root>
      {/if}
    {/if}

    {#if isLoan && metrics.remainingBalance !== undefined}
      <!-- Remaining Balance -->
      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">Remaining Balance</Card.Title>
          <TrendingDown class="h-4 w-4 text-muted-foreground"></TrendingDown>
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(metrics.remainingBalance)}
          </div>
          <p class="text-xs text-muted-foreground">
            Of {formatCurrency(account.debtLimit || 0)} original loan
          </p>
        </Card.Content>
      </Card.Root>

      <!-- Payoff Progress -->
      {#if metrics.payoffProgress !== undefined}
        <Card.Root>
          <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
            <Card.Title class="text-sm font-medium">Payoff Progress</Card.Title>
            <TrendingUp class="h-4 w-4 text-muted-foreground"></TrendingUp>
          </Card.Header>
          <Card.Content>
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatPercentage(metrics.payoffProgress)}
            </div>
            <Progress value={metrics.payoffProgress} class="mt-2" />
            <p class="mt-1 text-xs text-muted-foreground">
              {formatCurrency((account.debtLimit || 0) - metrics.remainingBalance)} paid off
            </p>
          </Card.Content>
        </Card.Root>
      {/if}
    {/if}

    <!-- Minimum Payment (if configured) -->
    {#if account.minimumPayment}
      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">Minimum Payment</Card.Title>
          <CreditCard class="h-4 w-4 text-muted-foreground"></CreditCard>
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">
            {formatCurrency(account.minimumPayment)}
          </div>
          {#if account.paymentDueDay}
            <p class="text-xs text-muted-foreground">
              Due on day {account.paymentDueDay} of each month
            </p>
          {:else}
            <p class="text-xs text-muted-foreground">
              Monthly payment
            </p>
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Interest Rate (if configured) -->
    {#if account.interestRate}
      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
          <Card.Title class="text-sm font-medium">Interest Rate</Card.Title>
          <TrendingUp class="h-4 w-4 text-muted-foreground"></TrendingUp>
        </Card.Header>
        <Card.Content>
          <div class="text-2xl font-bold">
            {formatPercentage(account.interestRate)}
          </div>
          <p class="text-xs text-muted-foreground">
            APR
          </p>
        </Card.Content>
      </Card.Root>
    {/if}
  </div>
{/if}
