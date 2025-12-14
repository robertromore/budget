<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Dialog from '$lib/components/ui/dialog';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as RadioGroup from '$lib/components/ui/radio-group';
import * as Select from '$lib/components/ui/select';
import { Separator } from '$lib/components/ui/separator';
import * as Tabs from '$lib/components/ui/tabs';
import type { EnvelopeAllocation } from '$lib/schema/budgets/envelope-allocations';
import { rpc } from '$lib/query';
import { cn } from '$lib/utils';
import { createTransformAccessors } from '$lib/utils/bind-helpers';
import { currencyFormatter } from '$lib/utils/formatters';
import {
  ArrowRight,
  CircleCheck,
  Info,
  LoaderCircle,
  TrendingDown,
  TriangleAlert,
  Zap,
} from '@lucide/svelte/icons';
import { toast } from 'svelte-sonner';

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

let selectedOptionIndex = $state<string | undefined>(undefined);
const selectedOptionAccessors = createTransformAccessors(
  () => selectedOptionIndex ?? '',
  (value: string) => {
    selectedOptionIndex = value || undefined;
  }
);
let isPerformingQuickAction = $state<boolean>(false);
let selectedTransferSource = $state<string>('');

const _envelope = (() => envelope)();
let transferAmount = $state<number>(_envelope.deficitAmount);
let surplusEnvelopes = $state<EnvelopeAllocation[]>([]);
let isLoadingSurplus = $state<boolean>(false);

const severityConfig = $derived.by(() => {
  if (!analysis) return { color: 'text-muted-foreground', label: 'Unknown', icon: Info };

  switch (analysis.deficitSeverity) {
    case 'critical':
      return { color: 'text-red-600', label: 'Critical', icon: TriangleAlert };
    case 'severe':
      return { color: 'text-orange-600', label: 'Severe', icon: TriangleAlert };
    case 'moderate':
      return { color: 'text-yellow-600', label: 'Moderate', icon: TrendingDown };
    case 'mild':
      return { color: 'text-blue-600', label: 'Mild', icon: Info };
    default:
      return { color: 'text-muted-foreground', label: analysis.deficitSeverity, icon: Info };
  }
});

function handleClose() {
  open = false;
  selectedOptionIndex = undefined;
  isPerformingQuickAction = false;
  selectedTransferSource = '';
  transferAmount = envelope.deficitAmount;
  surplusEnvelopes = [];
}

function handleExecute() {
  if (recoveryPlan && onExecutePlan) {
    onExecutePlan(recoveryPlan);
  }
}

async function loadSurplusEnvelopes() {
  isLoadingSurplus = true;
  try {
    const result = await rpc.budgets.getSurplusEnvelopes(envelope.budgetId, 10).execute();
    surplusEnvelopes = result;
  } catch (error) {
    console.error('Failed to load surplus envelopes:', error);
    toast.error('Failed to load available envelopes');
  } finally {
    isLoadingSurplus = false;
  }
}

async function handleTransferFromEnvelope() {
  if (!selectedTransferSource || transferAmount <= 0) {
    toast.error('Please select a source envelope and enter a valid amount');
    return;
  }

  isPerformingQuickAction = true;
  try {
    await rpc.budgets.transferEnvelopeFunds.execute({
      fromEnvelopeId: Number(selectedTransferSource),
      toEnvelopeId: envelope.id,
      amount: transferAmount,
      reason: `Deficit recovery transfer to ${categoryName}`,
      transferredBy: 'user',
    });

    toast.success(`Transferred ${currencyFormatter.format(transferAmount)} successfully`);
    handleClose();
    // Trigger re-fetch in parent
    window.location.reload();
  } catch (error) {
    console.error('Transfer failed:', error);
    toast.error('Failed to transfer funds');
  } finally {
    isPerformingQuickAction = false;
  }
}

async function handleUseEmergencyFund() {
  if (!analysis) {
    toast.error('Please analyze the deficit first');
    return;
  }

  // Find emergency fund option
  const emergencyOption = analysis.autoRecoveryOptions.find((opt) => opt.type === 'emergency_fund');

  if (!emergencyOption || !emergencyOption.sourceEnvelopeId) {
    toast.error('No emergency fund available');
    return;
  }

  isPerformingQuickAction = true;
  try {
    await rpc.budgets.transferEnvelopeFunds.execute({
      fromEnvelopeId: emergencyOption.sourceEnvelopeId,
      toEnvelopeId: envelope.id,
      amount: emergencyOption.amount,
      reason: `Emergency fund withdrawal for ${categoryName} deficit`,
      transferredBy: 'user',
    });

    toast.success(`Used ${currencyFormatter.format(emergencyOption.amount)} from emergency fund`);
    handleClose();
    window.location.reload();
  } catch (error) {
    console.error('Emergency fund transfer failed:', error);
    toast.error('Failed to use emergency fund');
  } finally {
    isPerformingQuickAction = false;
  }
}

async function handleReallocateBudget() {
  isPerformingQuickAction = true;
  try {
    // Update the envelope allocation to increase the allocated amount
    await rpc.budgets.updateEnvelopeAllocation.execute({
      envelopeId: envelope.id,
      allocatedAmount: envelope.allocatedAmount + envelope.deficitAmount,
    });

    toast.success('Budget reallocated successfully');
    handleClose();
    window.location.reload();
  } catch (error) {
    console.error('Reallocation failed:', error);
    toast.error('Failed to reallocate budget');
  } finally {
    isPerformingQuickAction = false;
  }
}

async function handleResetEnvelope() {
  isPerformingQuickAction = true;
  try {
    // Reset envelope by setting deficit to 0
    await rpc.budgets.updateEnvelopeAllocation.execute({
      envelopeId: envelope.id,
      allocatedAmount: envelope.spentAmount, // Set allocated = spent to zero out deficit
    });

    toast.success('Envelope reset successfully');
    handleClose();
    window.location.reload();
  } catch (error) {
    console.error('Reset failed:', error);
    toast.error('Failed to reset envelope');
  } finally {
    isPerformingQuickAction = false;
  }
}
</script>

<Dialog.Root bind:open {...onOpenChange ? { onOpenChange } : {}}>
  <Dialog.Content class="max-h-[90vh] max-w-3xl overflow-y-auto">
    <Dialog.Header>
      <div class="flex items-center gap-3">
        <div class="rounded-lg bg-red-50 p-2 dark:bg-red-950/20">
          <TriangleAlert class="h-5 w-5 text-red-600" />
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
          <Card.Title class="flex items-center gap-2 text-lg">
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
                  <severityConfig.icon class="mr-1 h-3 w-3" />
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
      <Tabs.Root value="recovery-plan" class="w-full">
        <Tabs.List class="grid w-full grid-cols-2">
          <Tabs.Trigger value="recovery-plan">Recovery Options</Tabs.Trigger>
          <Tabs.Trigger value="quick-actions">Quick Actions</Tabs.Trigger>
        </Tabs.List>

        <!-- Recovery Options Tab -->
        <Tabs.Content value="recovery-plan" class="mt-4 space-y-4">
          {#if !analysis}
            <Card.Root>
              <Card.Content class="p-6 text-center">
                <Info class="text-muted-foreground mx-auto mb-3 h-12 w-12" />
                <p class="text-muted-foreground mb-4 text-sm">
                  Analyze available recovery options for this deficit
                </p>
                <Button onclick={onAnalyze} disabled={isAnalyzing}>
                  {#if isAnalyzing}
                    <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
                  {/if}
                  Show Recovery Options
                </Button>
              </Card.Content>
            </Card.Root>
          {:else if !recoveryPlan}
            <!-- Recovery Options - Selectable -->
            <Card.Root>
              <Card.Header>
                <Card.Title class="text-base">Select Recovery Method</Card.Title>
                <Card.Description>Choose which option to use to cover the deficit</Card.Description>
              </Card.Header>
              <Card.Content>
                <RadioGroup.Root
                  bind:value={selectedOptionAccessors.get, selectedOptionAccessors.set}
                  class="space-y-3">
                  {#each analysis.autoRecoveryOptions as option, index}
                    {@const typeConfig = {
                      transfer: {
                        color:
                          'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
                        icon: ArrowRight,
                        label: 'Transfer',
                      },
                      emergency_fund: {
                        color: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
                        icon: TriangleAlert,
                        label: 'Emergency Fund',
                      },
                      reallocation: {
                        color:
                          'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800',
                        icon: Zap,
                        label: 'Reallocation',
                      },
                      borrowing: {
                        color:
                          'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800',
                        icon: Info,
                        label: 'Borrowing',
                      },
                      reset: {
                        color:
                          'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800',
                        icon: TrendingDown,
                        label: 'Reset',
                      },
                    }[option.type] || { color: '', icon: Info, label: option.type }}
                    {@const isSelected = selectedOptionIndex === String(index)}
                    <label
                      class={cn(
                        'flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-left transition-all',
                        typeConfig.color,
                        isSelected && 'ring-primary ring-2 ring-offset-2',
                        'hover:shadow-md'
                      )}>
                      <RadioGroup.Item value={String(index)} class="mt-1" />
                      <div class="flex-1">
                        <div class="mb-2 flex items-start justify-between">
                          <div class="flex items-center gap-2">
                            <typeConfig.icon class="h-4 w-4" />
                            <span class="font-medium">{typeConfig.label}</span>
                            <Badge
                              variant={option.feasible ? 'default' : 'secondary'}
                              class="text-xs">
                              {option.feasible ? 'Feasible' : 'Limited'}
                            </Badge>
                          </div>
                          <span class="font-bold">{currencyFormatter.format(option.amount)}</span>
                        </div>
                        <p class="mb-2 text-sm">{option.description}</p>
                        <p class="text-muted-foreground text-xs">Impact: {option.impact}</p>
                      </div>
                    </label>
                  {/each}
                </RadioGroup.Root>
              </Card.Content>
              <Card.Footer class="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onclick={() => {
                    selectedOptionIndex = undefined;
                  }}>
                  Clear Selection
                </Button>
                <Button
                  onclick={onCreatePlan}
                  disabled={selectedOptionIndex === undefined || isCreatingPlan}>
                  {#if isCreatingPlan}
                    <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
                  {/if}
                  Create Recovery Plan
                </Button>
              </Card.Footer>
            </Card.Root>
          {:else}
            <!-- Recovery Plan Overview -->
            <Card.Root>
              <Card.Header>
                <Card.Title class="text-base">Recovery Plan</Card.Title>
                <Card.Description>
                  {recoveryPlan.recoverySteps.length} step{recoveryPlan.recoverySteps.length !== 1
                    ? 's'
                    : ''} to recover {currencyFormatter.format(recoveryPlan.totalDeficit)}
                </Card.Description>
              </Card.Header>
              <Card.Content class="space-y-4">
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div class="bg-muted/50 rounded-lg p-3">
                    <div class="text-muted-foreground mb-1 text-xs">Total to Recover</div>
                    <div class="text-lg font-bold">
                      {currencyFormatter.format(recoveryPlan.totalDeficit)}
                    </div>
                  </div>
                  <div class="bg-muted/50 rounded-lg p-3">
                    <div class="text-muted-foreground mb-1 text-xs">Estimated Time</div>
                    <div class="text-lg font-bold">
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
                  <h4 class="text-sm font-medium">Recovery Steps</h4>
                  {#each recoveryPlan.recoverySteps as step}
                    {@const stepTypeConfig = {
                      transfer: { color: 'border-blue-500', icon: ArrowRight, label: 'Transfer' },
                      emergency_fund: {
                        color: 'border-red-500',
                        icon: TriangleAlert,
                        label: 'Emergency Fund',
                      },
                      reallocation: {
                        color: 'border-purple-500',
                        icon: Zap,
                        label: 'Reallocation',
                      },
                      external_injection: {
                        color: 'border-green-500',
                        icon: CircleCheck,
                        label: 'External Funds',
                      },
                    }[step.type] || { color: 'border-gray-500', icon: Info, label: step.type }}
                    <div
                      class="bg-muted/30 flex items-start gap-3 rounded-lg border-l-4 p-3 {stepTypeConfig.color}">
                      <div
                        class="bg-primary text-primary-foreground mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                        {step.order}
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="mb-1 flex items-center gap-2">
                          <stepTypeConfig.icon class="h-4 w-4" />
                          <span class="text-sm font-medium">{stepTypeConfig.label}</span>
                          {#if step.automated}
                            <Badge variant="secondary" class="text-xs">Automated</Badge>
                          {/if}
                        </div>
                        <p class="text-muted-foreground mb-1 text-sm">{step.description}</p>
                        <div class="text-sm font-medium">
                          {currencyFormatter.format(step.amount)}
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              </Card.Content>
              <Card.Footer class="flex justify-between">
                <Button
                  variant="outline"
                  onclick={() => {
                    // Go back to option selection
                    recoveryPlan = null;
                    selectedOptionIndex = undefined;
                  }}>
                  Change Selection
                </Button>
              </Card.Footer>
            </Card.Root>
          {/if}
        </Tabs.Content>

        <!-- Quick Actions Tab -->
        <Tabs.Content value="quick-actions" class="mt-4 space-y-4">
          <!-- Transfer from Another Envelope -->
          <Card.Root>
            <Card.Header>
              <div class="flex items-center gap-2">
                <ArrowRight class="h-5 w-5 text-blue-600" />
                <Card.Title class="text-base">Transfer from Another Envelope</Card.Title>
              </div>
              <Card.Description>
                Move funds from an envelope with surplus to cover this deficit
              </Card.Description>
            </Card.Header>
            <Card.Content class="space-y-4">
              <div class="space-y-2">
                <Label>Source Envelope</Label>
                {#if surplusEnvelopes.length === 0}
                  <Button
                    variant="outline"
                    class="w-full"
                    onclick={loadSurplusEnvelopes}
                    disabled={isLoadingSurplus}>
                    {#if isLoadingSurplus}
                      <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
                    {/if}
                    Load Available Envelopes
                  </Button>
                {:else}
                  <Select.Root type="single" bind:value={selectedTransferSource}>
                    <Select.Trigger>
                      {#if selectedTransferSource}
                        {@const selectedEnv = surplusEnvelopes.find(
                          (e) => String(e.id) === selectedTransferSource
                        )}
                        {#if selectedEnv}
                          Category {selectedEnv.categoryId} - {currencyFormatter.format(
                            selectedEnv.availableAmount
                          )} available
                        {:else}
                          Select an envelope
                        {/if}
                      {:else}
                        Select an envelope
                      {/if}
                    </Select.Trigger>
                    <Select.Content>
                      {#each surplusEnvelopes as env}
                        <Select.Item value={String(env.id)}>
                          Category {env.categoryId} - {currencyFormatter.format(
                            env.availableAmount
                          )} available
                        </Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                {/if}
              </div>

              <div class="space-y-2">
                <Label>Transfer Amount</Label>
                <Input
                  type="number"
                  bind:value={transferAmount}
                  min={0}
                  max={envelope.deficitAmount}
                  step={0.01}
                  placeholder="Enter amount" />
                <p class="text-muted-foreground text-xs">
                  Deficit: {currencyFormatter.format(envelope.deficitAmount)}
                </p>
              </div>
            </Card.Content>
            <Card.Footer>
              <Button
                onclick={handleTransferFromEnvelope}
                disabled={!selectedTransferSource || transferAmount <= 0 || isPerformingQuickAction}
                class="w-full">
                {#if isPerformingQuickAction}
                  <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                Transfer Funds
              </Button>
            </Card.Footer>
          </Card.Root>

          <!-- Use Emergency Fund -->
          <Card.Root>
            <Card.Header>
              <div class="flex items-center gap-2">
                <TriangleAlert class="h-5 w-5 text-red-600" />
                <Card.Title class="text-base">Use Emergency Fund</Card.Title>
              </div>
              <Card.Description>
                Withdraw from your emergency fund to cover this deficit
              </Card.Description>
            </Card.Header>
            <Card.Content>
              {#if !analysis}
                <p class="text-muted-foreground text-sm">
                  Run analysis first to check emergency fund availability
                </p>
              {:else}
                {@const emergencyOption = analysis.autoRecoveryOptions.find(
                  (opt) => opt.type === 'emergency_fund'
                )}
                {#if emergencyOption && emergencyOption.sourceEnvelopeId}
                  <div class="space-y-2 rounded-lg bg-red-50 p-3 dark:bg-red-950/20">
                    <div class="flex justify-between text-sm">
                      <span class="text-muted-foreground">Available:</span>
                      <span class="font-medium"
                        >{currencyFormatter.format(emergencyOption.amount)}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-muted-foreground">Impact:</span>
                      <span class="text-xs">{emergencyOption.impact}</span>
                    </div>
                  </div>
                {:else}
                  <p class="text-muted-foreground text-sm">No emergency fund available</p>
                {/if}
              {/if}
            </Card.Content>
            <Card.Footer>
              <Button
                onclick={handleUseEmergencyFund}
                disabled={!analysis ||
                  !analysis.autoRecoveryOptions.find((opt) => opt.type === 'emergency_fund') ||
                  isPerformingQuickAction}
                variant="destructive"
                class="w-full">
                {#if isPerformingQuickAction}
                  <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                Use Emergency Fund
              </Button>
            </Card.Footer>
          </Card.Root>

          <!-- Reallocate Budget -->
          <Card.Root>
            <Card.Header>
              <div class="flex items-center gap-2">
                <Zap class="h-5 w-5 text-purple-600" />
                <Card.Title class="text-base">Reallocate Budget</Card.Title>
              </div>
              <Card.Description>
                Increase the allocated amount for this envelope to cover the deficit
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <div class="space-y-2 rounded-lg bg-purple-50 p-3 text-sm dark:bg-purple-950/20">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Current Allocation:</span>
                  <span class="font-medium"
                    >{currencyFormatter.format(envelope.allocatedAmount)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Deficit:</span>
                  <span class="font-medium text-red-600"
                    >{currencyFormatter.format(envelope.deficitAmount)}</span>
                </div>
                <Separator />
                <div class="flex justify-between font-bold">
                  <span>New Allocation:</span>
                  <span
                    >{currencyFormatter.format(
                      envelope.allocatedAmount + envelope.deficitAmount
                    )}</span>
                </div>
              </div>
            </Card.Content>
            <Card.Footer>
              <Button
                onclick={handleReallocateBudget}
                disabled={isPerformingQuickAction}
                class="w-full">
                {#if isPerformingQuickAction}
                  <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                Reallocate Budget
              </Button>
            </Card.Footer>
          </Card.Root>

          <!-- Reset Envelope -->
          <Card.Root>
            <Card.Header>
              <div class="flex items-center gap-2">
                <TrendingDown class="h-5 w-5 text-gray-600" />
                <Card.Title class="text-base">Reset Envelope</Card.Title>
              </div>
              <Card.Description>
                Accept the deficit and reset the envelope balance to zero
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <div class="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-950/20">
                <p class="text-muted-foreground text-sm">
                  ⚠️ This will adjust the allocated amount to match spending, effectively accepting
                  the overspend. The deficit will be removed but the overspending will remain
                  recorded.
                </p>
              </div>
            </Card.Content>
            <Card.Footer>
              <Button
                onclick={handleResetEnvelope}
                disabled={isPerformingQuickAction}
                variant="outline"
                class="w-full">
                {#if isPerformingQuickAction}
                  <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                Reset Envelope
              </Button>
            </Card.Footer>
          </Card.Root>
        </Tabs.Content>
      </Tabs.Root>
    </div>

    <Dialog.Footer class="flex-col gap-2 sm:flex-row">
      <Button variant="outline" onclick={handleClose} class="flex-1">Cancel</Button>
      {#if recoveryPlan}
        <Button onclick={handleExecute} disabled={isExecuting} class="flex-1">
          {#if isExecuting}
            <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Execute Recovery Plan
        </Button>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
