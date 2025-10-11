<script lang="ts">
  import {Calendar, ArrowRight, Settings, RefreshCw, AlertTriangle, CheckCircle, Info} from "@lucide/svelte/icons";
  import * as Card from "$lib/components/ui/card";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Select from "$lib/components/ui/select";
  import {Button} from "$lib/components/ui/button";
  import {Badge} from "$lib/components/ui/badge";
  import {Input} from "$lib/components/ui/input";
  import Label from "$lib/components/ui/label/label.svelte";
  import {cn} from "$lib/utils";
  import {currencyFormatter} from "$lib/utils/formatters";
  import {formatDateDisplay, parseISOString, currentDate} from "$lib/utils/dates";
  import {
    listPeriodInstances,
    previewEnvelopeRollover,
    processEnvelopeRollover,
  } from "$lib/query/budgets";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";

  interface Props {
    budget: BudgetWithRelations;
    class?: string;
  }

  let {
    budget,
    class: className,
  }: Props = $props();

  const periodsQuery = listPeriodInstances(budget.id).options();
  const processRolloverMutation = processEnvelopeRollover.options();

  let rolloverDialogOpen = $state(false);
  let fromPeriodId = $state<string>("");
  let toPeriodId = $state<string>("");

  const periods = $derived.by(() => periodsQuery.data ?? []);

  // Get preview when both periods are selected
  const previewQuery = $derived.by(() => {
    if (!fromPeriodId || !toPeriodId) return null;
    return previewEnvelopeRollover(Number(fromPeriodId), Number(toPeriodId)).options();
  });

  const rolloverPreview = $derived.by(() => {
    return previewQuery ? previewQuery.data : null;
  });

  const availableFromPeriods = $derived.by(() => {
    return periods.filter(period => String(period.id) !== toPeriodId);
  });

  const availableToPeriods = $derived.by(() => {
    return periods.filter(period => String(period.id) !== fromPeriodId);
  });

  function formatPeriodDisplay(period: any): string {
    const start = formatDateDisplay(parseISOString(period.startDate) || currentDate, 'short');
    const end = formatDateDisplay(parseISOString(period.endDate) || currentDate, 'short');
    return `${start} - ${end}`;
  }

  function getRolloverModeDescription(mode: string): string {
    switch (mode) {
      case "unlimited":
        return "Carry over all remaining funds to next period";
      case "reset":
        return "Reset to allocated amount, lose remaining funds";
      case "limited":
        return "Carry over up to a specified limit";
      default:
        return "Default rollover behavior";
    }
  }

  function getRolloverModeColor(mode: string): string {
    switch (mode) {
      case "unlimited":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "reset":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "limited":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  }

  async function handleProcessRollover() {
    if (!fromPeriodId || !toPeriodId) return;

    try {
      await processRolloverMutation.mutateAsync({
        fromPeriodId: Number(fromPeriodId),
        toPeriodId: Number(toPeriodId),
      });

      // Reset form and close dialog
      fromPeriodId = "";
      toPeriodId = "";
      rolloverDialogOpen = false;
    } catch (error) {
      console.error("Failed to process rollover:", error);
    }
  }

  function openRolloverDialog() {
    rolloverDialogOpen = true;
    // Auto-select the most recent completed period and next period if available
    if (periods.length >= 2) {
      const sortedPeriods = [...periods].sort((a, b) =>
        new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
      );
      fromPeriodId = String(sortedPeriods[1]?.id || ""); // Second most recent
      toPeriodId = String(sortedPeriods[0]?.id || "");   // Most recent
    }
  }
</script>

<div class={cn("space-y-6", className)}>
  <!-- Rollover Management Header -->
  <Card.Root>
    <Card.Header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <RefreshCw class="h-5 w-5 text-blue-600" />
          <Card.Title>Rollover Management</Card.Title>
        </div>
        <Button onclick={openRolloverDialog} size="sm">
          <Calendar class="h-4 w-4 mr-2" />
          Process Rollover
        </Button>
      </div>
      <Card.Description>
        Manage how envelope funds carry over between budget periods
      </Card.Description>
    </Card.Header>
  </Card.Root>

  <!-- Period History -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Period History</Card.Title>
      <Card.Description>
        View past and current budget periods for this budget
      </Card.Description>
    </Card.Header>
    <Card.Content>
      {#if periodsQuery.isLoading}
        <div class="flex items-center justify-center py-8">
          <RefreshCw class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      {:else if periods.length === 0}
        <div class="text-center py-8 text-muted-foreground">
          <Calendar class="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No budget periods found</p>
          <p class="text-sm">Create a budget period to start tracking rollovers</p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each periods as period (period.id)}
            <div class="flex items-center justify-between rounded-lg border p-4">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <h4 class="font-medium">{formatPeriodDisplay(period)}</h4>
                  <Badge variant="outline" class="text-xs">
                    Period {period.id}
                  </Badge>
                </div>
                <p class="text-sm text-muted-foreground">
                  Allocated: {currencyFormatter.format(period.allocatedAmount || 0)}
                  • Rollover: {currencyFormatter.format(period.rolloverAmount || 0)}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <Badge variant="secondary" class="text-xs">
                  {period.status || 'Active'}
                </Badge>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </Card.Content>
  </Card.Root>

  <!-- Rollover Policies Info -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Rollover Policies</Card.Title>
      <Card.Description>
        Understanding how different rollover modes work
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="grid gap-4 md:grid-cols-3">
        <div class="space-y-2">
          <Badge class={getRolloverModeColor("unlimited")}>Unlimited</Badge>
          <p class="text-sm text-muted-foreground">
            {getRolloverModeDescription("unlimited")}
          </p>
        </div>
        <div class="space-y-2">
          <Badge class={getRolloverModeColor("limited")}>Limited</Badge>
          <p class="text-sm text-muted-foreground">
            {getRolloverModeDescription("limited")}
          </p>
        </div>
        <div class="space-y-2">
          <Badge class={getRolloverModeColor("reset")}>Reset</Badge>
          <p class="text-sm text-muted-foreground">
            {getRolloverModeDescription("reset")}
          </p>
        </div>
      </div>
    </Card.Content>
  </Card.Root>
</div>

<!-- Rollover Processing Dialog -->
<Dialog.Root bind:open={rolloverDialogOpen}>
  <Dialog.Content class="max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>Process Envelope Rollover</Dialog.Title>
      <Dialog.Description>
        Transfer remaining envelope funds from one period to another
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-6">
      <!-- Period Selection -->
      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <Label for="from-period">From Period</Label>
          <Select.Root
            type="single"
            bind:value={fromPeriodId}
          >
            <Select.Trigger>
              {fromPeriodId ? formatPeriodDisplay(periods.find(p => String(p.id) === fromPeriodId)) : "Select source period"}
            </Select.Trigger>
            <Select.Content>
              {#each availableFromPeriods as period (period.id)}
                <Select.Item value={String(period.id)}>
                  {formatPeriodDisplay(period)}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <div class="space-y-2">
          <Label for="to-period">To Period</Label>
          <Select.Root
            type="single"
            bind:value={toPeriodId}
          >
            <Select.Trigger>
              {toPeriodId ? formatPeriodDisplay(periods.find(p => String(p.id) === toPeriodId)) : "Select target period"}
            </Select.Trigger>
            <Select.Content>
              {#each availableToPeriods as period (period.id)}
                <Select.Item value={String(period.id)}>
                  {formatPeriodDisplay(period)}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      <!-- Rollover Preview -->
      {#if rolloverPreview}
        <Card.Root class="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-700">
          <Card.Header>
            <Card.Title class="text-sm flex items-center gap-2">
              <Info class="h-4 w-4" />
              Rollover Preview
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="space-y-3">
              {#if rolloverPreview.envelopes?.length > 0}
                {#each rolloverPreview.envelopes as envelope}
                  <div class="flex items-center justify-between text-sm">
                    <span>{envelope.categoryName}</span>
                    <div class="flex items-center gap-2">
                      <span class="text-muted-foreground">
                        {currencyFormatter.format(envelope.currentAmount)}
                      </span>
                      <ArrowRight class="h-3 w-3" />
                      <span class="font-medium">
                        {currencyFormatter.format(envelope.rolloverAmount)}
                      </span>
                    </div>
                  </div>
                {/each}
                <div class="border-t pt-2">
                  <div class="flex items-center justify-between font-medium">
                    <span>Total Rollover</span>
                    <span>{currencyFormatter.format(rolloverPreview.totalRollover || 0)}</span>
                  </div>
                </div>
              {:else}
                <p class="text-sm text-muted-foreground">No funds to rollover</p>
              {/if}
            </div>
          </Card.Content>
        </Card.Root>
      {:else if fromPeriodId && toPeriodId && previewQuery?.$isLoading}
        <div class="flex items-center justify-center py-8">
          <RefreshCw class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      {/if}
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => rolloverDialogOpen = false}>
        Cancel
      </Button>
      <Button
        onclick={handleProcessRollover}
        disabled={!fromPeriodId || !toPeriodId || processRolloverMutation.isPending}
      >
        {#if processRolloverMutation.isPending}
          <RefreshCw class="h-4 w-4 mr-2 animate-spin" />
          Processing...
        {:else}
          <CheckCircle class="h-4 w-4 mr-2" />
          Process Rollover
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
