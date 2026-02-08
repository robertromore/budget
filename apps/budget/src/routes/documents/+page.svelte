<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Select from '$lib/components/ui/select';
import * as Tabs from '$lib/components/ui/tabs';
import { DocumentList, DocumentUploadWidget } from '$lib/components/documents';
import { rpc } from '$lib/query';
import FileText from '@lucide/svelte/icons/file-text';
import Filter from '@lucide/svelte/icons/filter';
import Plus from '@lucide/svelte/icons/plus';
import Upload from '@lucide/svelte/icons/upload';

interface Props {
  data: {
    accounts: { id: number; name: string; accountType: string }[];
    availableTaxYears: number[];
    defaultTaxYear: number;
  };
}

let { data }: Props = $props();

// State
let selectedTaxYear = $state(data.defaultTaxYear);
let showUpload = $state(false);
let filterAccountId = $state<number | undefined>(undefined);
let activeTab = $state('documents');

// Generate tax year options (include years with documents + last 5 years)
const currentYear = new Date().getFullYear();
const recentYears = Array.from({ length: 5 }, (_, i) => currentYear - i);
const allYears = [...new Set([...data.availableTaxYears, ...recentYears])].sort((a, b) => b - a);

// Query documents for selected tax year - use $derived to react to year changes
const documentsQuery = $derived(rpc.accountDocuments.getDocumentsByTaxYear(selectedTaxYear).options());
const documents = $derived(documentsQuery.data ?? []);
const isLoading = $derived(documentsQuery.isLoading);

// Query document counts
const countsQuery = $derived(rpc.accountDocuments.getDocumentCounts(selectedTaxYear).options());
const counts = $derived(countsQuery.data ?? { total: 0, byType: {} });

// Filter documents by account if selected
const filteredDocuments = $derived(
  filterAccountId
    ? documents.filter((doc) => doc.accountId === filterAccountId)
    : documents
);

// Group counts by category (tax forms, statements, other)
const taxFormCount = $derived(
  Object.entries(counts.byType)
    .filter(([key]) => key.startsWith('tax_'))
    .reduce((sum, [_, count]) => sum + (count as number), 0)
);
const statementCount = $derived(
  Object.entries(counts.byType)
    .filter(([key]) => key.includes('statement'))
    .reduce((sum, [_, count]) => sum + (count as number), 0)
);
const otherCount = $derived(counts.total - taxFormCount - statementCount);

// Handle successful upload
function handleUploadComplete() {
  showUpload = false;
  // Queries will auto-refresh
}

// Get accounts that have documents
const accountsWithDocs = $derived(
  data.accounts.filter((acc) => documents.some((doc) => doc.accountId === acc.id))
);
</script>

<svelte:head>
  <title>Documents - Budget App</title>
  <meta name="description" content="Manage your documents and financial records" />
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Documents</h1>
      <p class="text-muted-foreground">
        Organize your tax forms, statements, and financial records by year
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
              {#if data.availableTaxYears.includes(year)}
                <Badge variant="secondary" class="ml-2 text-xs">has docs</Badge>
              {/if}
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>

      <Button onclick={() => (showUpload = !showUpload)}>
        {#if showUpload}
          Cancel
        {:else}
          <Plus class="mr-2 h-4 w-4" />
          Upload Document
        {/if}
      </Button>
    </div>
  </div>

  <!-- Stats Cards -->
  <div class="grid gap-4 md:grid-cols-4">
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium">Total Documents</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{counts.total}</div>
        <p class="text-muted-foreground text-xs">for {selectedTaxYear}</p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium">Tax Forms</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{taxFormCount}</div>
        <p class="text-muted-foreground text-xs">1099s, W-2s, 1098s</p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium">Statements</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{statementCount}</div>
        <p class="text-muted-foreground text-xs">Bank, investment, credit</p>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium">Other Documents</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{otherCount}</div>
        <p class="text-muted-foreground text-xs">Receipts, contracts</p>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Upload Widget (Collapsible) -->
  {#if showUpload}
    <Card.Root>
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Upload class="h-5 w-5" />
          Upload Document
        </Card.Title>
        <Card.Description>
          Add a new document for tax year {selectedTaxYear}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <DocumentUploadWidget
          accounts={data.accounts}
          defaultTaxYear={selectedTaxYear}
          onUploadComplete={handleUploadComplete}
        />
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Main Content -->
  <Tabs.Root bind:value={activeTab}>
    <div class="flex items-center justify-between">
      <Tabs.List>
        <Tabs.Trigger value="documents">All Documents</Tabs.Trigger>
        <Tabs.Trigger value="by-account">By Account</Tabs.Trigger>
        <Tabs.Trigger value="by-type">By Type</Tabs.Trigger>
      </Tabs.List>

      {#if activeTab === 'documents' && accountsWithDocs.length > 1}
        <div class="flex items-center gap-2">
          <Filter class="text-muted-foreground h-4 w-4" />
          <Select.Root
            type="single"
            value={filterAccountId?.toString() ?? ''}
            onValueChange={(value) => {
              filterAccountId = value ? parseInt(value, 10) : undefined;
            }}>
            <Select.Trigger class="w-[180px]">
              {filterAccountId
                ? data.accounts.find((a) => a.id === filterAccountId)?.name
                : 'All Accounts'}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="">All Accounts</Select.Item>
              {#each accountsWithDocs as account}
                <Select.Item value={account.id.toString()}>
                  {account.name}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      {/if}
    </div>

    <Tabs.Content value="documents" class="mt-4">
      <DocumentList
        documents={filteredDocuments}
        accounts={data.accounts}
        loading={isLoading}
        groupBy="none"
        showEmpty={false}
      />
    </Tabs.Content>

    <Tabs.Content value="by-account" class="mt-4">
      <DocumentList
        documents={documents}
        accounts={data.accounts}
        loading={isLoading}
        groupBy="account"
        showEmpty={false}
      />
    </Tabs.Content>

    <Tabs.Content value="by-type" class="mt-4">
      <DocumentList
        documents={documents}
        accounts={data.accounts}
        loading={isLoading}
        groupBy="type"
        showEmpty={false}
      />
    </Tabs.Content>
  </Tabs.Root>

  <!-- Empty State when no documents and not uploading -->
  {#if !showUpload && !isLoading && documents.length === 0}
    <Card.Root class="border-dashed">
      <Card.Content class="flex flex-col items-center justify-center py-12">
        <FileText class="text-muted-foreground mb-4 h-16 w-16 opacity-50" />
        <h3 class="mb-2 text-lg font-medium">No documents for {selectedTaxYear}</h3>
        <p class="text-muted-foreground mb-4 text-center text-sm">
          Upload your tax forms, bank statements, and other financial documents to keep them organized.
        </p>
        <Button onclick={() => (showUpload = true)}>
          <Upload class="mr-2 h-4 w-4" />
          Upload Your First Document
        </Button>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
