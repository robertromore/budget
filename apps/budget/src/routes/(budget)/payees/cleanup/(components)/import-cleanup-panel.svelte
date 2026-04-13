<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Button } from '$lib/components/ui/button';
import { Switch } from '$lib/components/ui/switch';
import { Label } from '$lib/components/ui/label';
import { listPayees, previewImportCleanup, updatePayee } from '$lib/query/payees';
import { toast } from '$lib/utils/toast-interceptor';

import NormalizationPreviewTable, {
  type NormalizationPreview,
} from './normalization-preview-table.svelte';

import Check from '@lucide/svelte/icons/check';
import Eye from '@lucide/svelte/icons/eye';
import Loader2 from '@lucide/svelte/icons/loader-2';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Eraser from '@lucide/svelte/icons/eraser';

// State
let previews = $state<NormalizationPreview[]>([]);
let showOnlyChanges = $state(true);
let isPreviewLoading = $state(false);
let isApplying = $state(false);
let hasPreviewed = $state(false);

// Queries
const payeesQuery = listPayees().options();
const updateMutation = updatePayee().options();

const payees = $derived(payeesQuery.data ?? []);
const changesCount = $derived(previews.filter((p) => p.wouldChange).length);
const selectedCount = $derived(previews.filter((p) => p.selected).length);

async function handlePreview() {
  if (payees.length === 0) {
    toast.error('No payees to clean up');
    return;
  }

  isPreviewLoading = true;

  try {
    const payeesWithNames = payees.filter((p): p is typeof p & { name: string } => !!p.name);
    const descriptions = payeesWithNames.map((p) => p.name);
    const result = await previewImportCleanup(descriptions).execute();

    if (!result) {
      throw new Error('No result from cleanup preview');
    }

    previews = payeesWithNames.map((payee, index) => ({
      payeeId: payee.id,
      original: payee.name,
      normalized: result.results[index]?.normalized ?? payee.name,
      wouldChange: result.results[index]?.wouldChange ?? false,
      selected: result.results[index]?.wouldChange ?? false,
    }));

    hasPreviewed = true;

    if (result.changesNeeded === 0) {
      toast.success('All names are already clean', {
        description: 'No transactional noise detected.',
      });
    } else {
      toast.info(
        `Found ${result.changesNeeded} name${result.changesNeeded === 1 ? '' : 's'} to clean`,
        { description: `${result.alreadyNormalized} already clean` }
      );
    }
  } catch (error) {
    console.error('Failed to preview import cleanup:', error);
    toast.error('Failed to preview cleanup', {
      description: error instanceof Error ? error.message : 'An error occurred',
    });
  } finally {
    isPreviewLoading = false;
  }
}

function toggleSelect(payeeId: number, selected: boolean) {
  previews = previews.map((p) => (p.payeeId === payeeId ? { ...p, selected } : p));
}

function selectAll(selected: boolean) {
  previews = previews.map((p) => (p.wouldChange ? { ...p, selected } : p));
}

async function handleApply() {
  const toApply = previews.filter((p) => p.selected && p.wouldChange);

  if (toApply.length === 0) {
    toast.error('No changes selected');
    return;
  }

  isApplying = true;
  let successCount = 0;
  let failCount = 0;

  for (const preview of toApply) {
    try {
      await updateMutation.mutateAsync({
        id: preview.payeeId,
        name: preview.normalized,
      });
      successCount++;

      previews = previews.map((p) =>
        p.payeeId === preview.payeeId
          ? { ...p, original: preview.normalized, wouldChange: false, selected: false }
          : p
      );
    } catch {
      failCount++;
    }
  }

  if (successCount > 0) {
    toast.success(`Cleaned ${successCount} payee name${successCount === 1 ? '' : 's'}`, {
      description: failCount > 0 ? `${failCount} failed` : undefined,
    });
  }

  if (failCount > 0 && successCount === 0) {
    toast.error('Failed to update payee names');
  }

  isApplying = false;
}
</script>

<div class="space-y-6">
  <!-- Info Card -->
  <Card.Root>
    <Card.Header>
      <div class="flex items-center gap-2">
        <Eraser class="text-primary h-5 w-5" />
        <Card.Title>Remove Transaction Noise</Card.Title>
      </div>
      <Card.Description>
        Strip raw bank statement noise from payee names using the same logic applied during import
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="text-muted-foreground text-sm">
        <p class="mb-2">This will:</p>
        <ul class="list-inside list-disc space-y-1">
          <li>Remove transaction prefixes (DEBIT, CREDIT, ACH, POS, ATM, CHECK)</li>
          <li>Strip payment processor tags (SQ *, TST*, PYMT, PMT)</li>
          <li>Remove store numbers and location codes (#1234, Store 567)</li>
          <li>Strip trailing transaction IDs and card numbers (****1234)</li>
          <li>Remove embedded dollar amounts and dates</li>
          <li>Remove corporate suffixes (INC, LLC, LTD, CORP)</li>
        </ul>
      </div>

      <Button onclick={handlePreview} disabled={isPreviewLoading} class="w-full">
        {#if isPreviewLoading}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          Analyzing names...
        {:else}
          <Eye class="mr-2 h-4 w-4" />
          Preview Changes
        {/if}
      </Button>
    </Card.Content>
  </Card.Root>

  <!-- Preview Results -->
  {#if hasPreviewed}
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold">Cleanup Preview</h3>
          <p class="text-muted-foreground text-sm">
            {changesCount} change{changesCount === 1 ? '' : 's'} needed,
            {selectedCount} selected
          </p>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <Switch id="show-only-changes-import" bind:checked={showOnlyChanges} />
            <Label for="show-only-changes-import" class="text-sm font-normal">
              Show only changes
            </Label>
          </div>
          <Button onclick={handleApply} disabled={isApplying || selectedCount === 0}>
            {#if isApplying}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              Applying...
            {:else}
              <Check class="mr-2 h-4 w-4" />
              Apply Selected ({selectedCount})
            {/if}
          </Button>
        </div>
      </div>

      {#if changesCount === 0}
        <Card.Root>
          <Card.Content class="flex flex-col items-center justify-center py-12">
            <Sparkles class="text-muted-foreground mb-4 h-12 w-12" />
            <h3 class="mb-1 text-lg font-semibold">All Names Are Clean</h3>
            <p class="text-muted-foreground text-center text-sm">
              No transactional noise detected in your payee names.
            </p>
          </Card.Content>
        </Card.Root>
      {:else}
        <NormalizationPreviewTable
          {previews}
          {showOnlyChanges}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll} />
      {/if}
    </div>
  {/if}
</div>
