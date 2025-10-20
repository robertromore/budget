<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Badge } from '$lib/components/ui/badge';
import { Separator } from '$lib/components/ui/separator';
import { currencyFormatter } from '$lib/utils/formatters';
import { formatAmount, formatRecurringPattern, calculateNextOccurrence } from '../(data)';
import type { ScheduleWithDetails } from '$lib/server/domains/schedules';

// Icons
import Calendar from '@lucide/svelte/icons/calendar';
import Clock from '@lucide/svelte/icons/clock';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Activity from '@lucide/svelte/icons/activity';
import CalendarDays from '@lucide/svelte/icons/calendar-days';
import Building from '@lucide/svelte/icons/building';

let { schedule, statistics, futureProjections }: {
  schedule: ScheduleWithDetails | null;
  statistics: any;
  futureProjections: any[];
} = $props();
</script>

{#if schedule}
<div class="space-y-4">
  <!-- Key Metrics Cards -->
  <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
    <!-- Amount Card -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-1">
        <Card.Title class="text-xs font-medium">Amount</Card.Title>
        <DollarSign class="h-3 w-3 text-muted-foreground" />
      </Card.Header>
      <Card.Content class="pt-1">
        <div class="text-lg font-bold">{formatAmount(schedule)}</div>
        <p class="text-xs text-muted-foreground">
          {schedule.amount_type || 'fixed'} amount
        </p>
      </Card.Content>
    </Card.Root>

    <!-- Status Card -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-1">
        <Card.Title class="text-xs font-medium">Status</Card.Title>
        <Activity class="h-3 w-3 text-muted-foreground" />
      </Card.Header>
      <Card.Content class="pt-1">
        <div class="text-lg font-bold capitalize">{schedule.status}</div>
        <p class="text-xs text-muted-foreground">
          {#if schedule.scheduleDate}
            {formatRecurringPattern(schedule)}
          {:else}
            One-time schedule
          {/if}
        </p>
      </Card.Content>
    </Card.Root>

    <!-- Next Occurrence Card -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-1">
        <Card.Title class="text-xs font-medium">Next Occurrence</Card.Title>
        <CalendarDays class="h-3 w-3 text-muted-foreground" />
      </Card.Header>
      <Card.Content class="pt-1">
        <div class="text-lg font-bold">
          {#if schedule.scheduleDate}
            {calculateNextOccurrence(schedule)}
          {:else}
            N/A
          {/if}
        </div>
        <p class="text-xs text-muted-foreground">
          Next due date
        </p>
      </Card.Content>
    </Card.Root>

    <!-- Total Transactions Card -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-1">
        <Card.Title class="text-xs font-medium">Total Transactions</Card.Title>
        <TrendingUp class="h-3 w-3 text-muted-foreground" />
      </Card.Header>
      <Card.Content class="pt-1">
        <div class="text-lg font-bold">{statistics.totalTransactions}</div>
        <p class="text-xs text-muted-foreground">
          Avg: {currencyFormatter.format(statistics.averageAmount)}
        </p>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Schedule Details -->
  <div class="grid gap-3 md:grid-cols-2">
    <!-- Account & Payee Info -->
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="flex items-center gap-2 text-sm">
          <Building class="h-4 w-4" />
          Transaction Details
        </Card.Title>
      </Card.Header>
      <Card.Content class="space-y-2 pt-2">
        <div class="flex justify-between items-center">
          <span class="text-xs text-muted-foreground">Account</span>
          <span class="text-sm font-medium">{schedule.account?.name || 'None'}</span>
        </div>
        <Separator />
        <div class="flex justify-between items-center">
          <span class="text-xs text-muted-foreground">Payee</span>
          <span class="text-sm font-medium">{schedule.payee?.name || 'None'}</span>
        </div>
        <Separator />
        <div class="flex justify-between items-center">
          <span class="text-xs text-muted-foreground">Amount Type</span>
          <Badge variant="outline" class="text-xs">{schedule.amount_type}</Badge>
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Schedule Pattern -->
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="flex items-center gap-2 text-sm">
          <Clock class="h-4 w-4" />
          Schedule Pattern
        </Card.Title>
      </Card.Header>
      <Card.Content class="space-y-2 pt-2">
        {#if schedule.scheduleDate}
          <div class="flex justify-between items-center">
            <span class="text-xs text-muted-foreground">Frequency</span>
            <span class="text-sm font-medium">{formatRecurringPattern(schedule)}</span>
          </div>
          <Separator />
          <div class="flex justify-between items-center">
            <span class="text-xs text-muted-foreground">Start Date</span>
            <span class="text-sm font-medium">
              {new Date(schedule.scheduleDate.start).toLocaleDateString()}
            </span>
          </div>
          <Separator />
          <div class="flex justify-between items-center">
            <span class="text-xs text-muted-foreground">End Date</span>
            <span class="text-sm font-medium">
              {#if schedule.scheduleDate.end}
                {new Date(schedule.scheduleDate.end).toLocaleDateString()}
              {:else}
                —
              {/if}
            </span>
          </div>
          {#if schedule.scheduleDate.limit && schedule.scheduleDate.limit > 0}
            <Separator />
            <div class="flex justify-between items-center">
              <span class="text-xs text-muted-foreground">Limit</span>
              <span class="text-sm font-medium">
                {schedule.scheduleDate.limit} occurrences
              </span>
            </div>
          {/if}
        {:else}
          <div class="text-center py-2">
            <Calendar class="h-6 w-6 mx-auto text-muted-foreground mb-1" />
            <p class="text-xs text-muted-foreground">One-time schedule</p>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Upcoming Transactions Preview -->
  {#if futureProjections.length > 0}
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm">Upcoming Transactions</Card.Title>
        <Card.Description class="text-xs">
          Next few scheduled occurrences
        </Card.Description>
      </Card.Header>
      <Card.Content class="pt-2">
        <div class="space-y-2">
          {#each futureProjections.slice(0, 4) as projection, index}
            <div class="flex items-center justify-between p-2 bg-muted/30 rounded">
              <div class="flex items-center gap-2">
                <CalendarDays class="h-3 w-3 text-muted-foreground" />
                <div>
                  <div class="text-sm font-medium">
                    {projection.date.toLocaleDateString()}
                  </div>
                  <div class="text-xs text-muted-foreground">
                    {Math.ceil((projection.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days from now
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm font-medium">
                  {formatAmount(schedule)}
                </div>
                {#if index === 0}
                  <Badge variant="default" class="text-xs">Next</Badge>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
{/if}