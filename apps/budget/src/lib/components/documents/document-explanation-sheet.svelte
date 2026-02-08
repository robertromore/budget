<script lang="ts">
import { Button } from '$lib/components/ui/button';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import { Skeleton } from '$lib/components/ui/skeleton';
import type { AccountDocument } from '$lib/schema/account-documents';
import { documentTypeEnum, type DocumentType } from '$lib/schema/account-documents';
import { trpc } from '$lib/trpc/client';
import Brain from '@lucide/svelte/icons/brain';
import FileText from '@lucide/svelte/icons/file-text';
import RefreshCw from '@lucide/svelte/icons/refresh-cw';

interface Props {
  /** Document to explain */
  document: AccountDocument | null;
  /** Whether the sheet is open */
  open: boolean;
  /** Callback when sheet closes */
  onOpenChange: (open: boolean) => void;
}

let { document: doc, open, onOpenChange }: Props = $props();

// State for the explanation
let explanation = $state<string | null>(null);
let error = $state<string | null>(null);
let isLoading = $state(false);
let abortController = $state<AbortController | null>(null);

// Fetch explanation when document changes and sheet opens
$effect(() => {
  if (open && doc && !explanation && !isLoading) {
    fetchExplanation();
  }
});

// Abort in-flight request and reset state when sheet closes
$effect(() => {
  if (!open) {
    abortController?.abort();
    abortController = null;
    explanation = null;
    error = null;
    isLoading = false;
  }
});

async function fetchExplanation() {
  if (!doc) return;

  abortController?.abort();
  const controller = new AbortController();
  abortController = controller;

  error = null;
  isLoading = true;

  try {
    const result = await trpc().aiRoutes.explainDocument.mutate(
      { documentId: doc.id },
      { signal: controller.signal }
    );
    explanation = result.explanation;
  } catch (err: any) {
    if (err.name === 'AbortError' || controller.signal.aborted) return;
    error = err.message || 'Failed to explain document';
    explanation = null;
  } finally {
    if (!controller.signal.aborted) {
      isLoading = false;
    }
  }
}

function handleRetry() {
  explanation = null;
  fetchExplanation();
}

const docType = $derived(doc?.documentType as DocumentType | undefined);
const docTypeLabel = $derived(docType ? documentTypeEnum[docType] : 'Document');

// Simple markdown to HTML conversion for common patterns
function formatMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Bullet lists
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc my-2">$&</ul>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="my-2">')
    .replace(/\n/g, '<br>')
    // Wrap in paragraph
    .replace(/^/, '<p class="my-2">')
    .replace(/$/, '</p>');
}
</script>

<ResponsiveSheet
  {open}
  {onOpenChange}
  side="right"
  defaultWidth={500}
  minWidth={400}
  maxWidth={700}
>
  {#snippet header()}
    <div class="flex flex-col gap-1">
      <h2 class="flex items-center gap-2 text-lg font-semibold">
        <Brain class="h-5 w-5 text-purple-500" />
        Document Explanation
      </h2>
      <p class="text-muted-foreground text-sm">AI-powered analysis of your document</p>
    </div>
  {/snippet}

  {#snippet content()}
    <div class="space-y-4">
      {#if doc}
        <!-- Document Info -->
        <div class="bg-muted/30 flex items-start gap-3 rounded-lg border p-3">
          <div class="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <FileText class="text-muted-foreground h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium">
              {doc.title || doc.fileName}
            </p>
            <p class="text-muted-foreground text-sm">
              {docTypeLabel} - Tax Year {doc.taxYear}
            </p>
          </div>
        </div>

        <!-- Loading State -->
        {#if isLoading}
          <div class="space-y-3">
            <div class="text-muted-foreground flex items-center gap-2 text-sm">
              <RefreshCw class="h-4 w-4 animate-spin" />
              Analyzing document...
            </div>
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-[90%]" />
            <Skeleton class="h-4 w-[80%]" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-[70%]" />
          </div>
        {:else if error}
          <!-- Error State -->
          <div class="border-destructive/50 bg-destructive/10 rounded-lg border p-4">
            <p class="text-destructive mb-2 text-sm font-medium">Unable to explain document</p>
            <p class="text-muted-foreground text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              class="mt-3"
              onclick={handleRetry}
            >
              <RefreshCw class="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        {:else if explanation}
          <!-- Explanation Content -->
          <div class="prose prose-sm dark:prose-invert max-w-none">
            {@html formatMarkdown(explanation)}
          </div>
        {/if}
      {:else}
        <p class="text-muted-foreground text-sm">No document selected</p>
      {/if}
    </div>
  {/snippet}

  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="outline" onclick={() => onOpenChange(false)}>
        Close
      </Button>
      {#if explanation && !isLoading}
        <Button variant="outline" onclick={handleRetry}>
          <RefreshCw class="mr-2 h-4 w-4" />
          Regenerate
        </Button>
      {/if}
    </div>
  {/snippet}
</ResponsiveSheet>
