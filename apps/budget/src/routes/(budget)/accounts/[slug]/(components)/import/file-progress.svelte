<script lang="ts">
import { cn } from '$lib/utils';
import AlertCircle from '@lucide/svelte/icons/alert-circle';
import CheckCircle from '@lucide/svelte/icons/check-circle';
import Circle from '@lucide/svelte/icons/circle';
import Loader2 from '@lucide/svelte/icons/loader-2';
import type { ImportFile } from '$core/types/import';

interface Props {
  files: ImportFile[];
  currentIndex: number;
  onFileClick?: (index: number) => void;
  class?: string;
}

let { files, currentIndex, onFileClick, class: className }: Props = $props();

function getStatusIcon(file: ImportFile, index: number) {
  if (file.status === 'error') {
    return { icon: AlertCircle, class: 'text-destructive' };
  }
  if (file.status === 'ready') {
    return { icon: CheckCircle, class: 'text-success' };
  }
  if (index === currentIndex && ['uploading', 'mapping', 'preview'].includes(file.status)) {
    return { icon: Loader2, class: 'text-primary animate-spin' };
  }
  return { icon: Circle, class: 'text-muted-foreground' };
}
</script>

<div class={cn('space-y-2', className)}>
  <!-- Progress indicator. With a single file, "Processing file 1 of 1"
       is noise — the filename chip below says the same thing. Also
       drop the progress bar for the same reason: it's binary with
       a single file. -->
  {#if files.length > 1}
    <div class="text-muted-foreground mb-2 text-sm">
      Processing file {currentIndex + 1} of {files.length}
    </div>
  {/if}

  <!-- File pills -->
  <div class="flex flex-wrap items-center gap-2">
    {#each files as file, index (file.id)}
      {@const status = getStatusIcon(file, index)}
      {@const StatusIcon = status.icon}
      {@const isCurrent = index === currentIndex}
      {@const isPast = index < currentIndex || file.status === 'ready'}
      {@const canClick = isPast && onFileClick}

      <button
        type="button"
        class={cn(
          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
          isCurrent && 'border-primary bg-primary text-primary-foreground shadow-sm',
          !isCurrent &&
            isPast &&
            'border-success/50 bg-success-bg text-success-fg',
          !isCurrent && !isPast && 'border-muted bg-muted/30 text-muted-foreground',
          file.status === 'error' && 'border-destructive bg-destructive/10 text-destructive',
          canClick && 'cursor-pointer hover:opacity-80',
          !canClick && 'cursor-default'
        )}
        title={file.fileName}
        onclick={() => canClick && onFileClick?.(index)}
        disabled={!canClick}>
        <StatusIcon class={cn('h-3.5 w-3.5', isCurrent ? 'text-inherit' : status.class)} />
        <span class="max-w-40 truncate">{file.fileName}</span>
      </button>
    {/each}
  </div>

  {#if files.length > 1}
    <!-- Progress bar — counts files in the `ready` state. Irrelevant
         in single-file mode (always 0% or 100%), so we skip it. -->
    <div class="bg-muted h-1.5 w-full overflow-hidden rounded-full">
      <div
        class="bg-primary h-full transition-all duration-300"
        style:width="{(files.filter((f) => f.status === 'ready').length / files.length) * 100}%">
      </div>
    </div>
  {/if}
</div>
