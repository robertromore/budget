<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { ResponsiveSheet } from '$lib/components/ui/responsive-sheet';
import * as Select from '$lib/components/ui/select';
import { rpc } from '$lib/query';
import { receiptTypeEnum, type ReceiptType } from '$lib/schema';
import Download from '@lucide/svelte/icons/download';
import FileText from '@lucide/svelte/icons/file-text';
import Image from '@lucide/svelte/icons/image';
import Trash2 from '@lucide/svelte/icons/trash-2';
import Upload from '@lucide/svelte/icons/upload';
import X from '@lucide/svelte/icons/x';

// Receipt type keys array
const receiptTypeKeys = Object.keys(receiptTypeEnum) as Array<ReceiptType>;

interface Props {
  medicalExpenseId: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

let {medicalExpenseId, open = $bindable(false), onOpenChange}: Props = $props();

// Query receipts
const receiptsQuery = $derived(rpc.medicalExpenses.getReceipts(medicalExpenseId).options());
const receipts = $derived(receiptsQuery.data ?? []);

// Upload state
let selectedFile = $state<File | null>(null);
let receiptType = $state<ReceiptType>('receipt');
let description = $state('');
let isDragging = $state(false);
let isUploading = $state(false);
let uploadError = $state('');

// Create mutations at component level
const uploadReceiptMutation = rpc.medicalExpenses.uploadReceipt.options();
const deleteReceiptMutation = rpc.medicalExpenses.deleteReceipt.options();

// File input ref
let fileInput = $state<HTMLInputElement>();

// Allowed file types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    validateAndSetFile(file);
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragging = false;

  const file = event.dataTransfer?.files?.[0];
  if (file) {
    validateAndSetFile(file);
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  isDragging = true;
}

function handleDragLeave() {
  isDragging = false;
}

function validateAndSetFile(file: File) {
  uploadError = '';

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    uploadError = 'File must be JPEG, PNG, WebP, or PDF';
    return;
  }

  // Check file size
  if (file.size > MAX_SIZE) {
    uploadError = `File size must be less than ${MAX_SIZE / 1024 / 1024}MB`;
    return;
  }

  selectedFile = file;
}

function clearSelectedFile() {
  selectedFile = null;
  uploadError = '';
  if (fileInput) {
    fileInput.value = '';
  }
}

async function handleUpload() {
  if (!selectedFile) return;

  isUploading = true;
  uploadError = '';

  try {
    // Build upload data conditionally for exactOptionalPropertyTypes
    const uploadData: any = {
      medicalExpenseId,
      file: selectedFile,
      receiptType,
    };

    if (description) {
      uploadData.description = description;
    }

    await uploadReceiptMutation.mutateAsync(uploadData);

    // Reset form
    clearSelectedFile();
    receiptType = 'receipt';
    description = '';
  } catch (err: any) {
    uploadError = err.message || 'Failed to upload receipt';
  } finally {
    isUploading = false;
  }
}

async function handleDelete(receiptId: number) {
  if (!confirm('Are you sure you want to delete this receipt?')) return;

  try {
    await deleteReceiptMutation.mutateAsync({
      id: receiptId,
      medicalExpenseId,
    });
  } catch (err: any) {
    console.error('Failed to delete receipt:', err);
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  return FileText;
}

function handleOpenChange(newOpen: boolean) {
  open = newOpen;
  onOpenChange?.(newOpen);
}
</script>

<ResponsiveSheet bind:open onOpenChange={handleOpenChange}>
  <div class="space-y-6">
    <!-- Upload Area -->
    <div>
      <div
        role="button"
        tabindex="0"
        class={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : ''}`}
        ondrop={handleDrop}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            document.getElementById('file-input')?.click();
          }
        }}>
        {#if selectedFile}
          {@const IconComponent = getFileIcon(selectedFile.type)}
          <!-- Selected File Preview -->
          <div class="bg-muted flex items-center justify-between rounded-md p-4">
            <div class="flex items-center gap-3">
              <IconComponent class="text-muted-foreground h-8 w-8" />
              <div class="text-left">
                <p class="font-medium">{selectedFile.name}</p>
                <p class="text-muted-foreground text-sm">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onclick={clearSelectedFile} disabled={isUploading}>
              <X class="h-4 w-4" />
            </Button>
          </div>

          <!-- Receipt Type and Description -->
          <div class="mt-4 space-y-4">
            <div class="space-y-2">
              <Label for="receipt-type">Receipt Type</Label>
              <Select.Root type="single" bind:value={receiptType}>
                <Select.Trigger>
                  {receiptType ? receiptTypeEnum[receiptType as ReceiptType] : ''}
                </Select.Trigger>
                <Select.Content>
                  {#each receiptTypeKeys as type}
                    <Select.Item value={type}>
                      {receiptTypeEnum[type as ReceiptType]}
                    </Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>

            <div class="space-y-2">
              <Label for="description">Description (Optional)</Label>
              <Input
                id="description"
                type="text"
                bind:value={description}
                placeholder="Add a description"
                maxlength={500} />
            </div>

            <Button class="w-full" onclick={handleUpload} disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload Receipt'}
            </Button>
          </div>
        {:else}
          <!-- Upload Prompt -->
          <Upload class="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <p class="mb-2 text-lg font-medium">Drop files here or click to upload</p>
          <p class="text-muted-foreground mb-4 text-sm">
            Supports JPEG, PNG, WebP, and PDF (max 10MB)
          </p>
          <input
            bind:this={fileInput}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            class="hidden"
            onchange={handleFileSelect} />
          <Button variant="outline" onclick={() => fileInput?.click()}>Select File</Button>
        {/if}
      </div>

      {#if uploadError}
        <div class="text-destructive mt-2 text-sm">
          {uploadError}
        </div>
      {/if}
    </div>

    <!-- Uploaded Receipts List -->
    {#if receipts.length > 0}
      <div class="space-y-2">
        <h4 class="text-sm font-medium">Uploaded Receipts ({receipts.length})</h4>
        <div class="space-y-2">
          {#each receipts as receipt}
            {@const IconComponent = getFileIcon(receipt.mimeType)}
            <div class="bg-muted flex items-center justify-between rounded-md p-3">
              <div class="flex min-w-0 flex-1 items-center gap-3">
                <IconComponent class="text-muted-foreground h-5 w-5 shrink-0" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium">{receipt.fileName}</p>
                  <div class="text-muted-foreground flex items-center gap-2 text-xs">
                    <Badge variant="outline" class="text-xs">
                      {receiptTypeEnum[(receipt.receiptType || 'receipt') as ReceiptType]}
                    </Badge>
                    <span>{formatFileSize(receipt.fileSize)}</span>
                    {#if receipt.description}
                      <span class="truncate">· {receipt.description}</span>
                    {/if}
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => window.open(`/api/receipts/${receipt.id}`, '_blank')}
                  title="View receipt">
                  <Download class="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => handleDelete(receipt.id)}
                  title="Delete receipt">
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <p class="text-muted-foreground py-4 text-center text-sm">No receipts uploaded yet</p>
    {/if}
  </div>
</ResponsiveSheet>
