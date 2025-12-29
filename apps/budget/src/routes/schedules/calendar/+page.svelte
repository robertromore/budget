<script lang="ts">
import { goto } from '$app/navigation';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Badge } from '$lib/components/ui/badge';
import * as Tooltip from '$lib/components/ui/tooltip';
import { Skeleton } from '$lib/components/ui/skeleton';
import type { Schedule } from '$lib/schema/schedules';
import { SchedulesState } from '$lib/states/entities';
import { currencyFormatter } from '$lib/utils/formatters';
import { nextDaily, nextMonthly, nextWeekly, nextYearly } from '$lib/utils/date-frequency';
import { currentDate, parseISOString } from '$lib/utils/dates';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Calendar from '@lucide/svelte/icons/calendar';
import ChevronLeft from '@lucide/svelte/icons/chevron-left';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import CreditCard from '@lucide/svelte/icons/credit-card';
import List from '@lucide/svelte/icons/list';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import TrendingUp from '@lucide/svelte/icons/trending-up';

// Get schedules from state
const schedulesState = SchedulesState.get();
const allSchedules = $derived(schedulesState.all);
const activeSchedules = $derived(allSchedules.filter(s => s.status === 'active'));

// Calendar state
let currentMonth = $state(new Date());
const currentYear = $derived(currentMonth.getFullYear());
const currentMonthIndex = $derived(currentMonth.getMonth());

const monthName = $derived(
  currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
);

// Navigate months
const previousMonth = () => {
  currentMonth = new Date(currentYear, currentMonthIndex - 1, 1);
};

const nextMonth = () => {
  currentMonth = new Date(currentYear, currentMonthIndex + 1, 1);
};

const goToToday = () => {
  currentMonth = new Date();
};

// Generate calendar grid
const calendarDays = $derived.by(() => {
  const firstDay = new Date(currentYear, currentMonthIndex, 1);
  const lastDay = new Date(currentYear, currentMonthIndex + 1, 0);
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = lastDay.getDate();

  const days: Array<{ date: Date | null; isCurrentMonth: boolean; isToday: boolean }> = [];

  // Add empty slots for days before the first of the month
  for (let i = 0; i < startDayOfWeek; i++) {
    const prevMonthDate = new Date(currentYear, currentMonthIndex, -startDayOfWeek + i + 1);
    days.push({ date: prevMonthDate, isCurrentMonth: false, isToday: false });
  }

  // Add days of the current month
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonthIndex, day);
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
    days.push({ date, isCurrentMonth: true, isToday });
  }

  // Add empty slots to complete the grid (6 rows)
  const totalSlots = Math.ceil(days.length / 7) * 7;
  while (days.length < totalSlots) {
    const nextMonthDay = days.length - startDayOfWeek - daysInMonth + 1;
    const nextMonthDate = new Date(currentYear, currentMonthIndex + 1, nextMonthDay);
    days.push({ date: nextMonthDate, isCurrentMonth: false, isToday: false });
  }

  return days;
});

// Generate schedule occurrences for the visible month
interface ScheduleOccurrence {
  schedule: Schedule;
  date: Date;
  amount: number;
}

const scheduleOccurrences = $derived.by(() => {
  const occurrences: ScheduleOccurrence[] = [];
  const monthStart = new Date(currentYear, currentMonthIndex, 1);
  const monthEnd = new Date(currentYear, currentMonthIndex + 1, 0);

  for (const schedule of activeSchedules) {
    if (!schedule.scheduleDate?.frequency) continue;

    const frequency = schedule.scheduleDate.frequency;
    const interval = schedule.scheduleDate.interval || 1;
    const startDateValue = parseISOString(schedule.scheduleDate.start) || currentDate;
    const endDateValue = schedule.scheduleDate.end
      ? parseISOString(schedule.scheduleDate.end)
      : null;

    // Generate dates for the visible range (with some buffer)
    const startOfRange = currentDate.subtract({ months: 1 });
    const endOfRange = currentDate.add({ months: 13 });

    let futureDates;
    switch (frequency) {
      case 'daily':
        futureDates = nextDaily(startDateValue, endOfRange, interval, 365);
        break;
      case 'weekly': {
        const weekDays = (schedule.scheduleDate.week_days || []) as number[];
        futureDates = nextWeekly(startDateValue, endOfRange, interval, weekDays, 100);
        break;
      }
      case 'monthly': {
        const scheduleDate = schedule.scheduleDate;
        const days = scheduleDate.days as number | number[] | null;
        const weeks = (scheduleDate.weeks || []) as number[];
        const weeksDays = (scheduleDate.weeks_days || []) as number[];
        const onDay =
          scheduleDate.on &&
          scheduleDate.on_type === 'day' &&
          days &&
          Array.isArray(days) &&
          days.length > 0;
        const onThe =
          scheduleDate.on &&
          scheduleDate.on_type === 'the' &&
          weeks.length &&
          weeksDays.length;

        if (onDay) {
          futureDates = nextMonthly(startDateValue, endOfRange, interval, days, [], [], 100);
        } else if (onThe) {
          futureDates = nextMonthly(startDateValue, endOfRange, interval, null, weeks, weeksDays, 100);
        } else {
          futureDates = nextMonthly(
            startDateValue,
            endOfRange,
            interval,
            startDateValue.day,
            [],
            [],
            100
          );
        }
        break;
      }
      case 'yearly':
        futureDates = nextYearly(startDateValue, startDateValue, endOfRange, interval, 20);
        break;
      default:
        continue;
    }

    // Filter to dates within the current month
    for (const dateValue of futureDates) {
      if (endDateValue && dateValue.compare(endDateValue) > 0) continue;

      const jsDate = new Date(dateValue.year, dateValue.month - 1, dateValue.day);
      if (jsDate >= monthStart && jsDate <= monthEnd) {
        occurrences.push({
          schedule,
          date: jsDate,
          amount: schedule.amount,
        });
      }
    }
  }

  return occurrences;
});

// Group occurrences by date
const occurrencesByDate = $derived.by(() => {
  const map = new Map<string, ScheduleOccurrence[]>();

  for (const occ of scheduleOccurrences) {
    const key = occ.date.toISOString().split('T')[0]!;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(occ);
  }

  return map;
});

// Calculate monthly totals
const monthlyIncome = $derived(
  scheduleOccurrences
    .filter(o => o.amount > 0)
    .reduce((sum, o) => sum + o.amount, 0)
);

const monthlyExpenses = $derived(
  scheduleOccurrences
    .filter(o => o.amount < 0)
    .reduce((sum, o) => sum + Math.abs(o.amount), 0)
);

const monthlyNet = $derived(monthlyIncome - monthlyExpenses);

// View schedule detail
const viewSchedule = (schedule: Schedule) => {
  goto(`/schedules/${schedule.slug}`);
};

// Day names
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
</script>

<svelte:head>
  <title>Bill Calendar - Budget App</title>
  <meta name="description" content="View your upcoming bills and scheduled payments on a calendar" />
</svelte:head>

<div class="container mx-auto space-y-6 py-6">
  <!-- Page Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" href="/schedules" class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to Schedules</span>
      </Button>
      <div>
        <h1 class="flex items-center gap-3 text-2xl font-bold tracking-tight">
          <Calendar class="text-muted-foreground h-6 w-6" />
          Bill Calendar
        </h1>
        <p class="text-muted-foreground mt-1">
          View your upcoming bills and scheduled payments
        </p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <Button variant="outline" href="/schedules">
        <List class="mr-2 h-4 w-4" />
        List View
      </Button>
    </div>
  </div>

  <!-- Monthly Summary Cards -->
  <div class="grid gap-4 md:grid-cols-3">
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Expected Income</Card.Title>
        <TrendingUp class="h-4 w-4 text-green-500" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold text-green-600 dark:text-green-400">
          {currencyFormatter.format(monthlyIncome)}
        </div>
        <p class="text-muted-foreground text-xs">
          From scheduled deposits
        </p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Expected Expenses</Card.Title>
        <TrendingDown class="h-4 w-4 text-red-500" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold text-red-600 dark:text-red-400">
          {currencyFormatter.format(monthlyExpenses)}
        </div>
        <p class="text-muted-foreground text-xs">
          From scheduled bills
        </p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Net Cash Flow</Card.Title>
        <CreditCard class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        <div
          class="text-2xl font-bold {monthlyNet >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}"
        >
          {currencyFormatter.format(monthlyNet)}
        </div>
        <p class="text-muted-foreground text-xs">
          Expected monthly balance
        </p>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Calendar -->
  <Card.Root>
    <Card.Header>
      <div class="flex items-center justify-between">
        <Card.Title>{monthName}</Card.Title>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" onclick={previousMonth}>
            <ChevronLeft class="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onclick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onclick={nextMonth}>
            <ChevronRight class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card.Header>
    <Card.Content>
      <!-- Calendar Grid -->
      <div class="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-gray-200 dark:bg-gray-800">
        <!-- Day Headers -->
        {#each dayNames as day}
          <div class="bg-muted p-2 text-center text-sm font-medium">
            {day}
          </div>
        {/each}

        <!-- Calendar Days -->
        {#each calendarDays as { date, isCurrentMonth, isToday }}
          {@const dateKey = date?.toISOString().split('T')[0] ?? ''}
          {@const dayOccurrences = occurrencesByDate.get(dateKey) ?? []}
          {@const dayTotal = dayOccurrences.reduce((sum, o) => sum + o.amount, 0)}

          <div
            class="min-h-[100px] bg-white p-1 dark:bg-gray-950"
            class:opacity-50={!isCurrentMonth}
          >
            <!-- Date Number -->
            <div class="mb-1 flex items-center justify-between">
              <span
                class="flex h-6 w-6 items-center justify-center rounded-full text-sm"
                class:bg-primary={isToday}
                class:text-primary-foreground={isToday}
                class:font-bold={isToday}
              >
                {date?.getDate()}
              </span>
              {#if dayOccurrences.length > 0}
                <span
                  class="text-xs font-medium"
                  class:text-green-600={dayTotal >= 0}
                  class:text-red-600={dayTotal < 0}
                >
                  {currencyFormatter.format(dayTotal)}
                </span>
              {/if}
            </div>

            <!-- Occurrences -->
            <div class="space-y-1">
              {#each dayOccurrences.slice(0, 3) as occ}
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <button
                      type="button"
                      class="flex w-full items-center justify-between rounded px-1 py-0.5 text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 {occ.amount > 0 ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}"
                      onclick={() => viewSchedule(occ.schedule)}
                    >
                      <span class="truncate">{occ.schedule.name}</span>
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p class="font-medium">{occ.schedule.name}</p>
                    <p class="text-muted-foreground text-xs">
                      {currencyFormatter.format(occ.amount)}
                    </p>
                    {#if occ.schedule.payee}
                      <p class="text-muted-foreground text-xs">
                        {occ.schedule.payee.name}
                      </p>
                    {/if}
                  </Tooltip.Content>
                </Tooltip.Root>
              {/each}
              {#if dayOccurrences.length > 3}
                <span class="text-muted-foreground px-1 text-xs">
                  +{dayOccurrences.length - 3} more
                </span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Upcoming Bills List -->
  {#if scheduleOccurrences.length > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title>Upcoming This Month</Card.Title>
        <Card.Description>
          All scheduled transactions for {monthName.split(' ')[0]}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="space-y-2">
          {#each [...scheduleOccurrences].sort((a, b) => a.date.getTime() - b.date.getTime()) as occ}
            <button
              type="button"
              class="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors"
              onclick={() => viewSchedule(occ.schedule)}
            >
              <div class="flex items-center gap-3">
                <div
                  class="flex h-10 w-10 flex-col items-center justify-center rounded-lg text-xs {occ.amount > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}"
                >
                  <span class="font-bold">{occ.date.getDate()}</span>
                  <span class="text-[10px]">{occ.date.toLocaleDateString('en-US', { month: 'short' })}</span>
                </div>
                <div>
                  <p class="font-medium">{occ.schedule.name}</p>
                  <p class="text-muted-foreground text-sm">
                    {occ.schedule.payee?.name ?? 'No payee'}
                    {#if occ.schedule.category}
                      <span class="text-muted-foreground/50"> • </span>
                      {occ.schedule.category.name}
                    {/if}
                  </p>
                </div>
              </div>
              <div class="text-right">
                <p
                  class="font-semibold"
                  class:text-green-600={occ.amount > 0}
                  class:text-red-600={occ.amount < 0}
                >
                  {currencyFormatter.format(occ.amount)}
                </p>
                <p class="text-muted-foreground text-xs">
                  {occ.date.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
              </div>
            </button>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
