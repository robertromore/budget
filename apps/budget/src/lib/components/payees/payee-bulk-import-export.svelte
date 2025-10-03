<script lang="ts">
import * as Dialog from '$lib/components/ui/dialog';
import * as Card from '$lib/components/ui/card';
import * as Tabs from '$lib/components/ui/tabs';
import * as Alert from '$lib/components/ui/alert';
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import { Progress } from '$lib/components/ui/progress';
import { Separator } from '$lib/components/ui/separator';
import { ScrollArea } from '$lib/components/ui/scroll-area';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Textarea } from '$lib/components/ui/textarea';

import { PayeesState } from '$lib/states/entities/payees.svelte';
import { bulkExport, bulkImport } from '$lib/query/payees';
import type { Payee } from '$lib/schema/payees';

// Icons
import Download from '@lucide/svelte/icons/download';
import Upload from '@lucide/svelte/icons/upload';
import FileText from '@lucide/svelte/icons/file-text';
import Database from '@lucide/svelte/icons/database';
import CheckCircle from '@lucide/svelte/icons/check-circle';
import XCircle from '@lucide/svelte/icons/x-circle';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
import Info from '@lucide/svelte/icons/info';
import Loader2 from '@lucide/svelte/icons/loader-2';
import Copy from '@lucide/svelte/icons/copy';
import Eye from '@lucide/svelte/icons/eye';
import EyeOff from '@lucide/svelte/icons/eye-off';

let {
  open = $bindable(false),
  selectedPayeeIds = [],
  onImportComplete,
}: {
  open: boolean;
  selectedPayeeIds?: number[];
  onImportComplete?: (importedCount: number) => void;
} = $props();

const payeesState = PayeesState.get();

// Local state
let activeTab = $state('export');
let exportFormat = $state<'csv' | 'json'>('csv');
let includeInactive = $state(false);
let includeTransactionStats = $state(true);
let includeContactInfo = $state(true);
let includeIntelligenceData = $state(false);
let exportInProgress = $state(false);
let exportResult = $state<string>('');

// Import state
let importFormat = $state<'csv' | 'json'>('csv');
let importData = $state('');
let importFile = $state<File | null>(null);
let skipDuplicates = $state(true);
let updateExisting = $state(false);
let applyIntelligentDefaults = $state(true);
let validateContactInfo = $state(true);
let importInProgress = $state(false);
let importResults = $state<any>(null);
let showPreview = $state(false);
let previewData = $state<any[]>([]);

// Query hooks
const bulkExportMutation = bulkExport();
const bulkImportMutation = bulkImport();

// Get all payees
const allPayees = $derived(Array.from(payeesState.payees.values()));

// Filter payees for export
const exportPayees = $derived.by(() => {
  let payees = selectedPayeeIds.length > 0
    ? allPayees.filter(p => selectedPayeeIds.includes(p.id))
    : allPayees;

  if (!includeInactive) {
    payees = payees.filter(p => p.isActive);
  }

  return payees;
});

// CSV template
const csvTemplate = `name,payeeType,email,phone,website,notes,isActive
"Example Store","merchant","store@example.com","555-0123","https://example.com","Sample merchant",true
"John Doe","individual","john@example.com","555-0124","","Individual payee",true
"Utility Company","utility","billing@utility.com","555-0125","https://utility.com","Monthly service",true`;

// JSON template
const jsonTemplate = JSON.stringify([
  {
    name: "Example Store",
    payeeType: "merchant",
    email: "store@example.com",
    phone: "555-0123",
    website: "https://example.com",
    notes: "Sample merchant",
    isActive: true
  },
  {
    name: "John Doe",
    payeeType: "individual",
    email: "john@example.com",
    phone: "555-0124",
    website: "",
    notes: "Individual payee",
    isActive: true
  }
], null, 2);

// Export functionality
async function performExport() {
  if (exportPayees.length === 0) return;

  exportInProgress = true;
  exportResult = '';

  try {
    const result = await bulkExportMutation.mutateAsync({
      payeeIds: exportPayees.map(p => p.id),
      format: exportFormat,
      includeTransactionStats,
      includeContactInfo,
      includeIntelligenceData,
    });

    exportResult = result.data;

    // Auto-download the file
    const blob = new Blob([result.data], {
      type: exportFormat === 'csv' ? 'text/csv' : 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payees_export_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
    exportResult = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  } finally {
    exportInProgress = false;
  }
}

// Import functionality
function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (file) {
    importFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      importData = e.target?.result as string || '';
      parsePreviewData();
    };
    reader.readAsText(file);

    // Auto-detect format
    if (file.name.endsWith('.json')) {
      importFormat = 'json';
    } else {
      importFormat = 'csv';
    }
  }
}

function parsePreviewData() {
  try {
    if (importFormat === 'json') {
      const parsed = JSON.parse(importData);
      previewData = Array.isArray(parsed) ? parsed.slice(0, 5) : [parsed];
    } else {
      // Parse CSV
      const lines = importData.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        previewData = [];
        return;
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      previewData = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.replace(/"/g, '').trim());
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        return obj;
      });
    }
  } catch (error) {
    console.error('Preview parsing failed:', error);
    previewData = [];
  }
}

async function performImport() {
  if (!importData.trim()) return;

  importInProgress = true;
  importResults = null;

  try {
    const result = await bulkImportMutation.mutateAsync({
      data: importData,
      format: importFormat,
      options: {
        skipDuplicates,
        updateExisting,
        applyIntelligentDefaults,
        validateContactInfo,
      },
    });

    importResults = result;

    if (onImportComplete && result.summary?.imported) {
      onImportComplete(result.summary.imported);
    }
  } catch (error) {
    console.error('Import failed:', error);
    importResults = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    importInProgress = false;
  }
}

// Copy template to clipboard
async function copyTemplate(template: string) {
  try {
    await navigator.clipboard.writeText(template);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
  }
}

// Clear import data
function clearImportData() {
  importData = '';
  importFile = null;
  previewData = [];
  importResults = null;
  showPreview = false;
}

// Reset state when dialog opens
$effect(() => {
  if (open) {
    exportResult = '';
    importResults = null;
    showPreview = false;
    if (activeTab === 'import') {
      clearImportData();
    }
  }
});

// Update preview when import data changes
$effect(() => {
  if (importData && showPreview) {
    parsePreviewData();
  }
});
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-5xl max-h-[90vh] overflow-hidden">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <Database class="h-5 w-5" />
        Bulk Import/Export Payees
      </Dialog.Title>
      <Dialog.Description>
        Export your payee data or import payees from CSV/JSON files.
      </Dialog.Description>
    </Dialog.Header>

    <Tabs.Root bind:value={activeTab} class="h-full">
      <Tabs.List class="grid w-full grid-cols-2">
        <Tabs.Trigger value="export">Export</Tabs.Trigger>
        <Tabs.Trigger value="import">Import</Tabs.Trigger>
      </Tabs.List>

      <!-- Export Tab -->
      <Tabs.Content value="export" class="space-y-4">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Export Settings -->
          <Card.Root>
            <Card.Header>
              <Card.Title>Export Settings</Card.Title>
            </Card.Header>
            <Card.Content class="space-y-4">
              <!-- Format Selection -->
              <div class="space-y-2">
                <Label>Export Format</Label>
                <div class="flex gap-2">
                  <Button
                    variant={exportFormat === 'csv' ? 'default' : 'outline'}
                    size="sm"
                    onclick={() => exportFormat = 'csv'}
                  >
                    <FileText class="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button
                    variant={exportFormat === 'json' ? 'default' : 'outline'}
                    size="sm"
                    onclick={() => exportFormat = 'json'}
                  >
                    <Database class="h-4 w-4 mr-2" />
                    JSON
                  </Button>
                </div>
              </div>

              <!-- Payee Selection -->
              <div class="space-y-2">
                <Label>Payees to Export</Label>
                <div class="text-sm text-muted-foreground">
                  {#if selectedPayeeIds.length > 0}
                    <div class="flex items-center gap-2">
                      <CheckCircle class="h-4 w-4 text-green-500" />
                      {selectedPayeeIds.length} selected payee{selectedPayeeIds.length > 1 ? 's' : ''}
                    </div>
                  {:else}
                    <div class="flex items-center gap-2">
                      <Info class="h-4 w-4 text-blue-500" />
                      All payees ({allPayees.length} total)
                    </div>
                  {/if}
                  {#if !includeInactive}
                    <div class="text-xs">Active payees only</div>
                  {/if}
                </div>
              </div>

              <!-- Options -->
              <div class="space-y-3">
                <div class="flex items-center space-x-2">
                  <Checkbox bind:checked={includeInactive} id="export-inactive" />
                  <Label for="export-inactive">Include inactive payees</Label>
                </div>

                <div class="flex items-center space-x-2">
                  <Checkbox bind:checked={includeTransactionStats} id="export-stats" />
                  <Label for="export-stats">Include transaction statistics</Label>
                </div>

                <div class="flex items-center space-x-2">
                  <Checkbox bind:checked={includeContactInfo} id="export-contact" />
                  <Label for="export-contact">Include contact information</Label>
                </div>

                <div class="flex items-center space-x-2">
                  <Checkbox bind:checked={includeIntelligenceData} id="export-intelligence" />
                  <Label for="export-intelligence">Include intelligence data</Label>
                </div>
              </div>

              <!-- Export Button -->
              <Button
                onclick={performExport}
                disabled={exportInProgress || exportPayees.length === 0}
                class="w-full"
              >
                {#if exportInProgress}
                  <Loader2 class="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                {:else}
                  <Download class="h-4 w-4 mr-2" />
                  Export {exportPayees.length} Payee{exportPayees.length > 1 ? 's' : ''}
                {/if}
              </Button>
            </Card.Content>
          </Card.Root>

          <!-- Export Preview/Result -->
          <Card.Root>
            <Card.Header>
              <Card.Title>Export Preview</Card.Title>
            </Card.Header>
            <Card.Content>
              {#if exportResult}
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <Label>Export Result</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={() => copyTemplate(exportResult)}
                    >
                      <Copy class="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  <Textarea
                    value={exportResult}
                    readonly
                    class="h-[300px] font-mono text-xs"
                    placeholder="Export results will appear here..."
                  />
                </div>
              {:else}
                <div class="text-center py-8 text-muted-foreground">
                  <Download class="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Export results will appear here</p>
                  <p class="text-sm">File will be automatically downloaded</p>
                </div>
              {/if}
            </Card.Content>
          </Card.Root>
        </div>
      </Tabs.Content>

      <!-- Import Tab -->
      <Tabs.Content value="import" class="space-y-4">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Import Data -->
          <Card.Root>
            <Card.Header>
              <Card.Title>Import Data</Card.Title>
            </Card.Header>
            <Card.Content class="space-y-4">
              <!-- Format Selection -->
              <div class="space-y-2">
                <Label>Import Format</Label>
                <div class="flex gap-2">
                  <Button
                    variant={importFormat === 'csv' ? 'default' : 'outline'}
                    size="sm"
                    onclick={() => importFormat = 'csv'}
                  >
                    <FileText class="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button
                    variant={importFormat === 'json' ? 'default' : 'outline'}
                    size="sm"
                    onclick={() => importFormat = 'json'}
                  >
                    <Database class="h-4 w-4 mr-2" />
                    JSON
                  </Button>
                </div>
              </div>

              <!-- File Upload -->
              <div class="space-y-2">
                <Label for="import-file">Upload File</Label>
                <Input
                  id="import-file"
                  type="file"
                  accept={importFormat === 'csv' ? '.csv' : '.json'}
                  onchange={handleFileUpload}
                />
                {#if importFile}
                  <div class="text-sm text-muted-foreground">
                    Loaded: {importFile.name} ({Math.round(importFile.size / 1024)} KB)
                  </div>
                {/if}
              </div>

              <div class="text-center text-muted-foreground">
                <span class="text-sm">or</span>
              </div>

              <!-- Manual Data Entry -->
              <div class="space-y-2">
                <Label for="import-data">Paste Data</Label>
                <Textarea
                  id="import-data"
                  bind:value={importData}
                  placeholder={`Paste your ${importFormat.toUpperCase()} data here...`}
                  class="h-[200px] font-mono text-xs"
                />
              </div>

              <!-- Preview Toggle -->
              {#if importData}
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => showPreview = !showPreview}
                  class="w-full"
                >
                  {#if showPreview}
                    <EyeOff class="h-4 w-4 mr-2" />
                    Hide Preview
                  {:else}
                    <Eye class="h-4 w-4 mr-2" />
                    Show Preview
                  {/if}
                </Button>
              {/if}
            </Card.Content>
          </Card.Root>

          <!-- Import Settings & Results -->
          <Card.Root>
            <Card.Header>
              <Card.Title>Import Settings</Card.Title>
            </Card.Header>
            <Card.Content class="space-y-4">
              <!-- Options -->
              <div class="space-y-3">
                <div class="flex items-center space-x-2">
                  <Checkbox bind:checked={skipDuplicates} id="skip-duplicates" />
                  <Label for="skip-duplicates">Skip duplicate payees</Label>
                </div>

                <div class="flex items-center space-x-2">
                  <Checkbox bind:checked={updateExisting} id="update-existing" />
                  <Label for="update-existing">Update existing payees</Label>
                </div>

                <div class="flex items-center space-x-2">
                  <Checkbox bind:checked={applyIntelligentDefaults} id="apply-defaults" />
                  <Label for="apply-defaults">Apply intelligent defaults</Label>
                </div>

                <div class="flex items-center space-x-2">
                  <Checkbox bind:checked={validateContactInfo} id="validate-contact" />
                  <Label for="validate-contact">Validate contact information</Label>
                </div>
              </div>

              <!-- Import Button -->
              <Button
                onclick={performImport}
                disabled={importInProgress || !importData.trim()}
                class="w-full"
              >
                {#if importInProgress}
                  <Loader2 class="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                {:else}
                  <Upload class="h-4 w-4 mr-2" />
                  Import Data
                {/if}
              </Button>

              <!-- Clear Button -->
              {#if importData}
                <Button
                  variant="outline"
                  onclick={clearImportData}
                  class="w-full"
                >
                  Clear Data
                </Button>
              {/if}

              <!-- Import Results -->
              {#if importResults}
                <Separator />
                <div class="space-y-2">
                  <Label>Import Results</Label>
                  {#if importResults.success}
                    <Alert.Root class="border-green-200 bg-green-50">
                      <CheckCircle class="h-4 w-4 text-green-600" />
                      <Alert.Title class="text-green-800">Import Successful</Alert.Title>
                      <Alert.Description class="text-green-700">
                        {#if importResults.summary}
                          <div class="space-y-1">
                            <div>Imported: {importResults.summary.imported || 0}</div>
                            <div>Updated: {importResults.summary.updated || 0}</div>
                            <div>Skipped: {importResults.summary.skipped || 0}</div>
                            <div>Errors: {importResults.summary.errors || 0}</div>
                          </div>
                        {:else}
                          Import completed successfully.
                        {/if}
                      </Alert.Description>
                    </Alert.Root>
                  {:else}
                    <Alert.Root class="border-red-200 bg-red-50">
                      <XCircle class="h-4 w-4 text-red-600" />
                      <Alert.Title class="text-red-800">Import Failed</Alert.Title>
                      <Alert.Description class="text-red-700">
                        {importResults.error || 'Unknown error occurred during import.'}
                      </Alert.Description>
                    </Alert.Root>
                  {/if}
                </div>
              {/if}
            </Card.Content>
          </Card.Root>
        </div>

        <!-- Data Preview -->
        {#if showPreview && previewData.length > 0}
          <Card.Root>
            <Card.Header>
              <Card.Title>Data Preview (First 5 rows)</Card.Title>
            </Card.Header>
            <Card.Content>
              <ScrollArea class="h-[200px]">
                <div class="text-xs font-mono">
                  <pre>{JSON.stringify(previewData, null, 2)}</pre>
                </div>
              </ScrollArea>
            </Card.Content>
          </Card.Root>
        {/if}

        <!-- Templates -->
        <Card.Root>
          <Card.Header>
            <Card.Title>Import Templates</Card.Title>
            <Card.Description>
              Use these templates as a starting point for your import data.
            </Card.Description>
          </Card.Header>
          <Card.Content class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- CSV Template -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <Label>CSV Template</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => copyTemplate(csvTemplate)}
                  >
                    <Copy class="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={csvTemplate}
                  readonly
                  class="h-[120px] font-mono text-xs"
                />
              </div>

              <!-- JSON Template -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <Label>JSON Template</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => copyTemplate(jsonTemplate)}
                  >
                    <Copy class="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={jsonTemplate}
                  readonly
                  class="h-[120px] font-mono text-xs"
                />
              </div>
            </div>

            <!-- Field Information -->
            <Alert.Root>
              <Info class="h-4 w-4" />
              <Alert.Title>Required Fields</Alert.Title>
              <Alert.Description>
                <strong>name</strong> is the only required field. Optional fields include:
                payeeType, email, phone, website, notes, isActive.
                Valid payeeTypes: merchant, utility, employer, financial_institution, government, individual.
              </Alert.Description>
            </Alert.Root>
          </Card.Content>
        </Card.Root>
      </Tabs.Content>
    </Tabs.Root>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => open = false}>
        Close
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
