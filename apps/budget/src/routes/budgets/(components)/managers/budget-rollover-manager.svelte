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
    Loader2,
    AlertTriangle,
  } from "@lucide/svelte/icons";
  import {cn} from "$lib/utils";
  import {currencyFormatter} from "$lib/utils/formatters";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";
  import {
    getRolloverSummary,
    estimateRolloverImpact,
    processEnvelopeRollover,
    listPeriodInstances,
    updateRolloverSettings,
    getBudgetRolloverHistory,
    previewRollover,
  } from "$lib/query/budgets";
  import {toast} from "svelte-sonner";

  interface Props {
    budgets: BudgetWithRelations[];
    className?: string;
  }

  let {budgets = [], className}: Props = $props();

  // Get the first budget with periods
  const primaryBudget = $derived(budgets.find(b => b.periodTemplates && b.periodTemplates.length > 0));
  const firstTemplateId = $derived(primaryBudget?.periodTemplates?.[0]?.id);

  // Period data
  const periodsQuery = $derived.by(() => {
    if (!firstTemplateId) return null;
    return listPeriodInstances(firstTemplateId).options();
  });
  const periods = $derived(periodsQuery?.data ?? []);
  // Periods are ordered by startDate ascending, so [0] is oldest, [length-1] is newest
  const previousPeriod = $derived(periods[periods.length - 2]); // Second to last = previous period
  const currentPeriod = $derived(periods[periods.length - 1]); // Last = current period

  // Rollover data queries
  const rolloverSummaryQuery = $derived.by(() => {
    if (!currentPeriod?.id) return null;
    return getRolloverSummary(currentPeriod.id).options();
  });
  const rolloverSummary = $derived(rolloverSummaryQuery?.data);

  const rolloverEstimateQuery = $derived.by(() => {
    if (!currentPeriod?.id || !previousPeriod?.id) return null;
    return estimateRolloverImpact(previousPeriod.id, currentPeriod.id).options();
  });
  const rolloverEstimate = $derived(rolloverEstimateQuery?.data);

  // Loading states
  const isLoadingSummary = $derived(rolloverSummaryQuery?.isLoading ?? false);
  const isLoadingEstimate = $derived(rolloverEstimateQuery?.isLoading ?? false);

  // UI state
  let rolloverSettingsOpen = $state(false);
  let periodTransitionOpen = $state(false);
  let selectedBudget = $state<BudgetWithRelations | null>(null);
  let rolloverLimit = $state<string>('6');
  let rolloverType = $state<string>('');
  let isProcessingTransition = $state(false);

  // Rollover configuration state
  let rolloverConfig = $state({
    enabled: true,
    maxRolloverPercentage: 100,
    rolloverLimitMonths: 6,
    deficitRecoveryMode: 'gradual' as 'immediate' | 'gradual' | 'manual',
    autoTransition: true,
    notificationEnabled: true
  });

  // Load settings from budget metadata when budget changes
  $effect(() => {
    if (primaryBudget?.metadata?.rolloverSettings) {
      const saved = primaryBudget.metadata.rolloverSettings as any;
      rolloverConfig.enabled = saved.enabled ?? rolloverConfig.enabled;
      rolloverConfig.maxRolloverPercentage = saved.maxRolloverPercentage ?? rolloverConfig.maxRolloverPercentage;
      rolloverConfig.rolloverLimitMonths = saved.rolloverLimitMonths ?? rolloverConfig.rolloverLimitMonths;
      rolloverConfig.deficitRecoveryMode = saved.deficitRecoveryMode ?? rolloverConfig.deficitRecoveryMode;
      rolloverConfig.autoTransition = saved.autoTransition ?? rolloverConfig.autoTransition;
      rolloverConfig.notificationEnabled = saved.notificationEnabled ?? rolloverConfig.notificationEnabled;

      // Sync UI state with loaded config
      rolloverLimit = rolloverConfig.rolloverLimitMonths === 999 ? 'unlimited' : String(rolloverConfig.rolloverLimitMonths);
    }
  });

  // Sync rolloverLimit changes back to config
  $effect(() => {
    if (rolloverLimit === 'unlimited') {
      rolloverConfig.rolloverLimitMonths = 999; // Use 999 as unlimited marker
    } else {
      rolloverConfig.rolloverLimitMonths = parseInt(rolloverLimit) || 6;
    }
  });

  // Rollover metrics
  const totalRolledIn = $derived(rolloverSummary?.totalRolledIn ?? 0);
  const totalRolledOut = $derived(rolloverSummary?.totalRolledOut ?? 0);
  const rolloverCount = $derived(rolloverSummary?.rolloverCount ?? 0);
  const resetCount = $derived(rolloverSummary?.resetCount ?? 0);

  // Estimate metrics
  const estimatedRollover = $derived(rolloverEstimate?.estimatedRolloverAmount ?? 0);
  const estimatedReset = $derived(rolloverEstimate?.estimatedResetAmount ?? 0);
  const deficitImpact = $derived(rolloverEstimate?.deficitImpact ?? 0);
  const envelopesAffected = $derived(rolloverEstimate?.envelopesAffected ?? 0);

  // Calculate days until next period
  const daysUntilTransition = $derived.by(() => {
    if (!currentPeriod) return 0;
    const endDate = new Date(currentPeriod.endDate);
    const today = new Date();
    const diff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  });

  // Rollover preview query with envelope-level details
  const rolloverPreviewQuery = $derived.by(() => {
    if (!currentPeriod?.id || !previousPeriod?.id) return null;
    return previewRollover(previousPeriod.id, currentPeriod.id).options();
  });
  const rolloverPreview = $derived(rolloverPreviewQuery?.data);
  const upcomingTransitions = $derived(rolloverPreview?.calculations ?? []);

  // Rollover history query
  const rolloverHistoryQuery = $derived.by(() => {
    if (!primaryBudget?.id) return null;
    return getBudgetRolloverHistory(primaryBudget.id, 50).options();
  });
  const rolloverHistory = $derived(rolloverHistoryQuery?.data ?? []);
  const isLoadingHistory = $derived(rolloverHistoryQuery?.isLoading ?? false);

  // Mutations
  const rolloverMutation = processEnvelopeRollover.options();

  function openRolloverSettings(budget?: BudgetWithRelations) {
    selectedBudget = budget || null;
    rolloverSettingsOpen = true;
  }

  function openPeriodTransition() {
    periodTransitionOpen = true;
  }

  async function handleManualTransition() {
    if (!previousPeriod?.id || !currentPeriod?.id) {
      toast.error("Cannot process transition: missing period data");
      return;
    }

    isProcessingTransition = true;
    try {
      await rolloverMutation.mutateAsync({
        fromPeriodId: previousPeriod.id,
        toPeriodId: currentPeriod.id,
      });
      periodTransitionOpen = false;
      toast.success("Period transition completed successfully");
    } catch (error) {
      console.error("Failed to process transition:", error);
      // Error toast handled by mutation
    } finally {
      isProcessingTransition = false;
    }
  }

  async function handleSaveSettings() {
    if (!primaryBudget?.id) {
      toast.error("No budget selected");
      return;
    }

    const mutation = updateRolloverSettings.execute();
    try {
      await mutation.mutateAsync({
        budgetId: primaryBudget.id,
        settings: rolloverConfig,
      });
      rolloverSettingsOpen = false;
    } catch (error) {
      console.error("Failed to save settings:", error);
      // Error toast handled by mutation
    }
  }
</script>

<div class={cn("space-y-6", className)}>
  <!-- Period Information -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Period Information</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-2">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-sm font-medium text-muted-foreground">Previous Period</p>
          {#if previousPeriod}
            <p class="text-lg font-semibold">
              {new Date(previousPeriod.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
            <p class="text-xs text-muted-foreground">
              ID: {previousPeriod.id} | {previousPeriod.startDate} to {previousPeriod.endDate}
            </p>
          {:else}
            <p class="text-sm text-muted-foreground">No previous period found</p>
          {/if}
        </div>
        <div>
          <p class="text-sm font-medium text-muted-foreground">Current Period</p>
          {#if currentPeriod}
            <p class="text-lg font-semibold">
              {new Date(currentPeriod.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
            <p class="text-xs text-muted-foreground">
              ID: {currentPeriod.id} | {currentPeriod.startDate} to {currentPeriod.endDate}
            </p>
          {:else}
            <p class="text-sm text-muted-foreground">No current period found</p>
          {/if}
        </div>
      </div>
      <div class="text-xs text-muted-foreground pt-2 border-t">
        Total periods loaded: {periods.length} | Template ID: {firstTemplateId ?? 'none'}
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Overview Cards -->
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
    <!-- Total Rolled In -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Rolled Into Period</Card.Title>
        <TrendingUp class="h-4 w-4 text-green-600" />
      </Card.Header>
      <Card.Content>
        {#if isLoadingSummary}
          <div class="flex items-center gap-2">
            <Loader2 class="h-4 w-4 animate-spin" />
            <span class="text-sm text-muted-foreground">Loading...</span>
          </div>
        {:else}
          <div class="text-2xl font-bold text-green-600">
            {currencyFormatter.format(totalRolledIn)}
          </div>
          <p class="text-xs text-muted-foreground">
            {rolloverCount} envelope{rolloverCount !== 1 ? 's' : ''}
          </p>
        {/if}
      </Card.Content>
    </Card.Root>

    <!-- Total Rolled Out -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Rolled Out of Period</Card.Title>
        <TrendingDown class="h-4 w-4 text-blue-600" />
      </Card.Header>
      <Card.Content>
        {#if isLoadingSummary}
          <div class="flex items-center gap-2">
            <Loader2 class="h-4 w-4 animate-spin" />
            <span class="text-sm text-muted-foreground">Loading...</span>
          </div>
        {:else}
          <div class="text-2xl font-bold text-blue-600">
            {currencyFormatter.format(totalRolledOut)}
          </div>
          <p class="text-xs text-muted-foreground">
            {resetCount} reset
          </p>
        {/if}
      </Card.Content>
    </Card.Root>

    <!-- Estimated Next Rollover -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Estimated Rollover</Card.Title>
        <RotateCcw class="h-4 w-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        {#if isLoadingEstimate}
          <div class="flex items-center gap-2">
            <Loader2 class="h-4 w-4 animate-spin" />
            <span class="text-sm text-muted-foreground">Loading...</span>
          </div>
        {:else}
          <div class="text-2xl font-bold">
            {currencyFormatter.format(estimatedRollover)}
          </div>
          <p class="text-xs text-muted-foreground">
            {envelopesAffected} envelope{envelopesAffected !== 1 ? 's' : ''} affected
          </p>
        {/if}
      </Card.Content>
    </Card.Root>

    <!-- Next Transition -->
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Next Transition</Card.Title>
        <Calendar class="h-4 w-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{daysUntilTransition} days</div>
        <p class="text-xs text-muted-foreground">
          {currentPeriod?.endDate ? new Date(currentPeriod.endDate).toLocaleDateString() : 'No period'}
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
        <Button
          variant="outline"
          size="sm"
          onclick={openPeriodTransition}
          disabled={!previousPeriod || !currentPeriod}
        >
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
      {#if isLoadingEstimate}
        <div class="flex items-center justify-center py-12">
          <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      {:else if !rolloverEstimate || envelopesAffected === 0}
        <Card.Root>
          <Card.Content class="p-12 text-center">
            <Calendar class="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 class="text-lg font-medium mb-2">No Upcoming Transitions</h3>
            <p class="text-sm text-muted-foreground">
              {!previousPeriod || !currentPeriod
                ? "Need at least two periods to calculate transitions"
                : "All envelopes are at zero balance"}
            </p>
          </Card.Content>
        </Card.Root>
      {:else}
        <Card.Root>
          <Card.Content class="p-4">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-medium">Estimated Rollover Impact</h3>
                  <p class="text-sm text-muted-foreground">
                    Transition from {previousPeriod?.name ?? 'Previous'} to {currentPeriod?.name ?? 'Current'}
                  </p>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-bold text-green-600">
                    {currencyFormatter.format(estimatedRollover)}
                  </div>
                  <p class="text-xs text-muted-foreground">
                    {envelopesAffected} envelopes
                  </p>
                </div>
              </div>

              {#if estimatedReset > 0}
                <div class="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <div class="flex items-center gap-2">
                    <AlertTriangle class="h-4 w-4 text-orange-600" />
                    <span class="text-sm font-medium">Amount to be Reset</span>
                  </div>
                  <span class="text-sm font-medium text-orange-600">
                    {currencyFormatter.format(estimatedReset)}
                  </span>
                </div>
              {/if}

              {#if deficitImpact > 0}
                <div class="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div class="flex items-center gap-2">
                    <TrendingDown class="h-4 w-4 text-red-600" />
                    <span class="text-sm font-medium">Deficit Impact</span>
                  </div>
                  <span class="text-sm font-medium text-red-600">
                    {currencyFormatter.format(deficitImpact)}
                  </span>
                </div>
              {/if}
            </div>
          </Card.Content>
        </Card.Root>

        <!-- Envelope-level transitions breakdown -->
        {#if upcomingTransitions.length > 0}
          <Card.Root>
            <Card.Header>
              <Card.Title>Envelope Breakdown</Card.Title>
              <Card.Description>Detailed rollover for each envelope</Card.Description>
            </Card.Header>
            <Card.Content class="space-y-2">
              {#each upcomingTransitions as transition}
                {@const isPositive = transition.rolloverAmount > 0}
                {@const hasReset = transition.resetAmount > 0}
                {@const hasDeficit = transition.hasDeficit}
                <div class="flex items-center justify-between p-3 rounded-lg border {hasDeficit ? 'bg-red-50 dark:bg-red-950/10' : ''}">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-medium">Envelope #{transition.envelopeId}</span>
                      <Badge variant="outline" class="text-xs">
                        {transition.rolloverMode}
                      </Badge>
                    </div>
                    <p class="text-xs text-muted-foreground mt-1 truncate">
                      {transition.rolloverReason}
                    </p>
                  </div>
                  <div class="flex items-center gap-4 flex-shrink-0">
                    {#if hasDeficit}
                      <div class="text-right">
                        <div class="text-sm font-medium text-red-600">
                          -{currencyFormatter.format(transition.deficitAmount)}
                        </div>
                        <div class="text-xs text-muted-foreground">Deficit</div>
                      </div>
                    {/if}
                    {#if hasReset}
                      <div class="text-right">
                        <div class="text-sm font-medium text-orange-600">
                          {currencyFormatter.format(transition.resetAmount)}
                        </div>
                        <div class="text-xs text-muted-foreground">Reset</div>
                      </div>
                    {/if}
                    <div class="text-right">
                      <div class="text-sm font-medium {isPositive ? 'text-green-600' : 'text-muted-foreground'}">
                        {isPositive ? '+' : ''}{currencyFormatter.format(transition.rolloverAmount)}
                      </div>
                      <div class="text-xs text-muted-foreground">Rollover</div>
                    </div>
                  </div>
                </div>
              {/each}
            </Card.Content>
          </Card.Root>
        {/if}
      {/if}
    </Tabs.Content>

    <!-- Rollover History Tab -->
    <Tabs.Content value="history" class="space-y-4">
      {#if isLoadingHistory}
        <Card.Root>
          <Card.Content class="p-12 text-center">
            <Loader2 class="mx-auto h-12 w-12 text-muted-foreground/50 mb-4 animate-spin" />
            <h3 class="text-lg font-medium mb-2">Loading History...</h3>
          </Card.Content>
        </Card.Root>
      {:else if rolloverHistory.length === 0}
        <Card.Root>
          <Card.Content class="p-12 text-center">
            <RotateCcw class="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 class="text-lg font-medium mb-2">No Rollover History</h3>
            <p class="text-sm text-muted-foreground">
              Rollover history will appear here once periods transition
            </p>
          </Card.Content>
        </Card.Root>
      {:else}
        <div class="space-y-3">
          {#each rolloverHistory as rollover (rollover.id)}
            {@const amount = rollover.rolledAmount}
            {@const hasReset = rollover.resetAmount > 0}
            {@const isPositive = amount > 0}
            <Card.Root>
              <Card.Content class="p-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div class="flex flex-col">
                      <span class="font-medium">Envelope #{rollover.envelopeId}</span>
                      <span class="text-sm text-muted-foreground">
                        Period #{rollover.fromPeriodId} → #{rollover.toPeriodId}
                      </span>
                    </div>

                    {#if hasReset}
                      <Badge variant="destructive">
                        Reset: {currencyFormatter.format(rollover.resetAmount)}
                      </Badge>
                    {/if}
                  </div>

                  <div class="flex items-center gap-4">
                    <div class="text-right">
                      <div class="font-mono {isPositive ? 'text-green-600' : 'text-red-600'}">
                        {isPositive ? '+' : ''}{currencyFormatter.format(amount)}
                      </div>
                      <div class="text-xs text-muted-foreground">
                        {isPositive ? 'Rolled Over' : 'Deficit'}
                      </div>
                    </div>

                    <div class="text-sm text-muted-foreground min-w-[100px] text-right">
                      {new Date(rollover.processedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Card.Content>
            </Card.Root>
          {/each}
        </div>
      {/if}
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

      <div class="flex justify-end">
        <Button onclick={handleSaveSettings}>
          Save Settings
        </Button>
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
      <Button onclick={handleSaveSettings}>
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
        Process rollover from {previousPeriod?.name ?? 'previous period'} to {currentPeriod?.name ?? 'current period'}
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4">
      {#if rolloverEstimate}
        <div class="p-4 border rounded-lg space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Total to Roll Over:</span>
            <span class="text-lg font-bold text-green-600">
              {currencyFormatter.format(estimatedRollover)}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Envelopes Affected:</span>
            <span class="text-sm">{envelopesAffected}</span>
          </div>
          {#if estimatedReset > 0}
            <div class="flex items-center justify-between text-orange-600">
              <span class="text-sm font-medium">To be Reset:</span>
              <span class="text-sm font-medium">{currencyFormatter.format(estimatedReset)}</span>
            </div>
          {/if}
        </div>
      {/if}

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
      <Button
        onclick={handleManualTransition}
        disabled={isProcessingTransition || !previousPeriod || !currentPeriod}
      >
        {#if isProcessingTransition}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        Execute Transition
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
