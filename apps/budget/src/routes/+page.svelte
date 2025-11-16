<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Button } from '$lib/components/ui/button';
import PayeeAnalyticsSummary from '$lib/components/dashboard/payee-analytics-summary.svelte';
import Home from '@lucide/svelte/icons/home';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Receipt from '@lucide/svelte/icons/receipt';
import Users from '@lucide/svelte/icons/users';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import Calendar from '@lucide/svelte/icons/calendar';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { PayeesState } from '$lib/states/entities/payees.svelte';
import { SchedulesState } from '$lib/states/entities/schedules.svelte';
import { currencyFormatter } from '$lib/utils/formatters';

// Get state data
const accountsState = $derived(AccountsState.get());
const totalBalance = $derived(accountsState.getTotalBalance());
const accounts = $derived(Array.from(accountsState.accounts.values()));

const payeesState = $derived(PayeesState.get());
const payees = $derived(Array.from(payeesState.payees.values()));

const schedulesState = $derived(SchedulesState.get());
const schedules = $derived(Array.from(schedulesState.schedules.values()));
</script>

<svelte:head>
  <title>Dashboard - Budget App</title>
  <meta
    name="description"
    content="Your personal finance dashboard with comprehensive insights and analytics" />
</svelte:head>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
        <Home class="text-primary h-8 w-8" />
        Dashboard
      </h1>
      <p class="text-muted-foreground mt-1">Welcome to your personal finance overview</p>
    </div>
  </div>

  <!-- Quick Stats Overview -->
  <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Total Balance</Card.Title>
        <CreditCard class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        <div
          class="text-2xl font-bold"
          class:text-green-600={totalBalance > 0}
          class:text-red-600={totalBalance < 0}
          class:text-muted-foreground={totalBalance === 0}>
          {currencyFormatter.format(totalBalance)}
        </div>
        <p class="text-muted-foreground text-xs">
          Across {accounts.length} accounts
        </p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Active Accounts</Card.Title>
        <CreditCard class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{accounts.filter((a) => !a.closed).length}</div>
        <p class="text-muted-foreground text-xs">
          {accounts.length} total accounts
        </p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Payees</Card.Title>
        <Users class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{payees.length}</div>
        <p class="text-muted-foreground text-xs">Managed entities</p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Schedules</Card.Title>
        <Calendar class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{schedules.length}</div>
        <p class="text-muted-foreground text-xs">Recurring transactions</p>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Main Content Grid -->
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <!-- Payee Analytics Summary -->
    <PayeeAnalyticsSummary />

    <!-- Quick Actions Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Receipt class="h-5 w-5 text-green-500" />
          Quick Actions
        </Card.Title>
        <Card.Description>Common tasks and navigation shortcuts</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="grid grid-cols-1 gap-3">
          <Button variant="outline" href="/accounts" class="justify-start">
            <CreditCard class="mr-2 h-4 w-4" />
            Manage Accounts
          </Button>
          <Button variant="outline" href="/payees" class="justify-start">
            <Users class="mr-2 h-4 w-4" />
            Manage Payees
          </Button>
          <Button variant="outline" href="/schedules" class="justify-start">
            <Calendar class="mr-2 h-4 w-4" />
            Manage Schedules
          </Button>
          <Button variant="outline" href="/payees/analytics" class="justify-start">
            <BarChart3 class="mr-2 h-4 w-4" />
            Payee Analytics
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Additional Analytics Section -->
  <div class="space-y-4">
    <h2 class="text-xl font-bold tracking-tight">Financial Overview</h2>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card.Root>
        <Card.Header>
          <Card.Title class="text-sm">Account Summary</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each accounts.slice(0, 5) as account}
              <div class="flex items-center justify-between">
                <span class="truncate text-sm font-medium">{account.name}</span>
                <span
                  class="text-sm"
                  class:text-green-600={account.balance && account.balance > 0}
                  class:text-red-600={account.balance && account.balance < 0}
                  class:text-muted-foreground={!account.balance || account.balance === 0}>
                  {currencyFormatter.format(account.balance || 0)}
                </span>
              </div>
            {/each}
            {#if accounts.length > 5}
              <div class="text-muted-foreground pt-2 text-center text-xs">
                +{accounts.length - 5} more accounts
              </div>
            {/if}
          </div>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title class="text-sm">Recent Payees</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each payees.slice(0, 5) as payee}
              <div class="flex items-center justify-between">
                <span class="truncate text-sm font-medium">{payee.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  href="/payees/{payee.slug}/analytics"
                  class="h-6 px-2 text-xs">
                  Analytics
                </Button>
              </div>
            {/each}
            {#if payees.length > 5}
              <div class="text-muted-foreground pt-2 text-center text-xs">
                +{payees.length - 5} more payees
              </div>
            {/if}
          </div>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title class="text-sm">Active Schedules</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            {#each schedules.slice(0, 5) as schedule}
              <div class="flex items-center justify-between">
                <span class="truncate text-sm font-medium">{schedule.name}</span>
                <span class="text-muted-foreground text-xs capitalize">
                  {schedule.status}
                </span>
              </div>
            {/each}
            {#if schedules.length > 5}
              <div class="text-muted-foreground pt-2 text-center text-xs">
                +{schedules.length - 5} more schedules
              </div>
            {/if}
          </div>
        </Card.Content>
      </Card.Root>
    </div>
  </div>
</div>
