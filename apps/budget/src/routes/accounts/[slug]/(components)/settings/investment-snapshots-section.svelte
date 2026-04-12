<script lang="ts">
import { rpc } from '$lib/query';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import type { Account } from '$core/schema';
import type { InvestmentValueSnapshot } from '$core/schema/investment-value-snapshots';
import { currencyFormatter } from '$lib/utils/formatters';
import { timezone } from '$lib/utils/dates';
import { today } from '@internationalized/date';
import Plus from '@lucide/svelte/icons/plus';
import Trash2 from '@lucide/svelte/icons/trash-2';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Info from '@lucide/svelte/icons/info';

interface Props {
  account: Account;
}

let { account }: Props = $props();

// Snapshots query
// svelte-ignore state_referenced_locally
const snapshotsQuery = rpc.investmentSnapshots.listSnapshots(account.id).options();
const snapshots = $derived(snapshotsQuery.data ?? []);
const isLoading = $derived(snapshotsQuery.isLoading);

// Mutations
const saveMutation = rpc.investmentSnapshots.saveSnapshot.options();
const deleteMutation = rpc.investmentSnapshots.deleteSnapshot.options();

// New snapshot form state
let newDate = $state(today(timezone).toString());
let newValue = $state<number | undefined>(undefined);
let newNotes = $state<string>('');
let isSaving = $state(false);
let deletingId = $state<number | null>(null);

function todayISO(): string {
  return today(timezone).toString();
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function handleAddSnapshot() {
  if (newValue === undefined || newValue < 0) return;
  isSaving = true;
  try {
    await saveMutation.mutateAsync({
      accountId: account.id,
      snapshotDate: newDate,
      value: newValue,
      notes: newNotes || null,
    });
    // Reset form
    newDate = todayISO();
    newValue = undefined;
    newNotes = '';
  } finally {
    isSaving = false;
  }
}

async function handleDelete(snapshot: InvestmentValueSnapshot) {
  deletingId = snapshot.id;
  try {
    await deleteMutation.mutateAsync({ id: snapshot.id, accountId: account.id });
  } finally {
    deletingId = null;
  }
}
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-xl font-semibold">Investment Value Snapshots</h2>
    <p class="text-muted-foreground text-sm">
      Record periodic portfolio values to track performance over time and enable fee drag analysis.
    </p>
  </div>

  <!-- Add Snapshot -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Record Snapshot</Card.Title>
      <Card.Description>
        Enter the total portfolio value on a specific date. One snapshot per date — adding the same date updates the existing entry.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div class="space-y-2">
          <Label for="snapshot-date">Date</Label>
          <Input
            id="snapshot-date"
            type="date"
            bind:value={newDate}
            max={todayISO()} />
        </div>
        <div class="space-y-2">
          <Label for="snapshot-value">Portfolio Value</Label>
          <NumericInput bind:value={newValue} buttonClass="w-full" />
        </div>
        <div class="space-y-2">
          <Label for="snapshot-notes">
            Notes <span class="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="snapshot-notes"
            type="text"
            bind:value={newNotes}
            placeholder="e.g., end of quarter" />
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <Button
          onclick={handleAddSnapshot}
          disabled={isSaving || !newValue || newValue < 0}>
          <Plus class="mr-2 h-4 w-4" />
          {isSaving ? 'Saving…' : 'Add Snapshot'}
        </Button>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Snapshot History -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Snapshot History</Card.Title>
      <Card.Description>
        {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} recorded
      </Card.Description>
    </Card.Header>
    <Card.Content>
      {#if isLoading}
        <div class="space-y-2">
          {#each [1, 2, 3] as _}
            <div class="bg-muted h-10 animate-pulse rounded"></div>
          {/each}
        </div>
      {:else if snapshots.length === 0}
        <div class="text-muted-foreground flex flex-col items-center gap-3 py-8 text-center">
          <TrendingUp class="h-10 w-10 opacity-30" />
          <p class="text-sm">No snapshots yet. Add your first portfolio value above.</p>
          <div class="flex items-start gap-2 text-xs">
            <Info class="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>Record values periodically — monthly or quarterly — to enable performance tracking and fee drag analysis.</p>
          </div>
        </div>
      {:else}
        <div class="space-y-1">
          <!-- Header -->
          <div class="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span>Date</span>
            <span class="text-right">Value</span>
            <span class="text-right hidden sm:block">Change</span>
            <span></span>
          </div>
          <!-- Rows (reverse chronological) -->
          {#each [...snapshots].reverse() as snapshot, i (snapshot.id)}
            {@const prevSnapshot = snapshots[snapshots.length - 1 - i - 1]}
            {@const change = prevSnapshot ? snapshot.value - prevSnapshot.value : null}
            {@const changePct = prevSnapshot && prevSnapshot.value ? (change! / prevSnapshot.value) * 100 : null}
            <div class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted/50">
              <div>
                <span class="font-medium">{formatDate(snapshot.snapshotDate)}</span>
                {#if snapshot.notes}
                  <span class="text-muted-foreground ml-2 text-xs">{snapshot.notes}</span>
                {/if}
              </div>
              <span class="font-mono text-right">{currencyFormatter.format(snapshot.value)}</span>
              <span class="hidden text-right text-xs sm:block"
                class:text-green-600={change !== null && change >= 0}
                class:text-red-600={change !== null && change < 0}
                class:text-muted-foreground={change === null}>
                {#if change !== null && changePct !== null}
                  {change >= 0 ? '+' : ''}{changePct.toFixed(1)}%
                {:else}
                  —
                {/if}
              </span>
              <Button
                variant="ghost"
                size="sm"
                class="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                disabled={deletingId === snapshot.id}
                onclick={() => handleDelete(snapshot)}>
                <Trash2 class="h-3.5 w-3.5" />
              </Button>
            </div>
          {/each}
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
