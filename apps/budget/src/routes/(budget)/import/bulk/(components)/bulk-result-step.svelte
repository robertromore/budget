<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Badge } from '$lib/components/ui/badge';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import CircleX from '@lucide/svelte/icons/circle-x';
import CircleAlert from '@lucide/svelte/icons/circle-alert';
import FileText from '@lucide/svelte/icons/file-text';
import Loader from '@lucide/svelte/icons/loader-2';
import type { BulkImportState } from './bulk-import-state.svelte';

interface Props {
  state: BulkImportState;
}

let { state }: Props = $props();

const totalImported = $derived(
  state.files.reduce((sum, f) => sum + (f.result?.transactionsCreated ?? 0), 0)
);
const totalDuplicates = $derived(
  state.files.reduce((sum, f) => sum + (f.result?.duplicatesSkipped ?? 0), 0)
);
const newAccountsCreated = $derived(
  state.files.filter((f) => f.result?.accountCreated).length
);
const failed = $derived(state.files.filter((f) => f.result?.action === 'failed'));
</script>

<Card.Root>
  <Card.Header>
    <div class="flex items-center gap-2">
      {#if state.isCommitting}
        <Loader class="text-muted-foreground h-5 w-5 animate-spin"></Loader>
        <Card.Title>Importing…</Card.Title>
      {:else}
        <CircleCheck class="h-5 w-5 text-emerald-600 dark:text-emerald-400"></CircleCheck>
        <Card.Title>Import complete</Card.Title>
      {/if}
    </div>
    {#if !state.isCommitting}
      <Card.Description>
        {totalImported} transaction{totalImported === 1 ? '' : 's'} added across
        {state.importableFiles.length} statement{state.importableFiles.length === 1 ? '' : 's'}
        {#if newAccountsCreated > 0}
          · {newAccountsCreated} new account{newAccountsCreated === 1 ? '' : 's'} created
        {/if}
        {#if totalDuplicates > 0}
          · {totalDuplicates} duplicate{totalDuplicates === 1 ? '' : 's'} skipped
        {/if}
      </Card.Description>
    {/if}
  </Card.Header>

  <Card.Content class="space-y-2">
    <ul class="divide-y rounded-md border">
      {#each state.files as f (f.id)}
        <li class="flex items-center gap-3 p-3">
          <FileText class="text-muted-foreground h-4 w-4 shrink-0"></FileText>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{f.fileName}</p>
            {#if f.result}
              <p class="text-muted-foreground text-xs">
                {#if f.result.action === 'imported'}
                  → {f.result.accountName}
                  {#if f.result.accountCreated}
                    <Badge variant="secondary" class="ml-1">new</Badge>
                  {/if}
                  · {f.result.transactionsCreated} added
                  {#if f.result.duplicatesSkipped > 0}
                    · {f.result.duplicatesSkipped} duplicates skipped
                  {/if}
                  {#if f.result.reconciledBalanceSet}
                    · reconciled
                  {/if}
                {:else if f.result.action === 'failed'}
                  <span class="text-destructive">{f.result.errors.join('; ')}</span>
                {:else}
                  Skipped
                {/if}
              </p>
            {:else if state.isCommitting}
              <p class="text-muted-foreground text-xs">Waiting…</p>
            {/if}
          </div>
          {#if f.result?.action === 'imported'}
            <CircleCheck class="h-4 w-4 text-emerald-600 dark:text-emerald-400"></CircleCheck>
          {:else if f.result?.action === 'failed'}
            <CircleX class="text-destructive h-4 w-4"></CircleX>
          {:else if f.result?.action === 'skipped'}
            <CircleAlert class="text-muted-foreground h-4 w-4"></CircleAlert>
          {/if}
        </li>
      {/each}
    </ul>

    {#if failed.length > 0 && !state.isCommitting}
      <p class="text-muted-foreground text-xs">
        {failed.length} file{failed.length === 1 ? '' : 's'} failed. The other imports were saved
        successfully.
      </p>
    {/if}
  </Card.Content>

  <Card.Footer class="flex justify-end gap-2">
    {#if !state.isCommitting}
      <Button variant="ghost" onclick={() => state.reset()}>Import more</Button>
      <Button href="/accounts">View accounts</Button>
    {/if}
  </Card.Footer>
</Card.Root>
