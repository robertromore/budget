<script lang="ts">
  import {Button} from "$lib/components/ui/button";
  import * as Select from "$lib/components/ui/select";
  import Label from "$lib/components/ui/label/label.svelte";
  import {cn} from "$lib/utils";
  import {rawDateFormatter} from "$lib/utils/date-formatters";
  import {parseDate} from "@internationalized/date";
  import {timezone as defaultTimezone} from "$lib/utils/dates";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import type {BudgetPeriodInstance} from "$lib/schema/budgets";
  import {currencyFormatter} from "$lib/utils/formatters";

  interface Props {
    periods?: BudgetPeriodInstance[];
    selectedId?: string;
    label?: string | null;
    timezone?: string | null;
    formatter?: (value: number) => string;
    loading?: boolean;
    class?: string;
    onRequestEnsure?: (direction: "previous" | "next") => void;
  }

  const defaultFormatter = (value: number) => currencyFormatter.format(value ?? 0);

  let {
    periods = [],
    selectedId = $bindable<string>(""),
    label = null,
    timezone = null,
    formatter = defaultFormatter,
    loading = false,
    class: className,
    onRequestEnsure,
  }: Props = $props();


  const tz = $derived.by(() => timezone ?? defaultTimezone);

  const sortedPeriods = $derived.by(() =>
    [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate))
  );

  const selectedIndex = $derived.by(() =>
    sortedPeriods.findIndex((period: BudgetPeriodInstance) => selectedId !== "" && String(period.id) === selectedId)
  );

  const selectedPeriod = $derived.by(() => {
    if (selectedIndex >= 0) return sortedPeriods[selectedIndex];
    return sortedPeriods.at(-1) ?? null;
  });

  $effect(() => {
    const periods = sortedPeriods;
    if (!periods.length) {
      if (selectedId !== "") {
        selectedId = "";
      }
      return;
    }

    const hasSelected = selectedId !== "" && periods.some((period: BudgetPeriodInstance) => String(period.id) === selectedId);
    if (!hasSelected) {
      const fallbackId = String(periods.at(-1)!.id);
      selectedId = fallbackId;
    }
  });

  function formatRange(period: BudgetPeriodInstance): string {
    const start = rawDateFormatter.format(parseDate(period.startDate).toDate(tz));
    const end = rawDateFormatter.format(parseDate(period.endDate).toDate(tz));
    return `${start} – ${end}`;
  }

  function triggerChange(id: string) {
    selectedId = id;
  }

  function selectPrevious() {
    const periods = sortedPeriods;
    const index = selectedIndex;
    if (index > 0) {
      triggerChange(String(periods[index - 1]!.id));
    } else {
      onRequestEnsure?.("previous");
    }
  }

  function selectNext() {
    const periods = sortedPeriods;
    const index = selectedIndex;
    if (index >= 0 && index < periods.length - 1) {
      triggerChange(String(periods[index + 1]!.id));
    } else {
      onRequestEnsure?.("next");
    }
  }

  const formatValue = (value: number | null | undefined) => formatter(Math.abs(value ?? 0));

</script>

<div class={cn("flex flex-col gap-2", className)}>
  {#if label}
    <Label data-testid="period-label">{label}</Label>
  {/if}

  <div class="flex items-center gap-2">
    <Button
      type="button"
      size="icon"
      variant="outline"
      class="h-8 w-8"
      onclick={selectPrevious}
      disabled={loading || !sortedPeriods.length}
      aria-label="Previous period"
    >
      <ChevronLeft class="size-4" />
    </Button>

    <Select.Root
      type="single"
      bind:value={selectedId}
      disabled={loading || !sortedPeriods.length}
    >
      <Select.Trigger class="w-64 justify-between">
        <span>
          {#if selectedPeriod}
            {formatRange(selectedPeriod)}
          {:else}
            Select budget period
          {/if}
        </span>
      </Select.Trigger>
      <Select.Content class="max-h-64">
        {#if !sortedPeriods.length}
          <div class="px-3 py-2 text-sm text-muted-foreground">No periods available</div>
        {:else}
          {#each sortedPeriods as period (period.id)}
            <Select.Item value={String(period.id)} class="flex flex-col gap-0.5">
              <span class="text-sm font-medium text-foreground">{formatRange(period)}</span>
              <span class="text-xs text-muted-foreground">
                Allocated {formatValue(period.allocatedAmount)} · Spent {formatValue(period.actualAmount ?? 0)}
              </span>
            </Select.Item>
          {/each}
        {/if}
      </Select.Content>
    </Select.Root>

    <Button
      type="button"
      size="icon"
      variant="outline"
      class="h-8 w-8"
      onclick={selectNext}
      disabled={loading || !sortedPeriods.length}
      aria-label="Next period"
    >
      <ChevronRight class="size-4" />
    </Button>
  </div>

  {#if selectedPeriod}
    <div class="grid gap-1 text-xs text-muted-foreground">
      <div class="flex items-center justify-between">
        <span>Allocated</span>
        <span class="font-medium text-card-foreground">{formatValue(selectedPeriod.allocatedAmount)}</span>
      </div>
      <div class="flex items-center justify-between">
        <span>Spent</span>
        <span class="font-medium text-card-foreground">{formatValue(selectedPeriod.actualAmount ?? 0)}</span>
      </div>
      <div class="flex items-center justify-between">
        <span>Rollover</span>
        <span class="font-medium text-card-foreground">{formatValue(selectedPeriod.rolloverAmount ?? 0)}</span>
      </div>
      {#if timezone}
        <div class="text-[0.7rem]">Timezone: {timezone}</div>
      {/if}
    </div>
  {/if}
</div>
