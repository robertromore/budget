<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Select from '$lib/components/ui/select';
import { DocumentList, DocumentUploadWidget } from '$lib/components/documents';
import { rpc } from '$lib/query';
import FileText from '@lucide/svelte/icons/file-text';
import Plus from '@lucide/svelte/icons/plus';
import Upload from '@lucide/svelte/icons/upload';

interface Props {
  accountId: number;
  accountName: string;
}

let { accountId, accountName }: Props = $props();

// State
let selectedTaxYear = $state(new Date().getFullYear());
let showUpload = $state(false);

// Generate tax year options (last 10 years)
const currentYear = new Date().getFullYear();
const taxYearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

// Query documents for this account
const documentsQuery = $derived(
  rpc.accountDocuments.getDocumentsByAccount(accountId, selectedTaxYear).options()
);
const documents = $derived(documentsQuery.data ?? []);
const isLoading = $derived(documentsQuery.isLoading);

// Query available tax years for this account
const yearsQuery = $derived(rpc.accountDocuments.getAvailableTaxYearsForAccount(accountId).options());
const availableYears = $derived(yearsQuery.data ?? []);

// Merge available years with recent years for selector
const allYears = $derived(
  [...new Set([...availableYears, ...taxYearOptions])].sort((a, b) => b - a)
);

// Handle successful upload
function handleUploadComplete() {
  showUpload = false;
}

// Create minimal account info for components
const accountInfo = $derived([{ id: accountId, name: accountName }]);
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="text-lg font-semibold">Documents</h2>
      <p class="text-muted-foreground text-sm">
        Tax forms, statements, and financial records for this account
      </p>
    </div>
    <div class="flex items-center gap-2">
      <!-- Tax Year Selector -->
      <Select.Root
        type="single"
        value={selectedTaxYear.toString()}
        onValueChange={(value) => {
          if (value) selectedTaxYear = parseInt(value, 10);
        }}>
        <Select.Trigger class="w-[120px]">
          <span class="font-medium">{selectedTaxYear}</span>
        </Select.Trigger>
        <Select.Content>
          {#each allYears as year}
            <Select.Item value={year.toString()}>
              {year}
              {#if availableYears.includes(year)}
                <span class="text-muted-foreground ml-2 text-xs">(has docs)</span>
              {/if}
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>

      <Button onclick={() => (showUpload = !showUpload)} size="sm">
        {#if showUpload}
          Cancel
        {:else}
          <Plus class="mr-2 h-4 w-4" />
          Upload
        {/if}
      </Button>
    </div>
  </div>

  <!-- Upload Widget (Collapsible) -->
  {#if showUpload}
    <Card.Root>
      <Card.Header class="pb-3">
        <Card.Title class="flex items-center gap-2 text-base">
          <Upload class="h-4 w-4" />
          Upload Document
        </Card.Title>
        <Card.Description>
          Add a document for {accountName} - Tax Year {selectedTaxYear}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <DocumentUploadWidget
          accounts={accountInfo}
          defaultAccountId={accountId}
          defaultTaxYear={selectedTaxYear}
          onUploadComplete={handleUploadComplete}
          compact
        />
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Documents List -->
  <DocumentList
    {documents}
    accounts={accountInfo}
    loading={isLoading}
    groupBy="type"
    showEmpty={false}
  />

  <!-- Empty State when no documents and not uploading -->
  {#if !showUpload && !isLoading && documents.length === 0}
    <Card.Root class="border-dashed">
      <Card.Content class="flex flex-col items-center justify-center py-12">
        <FileText class="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
        <h3 class="mb-2 font-medium">No documents for {selectedTaxYear}</h3>
        <p class="text-muted-foreground mb-4 text-center text-sm">
          Upload tax forms, statements, and other documents for this account.
        </p>
        <Button onclick={() => (showUpload = true)} size="sm">
          <Upload class="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
