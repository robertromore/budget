<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Tabs from '$lib/components/ui/tabs';
  import * as Card from '$lib/components/ui/card';
  import {Button} from '$lib/components/ui/button';
  import {Badge} from '$lib/components/ui/badge';
  import {Separator} from '$lib/components/ui/separator';
  import {
    AlertTriangle,
    TrendingDown,
    ArrowRight,
    CheckCircle2,
    Loader2,
    Info,
    Zap,
  } from '@lucide/svelte/icons';
  import {currencyFormatter} from '$lib/utils/formatters';
  import {cn} from '$lib/utils';
  import type {EnvelopeAllocation} from '$lib/schema/budgets/envelope-allocations';

  interface DeficitAnalysis {
    envelopeId: number;
    categoryId: number;
    deficitAmount: number;
    daysSinceDeficit: number;
    deficitSeverity: 'mild' | 'moderate' | 'severe' | 'critical';
    suggestedSources: EnvelopeAllocation[];
    autoRecoveryOptions: DeficitRecoveryOption[];
  }

  interface DeficitRecoveryOption {
    type: 'transfer' | 'reallocation' | 'emergency_fund' | 'borrowing' | 'reset';
    sourceEnvelopeId?: number;
    amount: number;
    description: string;
    priority: number;
    feasible: boolean;
    impact: string;
  }

  interface DeficitRecoveryPlan {
    targetEnvelopeId: number;
    totalDeficit: number;
    recoverySteps: DeficitRecoveryStep[];
    estimatedTimeToRecover: number;
    totalCost: number;
    alternativePlans: DeficitRecoveryPlan[];
  }

  interface DeficitRecoveryStep {
    type: 'transfer' | 'reallocation' | 'emergency_fund' | 'external_injection';
    sourceEnvelopeId?: number;
    amount: number;
    description: string;
    order: number;
    automated: boolean;
  }

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    envelope: EnvelopeAllocation;
    categoryName: string;
    analysis?: DeficitAnalysis | null;
    recoveryPlan?: DeficitRecoveryPlan | null;
    isAnalyzing?: boolean;
    isCreatingPlan?: boolean;
    isExecuting?: boolean;
    onAnalyze?: () => void;
    onCreatePlan?: () => void;
    onExecutePlan?: (plan: DeficitRecoveryPlan) => void;
  }

  let {
    open = $bindable(false),
    onOpenChange,
    envelope,
    categoryName,
    analysis,
    recoveryPlan,
    isAnalyzing = false,
    isCreatingPlan = false,
    isExecuting = false,
    onAnalyze,
    onCreatePlan,
    onExecutePlan,
  }: Props = $props();

  const severityConfig = $derived.by(() => {
    if (!analysis) return {color: 'text-muted-foreground', label: 'Unknown', icon: Info};

    switch (analysis.deficitSeverity) {
      case 'critical':
        return {color: 'text-red-600', label: 'Critical', icon: AlertTriangle};
      case 'severe':
        return {color: 'text-orange-600', label: 'Severe', icon: AlertTriangle};
      case 'moderate':
        return {color: 'text-yellow-600', label: 'Moderate', icon: TrendingDown};
      case 'mild':
        return {color: 'text-blue-600', label: 'Mild', icon: Info};
      default:
        return {color: 'text-muted-foreground', label: analysis.deficitSeverity, icon: Info};
    }
  });

  function handleClose() {
    open = false;
  }

  function handleExecute() {
    if (recoveryPlan && onExecutePlan) {
      onExecutePlan(recoveryPlan);
    }
  }
</script>

<Dialog.Root bind:open {onOpenChange}>
  <Dialog.Content class="max-w-3xl max-h-[90vh] overflow-y-auto">
    <Dialog.Header>
      <div class="flex items-center gap-3">
        <div class="p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
          <AlertTriangle class="h-5 w-5 text-red-600" />
        </div>
        <div>
          <Dialog.Title>Deficit Recovery</Dialog.Title>
          <Dialog.Description>
            Manage and recover the deficit for <strong>{categoryName}</strong>
          </Dialog.Description>
        </div>
      </div>
    </Dialog.Header>

    <div class="space-y-6">
      <!-- Deficit Overview -->
      <Card.Root class="border-red-200 dark:border-red-900">
        <Card.Header class="pb-3">
          <Card.Title class="text-lg flex items-center gap-2">
            <TrendingDown class="h-5 w-5" />
            Deficit Overview
          </Card.Title>
        </Card.Header>
        <Card.Content class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Current Deficit:</span>
            <span class="text-2xl font-bold text-red-600">
              {currencyFormatter.format(envelope.deficitAmount)}
            </span>
          </div>

          {#if analysis}
            <Separator />
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-muted-foreground">Severity:</span>
                <Badge variant="destructive" class="ml-2">
                  <severityConfig.icon class="h-3 w-3 mr-1" />
                  {severityConfig.label}
                </Badge>
              </div>
              <div>
                <span class="text-muted-foreground">Days in Deficit:</span>
                <span class="ml-2 font-medium">{analysis.daysSinceDeficit}</span>
              </div>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>

      <!-- Actions Tabs -->
      <Tabs.Root value="analysis" class="w-full">
        <Tabs.List class="grid w-full grid-cols-3">
          <Tabs.Trigger value="analysis">Analysis</Tabs.Trigger>
          <Tabs.Trigger value="recovery-plan">Recovery Plan</Tabs.Trigger>
          <Tabs.Trigger value="quick-actions">Quick Actions</Tabs.Trigger>
        </Tabs.List>

        <!-- Analysis Tab -->
        <Tabs.Content value="analysis" class="space-y-4 mt-4">
          {#if !analysis}
            <Card.Root>
              <Card.Content class="p-6 text-center">
                <Info class="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p class="text-sm text-muted-foreground mb-4">
                  Run an analysis to understand the deficit and get recovery recommendations
                </p>
                <Button onclick={onAnalyze} disabled={isAnalyzing}>
                  {#if isAnalyzing}
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                  {/if}
                  Analyze Deficit
                </Button>
              </Card.Content>
            </Card.Root>
          {:else}
            <!-- Suggested Sources -->
            {#if analysis.suggestedSources && analysis.suggestedSources.length > 0}
              <Card.Root>
                <Card.Header>
                  <Card.Title class="text-base">Available Funding Sources</Card.Title>
                  <Card.Description>
                    Envelopes with surplus funds that can cover this deficit
                  </Card.Description>
                </Card.Header>
                <Card.Content class="space-y-2">
                  {#each analysis.suggestedSources.slice(0, 5) as source}
                    <div class="flex items-center justify-between p-3 rounded-lg border">
                      <div class="flex-1">
                        <div class="font-medium">Envelope #{source.id}</div>
                        <div class="text-xs text-muted-foreground">
                          Category ID: {source.categoryId}
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="text-sm font-medium text-green-600">
                          {currencyFormatter.format(source.availableAmount)}
                        </div>
                        <div class="text-xs text-muted-foreground">Available</div>
                      </div>
                    </div>
                  {/each}
                </Card.Content>
              </Card.Root>
            {/if}

            <!-- Recovery Options -->
            {#if analysis.autoRecoveryOptions && analysis.autoRecoveryOptions.length > 0}
              <Card.Root>
                <Card.Header>
                  <Card.Title class="text-base">Recovery Options</Card.Title>
                  <Card.Description>Recommended approaches to resolve the deficit</Card.Description>
                </Card.Header>
                <Card.Content class="space-y-3">
                  {#each analysis.autoRecoveryOptions as option}
                    {@const typeConfig = {
                      transfer: {color: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200', icon: ArrowRight, label: 'Transfer'},
                      emergency_fund: {color: 'bg-red-50 dark:bg-red-950/20 border-red-200', icon: AlertTriangle, label: 'Emergency Fund'},
                      reallocation: {color: 'bg-purple-50 dark:bg-purple-950/20 border-purple-200', icon: Zap, label: 'Reallocation'},
                      borrowing: {color: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200', icon: Info, label: 'Borrowing'},
                      reset: {color: 'bg-gray-50 dark:bg-gray-950/20 border-gray-200', icon: TrendingDown, label: 'Reset'},
                    }[option.type] || {color: '', icon: Info, label: option.type}}
                    <div class={cn('p-4 rounded-lg border', typeConfig.color)}>
                      <div class="flex items-start justify-between mb-2">
                        <div class="flex items-center gap-2">
                          <typeConfig.icon class="h-4 w-4" />
                          <span class="font-medium">{typeConfig.label}</span>
                          <Badge variant={option.feasible ? 'default' : 'secondary'} class="text-xs">
                            {option.feasible ? 'Feasible' : 'Limited'}
                          </Badge>
                        </div>
                        <span class="font-bold">{currencyFormatter.format(option.amount)}</span>
                      </div>
                      <p class="text-sm mb-2">{option.description}</p>
                      <p class="text-xs text-muted-foreground">Impact: {option.impact}</p>
                    </div>
                  {/each}
                </Card.Content>
              </Card.Root>
            {/if}
          {/if}
        </Tabs.Content>

        <!-- Recovery Plan Tab -->
        <Tabs.Content value="recovery-plan" class="space-y-4 mt-4">
          {#if !recoveryPlan}
            <Card.Root>
              <Card.Content class="p-6 text-center">
                <Zap class="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p class="text-sm text-muted-foreground mb-4">
                  Create a detailed recovery plan with step-by-step instructions
                </p>
                <Button onclick={onCreatePlan} disabled={isCreatingPlan}>
                  {#if isCreatingPlan}
                    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                  {/if}
                  Generate Recovery Plan
                </Button>
              </Card.Content>
            </Card.Root>
          {:else}
            <!-- Recovery Plan Overview -->
            <Card.Root>
              <Card.Header>
                <Card.Title class="text-base">Recovery Plan</Card.Title>
                <Card.Description>
                  {recoveryPlan.recoverySteps.length} step{recoveryPlan.recoverySteps.length !==
                  1
                    ? 's'
                    : ''} to recover {currencyFormatter.format(recoveryPlan.totalDeficit)}
                </Card.Description>
              </Card.Header>
              <Card.Content class="space-y-4">
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div class="p-3 bg-muted/50 rounded-lg">
                    <div class="text-muted-foreground text-xs mb-1">Total to Recover</div>
                    <div class="font-bold text-lg">
                      {currencyFormatter.format(recoveryPlan.totalDeficit)}
                    </div>
                  </div>
                  <div class="p-3 bg-muted/50 rounded-lg">
                    <div class="text-muted-foreground text-xs mb-1">Estimated Time</div>
                    <div class="font-bold text-lg">
                      {recoveryPlan.estimatedTimeToRecover} day{recoveryPlan.estimatedTimeToRecover !==
                      1
                        ? 's'
                        : ''}
                    </div>
                  </div>
                </div>

                <Separator />

                <!-- Recovery Steps -->
                <div class="space-y-3">
                  <h4 class="font-medium text-sm">Recovery Steps</h4>
                  {#each recoveryPlan.recoverySteps as step}
                    {@const stepTypeConfig = {
                      transfer: {color: 'border-blue-500', icon: ArrowRight, label: 'Transfer'},
                      emergency_fund: {color: 'border-red-500', icon: AlertTriangle, label: 'Emergency Fund'},
                      reallocation: {color: 'border-purple-500', icon: Zap, label: 'Reallocation'},
                      external_injection: {color: 'border-green-500', icon: CheckCircle2, label: 'External Funds'},
                    }[step.type] || {color: 'border-gray-500', icon: Info, label: step.type}}
                    <div class="flex items-start gap-3 p-3 rounded-lg border-l-4 bg-muted/30 {stepTypeConfig.color}">
                      <div
                        class="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0 mt-0.5"
                      >
                        {step.order}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                          <stepTypeConfig.icon class="h-4 w-4" />
                          <span class="font-medium text-sm">{stepTypeConfig.label}</span>
                          {#if step.automated}
                            <Badge variant="secondary" class="text-xs">Automated</Badge>
                          {/if}
                        </div>
                        <p class="text-sm text-muted-foreground mb-1">{step.description}</p>
                        <div class="text-sm font-medium">
                          {currencyFormatter.format(step.amount)}
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              </Card.Content>
            </Card.Root>
          {/if}
        </Tabs.Content>

        <!-- Quick Actions Tab -->
        <Tabs.Content value="quick-actions" class="space-y-4 mt-4">
          <Card.Root>
            <Card.Header>
              <Card.Title class="text-base">Quick Recovery Actions</Card.Title>
              <Card.Description>Immediate actions to address the deficit</Card.Description>
            </Card.Header>
            <Card.Content class="space-y-3">
              <Button variant="outline" class="w-full justify-start" disabled>
                <ArrowRight class="mr-2 h-4 w-4" />
                Transfer from Another Envelope
              </Button>
              <Button variant="outline" class="w-full justify-start" disabled>
                <AlertTriangle class="mr-2 h-4 w-4" />
                Use Emergency Fund
              </Button>
              <Button variant="outline" class="w-full justify-start" disabled>
                <Zap class="mr-2 h-4 w-4" />
                Reallocate Budget
              </Button>
              <Button variant="outline" class="w-full justify-start" disabled>
                <TrendingDown class="mr-2 h-4 w-4" />
                Reset Envelope
              </Button>
            </Card.Content>
          </Card.Root>
        </Tabs.Content>
      </Tabs.Root>
    </div>

    <Dialog.Footer class="flex-col sm:flex-row gap-2">
      <Button variant="outline" onclick={handleClose} class="flex-1">Cancel</Button>
      {#if recoveryPlan}
        <Button onclick={handleExecute} disabled={isExecuting} class="flex-1">
          {#if isExecuting}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Execute Recovery Plan
        </Button>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
