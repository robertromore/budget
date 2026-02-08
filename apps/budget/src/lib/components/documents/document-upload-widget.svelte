<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as Select from '$lib/components/ui/select';
import { rpc } from '$lib/query';
import { documentTypeEnum, type DocumentType } from '$lib/schema/account-documents';
import { formatFileSize } from '$lib/utils/formatters';

/** Minimal account type for display purposes */
type AccountInfo = { id: number; name: string };
import FileText from '@lucide/svelte/icons/file-text';
import Image from '@lucide/svelte/icons/image';
import Upload from '@lucide/svelte/icons/upload';
import X from '@lucide/svelte/icons/x';

// Document type keys array
const documentTypeKeys = Object.keys(documentTypeEnum) as Array<DocumentType>;

interface Props {
  /** List of accounts to choose from */
  accounts: AccountInfo[];
  /** Default selected account ID */
  defaultAccountId?: number;
  /** Default tax year */
  defaultTaxYear?: number;
  /** Called after successful upload */
  onUploadComplete?: () => void;
  /** Compact mode for embedding in smaller containers */
  compact?: boolean;
}

let {
  accounts,
  defaultAccountId,
  defaultTaxYear = new Date().getFullYear(),
  onUploadComplete,
  compact = false,
}: Props = $props();

// Form state
let selectedAccountId = $state<number | undefined>(defaultAccountId ?? accounts[0]?.id);
let selectedTaxYear = $state(defaultTaxYear);
let documentType = $state<DocumentType>('other');
let title = $state('');
let description = $state('');

// Upload state
let selectedFile = $state<File | null>(null);
let isDragging = $state(false);
let isUploading = $state(false);
let uploadError = $state('');

// File input ref
let fileInput = $state<HTMLInputElement>();

// Allowed file types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Generate tax year options (last 10 years)
const currentYear = new Date().getFullYear();
const taxYearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

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
    uploadError = `File size must be less than ${formatFileSize(MAX_SIZE)}`;
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

function resetForm() {
  clearSelectedFile();
  title = '';
  description = '';
  documentType = 'other';
}

async function handleUpload() {
  if (!selectedFile || !selectedAccountId) return;

  isUploading = true;
  uploadError = '';

  try {
    // Build upload data conditionally for exactOptionalPropertyTypes
    const uploadData: {
      accountId: number;
      taxYear: number;
      file: File;
      documentType?: DocumentType;
      title?: string;
      description?: string;
    } = {
      accountId: selectedAccountId,
      taxYear: selectedTaxYear,
      file: selectedFile,
      documentType,
    };

    if (title.trim()) {
      uploadData.title = title.trim();
    }

    if (description.trim()) {
      uploadData.description = description.trim();
    }

    await rpc.accountDocuments.uploadDocument.execute(uploadData);

    // Reset form
    resetForm();
    onUploadComplete?.();
  } catch (err: any) {
    uploadError = err.message || 'Failed to upload document';
  } finally {
    isUploading = false;
  }
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  return FileText;
}
</script>

<div class="space-y-4">
  <!-- Upload Area -->
  <div
    role="button"
    tabindex="0"
    class={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'} ${compact ? 'p-3' : 'p-6'}`}
    ondrop={handleDrop}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        fileInput?.click();
      }
    }}>
    {#if selectedFile}
      {@const IconComponent = getFileIcon(selectedFile.type)}
      <!-- Selected File Preview -->
      <div class="bg-muted flex items-center justify-between rounded-md p-3">
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
    {:else}
      <!-- Upload Prompt -->
      <Upload class="text-muted-foreground mx-auto mb-2 h-10 w-10" />
      <p class="mb-1 font-medium">Drop files here or click to upload</p>
      <p class="text-muted-foreground mb-3 text-sm">
        JPEG, PNG, WebP, or PDF (max 10MB)
      </p>
      <input
        bind:this={fileInput}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        class="hidden"
        onchange={handleFileSelect} />
      <Button variant="outline" size="sm" onclick={() => fileInput?.click()}>Select File</Button>
    {/if}
  </div>

  {#if uploadError}
    <div class="text-destructive text-sm">
      {uploadError}
    </div>
  {/if}

  {#if selectedFile}
    <!-- Document Details Form -->
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <!-- Account Selector -->
        <div class="space-y-2">
          <Label>Account</Label>
          <Select.Root
            type="single"
            value={selectedAccountId?.toString()}
            onValueChange={(value) => {
              if (value) selectedAccountId = parseInt(value, 10);
            }}>
            <Select.Trigger>
              {accounts.find((a) => a.id === selectedAccountId)?.name ?? 'Select account'}
            </Select.Trigger>
            <Select.Content>
              {#each accounts as account}
                <Select.Item value={account.id.toString()}>
                  {account.name}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Tax Year Selector -->
        <div class="space-y-2">
          <Label>Tax Year</Label>
          <Select.Root
            type="single"
            value={selectedTaxYear.toString()}
            onValueChange={(value) => {
              if (value) selectedTaxYear = parseInt(value, 10);
            }}>
            <Select.Trigger>
              {selectedTaxYear}
            </Select.Trigger>
            <Select.Content>
              {#each taxYearOptions as year}
                <Select.Item value={year.toString()}>
                  {year}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      <!-- Document Type -->
      <div class="space-y-2">
        <Label>Document Type</Label>
        <Select.Root
          type="single"
          value={documentType}
          onValueChange={(value) => {
            if (value) documentType = value as DocumentType;
          }}>
          <Select.Trigger>
            <Badge variant="outline" class="mr-2">
              {documentTypeEnum[documentType]}
            </Badge>
          </Select.Trigger>
          <Select.Content class="max-h-[300px]">
            {#each documentTypeKeys as type}
              <Select.Item value={type}>
                {documentTypeEnum[type]}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <!-- Title (Optional) -->
      <div class="space-y-2">
        <Label for="title">Title (Optional)</Label>
        <Input
          id="title"
          type="text"
          bind:value={title}
          placeholder="e.g., Chase 1099-INT 2024"
          maxlength={100} />
      </div>

      <!-- Description (Optional) -->
      <div class="space-y-2">
        <Label for="description">Description (Optional)</Label>
        <Input
          id="description"
          type="text"
          bind:value={description}
          placeholder="Add a note about this document"
          maxlength={500} />
      </div>

      <!-- Upload Button -->
      <Button
        class="w-full"
        onclick={handleUpload}
        disabled={isUploading || !selectedAccountId}>
        {isUploading ? 'Uploading...' : 'Upload Document'}
      </Button>
    </div>
  {/if}
</div>
