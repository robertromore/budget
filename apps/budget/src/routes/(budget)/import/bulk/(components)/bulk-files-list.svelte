<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { formatFileSize } from '$lib/utils/formatters';
import CircleAlert from '@lucide/svelte/icons/circle-alert';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import ClipboardPaste from '@lucide/svelte/icons/clipboard-paste';
import FileText from '@lucide/svelte/icons/file-text';
import Loader from '@lucide/svelte/icons/loader-2';
import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
import Trash2 from '@lucide/svelte/icons/trash-2';
import type { BulkImportState } from './bulk-import-state.svelte';

interface Props {
  state: BulkImportState;
}

let { state }: Props = $props();

const allReady = $derived(
  state.totalFiles > 0 && state.extractingCount === 0 && state.readyFiles.length > 0
);
</script>

{#if state.totalFiles > 0}
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium">
        {state.totalFiles} file{state.totalFiles === 1 ? '' : 's'}
        {#if state.extractingCount > 0}
          <span class="text-muted-foreground">· {state.extractingCount} extracting</span>
        {/if}
        {#if state.failedCount > 0}
          <span class="text-destructive">· {state.failedCount} failed</span>
        {/if}
      </h3>
    </div>
    <ul class="divide-y rounded-md border">
      {#each state.files as f (f.id)}
        <li class="flex items-center gap-3 p-3">
          {#if f.source === 'pasted'}
            <ClipboardPaste class="text-muted-foreground h-4 w-4 shrink-0"></ClipboardPaste>
          {:else}
            <FileText class="text-muted-foreground h-4 w-4 shrink-0"></FileText>
          {/if}
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="truncate text-sm font-medium">{f.fileName}</p>
              {#if f.source === 'pasted'}
                <Badge variant="outline" class="shrink-0 text-[10px]">Pasted</Badge>
              {/if}
            </div>
            <p class="text-muted-foreground text-xs">
              {formatFileSize(f.fileSize)}
              {#if f.status === 'ready' && f.match}
                · {f.transactions.length} transactions ·
                {#if f.match.confidence === 'none'}
                  <span class="text-amber-600 dark:text-amber-400">propose new account</span>
                {:else}
                  <span class="text-emerald-600 dark:text-emerald-400">
                    match: {f.match.accountName}
                  </span>
                {/if}
              {:else if f.status === 'failed'}
                <span class="text-destructive">{f.fatalError}</span>
              {/if}
            </p>
            {#if f.status === 'extracting' && f.phaseLabel}
              <p class="text-foreground/70 mt-0.5 text-xs italic">{f.phaseLabel}</p>
            {/if}
          </div>
          <div class="flex items-center gap-2">
            {#if f.status === 'extracting'}
              <Loader class="text-muted-foreground h-4 w-4 animate-spin"></Loader>
            {:else if f.status === 'ready'}
              <CircleCheck class="h-4 w-4 text-emerald-600 dark:text-emerald-400"></CircleCheck>
            {:else if f.status === 'failed'}
              <CircleAlert class="text-destructive h-4 w-4"></CircleAlert>
              {#if f.source === 'extracted'}
                <Button
                  variant="ghost"
                  size="icon"
                  onclick={() => state.retryFile(f.id)}
                  aria-label="Retry extraction"
                >
                  <RotateCcw class="h-4 w-4"></RotateCcw>
                </Button>
              {/if}
            {/if}
            <Button
              variant="ghost"
              size="icon"
              onclick={() => state.removeFile(f.id)}
              aria-label="Remove file"
            >
              <Trash2 class="h-4 w-4"></Trash2>
            </Button>
          </div>
        </li>
      {/each}
    </ul>
    <div class="flex justify-end gap-2">
      <Button variant="ghost" onclick={() => state.reset()} disabled={state.totalFiles === 0}>
        Clear
      </Button>
      <Button onclick={() => state.goToReview()} disabled={!allReady}>
        Review {state.readyFiles.length} statement{state.readyFiles.length === 1 ? '' : 's'}
      </Button>
    </div>
  </div>
{/if}
