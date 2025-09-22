<script lang="ts">
  import { Select } from '$lib/components/ui';
  import { Button } from '$lib/components/ui';
  import { Badge } from '$lib/components/ui';
  import { Calendar, ChevronLeft, ChevronRight, Plus } from '@lucide/svelte';
  import { formatDateDisplay, parseISOString, addPeriod, currentDate } from '$lib/utils/dates';
  import type { DateValue } from '@internationalized/date';

  interface BudgetPeriod {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    status?: 'active' | 'upcoming' | 'completed';
  }

  interface Props {
    periods?: BudgetPeriod[];
    selectedPeriodId?: number | null;
    onSelect?: (periodId: number | null) => void;
    onCreatePeriod?: () => void;
    onNavigate?: (direction: 'prev' | 'next') => void;
    showNavigation?: boolean;
    showCreateButton?: boolean;
    disabled?: boolean;
    class?: string;
  }

  let {
    periods = [],
    selectedPeriodId = $bindable(),
    onSelect,
    onCreatePeriod,
    onNavigate,
    showNavigation = true,
    showCreateButton = true,
    disabled = false,
    class: className,
  }: Props = $props();

  const selectedPeriod = $derived.by(() => {
    if (!selectedPeriodId) return null;
    return periods.find(period => period.id === selectedPeriodId) || null;
  });

  const sortedPeriods = $derived.by(() => {
    return [...periods].sort((a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  });

  const currentPeriodIndex = $derived.by(() => {
    if (!selectedPeriod) return -1;
    return sortedPeriods.findIndex(period => period.id === selectedPeriod.id);
  });

  const hasPrevious = $derived(() => currentPeriodIndex > 0);
  const hasNext = $derived(() => currentPeriodIndex >= 0 && currentPeriodIndex < sortedPeriods.length - 1);

  function getPeriodStatus(period: BudgetPeriod): 'active' | 'upcoming' | 'completed' {
    if (period.status) return period.status;

    const today = currentDate;
    const startDate = parseISOString(period.startDate);
    const endDate = parseISOString(period.endDate);

    if (!startDate || !endDate) return 'completed';

    if (today.compare(startDate) < 0) {
      return 'upcoming';
    } else if (today.compare(endDate) > 0) {
      return 'completed';
    } else {
      return 'active';
    }
  }

  function getStatusColor(status: 'active' | 'upcoming' | 'completed'): string {
    switch (status) {
      case 'active':
        return 'hsl(var(--success))';
      case 'upcoming':
        return 'hsl(var(--primary))';
      case 'completed':
        return 'hsl(var(--muted-foreground))';
      default:
        return 'hsl(var(--muted-foreground))';
    }
  }

  function getStatusLabel(status: 'active' | 'upcoming' | 'completed'): string {
    switch (status) {
      case 'active':
        return 'Active';
      case 'upcoming':
        return 'Upcoming';
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  }

  function formatPeriodRange(period: BudgetPeriod): string {
    const startDate = parseISOString(period.startDate);
    const endDate = parseISOString(period.endDate);

    if (!startDate || !endDate) return 'Invalid dates';

    const startFormatted = formatDateDisplay(startDate, 'short');
    const endFormatted = formatDateDisplay(endDate, 'short');

    return `${startFormatted} - ${endFormatted}`;
  }

  function handleSelect(value: string | undefined) {
    if (value === 'create-new') {
      onCreatePeriod?.();
    } else if (value) {
      const periodId = parseInt(value);
      selectedPeriodId = periodId;
      onSelect?.(periodId);
    }
  }

  function handleNavigate(direction: 'prev' | 'next') {
    if (!showNavigation || currentPeriodIndex === -1) return;

    let newIndex: number;
    if (direction === 'prev' && hasPrevious) {
      newIndex = currentPeriodIndex - 1;
    } else if (direction === 'next' && hasNext) {
      newIndex = currentPeriodIndex + 1;
    } else {
      return;
    }

    const newPeriod = sortedPeriods[newIndex];
    if (newPeriod) {
      selectedPeriodId = newPeriod.id;
      onSelect?.(newPeriod.id);
      onNavigate?.(direction);
    }
  }
</script>

<div class="flex items-center gap-2 {className || ''}">
  <!-- Navigation Controls -->
  {#if showNavigation}
    <Button
      variant="outline"
      size="sm"
      onclick={() => handleNavigate('prev')}
      disabled={disabled || !hasPrevious}
      class="p-2"
    >
      <ChevronLeft class="h-4 w-4" />
    </Button>
  {/if}

  <!-- Period Selector -->
  <div class="flex-1 min-w-0">
    <Select.Root
      value={selectedPeriodId?.toString()}
      onSelectedChange={handleSelect}
      {disabled}
    >
      <Select.Trigger class="w-full">
        <div class="flex items-center gap-2 min-w-0">
          <Calendar class="h-4 w-4 text-muted-foreground flex-shrink-0" />
          {#if selectedPeriod}
            <div class="flex items-center gap-2 min-w-0">
              {@const status = getPeriodStatus(selectedPeriod)}
              <Badge
                variant="outline"
                style="border-color: {getStatusColor(status)}; color: {getStatusColor(status)}"
                class="flex-shrink-0 text-xs"
              >
                {getStatusLabel(status)}
              </Badge>
              <div class="min-w-0">
                <div class="truncate font-medium">{selectedPeriod.name}</div>
                <div class="text-xs text-muted-foreground truncate">
                  {formatPeriodRange(selectedPeriod)}
                </div>
              </div>
            </div>
          {:else}
            <span class="text-muted-foreground">Select a period...</span>
          {/if}
        </div>
      </Select.Trigger>

      <Select.Content>
        <Select.Group>
          {#if sortedPeriods.length === 0}
            <Select.Item value="" disabled class="text-muted-foreground">
              No periods available
            </Select.Item>
          {:else}
            {#each sortedPeriods as period (period.id)}
              {@const status = getPeriodStatus(period)}
              <Select.Item value={period.id.toString()}>
                <div class="flex items-center gap-2 w-full">
                  <Badge
                    variant="outline"
                    style="border-color: {getStatusColor(status)}; color: {getStatusColor(status)}"
                    class="flex-shrink-0 text-xs"
                  >
                    {getStatusLabel(status)}
                  </Badge>
                  <div class="flex flex-col min-w-0">
                    <span class="truncate font-medium">{period.name}</span>
                    <span class="text-xs text-muted-foreground truncate">
                      {formatPeriodRange(period)}
                    </span>
                  </div>
                </div>
              </Select.Item>
            {/each}
          {/if}

          {#if showCreateButton && onCreatePeriod}
            <Select.Separator />
            <Select.Item value="create-new" class="text-primary">
              <div class="flex items-center gap-2">
                <Plus class="h-4 w-4" />
                <span>Create new period</span>
              </div>
            </Select.Item>
          {/if}
        </Select.Group>
      </Select.Content>
    </Select.Root>
  </div>

  <!-- Navigation Controls -->
  {#if showNavigation}
    <Button
      variant="outline"
      size="sm"
      onclick={() => handleNavigate('next')}
      disabled={disabled || !hasNext}
      class="p-2"
    >
      <ChevronRight class="h-4 w-4" />
    </Button>
  {/if}

  <!-- Create Period Button -->
  {#if showCreateButton && onCreatePeriod && !showNavigation}
    <Button
      variant="outline"
      size="sm"
      onclick={onCreatePeriod}
      {disabled}
      class="flex-shrink-0"
    >
      <Plus class="h-4 w-4" />
    </Button>
  {/if}
</div>