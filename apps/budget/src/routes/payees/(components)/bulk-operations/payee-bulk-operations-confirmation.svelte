<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import * as Card from '$lib/components/ui/card';
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import { Checkbox } from '$lib/components/ui/checkbox';
import { ScrollArea } from '$lib/components/ui/scroll-area';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';

import { PayeesState } from '$lib/states/entities/payees.svelte';

// Icons
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
import Trash2 from '@lucide/svelte/icons/trash-2';
import Users from '@lucide/svelte/icons/users';
import Eye from '@lucide/svelte/icons/eye';
import EyeOff from '@lucide/svelte/icons/eye-off';
import CheckCircle from '@lucide/svelte/icons/check-circle';
import Merge from '@lucide/svelte/icons/merge';
import Building from '@lucide/svelte/icons/building';

export interface ConfirmationOptions {
  type: 'delete' | 'merge' | 'cleanup';
  payeeIds?: number[];
  primaryPayeeId?: number;
  duplicatePayeeIds?: number[];
  cleanupOperations?: string[];
  title: string;
  description: string;
  confirmText?: string;
  requiresTyping?: boolean;
  expectedText?: string;
  showAffectedPayees?: boolean;
  showImpactWarning?: boolean;
  destructiveLevel?: 'low' | 'medium' | 'high';
}

let {
  open = $bindable(false),
  options,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  options: ConfirmationOptions | null;
  onConfirm?: () => void;
  onCancel?: () => void;
} = $props();

const payeesState = PayeesState.get();

// Local state
let showPayeeDetails = $state(false);
let confirmationText = $state('');
let hasReadWarning = $state(false);
let understandsConsequences = $state(false);

// Get affected payees
const affectedPayees = $derived.by(() => {
  if (!options) return [];

  const allPayees = Array.from(payeesState.payees.values());

  if (options.payeeIds) {
    return allPayees.filter(p => options.payeeIds!.includes(p.id));
  }

  if (options.primaryPayeeId && options.duplicatePayeeIds) {
    return allPayees.filter(p =>
      p.id === options.primaryPayeeId ||
      options.duplicatePayeeIds!.includes(p.id)
    );
  }

  return [];
});

// Validation
const canConfirm = $derived.by(() => {
  if (!options) return false;

  // Check if typing confirmation is required and matches
  if (options.requiresTyping && options.expectedText) {
    if (confirmationText.trim() !== options.expectedText) return false;
  }

  // Check if high-risk operations require additional confirmations
  if (options.destructiveLevel === 'high') {
    return hasReadWarning && understandsConsequences;
  }

  return true;
});

// Get operation icon and color
function getOperationIcon(type: string) {
  switch (type) {
    case 'delete': return Trash2;
    case 'merge': return Merge;
    case 'cleanup': return Building;
    default: return AlertTriangle;
  }
}

function getOperationColor(destructiveLevel?: string): string {
  switch (destructiveLevel) {
    case 'high': return 'text-red-600';
    case 'medium': return 'text-orange-600';
    case 'low': return 'text-yellow-600';
    default: return 'text-gray-600';
  }
}

// Get payee type icon
function getPayeeTypeIcon(payeeType?: string | null) {
  switch (payeeType) {
    case 'merchant': return Building;
    case 'utility': return Building;
    case 'employer': return Building;
    case 'financial_institution': return Building;
    case 'government': return Building;
    case 'individual': return Users;
    default: return Users;
  }
}

// Get impact warnings
function getImpactWarnings(type: string, payeeCount: number): string[] {
  const warnings: string[] = [];

  switch (type) {
    case 'delete':
      warnings.push(`${payeeCount} payee${payeeCount > 1 ? 's' : ''} will be permanently deleted`);
      warnings.push('All associated transaction assignments will be removed');
      warnings.push('This action cannot be undone');
      if (payeeCount > 10) {
        warnings.push('⚠️ Large number of payees being deleted - double check selection');
      }
      break;

    case 'merge':
      warnings.push('Duplicate payees will be merged into the primary payee');
      warnings.push('Transaction history will be preserved and transferred');
      warnings.push('Contact information will be merged intelligently');
      warnings.push('This action cannot be easily undone');
      break;

    case 'cleanup':
      warnings.push('Multiple cleanup operations will be performed');
      warnings.push('Some changes may affect multiple payees');
      warnings.push('Review the operations carefully before proceeding');
      break;
  }

  return warnings;
}

// Reset state when dialog opens/closes
$effect(() => {
  if (!open) {
    confirmationText = '';
    hasReadWarning = false;
    understandsConsequences = false;
    showPayeeDetails = false;
  }
});

// Handle actions
function handleConfirm() {
  if (canConfirm && onConfirm) {
    onConfirm();
  }
}

function handleCancel() {
  if (onCancel) {
    onCancel();
  }
  open = false;
}

function togglePayeeDetails() {
  showPayeeDetails = !showPayeeDetails;
}
</script>

{#if options}
  <AlertDialog.Root bind:open>
    <AlertDialog.Content class="max-w-2xl max-h-[90vh] overflow-hidden">
      <AlertDialog.Header>
        <AlertDialog.Title class="flex items-center gap-2">
          {@const Icon = getOperationIcon(options.type)}
          <Icon class="h-5 w-5 {getOperationColor(options.destructiveLevel)}" />
          {options.title}
        </AlertDialog.Title>
        <AlertDialog.Description>
          {options.description}
        </AlertDialog.Description>
      </AlertDialog.Header>

      <div class="space-y-4 max-h-[60vh] overflow-auto">
        <!-- Impact Warning -->
        {#if options.showImpactWarning}
          {@const warnings = getImpactWarnings(options.type, affectedPayees.length)}
          <Card.Root class="border-orange-200 bg-orange-50">
            <Card.Header>
              <Card.Title class="text-lg text-orange-800 flex items-center gap-2">
                <AlertTriangle class="h-5 w-5" />
                Impact Assessment
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <ul class="space-y-1">
                {#each warnings as warning}
                  <li class="text-sm text-orange-700 flex items-start gap-2">
                    <span class="text-orange-500 mt-1">•</span>
                    {warning}
                  </li>
                {/each}
              </ul>
            </Card.Content>
          </Card.Root>
        {/if}

        <!-- Affected Payees -->
        {#if options.showAffectedPayees && affectedPayees.length > 0}
          <Card.Root>
            <Card.Header>
              <Card.Title class="text-lg flex items-center justify-between">
                Affected Payees ({affectedPayees.length})
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={togglePayeeDetails}
                  class="h-8"
                >
                  {#if showPayeeDetails}
                    <EyeOff class="h-4 w-4 mr-2" />
                    Hide Details
                  {:else}
                    <Eye class="h-4 w-4 mr-2" />
                    Show Details
                  {/if}
                </Button>
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <ScrollArea class="h-[200px]">
                {#if showPayeeDetails}
                  <div class="space-y-2">
                    {#each affectedPayees as payee}
                      {@const Icon = getPayeeTypeIcon(payee.payeeType)}
                      <div class="flex items-center gap-3 p-2 border rounded-lg {payee.id === options.primaryPayeeId ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}">
                        <Icon class="h-4 w-4 text-muted-foreground" />
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2">
                            <span class="font-medium truncate">{payee.name}</span>
                            {#if payee.id === options.primaryPayeeId}
                              <Badge variant="default" class="text-xs">Primary</Badge>
                            {:else if options.duplicatePayeeIds?.includes(payee.id)}
                              <Badge variant="secondary" class="text-xs">Duplicate</Badge>
                            {/if}
                            {#if payee.payeeType}
                              <Badge variant="outline" class="text-xs">
                                {payee.payeeType.replace('_', ' ')}
                              </Badge>
                            {/if}
                          </div>
                          {#if payee.notes}
                            <p class="text-xs text-muted-foreground truncate">{payee.notes}</p>
                          {/if}
                        </div>
                        <div class="text-xs text-muted-foreground">
                          ID: {payee.id}
                        </div>
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {#each affectedPayees.slice(0, 8) as payee}
                      {@const Icon = getPayeeTypeIcon(payee.payeeType)}
                      <div class="flex items-center gap-2 text-sm p-2 border rounded">
                        <Icon class="h-3 w-3 text-muted-foreground" />
                        <span class="truncate">{payee.name}</span>
                        {#if payee.id === options.primaryPayeeId}
                          <Badge variant="default" class="text-xs">Primary</Badge>
                        {/if}
                      </div>
                    {/each}
                  </div>
                  {#if affectedPayees.length > 8}
                    <p class="text-sm text-muted-foreground text-center mt-2">
                      ... and {affectedPayees.length - 8} more payees
                    </p>
                  {/if}
                {/if}
              </ScrollArea>
            </Card.Content>
          </Card.Root>
        {/if}

        <!-- Cleanup Operations -->
        {#if options.type === 'cleanup' && options.cleanupOperations}
          <Card.Root>
            <Card.Header>
              <Card.Title class="text-lg">Cleanup Operations</Card.Title>
            </Card.Header>
            <Card.Content>
              <div class="space-y-2">
                {#each options.cleanupOperations as operation}
                  <div class="flex items-center gap-2 p-2 border rounded-lg">
                    <CheckCircle class="h-4 w-4 text-green-500" />
                    <span class="text-sm">{operation.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                  </div>
                {/each}
              </div>
            </Card.Content>
          </Card.Root>
        {/if}

        <!-- High-risk confirmations -->
        {#if options.destructiveLevel === 'high'}
          <Card.Root class="border-red-200 bg-red-50">
            <Card.Header>
              <Card.Title class="text-lg text-red-800">Additional Confirmations Required</Card.Title>
            </Card.Header>
            <Card.Content class="space-y-3">
              <div class="flex items-start space-x-2">
                <Checkbox bind:checked={hasReadWarning} id="warning-read" />
                <Label for="warning-read" class="text-sm text-red-700">
                  I have read and understand the impact of this operation
                </Label>
              </div>
              <div class="flex items-start space-x-2">
                <Checkbox bind:checked={understandsConsequences} id="consequences" />
                <Label for="consequences" class="text-sm text-red-700">
                  I understand that this action cannot be easily undone
                </Label>
              </div>
            </Card.Content>
          </Card.Root>
        {/if}

        <!-- Typing confirmation -->
        {#if options.requiresTyping && options.expectedText}
          <Card.Root>
            <Card.Header>
              <Card.Title class="text-lg">Confirmation Required</Card.Title>
            </Card.Header>
            <Card.Content class="space-y-2">
              <Label for="confirmation-input">
                Type "{options.expectedText}" to confirm:
              </Label>
              <Input
                id="confirmation-input"
                bind:value={confirmationText}
                placeholder={options.expectedText}
                class="font-mono"
              />
              {#if confirmationText && confirmationText.trim() !== options.expectedText}
                <p class="text-sm text-red-600">Text does not match. Please type exactly: {options.expectedText}</p>
              {/if}
            </Card.Content>
          </Card.Root>
        {/if}
      </div>

      <AlertDialog.Footer class="flex-col gap-2">
        {#if !canConfirm}
          <p class="text-sm text-muted-foreground text-center">
            Please complete all confirmations above to proceed.
          </p>
        {/if}

        <div class="flex justify-end gap-2 w-full">
          <AlertDialog.Cancel>
            <Button variant="outline" onclick={handleCancel}>
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button
              variant={options.destructiveLevel === 'high' ? 'destructive' : 'default'}
              onclick={handleConfirm}
              disabled={!canConfirm}
            >
              {options.confirmText || 'Confirm'}
            </Button>
          </AlertDialog.Action>
        </div>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>
{/if}
