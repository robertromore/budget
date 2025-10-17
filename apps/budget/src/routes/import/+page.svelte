<script lang="ts">
import FileUploadDropzone from '$lib/components/import/file-upload-dropzone.svelte';
import ImportPreviewTable from '$lib/components/import/import-preview-table.svelte';
import EntityReview from '$lib/components/import/entity-review.svelte';
import ColumnMapper from '$lib/components/import/column-mapper.svelte';
import * as Select from '$lib/components/ui/select';
import {Button} from '$lib/components/ui/button';
import {Checkbox} from '$lib/components/ui/checkbox';
import * as Card from '$lib/components/ui/card';
import * as Empty from '$lib/components/ui/empty';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import Circle from '@lucide/svelte/icons/circle';
import Wallet from '@lucide/svelte/icons/wallet';
import type {
  ParseResult,
  ImportResult,
  ImportPreviewData,
  PayeePreview,
  CategoryPreview,
  ColumnMapping,
} from '$lib/types/import';
import type {Account} from '$lib/schema/accounts';
import {useQueryClient} from '@tanstack/svelte-query';

let {data} = $props();
const queryClient = useQueryClient();

const accounts = $derived(data.accounts);
// Filter out HSA accounts since they can't be imported into
const importableAccounts = $derived(accounts.filter((a: Account) => a.accountType !== 'hsa'));
const hasImportableAccounts = $derived(importableAccounts.length > 0);

type Step = 'upload' | 'map-columns' | 'preview' | 'review-entities' | 'complete';

let currentStep = $state<Step>('upload');
let selectedFile = $state<File | null>(null);
let fileData = $state<{data: string; name: string; type: string} | null>(null);
let parseResults = $state<ParseResult | null>(null);
let columnMapping = $state<ColumnMapping | null>(null);
let rawCSVData = $state<Record<string, any>[] | null>(null);
let entityPreview = $state<ImportPreviewData | null>(null);
let importResult = $state<ImportResult | null>(null);
let isProcessing = $state(false);
let error = $state<string | null>(null);
let selectedRows = $state<Set<number>>(new Set());

// Import options
let createMissingPayees = $state(true);
let createMissingCategories = $state(true);
let allowPartialImport = $state(true);
let reverseAmountSigns = $state(false);

// Create reactive preview data that applies amount reversal
const previewData = $derived.by(() => {
  if (!parseResults) return null;

  if (!reverseAmountSigns) return parseResults;

  // Create a copy with reversed amounts
  return {
    ...parseResults,
    rows: parseResults.rows.map(row => ({
      ...row,
      normalizedData: {
        ...row.normalizedData,
        amount: row.normalizedData['amount'] ? -row.normalizedData['amount'] : row.normalizedData['amount']
      }
    }))
  };
});

// Pre-select account from query parameter if provided
let selectedAccountId = $state<string>(data.preselectedAccountId || '');
const selectedAccount = $derived(() =>
  importableAccounts.find((a: Account) => a.id.toString() === selectedAccountId)
);

async function handleFileSelected(file: File) {
  selectedFile = file;
  isProcessing = true;
  error = null;

  try {
    // Convert file to base64 for later re-processing
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    fileData = {
      data: base64,
      name: file.name,
      type: file.type,
    };

    // Parse file and move to preview step
    const formData = new FormData();
    formData.append('importFile', file);

    // Add accountId as query parameter for duplicate checking
    const url = new URL('/api/import/upload', window.location.origin);
    if (selectedAccountId) {
      url.searchParams.set('accountId', selectedAccountId);
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    console.log('Upload result:', result);

    if (response.ok) {
      parseResults = result;
      // Store raw data for column mapping preview
      rawCSVData = result.rows.map((row: any) => row.rawData);
      console.log('Parse results:', parseResults);

      // Skip column mapping for QIF, OFX files (they have fixed formats)
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension === 'qif' || fileExtension === 'ofx' || fileExtension === 'qfx') {
        currentStep = 'preview';
      } else {
        currentStep = 'map-columns';
      }
    } else {
      error = result.error || 'Failed to parse file';
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to parse file';
  } finally {
    isProcessing = false;
  }
}

function handleFileRejected(errorMsg: string) {
  error = errorMsg;
}

function goBackToUpload() {
  currentStep = 'upload';
  selectedFile = null;
  parseResults = null;
  columnMapping = null;
  rawCSVData = null;
  entityPreview = null;
  error = null;
}

function goBackToMapping() {
  currentStep = 'map-columns';
  error = null;
}

async function handleColumnMappingComplete(mapping: ColumnMapping) {
  columnMapping = mapping;
  isProcessing = true;
  error = null;

  try {
    // Re-parse the CSV with custom column mapping
    const response = await fetch('/api/import/remap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: fileData,
        columnMapping: mapping,
        accountId: selectedAccountId,
      }),
    });

    const result = await response.json();
    console.log('Remap result:', result);

    if (response.ok) {
      parseResults = result;
      // Update raw data with remapped results
      rawCSVData = result.rows.map((row: any) => row.rawData);
      currentStep = 'preview';
    } else {
      error = result.error || 'Failed to remap CSV with custom column mapping';
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to remap CSV';
  } finally {
    isProcessing = false;
  }
}

async function proceedToEntityReview() {
  if (!parseResults || !selectedAccountId) return;

  isProcessing = true;
  error = null;

  try {
    // Filter rows to only include selected ones
    const selectedRowsData = parseResults.rows.filter((row) => selectedRows.has(row.rowIndex));

    const response = await fetch('/api/import/preview-entities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({rows: selectedRowsData}),
    });

    const result = await response.json();

    if (response.ok) {
      entityPreview = result;
      currentStep = 'review-entities';
    } else {
      error = result.error || 'Failed to generate entity preview';
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to generate entity preview';
  } finally {
    isProcessing = false;
  }
}

function goBackToPreview() {
  currentStep = 'preview';
  error = null;
}

function handlePayeeToggle(name: string, selected: boolean) {
  if (!entityPreview) return;
  const payee = entityPreview.payees.find((p) => p.name === name);
  if (payee && !payee.existing) {
    payee.selected = selected;
  }
}

function handleCategoryToggle(name: string, selected: boolean) {
  if (!entityPreview) return;
  const category = entityPreview.categories.find((c) => c.name === name);
  if (category && !category.existing) {
    category.selected = selected;
  }
}

function selectAllPayees() {
  if (!entityPreview) return;
  entityPreview.payees.forEach((p) => {
    if (!p.existing) p.selected = true;
  });
}

function deselectAllPayees() {
  if (!entityPreview) return;
  entityPreview.payees.forEach((p) => {
    if (!p.existing) p.selected = false;
  });
}

function selectAllCategories() {
  if (!entityPreview) return;
  entityPreview.categories.forEach((c) => {
    if (!c.existing) c.selected = true;
  });
}

function deselectAllCategories() {
  if (!entityPreview) return;
  entityPreview.categories.forEach((c) => {
    if (!c.existing) c.selected = false;
  });
}

async function processImport() {
  if (!parseResults || !selectedAccountId || !entityPreview) return;

  isProcessing = true;
  error = null;

  try {
    // Filter rows to only include selected ones
    const selectedRowsData = parseResults.rows.filter((row) => selectedRows.has(row.rowIndex));

    // Get selected entity names
    const selectedPayeeNames = entityPreview.payees
      .filter((p) => p.selected && !p.existing)
      .map((p) => p.name);

    const selectedCategoryNames = entityPreview.categories
      .filter((c) => c.selected && !c.existing)
      .map((c) => c.name);

    const importData = {
      accountId: parseInt(selectedAccountId),
      data: selectedRowsData,
      selectedEntities: {
        payees: selectedPayeeNames,
        categories: selectedCategoryNames,
      },
      options: {
        allowPartialImport,
        createMissingEntities: createMissingPayees || createMissingCategories,
        createMissingPayees,
        createMissingCategories,
        reverseAmountSigns,
      },
    };

    const response = await fetch('/api/import/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(importData),
    });

    const result = await response.json();

    if (response.ok) {
      importResult = result.result;
      currentStep = 'complete';

      // Invalidate all account-related queries to refresh balances everywhere
      await queryClient.invalidateQueries({queryKey: ['accounts']});
      await queryClient.invalidateQueries({queryKey: ['transactions']});
      await queryClient.invalidateQueries({queryKey: ['payees']});
      await queryClient.invalidateQueries({queryKey: ['categories']});
    } else {
      error = result.error || 'Failed to process import';
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to process import';
  } finally {
    isProcessing = false;
  }
}

function startNewImport() {
  currentStep = 'upload';
  selectedFile = null;
  parseResults = null;
  entityPreview = null;
  importResult = null;
  selectedAccountId = '';
  selectedRows = new Set();
  error = null;
}

const steps = [
  {id: 'upload', label: 'Upload File'},
  {id: 'map-columns', label: 'Map Columns'},
  {id: 'preview', label: 'Preview Data'},
  {id: 'review-entities', label: 'Review Entities'},
  {id: 'complete', label: 'Complete'},
];

const currentStepIndex = $derived(steps.findIndex((s) => s.id === currentStep));
</script>

<svelte:head>
  <title>Import Transactions - Budget App</title>
  <meta name="description" content="Import financial data from CSV, Excel, QIF, or OFX files" />
</svelte:head>

<div class="container mx-auto py-8">
  <div>
    {#if !hasImportableAccounts}
      <Empty.Empty>
        <Empty.EmptyMedia variant="icon">
          <Wallet class="size-6" />
        </Empty.EmptyMedia>
        <Empty.EmptyHeader>
          <Empty.EmptyTitle>No Importable Accounts Available</Empty.EmptyTitle>
          <Empty.EmptyDescription>
            You need to create at least one account before you can import transactions.
            HSA accounts cannot be imported into directly.
          </Empty.EmptyDescription>
        </Empty.EmptyHeader>
        <Empty.EmptyContent>
          <Button href="/accounts/new">
            Create an Account
          </Button>
        </Empty.EmptyContent>
      </Empty.Empty>
    {:else}
    <!-- Progress Steps -->
    <div class="mb-8">
      <div class="flex items-center justify-center">
        {#each steps as step, index}
          {@const isComplete = index < currentStepIndex}
          {@const isCurrent = index === currentStepIndex}
          <div class="flex flex-col items-center">
            <div class="flex items-center">
              <div
                class="flex items-center justify-center w-12 h-12 rounded-full text-sm font-medium transition-all {isCurrent
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : isComplete
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'}"
              >
                {#if isComplete}
                  <CircleCheck class="h-6 w-6" />
                {:else if isCurrent}
                  <Circle class="h-6 w-6 fill-current" />
                {:else}
                  <span class="text-sm font-semibold">{index + 1}</span>
                {/if}
              </div>
              {#if index < steps.length - 1}
                <div
                  class="w-32 h-1 mx-4 rounded-full transition-all {isComplete
                    ? 'bg-green-500'
                    : 'bg-muted'}"
                ></div>
              {/if}
            </div>
            <div class="mt-3 text-sm font-medium transition-colors {isCurrent
              ? 'text-primary'
              : isComplete
                ? 'text-green-600'
                : 'text-muted-foreground'}">
              {step.label}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Error Message -->
    {#if error}
      <Card.Root class="mb-6 border-destructive">
        <Card.Content class="pt-6">
          <div class="flex items-start gap-3">
            <div class="text-destructive">
              <Circle class="h-5 w-5 fill-current" />
            </div>
            <div class="flex-1">
              <p class="font-medium text-destructive">Error</p>
              <p class="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Step Content -->
    {#if currentStep === 'upload'}
      <div class="space-y-6">
        <div>
          <h1 class="text-3xl font-bold">Import Financial Data</h1>
          <p class="text-muted-foreground mt-2">
            Upload your financial data from CSV, Excel (.xlsx, .xls), QIF, or OFX/QFX files
          </p>
        </div>

        <!-- Account Selection -->
        <Card.Root>
          <Card.Header>
            <Card.Title>Select Account</Card.Title>
            <Card.Description>
              Choose the account to import transactions into
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <Select.Root type="single" bind:value={selectedAccountId}>
              <Select.Trigger class="w-full">
                <span class="truncate">
                  {#if selectedAccountId}
                    {importableAccounts.find((a: Account) => a.id.toString() === selectedAccountId)?.name || 'Choose an account...'}
                  {:else}
                    Choose an account...
                  {/if}
                </span>
              </Select.Trigger>
              <Select.Content>
                {#each importableAccounts as account}
                  <Select.Item value={account.id.toString()}>
                    {account.name}
                  </Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </Card.Content>
        </Card.Root>

        <!-- File Upload -->
        <FileUploadDropzone
          acceptedFormats={['.csv', '.txt', '.xlsx', '.xls', '.qif', '.ofx', '.qfx']}
          maxFileSize={10 * 1024 * 1024}
          onFileSelected={handleFileSelected}
          onFileRejected={handleFileRejected}
          showPreview={true}
        />

        {#if isProcessing}
          <div class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p class="text-sm text-muted-foreground mt-4">Processing file...</p>
          </div>
        {/if}
      </div>
    {:else if currentStep === 'map-columns' && parseResults && rawCSVData}
      <ColumnMapper
        rawColumns={Object.keys(rawCSVData[0] || {})}
        sampleData={rawCSVData}
        onNext={handleColumnMappingComplete}
        onBack={goBackToUpload}
      />
    {:else if currentStep === 'preview' && parseResults}
      <div class="flex gap-6 -mx-8">
        <!-- Left Sidebar - Import Options -->
        <div class="w-80 flex-shrink-0 pl-8">
          <Card.Root class="sticky top-6">
            <Card.Header>
              <Card.Title>Import Options</Card.Title>
              <Card.Description>
                Configure how the import should handle missing entities
              </Card.Description>
            </Card.Header>
            <Card.Content class="space-y-4">
              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <label for="create-payees" class="text-sm font-medium">
                    Auto-create payees
                  </label>
                  <p class="text-sm text-muted-foreground">
                    Automatically create new payees that don't exist
                  </p>
                </div>
                <Checkbox id="create-payees" bind:checked={createMissingPayees} />
              </div>

              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <label for="create-categories" class="text-sm font-medium">
                    Auto-create categories
                  </label>
                  <p class="text-sm text-muted-foreground">
                    Automatically create new categories that don't exist
                  </p>
                </div>
                <Checkbox id="create-categories" bind:checked={createMissingCategories} />
              </div>

              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <label for="partial-import" class="text-sm font-medium">
                    Allow partial import
                  </label>
                  <p class="text-sm text-muted-foreground">
                    Continue importing even if some rows have warnings
                  </p>
                </div>
                <Checkbox id="partial-import" bind:checked={allowPartialImport} />
              </div>

              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <label for="reverse-amounts" class="text-sm font-medium">
                    Reverse amount signs
                  </label>
                  <p class="text-sm text-muted-foreground">
                    Convert positive amounts to negative and vice versa
                  </p>
                </div>
                <Checkbox id="reverse-amounts" bind:checked={reverseAmountSigns} />
              </div>
            </Card.Content>
          </Card.Root>
        </div>

        <!-- Right Content - Stats and Preview -->
        <div class="flex-1 min-w-0 pr-8">
          {#if previewData}
            <ImportPreviewTable
              data={previewData.rows}
              fileName={previewData.fileName}
              onNext={proceedToEntityReview}
              onBack={goBackToUpload}
              bind:selectedRows
            />
          {/if}
        </div>
      </div>

      {#if isProcessing}
        <div class="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card.Root class="w-96">
            <Card.Content class="pt-6">
              <div class="text-center">
                <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p class="font-medium">Analyzing Entities</p>
                <p class="text-sm text-muted-foreground mt-2">
                  Checking payees and categories...
                </p>
              </div>
            </Card.Content>
          </Card.Root>
        </div>
      {/if}
    {:else if currentStep === 'review-entities' && entityPreview}
      <div class="space-y-6">
        <div>
          <h2 class="text-2xl font-bold">Review Entities</h2>
          <p class="text-muted-foreground mt-2">
            Select which payees and categories you want to create
          </p>
        </div>

        <EntityReview
          payees={entityPreview.payees}
          categories={entityPreview.categories}
          onPayeeToggle={handlePayeeToggle}
          onCategoryToggle={handleCategoryToggle}
          onSelectAllPayees={selectAllPayees}
          onDeselectAllPayees={deselectAllPayees}
          onSelectAllCategories={selectAllCategories}
          onDeselectAllCategories={deselectAllCategories}
        />

        <!-- Actions -->
        <div class="flex items-center justify-between">
          <Button variant="outline" onclick={goBackToPreview} disabled={isProcessing}>
            Back
          </Button>
          <Button onclick={processImport} disabled={isProcessing}>
            {#if isProcessing}
              <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
              Processing...
            {:else}
              Import Transactions
            {/if}
          </Button>
        </div>
      </div>

      {#if isProcessing}
        <div class="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card.Root class="w-96">
            <Card.Content class="pt-6">
              <div class="text-center">
                <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p class="font-medium">Processing Import</p>
                <p class="text-sm text-muted-foreground mt-2">
                  Creating transactions...
                </p>
              </div>
            </Card.Content>
          </Card.Root>
        </div>
      {/if}
    {:else if currentStep === 'complete' && importResult}
      <div class="space-y-6">
        <div class="text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
            <CircleCheck class="h-8 w-8 text-green-600" />
          </div>
          <h2 class="text-2xl font-bold">Import Complete!</h2>
          <p class="text-muted-foreground mt-2">
            Your transactions have been successfully imported
          </p>
        </div>

        <!-- Import Summary -->
        <Card.Root>
          <Card.Header>
            <Card.Title>Import Summary</Card.Title>
          </Card.Header>
          <Card.Content class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-2xl font-bold text-green-600">
                  {importResult.transactionsCreated}
                </div>
                <div class="text-sm text-muted-foreground">Transactions Created</div>
              </div>
              <div>
                <div class="text-2xl font-bold">
                  {importResult.entitiesCreated.payees + importResult.entitiesCreated.categories}
                </div>
                <div class="text-sm text-muted-foreground">Entities Created</div>
              </div>
            </div>

            {#if importResult.errors.length > 0}
              <div class="pt-4 border-t">
                <p class="text-sm font-medium text-destructive mb-2">
                  {importResult.errors.length} Error(s)
                </p>
                {#each importResult.errors.slice(0, 5) as error}
                  <p class="text-xs text-muted-foreground">
                    Row {error.row}: {error.message}
                  </p>
                {/each}
              </div>
            {/if}
          </Card.Content>
        </Card.Root>

        <!-- Actions -->
        <div class="flex items-center gap-4">
          <Button class="flex-1" onclick={startNewImport}>Import Another File</Button>
          <Button class="flex-1" variant="outline" href="/accounts/{selectedAccount()?.slug}">
            View Account
          </Button>
        </div>
      </div>
    {/if}
    {/if}
  </div>
</div>
