<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Select from "$lib/components/ui/select";
  import * as Tabs from "$lib/components/ui/tabs";
  import {Button} from "$lib/components/ui/button";
  import {Badge} from "$lib/components/ui/badge";
  import {Input} from "$lib/components/ui/input";
  import {Label} from "$lib/components/ui/label";
  import {Textarea} from "$lib/components/ui/textarea";
  import {Switch} from "$lib/components/ui/switch";
  import Progress from "$lib/components/ui/progress/progress.svelte";
  import {
    RotateCcw,
    Calendar,
    TrendingUp,
    TrendingDown,
    Settings,
    Clock,
    ArrowRight,
  } from "@lucide/svelte/icons";
  import {cn} from "$lib/utils";
  import {currencyFormatter} from "$lib/utils/formatters";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";

  interface Props {
    budgets: BudgetWithRelations[];
    className?: string;
  }

  let {budgets = [], className}: Props = $props();

  // Rollover settings state
  let rolloverSettingsOpen = $state(false);
  let periodTransitionOpen = $state(false);
  let selectedBudget = $state<BudgetWithRelations | null>(null);
  let rolloverLimit = $state<string>('6');
  let rolloverType = $state<string>('');

  // Rollover configuration state
  let rolloverConfig = $state({
    enabled: true,
    maxRolloverPercentage: 100,
    rolloverLimitMonths: 6,
    deficitRecoveryMode: 'gradual' as 'immediate' | 'gradual' | 'manual',
    autoTransition: true,
    notificationEnabled: true
  });

  // Mock rollover data for demonstration
  const rolloverHistory = $derived.by(() => [
    {
      id: 1,
      budgetName: "Groceries",
      fromPeriod: "Nov 2024",
      toPeriod: "Dec 2024",
      amount: 127.50,
      type: "surplus" as const,
      date: "2024-12-01",
      status: "completed" as const
    },
    {
      id: 2,
      budgetName: "Entertainment",
      fromPeriod: "Oct 2024",
      toPeriod: "Nov 2024",
      amount: -43.20,
      type: "deficit" as const,
      date: "2024-11-01",
      status: "recovering" as const
    },
    {
      id: 3,
      budgetName: "Transportation",
      fromPeriod: "Nov 2024",
      toPeriod: "Dec 2024",
      amount: 89.75,
      type: "surplus" as const,
      date: "2024-12-01",
      status: "completed" as const
    }
  ]);

  const upcomingTransitions = $derived.by(() => [
    {
      id: 1,
      budgetName: "Groceries",
      currentPeriod: "Dec 2024",
      nextPeriod: "Jan 2025",
      remainingDays: 8,
      currentBalance: 145.30,
      projectedRollover: 145.30,
      status: "surplus" as const
    },
    {
      id: 2,
      budgetName: "Dining Out",
      currentPeriod: "Dec 2024",
      nextPeriod: "Jan 2025",
      remainingDays: 8,
      currentBalance: -67.80,
      projectedRollover: -67.80,
      status: "deficit" as const
    },
    {
      id: 3,
      budgetName: "Transportation",
      currentPeriod: "Dec 2024",
      nextPeriod: "Jan 2025",
      remainingDays: 8,
      currentBalance: 23.45,
      projectedRollover: 23.45,
      status: "surplus" as const
    }
  ]);

  // Rollover metrics as individual derived variables
  const totalSurplus = $derived(rolloverHistory
    .filter(r => r.type === 'surplus' && r.status === 'completed')
    .reduce((sum, r) => sum + r.amount, 0));

  const totalDeficit = $derived(Math.abs(rolloverHistory
    .filter(r => r.type === 'deficit')
    .reduce((sum, r) => sum + r.amount, 0)));

  const recoveringDeficits = $derived(rolloverHistory
    .filter(r => r.type === 'deficit' && r.status === 'recovering').length);

  const upcomingSurplus = $derived(upcomingTransitions
    .filter(t => t.status === 'surplus')
    .reduce((sum, t) => sum + t.projectedRollover, 0));

  const upcomingDeficit = $derived(Math.abs(upcomingTransitions
    .filter(t => t.status === 'deficit')
    .reduce((sum, t) => sum + t.projectedRollover, 0)));

  const netRollover = $derived(totalSurplus - totalDeficit);

  function getStatusColor(status: string, type?: string): string {
    if (type === 'deficit') {
      return status === 'recovering' ? 'text-orange-600' : 'text-red-600';
    }
    return status === 'completed' ? 'text-green-600' : 'text-blue-600';
  }

  function getStatusBadgeVariant(status: string, type?: string): "default" | "destructive" | "outline" | "secondary" {
    if (type === 'deficit') {
      return status === 'recovering' ? 'outline' : 'destructive';
    }
    return status === 'completed' ? 'default' : 'secondary';
  }

  function openRolloverSettings(budget?: BudgetWithRelations) {
    selectedBudget = budget || null;
    rolloverSettingsOpen = true;
  }

  function openPeriodTransition() {
    periodTransitionOpen = true;
  }

  async function handleManualTransition(budgetId: number, amount: number) {
    console.log(`Manual transition for budget ${budgetId}: ${amount}`);
    // Implementation would integrate with tRPC mutations
  }

  async function handleRecoveryAction(budgetId: number, action: 'defer' | 'adjust' | 'clear') {
    console.log(`Recovery action for budget ${budgetId}: ${action}`);
    // Implementation would integrate with tRPC mutations
  }
</script>

<div class={cn("space-y-6", className)}>
  <!-- Overview Cards -->
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
    <!-- Total Surplus Rolled Over -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Total Surplus</Card.Title>
        <TrendingUp class="h-4 w-4 text-green-600" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold text-green-600">
          {currencyFormatter.format(totalSurplus)}
        </div>
        <p class="text-xs text-muted-foreground">
          Successfully rolled over
        </p>
      </Card.Content>
    </Card.Root>

    <!-- Total Deficit -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Total Deficit</Card.Title>
        <TrendingDown class="h-4 w-4 text-red-600" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold text-red-600">
          {currencyFormatter.format(totalDeficit)}
        </div>
        <p class="text-xs text-muted-foreground">
          {recoveringDeficits} recovering
        </p>
      </Card.Content>
    </Card.Root>

    <!-- Net Rollover -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Net Position</Card.Title>
        <RotateCcw class="h-4 w-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold {netRollover >= 0 ? 'text-green-600' : 'text-red-600'}">
          {currencyFormatter.format(Math.abs(netRollover))}
        </div>
        <p class="text-xs text-muted-foreground">
          {netRollover >= 0 ? 'Positive' : 'Negative'} rollover balance
        </p>
      </Card.Content>
    </Card.Root>

    <!-- Upcoming Transitions -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Next Transition</Card.Title>
        <Calendar class="h-4 w-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">8 days</div>
        <p class="text-xs text-muted-foreground">
          {upcomingTransitions.length} budgets transitioning
        </p>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Main Content Tabs -->
  <Tabs.Root value="upcoming" class="space-y-4">
    <div class="flex items-center justify-between">
      <Tabs.List>
        <Tabs.Trigger value="upcoming">Upcoming Transitions</Tabs.Trigger>
        <Tabs.Trigger value="history">Rollover History</Tabs.Trigger>
        <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
      </Tabs.List>

      <div class="flex gap-2">
        <Button variant="outline" size="sm" onclick={openPeriodTransition}>
          <Clock class="mr-2 h-4 w-4" />
          Manual Transition
        </Button>
        <Button variant="outline" size="sm" onclick={() => openRolloverSettings()}>
          <Settings class="mr-2 h-4 w-4" />
          Configure
        </Button>
      </div>
    </div>

    <!-- Upcoming Transitions Tab -->
    <Tabs.Content value="upcoming" class="space-y-4">
      <div class="space-y-4">
        {#each upcomingTransitions as transition (transition.id)}
          <Card.Root>
            <Card.Content class="p-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div class="flex flex-col">
                    <span class="font-medium">{transition.budgetName}</span>
                    <span class="text-sm text-muted-foreground">
                      {transition.currentPeriod} → {transition.nextPeriod}
                    </span>
                  </div>

                  <ArrowRight class="h-4 w-4 text-muted-foreground" />

                  <div class="flex flex-col items-center">
                    <div class="text-sm font-mono {transition.status === 'surplus' ? 'text-green-600' : 'text-red-600'}">
                      {transition.status === 'surplus' ? '+' : ''}{currencyFormatter.format(transition.projectedRollover)}
                    </div>
                    <Badge variant={transition.status === 'surplus' ? 'default' : 'destructive'} class="text-xs">
                      {transition.status}
                    </Badge>
                  </div>
                </div>

                <div class="flex items-center gap-4">
                  <div class="text-right">
                    <div class="text-sm text-muted-foreground">Current Balance</div>
                    <div class="font-mono {transition.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}">
                      {currencyFormatter.format(Math.abs(transition.currentBalance))}
                    </div>
                  </div>

                  <div class="flex flex-col items-center gap-1">
                    <span class="text-xs text-muted-foreground">
                      {transition.remainingDays} days
                    </span>
                    <Progress
                      value={((30 - transition.remainingDays) / 30) * 100}
                      class="w-16 h-2"
                    />
                  </div>

                  {#if transition.status === 'deficit'}
                    <div class="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onclick={() => handleRecoveryAction(transition.id, 'adjust')}
                      >
                        Adjust
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onclick={() => handleRecoveryAction(transition.id, 'defer')}
                      >
                        Defer
                      </Button>
                    </div>
                  {/if}
                </div>
              </div>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>
    </Tabs.Content>

    <!-- Rollover History Tab -->
    <Tabs.Content value="history" class="space-y-4">
      <div class="space-y-3">
        {#each rolloverHistory as rollover (rollover.id)}
          <Card.Root>
            <Card.Content class="p-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div class="flex flex-col">
                    <span class="font-medium">{rollover.budgetName}</span>
                    <span class="text-sm text-muted-foreground">
                      {rollover.fromPeriod} → {rollover.toPeriod}
                    </span>
                  </div>

                  <Badge variant={getStatusBadgeVariant(rollover.status, rollover.type)}>
                    {rollover.status}
                  </Badge>
                </div>

                <div class="flex items-center gap-4">
                  <div class="text-right">
                    <div class="font-mono {getStatusColor(rollover.status, rollover.type)}">
                      {rollover.type === 'surplus' ? '+' : ''}{currencyFormatter.format(Math.abs(rollover.amount))}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {rollover.type === 'surplus' ? 'Surplus' : 'Deficit'}
                    </div>
                  </div>

                  <div class="text-sm text-muted-foreground">
                    {new Date(rollover.date).toLocaleDateString()}
                  </div>

                  {#if rollover.status === 'recovering'}
                    <div class="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onclick={() => handleRecoveryAction(rollover.id, 'clear')}
                      >
                        Clear
                      </Button>
                    </div>
                  {/if}
                </div>
              </div>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>
    </Tabs.Content>

    <!-- Settings Tab -->
    <Tabs.Content value="settings" class="space-y-4">
      <div class="grid gap-6 md:grid-cols-2">
        <!-- General Settings -->
        <Card.Root>
          <Card.Header>
            <Card.Title>General Settings</Card.Title>
            <Card.Description>Configure default rollover behavior</Card.Description>
          </Card.Header>
          <Card.Content class="space-y-4">
            <div class="flex items-center justify-between">
              <Label for="rollover-enabled">Enable Automatic Rollover</Label>
              <Switch id="rollover-enabled" bind:checked={rolloverConfig.enabled} />
            </div>

            <div class="space-y-2">
              <Label for="max-rollover">Maximum Rollover Percentage</Label>
              <div class="flex items-center gap-2">
                <Input
                  id="max-rollover"
                  type="number"
                  bind:value={rolloverConfig.maxRolloverPercentage}
                  min="0"
                  max="100"
                  class="w-20"
                />
                <span class="text-sm text-muted-foreground">%</span>
              </div>
              <p class="text-xs text-muted-foreground">
                Maximum percentage of unused budget to roll over
              </p>
            </div>

            <div class="space-y-2">
              <Label for="rollover-limit">Rollover Limit</Label>
              <Select.Root type="single" bind:value={rolloverLimit}>
                <Select.Trigger>
                  {rolloverLimit === '3' ? '3 months' : rolloverLimit === '6' ? '6 months' : rolloverLimit === '12' ? '12 months' : rolloverLimit === 'unlimited' ? 'Unlimited' : 'Select limit'}
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="3">3 months</Select.Item>
                  <Select.Item value="6">6 months</Select.Item>
                  <Select.Item value="12">12 months</Select.Item>
                  <Select.Item value="unlimited">Unlimited</Select.Item>
                </Select.Content>
              </Select.Root>
              <p class="text-xs text-muted-foreground">
                How long rollover amounts remain available
              </p>
            </div>
          </Card.Content>
        </Card.Root>

        <!-- Deficit Recovery -->
        <Card.Root>
          <Card.Header>
            <Card.Title>Deficit Recovery</Card.Title>
            <Card.Description>How to handle budget overruns</Card.Description>
          </Card.Header>
          <Card.Content class="space-y-4">
            <div class="space-y-2">
              <Label>Recovery Mode</Label>
              <Select.Root type="single" bind:value={rolloverConfig.deficitRecoveryMode}>
                <Select.Trigger>
                  {rolloverConfig.deficitRecoveryMode === 'immediate' ? 'Immediate Recovery' : rolloverConfig.deficitRecoveryMode === 'gradual' ? 'Gradual Recovery' : rolloverConfig.deficitRecoveryMode === 'manual' ? 'Manual Review' : 'Select recovery mode'}
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="immediate">Immediate Recovery</Select.Item>
                  <Select.Item value="gradual">Gradual Recovery</Select.Item>
                  <Select.Item value="manual">Manual Review</Select.Item>
                </Select.Content>
              </Select.Root>
            </div>

            <div class="flex items-center justify-between">
              <Label for="auto-transition">Auto Period Transition</Label>
              <Switch id="auto-transition" bind:checked={rolloverConfig.autoTransition} />
            </div>

            <div class="flex items-center justify-between">
              <Label for="notifications">Rollover Notifications</Label>
              <Switch id="notifications" bind:checked={rolloverConfig.notificationEnabled} />
            </div>
          </Card.Content>
        </Card.Root>
      </div>
    </Tabs.Content>
  </Tabs.Root>
</div>

<!-- Rollover Settings Dialog -->
<Dialog.Root bind:open={rolloverSettingsOpen}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>
        {selectedBudget ? `${selectedBudget.name} Rollover Settings` : 'Global Rollover Settings'}
      </Dialog.Title>
      <Dialog.Description>
        Configure rollover behavior for {selectedBudget ? 'this budget' : 'all budgets'}
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4">
      <div class="space-y-2">
        <Label>Rollover Type</Label>
        <Select.Root type="single" bind:value={rolloverType}>
          <Select.Trigger>
            {rolloverType === 'percentage' ? 'Percentage of unused' : rolloverType === 'fixed' ? 'Fixed amount' : rolloverType === 'all' ? 'All unused funds' : rolloverType === 'none' ? 'No rollover' : 'Select rollover type'}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="percentage">Percentage of unused</Select.Item>
            <Select.Item value="fixed">Fixed amount</Select.Item>
            <Select.Item value="all">All unused funds</Select.Item>
            <Select.Item value="none">No rollover</Select.Item>
          </Select.Content>
        </Select.Root>
      </div>

      <div class="space-y-2">
        <Label>Notes</Label>
        <Textarea
          placeholder="Add notes about this rollover configuration..."
          rows={3}
        />
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => rolloverSettingsOpen = false}>
        Cancel
      </Button>
      <Button onclick={() => rolloverSettingsOpen = false}>
        Save Settings
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Period Transition Dialog -->
<Dialog.Root bind:open={periodTransitionOpen}>
  <Dialog.Content class="max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Manual Period Transition</Dialog.Title>
      <Dialog.Description>
        Manually transition budgets to the next period
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4">
      <div class="space-y-2">
        <Label>Select Budgets</Label>
        <div class="space-y-2 max-h-48 overflow-y-auto">
          {#each upcomingTransitions as transition}
            <div class="flex items-center justify-between p-2 border rounded">
              <div class="flex items-center gap-2">
                <input type="checkbox" id="budget-{transition.id}" />
                <Label for="budget-{transition.id}">{transition.budgetName}</Label>
              </div>
              <div class="text-sm {transition.status === 'surplus' ? 'text-green-600' : 'text-red-600'}">
                {currencyFormatter.format(Math.abs(transition.projectedRollover))}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="space-y-2">
        <Label>Transition Notes</Label>
        <Textarea
          placeholder="Add notes about this manual transition..."
          rows={2}
        />
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => periodTransitionOpen = false}>
        Cancel
      </Button>
      <Button onclick={() => periodTransitionOpen = false}>
        Execute Transition
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
