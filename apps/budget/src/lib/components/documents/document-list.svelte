<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import { rpc } from '$lib/query';
import { DocumentExtraction } from '$lib/query/document-extraction';
import {
  documentTypeEnum,
  type AccountDocument,
  type DocumentType,
  type ExtractionStatus,
} from '$lib/schema/account-documents';
import type { DocumentExtractionMethod } from '$lib/schema/workspaces';
import { formatFileSize } from '$lib/utils/formatters';
import AlertCircle from '@lucide/svelte/icons/alert-circle';
import Brain from '@lucide/svelte/icons/brain';
import CheckCircle from '@lucide/svelte/icons/check-circle';
import Clock from '@lucide/svelte/icons/clock';
import Download from '@lucide/svelte/icons/download';
import Eye from '@lucide/svelte/icons/eye';
import ExternalLink from '@lucide/svelte/icons/external-link';
import File from '@lucide/svelte/icons/file';
import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
import FileText from '@lucide/svelte/icons/file-text';
import Image from '@lucide/svelte/icons/image';
import Loader2 from '@lucide/svelte/icons/loader-2';
import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
import RefreshCw from '@lucide/svelte/icons/refresh-cw';
import ScanText from '@lucide/svelte/icons/scan-text';
import Text from '@lucide/svelte/icons/text';
import Trash2 from '@lucide/svelte/icons/trash-2';
import Wand2 from '@lucide/svelte/icons/wand-2';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import { ScrollArea } from '$lib/components/ui/scroll-area';
import { DocumentExplanationSheet } from './index';

/** Minimal account type for display purposes */
type AccountInfo = { id: number; name: string };

interface Props {
  /** Documents to display */
  documents: AccountDocument[];
  /** Accounts for looking up account names */
  accounts: AccountInfo[];
  /** Optional: group by account or document type */
  groupBy?: 'account' | 'type' | 'none';
  /** Whether documents are loading */
  loading?: boolean;
  /** Show empty state */
  showEmpty?: boolean;
}

let {
  documents,
  accounts,
  groupBy = 'none',
  loading = false,
  showEmpty = true,
}: Props = $props();

// State for AI explanation sheet
let explainSheetOpen = $state(false);
let documentToExplain = $state<AccountDocument | null>(null);

// State for extracted text viewer
let textViewerOpen = $state(false);
let documentToView = $state<AccountDocument | null>(null);

// Check if AI is enabled
const llmPrefsQuery = rpc.llmSettings.getLLMPreferences().options();
const aiEnabled = $derived(llmPrefsQuery.data?.enabled ?? false);

// Extraction mutations
const extractMutation = DocumentExtraction.extract().options();
const reExtractMutation = DocumentExtraction.reExtract().options();

// Track which document is currently being extracted
let extractingDocId = $state<number | null>(null);
let reExtracting = $state(false);
let reExtractError = $state<string | null>(null);

function handleExplain(doc: AccountDocument) {
  documentToExplain = doc;
  explainSheetOpen = true;
}

function handleViewExtractedText(doc: AccountDocument) {
  documentToView = doc;
  textViewerOpen = true;
}

function handleReExtract(method: DocumentExtractionMethod) {
  if (!documentToView) return;
  reExtracting = true;
  reExtractError = null;
  reExtractMutation.mutate(
    { documentId: documentToView.id, method },
    {
      onSuccess: (result) => {
        if (!documentToView) return;
        documentToView = {
          ...documentToView,
          extractedText: result.text ?? documentToView.extractedText,
          extractionMethod: result.method,
          extractionStatus: result.success ? 'completed' : 'failed',
        };
        if (!result.success) {
          reExtractError = result.error ?? 'Extraction failed';
        }
      },
      onSettled: () => {
        reExtracting = false;
      },
    }
  );
}

const allReExtractMethods: Array<{ value: DocumentExtractionMethod; label: string; icon: typeof FileText; mimeFilter?: 'pdf' | 'image' }> = [
  { value: 'auto', label: 'Auto', icon: Wand2 },
  { value: 'pdf-parse', label: 'PDF Parse', icon: FileText, mimeFilter: 'pdf' },
  { value: 'tesseract', label: 'Tesseract OCR', icon: ScanText, mimeFilter: 'image' },
  { value: 'ai-vision', label: 'AI Vision', icon: Eye },
];

const reExtractMethods = $derived.by(() => {
  const mime = documentToView?.mimeType ?? '';
  const isPdf = mime === 'application/pdf';
  const isImage = mime.startsWith('image/');
  return allReExtractMethods.filter((m) => {
    if (!m.mimeFilter) return true;
    if (m.mimeFilter === 'pdf') return isPdf;
    if (m.mimeFilter === 'image') return isImage;
    return true;
  });
});

function handleExtract(doc: AccountDocument) {
  extractingDocId = doc.id;
  extractMutation.mutate(
    { documentId: doc.id },
    {
      onSettled: () => {
        extractingDocId = null;
      },
    }
  );
}

// Get extraction status badge info
function getExtractionStatusBadge(status: ExtractionStatus | null | undefined): {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  icon: typeof CheckCircle;
} | null {
  switch (status) {
    case 'completed':
      return { label: 'Extracted', variant: 'default', icon: CheckCircle };
    case 'processing':
      return { label: 'Processing', variant: 'secondary', icon: Loader2 };
    case 'failed':
      return { label: 'Failed', variant: 'destructive', icon: AlertCircle };
    case 'pending':
      return { label: 'Pending', variant: 'outline', icon: Clock };
    case 'skipped':
      return null; // Don't show badge for skipped
    default:
      return null;
  }
}

// Check if document can be extracted
function canExtract(doc: AccountDocument): boolean {
  return (
    doc.extractionStatus === 'pending' ||
    doc.extractionStatus === 'failed' ||
    !doc.extractionStatus
  );
}

// Get account name by ID
function getAccountName(accountId: number): string {
  const account = accounts.find((a) => a.id === accountId);
  return account?.name ?? 'Unknown Account';
}

// Get document icon based on MIME type
function getDocumentIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType === 'application/pdf') return FileText;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
  return File;
}

// Get document type badge color
function getTypeBadgeVariant(docType: DocumentType): 'default' | 'secondary' | 'outline' {
  if (docType.startsWith('tax_')) return 'default';
  if (docType.includes('statement')) return 'secondary';
  return 'outline';
}

// Group documents
type GroupedDocuments = Map<string, AccountDocument[]>;

const groupedDocuments = $derived.by((): GroupedDocuments => {
  const groups = new Map<string, AccountDocument[]>();

  if (groupBy === 'none') {
    groups.set('all', documents);
  } else if (groupBy === 'account') {
    for (const doc of documents) {
      const key = doc.accountId.toString();
      const existing = groups.get(key) ?? [];
      groups.set(key, [...existing, doc]);
    }
  } else if (groupBy === 'type') {
    for (const doc of documents) {
      const key = doc.documentType ?? 'other';
      const existing = groups.get(key) ?? [];
      groups.set(key, [...existing, doc]);
    }
  }

  return groups;
});

function getGroupLabel(groupKey: string): string {
  if (groupBy === 'account') {
    return getAccountName(parseInt(groupKey, 10));
  }
  if (groupBy === 'type') {
    return documentTypeEnum[groupKey as DocumentType] ?? groupKey;
  }
  return '';
}

async function handleDelete(doc: AccountDocument) {
  if (!confirm(`Are you sure you want to delete "${doc.title || doc.fileName}"?`)) return;

  try {
    await rpc.accountDocuments.deleteDocument.execute({
      id: doc.id,
      accountId: doc.accountId,
      taxYear: doc.taxYear,
    });
  } catch (err: any) {
    console.error('Failed to delete document:', err);
  }
}

function handleView(doc: AccountDocument) {
  window.open(`/api/documents/${doc.id}`, '_blank');
}

function handleDownload(doc: AccountDocument) {
  const link = document.createElement('a');
  link.href = `/api/documents/${doc.id}`;
  link.download = doc.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
</script>

<div class="space-y-4">
  {#if loading}
    <div class="flex items-center justify-center py-8">
      <div class="text-muted-foreground animate-pulse">Loading documents...</div>
    </div>
  {:else if documents.length === 0 && showEmpty}
    <div class="text-muted-foreground py-8 text-center">
      <FileText class="mx-auto mb-2 h-12 w-12 opacity-50" />
      <p>No documents uploaded yet</p>
    </div>
  {:else}
    {#each groupedDocuments.entries() as [groupKey, groupDocs]}
      {#if groupBy !== 'none'}
        <div class="mt-4 first:mt-0">
          <h4 class="text-muted-foreground mb-2 text-sm font-medium">
            {getGroupLabel(groupKey)} ({groupDocs.length})
          </h4>
        </div>
      {/if}

      <div class="space-y-2">
        {#each groupDocs as doc}
          {@const IconComponent = getDocumentIcon(doc.mimeType)}
          <div
            class="bg-card hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors">
            <div class="flex min-w-0 flex-1 items-center gap-3">
              <div class="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                <IconComponent class="text-muted-foreground h-5 w-5" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <p class="truncate font-medium">
                    {doc.title || doc.fileName}
                  </p>
                  <Badge variant={getTypeBadgeVariant(doc.documentType as DocumentType)}>
                    {documentTypeEnum[(doc.documentType || 'other') as DocumentType]}
                  </Badge>
                  {#if doc.extractionStatus}
                    {@const statusBadge = getExtractionStatusBadge(doc.extractionStatus as ExtractionStatus)}
                    {#if statusBadge}
                      {@const StatusIcon = statusBadge.icon}
                      <Badge variant={statusBadge.variant} class="gap-1">
                        <StatusIcon class="h-3 w-3 {doc.extractionStatus === 'processing' ? 'animate-spin' : ''}" />
                        {statusBadge.label}
                      </Badge>
                    {/if}
                  {/if}
                </div>
                <div class="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  {#if groupBy !== 'account'}
                    <span>{getAccountName(doc.accountId)}</span>
                    <span>·</span>
                  {/if}
                  <span>{formatFileSize(doc.fileSize)}</span>
                  {#if doc.uploadedAt}
                    <span>·</span>
                    <span>{formatDate(doc.uploadedAt)}</span>
                  {/if}
                  {#if doc.description}
                    <span>·</span>
                    <span class="truncate max-w-[200px]">{doc.description}</span>
                  {/if}
                </div>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onclick={() => handleView(doc)}
                title="View document">
                <ExternalLink class="h-4 w-4" />
              </Button>

              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  {#snippet child({ props })}
                    <Button variant="ghost" size="icon" {...props}>
                      <MoreHorizontal class="h-4 w-4" />
                    </Button>
                  {/snippet}
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  {#if doc.extractedText}
                    <DropdownMenu.Item onclick={() => handleViewExtractedText(doc)}>
                      <Text class="mr-2 h-4 w-4 text-green-500" />
                      View Extracted Text
                    </DropdownMenu.Item>
                    {#if aiEnabled}
                      <DropdownMenu.Item onclick={() => handleExplain(doc)}>
                        <Brain class="mr-2 h-4 w-4 text-purple-500" />
                        Explain with AI
                      </DropdownMenu.Item>
                    {/if}
                    <DropdownMenu.Separator />
                  {/if}
                  {#if canExtract(doc)}
                    <DropdownMenu.Item
                      onclick={() => handleExtract(doc)}
                      disabled={extractingDocId === doc.id}>
                      {#if extractingDocId === doc.id}
                        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                        Extracting...
                      {:else if doc.extractionStatus === 'failed'}
                        <RefreshCw class="mr-2 h-4 w-4 text-orange-500" />
                        Retry Extraction
                      {:else}
                        <ScanText class="mr-2 h-4 w-4 text-blue-500" />
                        Extract Text
                      {/if}
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                  {/if}
                  <DropdownMenu.Item onclick={() => handleDownload(doc)}>
                    <Download class="mr-2 h-4 w-4" />
                    Download
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item
                    onclick={() => handleDelete(doc)}
                    class="text-destructive focus:text-destructive">
                    <Trash2 class="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </div>
          </div>
        {/each}
      </div>
    {/each}
  {/if}
</div>

<!-- AI Explanation Sheet -->
<DocumentExplanationSheet
  document={documentToExplain}
  open={explainSheetOpen}
  onOpenChange={(open) => {
    explainSheetOpen = open;
    if (!open) documentToExplain = null;
  }}
/>

<!-- Extracted Text Viewer Sheet -->
<ResponsiveSheet
  open={textViewerOpen}
  onOpenChange={(open) => {
    textViewerOpen = open;
    if (!open) {
      documentToView = null;
      reExtractError = null;
    }
  }}
  side="right"
  defaultWidth={560}
  minWidth={400}
  maxWidth={800}
>
  {#snippet header()}
    <div class="flex flex-col gap-1">
      <h2 class="flex items-center gap-2 text-lg font-semibold">
        <Text class="h-5 w-5 text-green-500" />
        Extracted Text
      </h2>
      {#if documentToView}
        <p class="text-muted-foreground text-sm">
          {documentToView.title || documentToView.fileName}
          {#if documentToView.extractionMethod}
            <span> - Extracted using {documentToView.extractionMethod}</span>
          {/if}
        </p>
      {/if}
    </div>
  {/snippet}

  {#snippet content()}
    {#if reExtracting}
      <div class="flex flex-col items-center justify-center gap-3 py-12">
        <Loader2 class="text-muted-foreground h-6 w-6 animate-spin" />
        <p class="text-muted-foreground text-sm">Re-extracting text...</p>
      </div>
    {:else}
      {#if reExtractError}
        <div class="border-destructive/50 bg-destructive/10 mb-4 rounded-lg border p-3">
          <div class="flex items-center gap-2">
            <AlertCircle class="text-destructive h-4 w-4 shrink-0" />
            <p class="text-destructive text-sm">{reExtractError}</p>
          </div>
        </div>
      {/if}
      {#if documentToView?.extractedText}
        <ScrollArea class="h-[calc(100vh-200px)] rounded-md border p-4">
          <pre class="whitespace-pre-wrap font-mono text-sm">{documentToView.extractedText}</pre>
        </ScrollArea>
      {:else if !reExtractError}
        <div class="text-muted-foreground py-8 text-center">
          No extracted text available
        </div>
      {/if}
    {/if}
  {/snippet}

  {#snippet footer()}
    <div class="flex justify-between gap-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button variant="outline" size="sm" disabled={reExtracting} {...props}>
              {#if reExtracting}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {:else}
                <RefreshCw class="mr-2 h-4 w-4" />
              {/if}
              Re-extract
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="start">
          {#each reExtractMethods as method}
            {@const Icon = method.icon}
            <DropdownMenu.Item onclick={() => handleReExtract(method.value)}>
              <Icon class="mr-2 h-4 w-4" />
              {method.label}
            </DropdownMenu.Item>
          {/each}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <Button variant="outline" size="sm" onclick={() => textViewerOpen = false}>
        Close
      </Button>
    </div>
  {/snippet}
</ResponsiveSheet>
