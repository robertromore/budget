<script lang="ts">
import { ResponsiveSheet } from '$lib/components/ui/responsive-sheet';
import Button from '$lib/components/ui/button/button.svelte';
import Badge from '$lib/components/ui/badge/badge.svelte';
import Calendar from '@lucide/svelte/icons/calendar';
import ExternalLink from '@lucide/svelte/icons/external-link';
import CalendarX from '@lucide/svelte/icons/calendar-x';
import { currencyFormatter } from '$lib/utils/formatters';
import { goto } from '$app/navigation';
import { openSkipOccurrenceDialog } from '$lib/states/ui/global.svelte';

interface Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  scheduleId?: number | undefined;
  scheduleSlug?: string | undefined;
  scheduleName?: string | undefined;
  amount?: number | undefined;
  frequency?: string | undefined;
  interval?: number | undefined;
  nextOccurrence?: string | undefined;
  occurrenceDate?: string | undefined;
}

let {
  open = $bindable(false),
  onOpenChange,
  scheduleId,
  scheduleSlug,
  scheduleName = 'Unknown Schedule',
  amount = 0,
  frequency,
  interval = 1,
  nextOccurrence,
  occurrenceDate,
}: Props = $props();

const formatFrequency = (freq?: string, int: number = 1) => {
  if (!freq) return 'Unknown';

  const frequencies: Record<string, string> = {
    daily: int === 1 ? 'Daily' : `Every ${int} days`,
    weekly: int === 1 ? 'Weekly' : `Every ${int} weeks`,
    monthly: int === 1 ? 'Monthly' : `Every ${int} months`,
    yearly: int === 1 ? 'Yearly' : `Every ${int} years`,
  };

  return frequencies[freq] || freq;
};

const getFrequencyColor = (freq?: string) => {
  const colors: Record<string, string> = {
    daily: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    weekly: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    monthly: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    yearly: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  };

  return colors[freq || ''] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
};

const formatNextOccurrence = (date?: string) => {
  if (!date) return 'Not scheduled';

  const nextDate = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (nextDate.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (nextDate.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return nextDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
};

const handleViewFullSchedule = () => {
  if (scheduleSlug) {
    goto(`/schedules/${scheduleSlug}`);
  }
};

const handleSkipOccurrence = () => {
  const dateToSkip = occurrenceDate || nextOccurrence;
  if (scheduleId && dateToSkip) {
    open = false;
    openSkipOccurrenceDialog(scheduleId, scheduleName, dateToSkip);
  }
};

const canSkip = $derived.by(() => {
  return scheduleId && (occurrenceDate || nextOccurrence);
});
</script>

<ResponsiveSheet bind:open {onOpenChange}>
  {#snippet header()}
    <div class="flex items-center gap-3">
      <div
        class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
        <Calendar class="h-5 w-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <h2 class="text-lg font-semibold tracking-tight">Schedule Preview</h2>
        <p class="text-muted-foreground text-sm">Quick overview of scheduled transaction</p>
      </div>
    </div>
  {/snippet}

  {#snippet content()}
    <div class="flex-1 space-y-3">
      <!-- Schedule Name & Amount -->
      <div class="space-y-3">
        <div>
          <h3 class="text-lg font-medium">{scheduleName}</h3>
          <p class="text-foreground text-2xl font-bold">
            {currencyFormatter.format(Math.abs(amount))}
          </p>
          <p class="text-muted-foreground text-sm">
            {amount < 0 ? 'Expense' : 'Income'} • Auto-scheduled
          </p>
        </div>
      </div>

      <!-- Frequency -->
      <div class="space-y-2">
        <h4 class="text-muted-foreground text-sm font-medium">Frequency</h4>
        <Badge class={getFrequencyColor(frequency)}>
          {formatFrequency(frequency, interval)}
        </Badge>
      </div>

      <!-- Next Occurrence -->
      {#if nextOccurrence}
        <div class="space-y-2">
          <h4 class="text-muted-foreground text-sm font-medium">Next Occurrence</h4>
          <p class="text-sm">{formatNextOccurrence(nextOccurrence)}</p>
        </div>
      {/if}

      <!-- Schedule Details -->
      <div class="bg-muted/50 space-y-2 rounded-lg p-4">
        <h4 class="text-sm font-medium">Schedule Information</h4>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-muted-foreground">Schedule ID:</span>
            <span class="ml-2">#{scheduleId}</span>
          </div>
          <div>
            <span class="text-muted-foreground">Type:</span>
            <span class="ml-2">Recurring</span>
          </div>
        </div>
      </div>

      <!-- Info Note -->
      <div
        class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/50">
        <p class="text-sm text-blue-800 dark:text-blue-300">
          This is a preview of an upcoming scheduled transaction. The actual transaction will be
          created automatically on the scheduled date.
        </p>
      </div>
    </div>
  {/snippet}

  {#snippet footer()}
    <div class="flex gap-2 px-3 py-3">
      <Button variant="outline" onclick={() => (open = false)}>Close</Button>
      {#if canSkip}
        <Button variant="outline" onclick={handleSkipOccurrence}>
          <CalendarX class="mr-2 h-4 w-4" />
          Skip
        </Button>
      {/if}
      <Button onclick={handleViewFullSchedule} class="flex-1">
        <ExternalLink class="mr-2 h-4 w-4" />
        View Schedule
      </Button>
    </div>
  {/snippet}
</ResponsiveSheet>
