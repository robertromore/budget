<script lang="ts">
import type { Account } from '$core/schema/accounts';
import { Button } from '$lib/components/ui/button';
import { Alert, AlertDescription } from '$lib/components/ui/alert';
import CircleAlert from '@lucide/svelte/icons/circle-alert';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import AccountMatchCard from './account-match-card.svelte';
import type { BulkImportState } from './bulk-import-state.svelte';

interface Props {
  state: BulkImportState;
  accounts: Account[];
}

let { state, accounts }: Props = $props();
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <Button variant="ghost" onclick={() => state.goToUpload()}>
      <ArrowLeft class="mr-1 h-4 w-4"></ArrowLeft>
      Add more files
    </Button>
    <p class="text-muted-foreground text-sm">
      {state.importableFiles.length} of {state.readyFiles.length} ready ·
      {state.totalTransactionsToImport} transactions
    </p>
  </div>

  {#if state.commitError}
    <Alert variant="destructive">
      <CircleAlert class="h-4 w-4"></CircleAlert>
      <AlertDescription>{state.commitError}</AlertDescription>
    </Alert>
  {/if}

  <div class="space-y-3">
    {#each state.readyFiles as file (file.id)}
      <AccountMatchCard {file} {accounts} {state}></AccountMatchCard>
    {/each}
  </div>

  <div class="flex justify-end gap-2">
    <Button variant="ghost" onclick={() => state.goToUpload()}>Back</Button>
    <Button
      onclick={() => state.commit()}
      disabled={state.importableFiles.length === 0 || state.isCommitting}
    >
      Import {state.importableFiles.length} statement{state.importableFiles.length === 1 ? '' : 's'}
    </Button>
  </div>
</div>
