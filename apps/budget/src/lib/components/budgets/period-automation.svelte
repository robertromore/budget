<script lang="ts">
  import {Calendar, Clock, Settings, Play, Pause, CheckCircle, AlertTriangle, Info} from "@lucide/svelte/icons";
  import * as Card from "$lib/components/ui/card";
  import ResponsiveSheet from "$lib/components/ui/responsive-sheet/responsive-sheet.svelte";
  import * as Select from "$lib/components/ui/select";
  import {Button} from "$lib/components/ui/button";
  import {Badge} from "$lib/components/ui/badge";
  import {Input} from "$lib/components/ui/input";
  import {Switch} from "$lib/components/ui/switch";
  import Label from "$lib/components/ui/label/label.svelte";
  import {cn} from "$lib/utils";
  import {currencyFormatter} from "$lib/utils/formatters";
  import {
    ensurePeriodInstance,
    listPeriodInstances,
    processEnvelopeRollover,
  } from "$lib/query/budgets";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";

  interface Props {
    budget: BudgetWithRelations;
    class?: string;
  }

  interface AutomationSettings {
    enabled: boolean;
    frequency: "monthly" | "weekly" | "quarterly";
    autoRollover: boolean;
    defaultAllocation: number;
    advanceNotice: number; // days
    maxPeriodsAhead: number;
  }

  let {
    budget,
    class: className,
  }: Props = $props();

  const periodsQuery = listPeriodInstances(budget.id).options();
  const ensurePeriodMutation = ensurePeriodInstance.options();
  const processRolloverMutation = processEnvelopeRollover.options();

  let automationSheetOpen = $state(false);
  let settings = $state<AutomationSettings>({
    enabled: false,
    frequency: "monthly",
    autoRollover: true,
    defaultAllocation: 0,
    advanceNotice: 3,
    maxPeriodsAhead: 2,
  });

  let nextPeriodPreview = $state<any>(null);

  const periods = $derived.by(() => periodsQuery.data ?? []);

  const currentPeriod = $derived.by(() => {
    const now = new Date();
    return periods.find(period => {
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      return now >= start && now <= end;
    });
  });

  const nextPeriodDue = $derived.by(() => {
    if (!currentPeriod) return null;
    const endDate = new Date(currentPeriod.endDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  });

  const automationStatus = $derived.by(() => {
    if (!settings.enabled) return "disabled";
    if (nextPeriodDue !== null && nextPeriodDue <= settings.advanceNotice) return "pending";
    return "active";
  });

  function getAutomationStatusColor(status: string): string {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "disabled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  }

  function getFrequencyDescription(frequency: string): string {
    switch (frequency) {
      case "weekly":
        return "Create new budget period every week";
      case "monthly":
        return "Create new budget period every month";
      case "quarterly":
        return "Create new budget period every quarter (3 months)";
      default:
        return "Custom frequency";
    }
  }

  function calculateNextPeriodDates(): { start: Date; end: Date } {
    if (!currentPeriod) {
      // If no current period, start from today
      const start = new Date();
      const end = new Date(start);

      switch (settings.frequency) {
        case "weekly":
          end.setDate(start.getDate() + 7);
          break;
        case "monthly":
          end.setMonth(start.getMonth() + 1);
          break;
        case "quarterly":
          end.setMonth(start.getMonth() + 3);
          break;
      }

      return { start, end };
    }

    // Calculate next period based on current period end
    const start = new Date(currentPeriod.endDate);
    start.setDate(start.getDate() + 1); // Start day after current period ends

    const end = new Date(start);
    switch (settings.frequency) {
      case "weekly":
        end.setDate(start.getDate() + 6); // 7 days total
        break;
      case "monthly":
        end.setMonth(start.getMonth() + 1);
        end.setDate(start.getDate() - 1); // End on same day of month
        break;
      case "quarterly":
        end.setMonth(start.getMonth() + 3);
        end.setDate(start.getDate() - 1);
        break;
    }

    return { start, end };
  }

  async function createNextPeriod() {
    const { start, end } = calculateNextPeriodDates();

    try {
      const newPeriod = await ensurePeriodMutation.mutateAsync({
        templateId: budget.id,
        options: {
          referenceDate: {
            year: start.getFullYear(),
            month: start.getMonth() + 1,
            day: start.getDate(),
          },
          allocatedAmount: settings.defaultAllocation,
        },
      });

      // If auto-rollover is enabled and we have a current period, process rollover
      if (settings.autoRollover && currentPeriod && newPeriod) {
        await processRolloverMutation.mutateAsync({
          fromPeriodId: currentPeriod.id,
          toPeriodId: newPeriod.id,
        });
      }

      nextPeriodPreview = null;
    } catch (error) {
      console.error("Failed to create next period:", error);
    }
  }

  async function previewNextPeriod() {
    const { start, end } = calculateNextPeriodDates();
    nextPeriodPreview = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      allocatedAmount: settings.defaultAllocation,
      autoRollover: settings.autoRollover,
    };
  }

  function openAutomationSettings() {
    automationSheetOpen = true;
    previewNextPeriod();
  }

  function saveAutomationSettings() {
    // In a real implementation, this would save to backend
    automationSheetOpen = false;
  }
</script>

<div class={cn("space-y-6", className)}>
  <!-- Period Automation Header -->
  <Card.Root>
    <Card.Header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Clock class="h-5 w-5 text-purple-600" />
          <Card.Title>Period Automation</Card.Title>
        </div>
        <div class="flex items-center gap-2">
          <Badge class={getAutomationStatusColor(automationStatus)}>
            {automationStatus === "active" ? "Active" : automationStatus === "pending" ? "Pending" : "Disabled"}
          </Badge>
          <Button onclick={openAutomationSettings} size="sm" variant="outline">
            <Settings class="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>
      <Card.Description>
        Automatically create and manage budget periods with configurable rollover
      </Card.Description>
    </Card.Header>
  </Card.Root>

  <!-- Current Period Status -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Current Period Status</Card.Title>
    </Card.Header>
    <Card.Content>
      {#if currentPeriod}
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-medium">
                {new Date(currentPeriod.startDate).toLocaleDateString()} -
                {new Date(currentPeriod.endDate).toLocaleDateString()}
              </h4>
              <p class="text-sm text-muted-foreground">
                Allocated: {currencyFormatter.format(currentPeriod.allocatedAmount || 0)}
              </p>
            </div>
            <div class="text-right">
              {#if nextPeriodDue !== null}
                <div class="flex items-center gap-1">
                  {#if nextPeriodDue <= 0}
                    <AlertTriangle class="h-4 w-4 text-red-500" />
                    <span class="text-sm font-medium text-red-600">Period ended</span>
                  {:else if nextPeriodDue <= settings.advanceNotice}
                    <AlertTriangle class="h-4 w-4 text-yellow-500" />
                    <span class="text-sm font-medium text-yellow-600">{nextPeriodDue} days remaining</span>
                  {:else}
                    <CheckCircle class="h-4 w-4 text-green-500" />
                    <span class="text-sm text-green-600">{nextPeriodDue} days remaining</span>
                  {/if}
                </div>
              {/if}
            </div>
          </div>

          {#if settings.enabled && nextPeriodDue !== null && nextPeriodDue <= settings.advanceNotice}
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-950 dark:border-yellow-700">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Info class="h-4 w-4 text-yellow-600" />
                  <span class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Next period creation due
                  </span>
                </div>
                <Button onclick={createNextPeriod} size="sm" disabled={ensurePeriodMutation.isPending}>
                  {#if ensurePeriodMutation.isPending}
                    Creating...
                  {:else}
                    Create Next Period
                  {/if}
                </Button>
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <div class="text-center py-8 text-muted-foreground">
          <Calendar class="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No active period found</p>
          <p class="text-sm">Create your first budget period to enable automation</p>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>

  <!-- Automation Summary -->
  {#if settings.enabled}
    <Card.Root>
      <Card.Header>
        <Card.Title>Automation Summary</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <Calendar class="h-4 w-4 text-muted-foreground" />
              <span class="text-sm font-medium">Frequency</span>
            </div>
            <p class="text-sm text-muted-foreground ml-6">
              {getFrequencyDescription(settings.frequency)}
            </p>
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <Clock class="h-4 w-4 text-muted-foreground" />
              <span class="text-sm font-medium">Advance Notice</span>
            </div>
            <p class="text-sm text-muted-foreground ml-6">
              {settings.advanceNotice} days before period ends
            </p>
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <CheckCircle class="h-4 w-4 text-muted-foreground" />
              <span class="text-sm font-medium">Auto Rollover</span>
            </div>
            <p class="text-sm text-muted-foreground ml-6">
              {settings.autoRollover ? "Enabled - automatically carry over remaining funds" : "Disabled - manual rollover required"}
            </p>
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <Settings class="h-4 w-4 text-muted-foreground" />
              <span class="text-sm font-medium">Default Allocation</span>
            </div>
            <p class="text-sm text-muted-foreground ml-6">
              {currencyFormatter.format(settings.defaultAllocation)} per new period
            </p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>

<!-- Automation Settings Sheet -->
<ResponsiveSheet bind:open={automationSheetOpen} side="right">
  {#snippet header()}
    <div class="space-y-2">
      <h2 class="text-lg font-semibold">Period Automation Settings</h2>
      <p class="text-sm text-muted-foreground">
        Configure automatic period creation and rollover behavior
      </p>
    </div>
  {/snippet}

  {#snippet content()}
    <div class="space-y-6">
      <!-- Enable Automation -->
      <div class="flex items-center justify-between">
        <div class="space-y-1">
          <Label>Enable Automation</Label>
          <p class="text-sm text-muted-foreground">
            Automatically create new budget periods and manage rollovers
          </p>
        </div>
        <Switch bind:checked={settings.enabled} />
      </div>

      {#if settings.enabled}
        <!-- Frequency Selection -->
        <div class="space-y-2">
          <Label>Period Frequency</Label>
          <Select.Root
            type="single"
            bind:value={settings.frequency}
          >
            <Select.Trigger>
              {settings.frequency.charAt(0).toUpperCase() + settings.frequency.slice(1)}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="weekly">
                Weekly
              </Select.Item>
              <Select.Item value="monthly">
                Monthly
              </Select.Item>
              <Select.Item value="quarterly">
                Quarterly
              </Select.Item>
            </Select.Content>
          </Select.Root>
          <p class="text-sm text-muted-foreground">
            {getFrequencyDescription(settings.frequency)}
          </p>
        </div>

        <!-- Auto Rollover -->
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <Label>Auto Rollover</Label>
            <p class="text-sm text-muted-foreground">
              Automatically transfer remaining funds to new periods
            </p>
          </div>
          <Switch bind:checked={settings.autoRollover} />
        </div>

        <!-- Default Allocation -->
        <div class="space-y-2">
          <Label for="default-allocation">Default Allocation Amount</Label>
          <Input
            id="default-allocation"
            type="number"
            step="0.01"
            bind:value={settings.defaultAllocation}
            placeholder="0.00"
          />
          <p class="text-sm text-muted-foreground">
            Base allocation amount for new periods (before rollover)
          </p>
        </div>

        <!-- Advance Notice -->
        <div class="space-y-2">
          <Label for="advance-notice">Advance Notice (days)</Label>
          <Input
            id="advance-notice"
            type="number"
            min="1"
            max="30"
            bind:value={settings.advanceNotice}
            placeholder="3"
          />
          <p class="text-sm text-muted-foreground">
            How many days before period end to show creation reminder
          </p>
        </div>

        <!-- Next Period Preview -->
        {#if nextPeriodPreview}
          <Card.Root class="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-700">
            <Card.Header>
              <Card.Title class="text-sm flex items-center gap-2">
                <Info class="h-4 w-4" />
                Next Period Preview
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span>Start Date:</span>
                  <span>{new Date(nextPeriodPreview.startDate).toLocaleDateString()}</span>
                </div>
                <div class="flex justify-between">
                  <span>End Date:</span>
                  <span>{new Date(nextPeriodPreview.endDate).toLocaleDateString()}</span>
                </div>
                <div class="flex justify-between">
                  <span>Base Allocation:</span>
                  <span>{currencyFormatter.format(nextPeriodPreview.allocatedAmount)}</span>
                </div>
                <div class="flex justify-between">
                  <span>Auto Rollover:</span>
                  <span>{nextPeriodPreview.autoRollover ? "Yes" : "No"}</span>
                </div>
              </div>
            </Card.Content>
          </Card.Root>
        {/if}
      {/if}
    </div>
  {/snippet}

  {#snippet footer()}
    <div class="flex gap-2">
      <Button class="flex-1" variant="outline" onclick={() => automationSheetOpen = false}>
        Cancel
      </Button>
      <Button class="flex-1" onclick={saveAutomationSettings}>
        Save Settings
      </Button>
    </div>
  {/snippet}
</ResponsiveSheet>