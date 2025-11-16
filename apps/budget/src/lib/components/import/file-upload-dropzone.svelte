<script lang="ts">
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import {cn} from '$lib/utils';
import Upload from '@lucide/svelte/icons/upload';
import FileText from '@lucide/svelte/icons/file-text';
import X from '@lucide/svelte/icons/x';
import CircleAlert from '@lucide/svelte/icons/circle-alert';

interface Props {
  acceptedFormats: string[];
  maxFileSize: number;
  onFileSelected: (file: File) => void;
  onFileRejected?: (error: string) => void;
  allowMultiple?: boolean;
  showPreview?: boolean;
  class?: string;
}

let {
  acceptedFormats = ['.csv', '.xlsx', '.xls', '.qif', '.ofx', '.qfx', '.iif', '.qbo'],
  maxFileSize = 10 * 1024 * 1024,
  onFileSelected,
  onFileRejected,
  allowMultiple = false,
  showPreview = true,
  class: className,
}: Props = $props();

let isDragging = $state(false);
let selectedFile = $state<File | null>(null);
let error = $state<string | null>(null);
let fileInputRef = $state<HTMLInputElement | null>(null);

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function validateFile(file: File): {valid: boolean; error?: string} {
  // Check file type
  const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
  if (!acceptedFormats.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file type. Accepted formats: ${acceptedFormats.join(', ')}`,
    };
  }

  // Check file size
  if (file.size > maxFileSize) {
    return {
      valid: false,
      error: `File size exceeds ${formatFileSize(maxFileSize)}`,
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  return {valid: true};
}

function handleFileSelect(files: FileList | null) {
  if (!files || files.length === 0) return;

  const file = files[0];
  const validation = validateFile(file);

  if (!validation.valid) {
    error = validation.error || 'Invalid file';
    if (onFileRejected) {
      onFileRejected(error);
    }
    return;
  }

  error = null;
  selectedFile = file;
  onFileSelected(file);
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  isDragging = true;
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault();
  isDragging = false;
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  isDragging = false;

  const files = e.dataTransfer?.files;
  handleFileSelect(files);
}

function handleFileInputChange(e: Event) {
  const target = e.target as HTMLInputElement;
  handleFileSelect(target.files);
}

function clearFile() {
  selectedFile = null;
  error = null;
  if (fileInputRef) {
    fileInputRef.value = '';
  }
}

function openFilePicker() {
  fileInputRef?.click();
}
</script>

<div class={cn('space-y-4', className)}>
  <!-- Dropzone -->
  <div
    role="button"
    tabindex="0"
    class={cn(
      'cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors',
      'hover:border-primary/50 hover:bg-accent/5',
      'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none',
      isDragging && 'border-primary bg-accent/10',
      error && 'border-destructive bg-destructive/5'
    )}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    onclick={openFilePicker}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFilePicker();
      }
    }}>
    <input
      bind:this={fileInputRef}
      type="file"
      accept={acceptedFormats.join(',')}
      multiple={allowMultiple}
      onchange={handleFileInputChange}
      class="hidden" />

    <div class="flex flex-col items-center justify-center gap-4">
      {#if error}
        <CircleAlert class="text-destructive h-12 w-12" />
      {:else}
        <Upload class={cn('h-12 w-12', isDragging ? 'text-primary' : 'text-muted-foreground')} />
      {/if}

      <div class="space-y-2">
        <p class="text-lg font-medium">
          {#if isDragging}
            Drop file here
          {:else if error}
            {error}
          {:else}
            Drag and drop your file here
          {/if}
        </p>
        {#if !error}
          <p class="text-muted-foreground text-sm">or click to browse</p>
        {/if}
      </div>

      <div class="text-muted-foreground space-y-1 text-xs">
        <p>Accepted formats: {acceptedFormats.join(', ').toUpperCase()}</p>
        <p>Maximum file size: {formatFileSize(maxFileSize)}</p>
      </div>

      {#if !error}
        <Button
          variant="outline"
          onclick={(e) => {
            e.stopPropagation();
            openFilePicker();
          }}>
          Select File
        </Button>
      {:else}
        <Button
          variant="outline"
          onclick={(e) => {
            e.stopPropagation();
            clearFile();
            openFilePicker();
          }}>
          Try Again
        </Button>
      {/if}
    </div>
  </div>

  <!-- File Preview -->
  {#if showPreview && selectedFile && !error}
    <Card.Root>
      <Card.Header>
        <Card.Title class="text-base">Selected File</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <FileText class="text-primary h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{selectedFile.name}</p>
              <p class="text-muted-foreground text-sm">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onclick={clearFile}>
            <X class="h-4 w-4" />
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
