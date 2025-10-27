<script lang="ts">
import * as Select from '$lib/components/ui/select';
import * as Card from '$lib/components/ui/card';
import { Button } from '$lib/components/ui/button';
import type { ColumnMapping } from '$lib/types/import';
import { formatPreviewAmount } from '$lib/utils/import';

interface Props {
  rawColumns: string[];
  initialMapping?: ColumnMapping;
  sampleData?: Record<string, any>[];
  onNext: (mapping: ColumnMapping) => void;
  onBack: () => void;
}

let { rawColumns, initialMapping, sampleData = [], onNext, onBack }: Props = $props();

// Filter out header rows from sample data
const filteredSampleData = $derived.by(() => {
  if (sampleData.length === 0) return [];

  // Check if first row is the header row (values match column names)
  const firstRow = sampleData[0];
  if (!firstRow) return sampleData;

  const isHeaderRow = rawColumns.every(col => firstRow[col] === col);

  return isHeaderRow ? sampleData.slice(1) : sampleData;
});

// Available target fields - dynamically generated based on detected columns
const targetFields = $derived((() => {
  const fields = [
    { value: '', label: 'Skip Column' },
    { value: 'date', label: 'Date' },
  ];

  // Check if we have both debit and credit columns in the CSV
  const hasDebitCol = rawColumns.some(col => col.toLowerCase().includes('debit'));
  const hasCreditCol = rawColumns.some(col => col.toLowerCase().includes('credit'));

  console.log('Column detection:', { rawColumns, hasDebitCol, hasCreditCol });

  if (hasDebitCol && hasCreditCol) {
    // If both debit and credit columns exist, offer combined option
    fields.push({ value: 'debit/credit', label: 'Debit/Credit (Amount)' });
  } else {
    // Otherwise offer standard amount field
    fields.push({ value: 'amount', label: 'Amount' });
  }

  fields.push(
    { value: 'payee', label: 'Payee/Merchant' },
    { value: 'notes', label: 'Notes/Memo' },
    { value: 'category', label: 'Category' },
    { value: 'status', label: 'Status' },
  );

  console.log('Generated fields:', fields);

  return fields;
})());

// Initialize mapping state
let columnMapping = $state<Record<string, string>>({});

// State for Select components
let debitSelectValue = $state<string>('');
let creditSelectValue = $state<string>('');
let fieldSelectValues = $state<Record<string, string>>({});

// Track if initialization is complete to prevent effect loops
let initialized = $state(false);

// Initialize with provided mapping or attempt auto-detection (only runs once)
$effect(() => {
  if (initialized) return;

  if (initialMapping) {
    columnMapping = { ...initialMapping };
  } else {
    // Check if we have both debit and credit columns
    const hasDebitCol = rawColumns.some(col => col.toLowerCase().includes('debit'));
    const hasCreditCol = rawColumns.some(col => col.toLowerCase().includes('credit'));
    const useDebitCredit = hasDebitCol && hasCreditCol;

    // Auto-detect mappings based on column names
    rawColumns.forEach((col) => {
      const colLower = col.toLowerCase().trim();

      if (colLower.includes('date')) {
        columnMapping[col] = 'date';
      } else if (useDebitCredit && (colLower.includes('debit') || colLower.includes('credit'))) {
        columnMapping[col] = 'debit/credit';
        console.log(`Auto-mapped "${col}" to debit/credit`);
      } else if (colLower.includes('amount')) {
        columnMapping[col] = 'amount';
      } else if (colLower.includes('payee') || colLower.includes('merchant') || colLower.includes('name')) {
        columnMapping[col] = 'payee';
      } else if (colLower.includes('note') || colLower.includes('memo') || colLower.includes('description') || colLower.includes('transaction')) {
        columnMapping[col] = 'notes';
      } else if (colLower.includes('category')) {
        columnMapping[col] = 'category';
      } else if (colLower.includes('status')) {
        columnMapping[col] = 'status';
      } else {
        columnMapping[col] = '';
      }
    });

    console.log('Final column mapping:', columnMapping);
  }

  // Initialize select values based on column mapping
  Object.entries(columnMapping).forEach(([col, target]) => {
    if (target === 'debit/credit') {
      if (col.toLowerCase().includes('debit')) {
        debitSelectValue = col;
      } else if (col.toLowerCase().includes('credit')) {
        creditSelectValue = col;
      }
    } else if (target) {
      if (!fieldSelectValues[target]) {
        fieldSelectValues[target] = col;
      }
    }
  });

  initialized = true;
});

// Handler functions for select changes (called directly, not in effects)
function handleDebitChange(newValue: string) {
  // Clear any existing debit mapping
  Object.keys(columnMapping).forEach((col) => {
    if (columnMapping[col] === 'debit/credit' && col.toLowerCase().includes('debit')) {
      columnMapping[col] = '';
    }
  });
  // Set new debit mapping
  if (newValue) {
    columnMapping[newValue] = 'debit/credit';
  }
  debitSelectValue = newValue;
}

function handleCreditChange(newValue: string) {
  // Clear any existing credit mapping
  Object.keys(columnMapping).forEach((col) => {
    if (columnMapping[col] === 'debit/credit' && col.toLowerCase().includes('credit')) {
      columnMapping[col] = '';
    }
  });
  // Set new credit mapping
  if (newValue) {
    columnMapping[newValue] = 'debit/credit';
  }
  creditSelectValue = newValue;
}

function handleFieldChange(field: string, newValue: string) {
  // Clear any existing mapping to this target field
  Object.keys(columnMapping).forEach((col) => {
    if (columnMapping[col] === field) {
      columnMapping[col] = '';
    }
  });
  // Set new mapping
  if (newValue) {
    columnMapping[newValue] = field;
  }
  fieldSelectValues[field] = newValue;
}

// Check if mapping is valid (at minimum needs date and either amount OR debit/credit)
const isValidMapping = $derived.by(() => {
  const mappedFields = Object.values(columnMapping).filter(v => v);
  const hasDate = mappedFields.includes('date');
  const hasAmount = mappedFields.includes('amount');
  const hasDebitCredit = mappedFields.includes('debit/credit');

  // Valid if we have date and either amount or debit/credit
  return hasDate && (hasAmount || hasDebitCredit);
});

function handleNext() {
  if (!isValidMapping) return;

  // Convert to ColumnMapping format
  const mapping: ColumnMapping = {
    date: '',
    amount: '',
  };

  Object.entries(columnMapping).forEach(([rawCol, targetField]) => {
    if (targetField && targetField !== '') {
      // Handle debit/credit combined mapping
      if (targetField === 'debit/credit') {
        const colLower = rawCol.toLowerCase();
        if (colLower.includes('debit')) {
          (mapping as any).debit = rawCol;
        } else if (colLower.includes('credit')) {
          (mapping as any).credit = rawCol;
        }
      } else {
        mapping[targetField as keyof ColumnMapping] = rawCol;
      }
    }
  });

  console.log('Final mapping being sent:', mapping);
  onNext(mapping);
}
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-2xl font-semibold">Map CSV Columns</h2>
    <p class="text-sm text-muted-foreground mt-1">
      Match your CSV columns to the transaction fields
    </p>
  </div>

  <Card.Root>
    <Card.Header>
      <Card.Title>Column Mapping</Card.Title>
      <Card.Description>
        Select which field each column should map to. At minimum, Date and Amount are required.
        For files with separate debit/credit columns, both will be mapped automatically as Debit/Credit.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="space-y-4">
        {#each targetFields as field}
          {#if field.value !== ''}
            {@const selectedColumns = Object.entries(columnMapping).filter(([, target]) => target === field.value).map(([col]) => col)}
            <div class="flex items-center gap-4">
              <div class="w-48 font-medium text-sm">
                {field.label}
                {#if field.value === 'date' || (field.value === 'amount' && !targetFields.some(f => f.value === 'debit/credit')) || (field.value === 'debit/credit')}
                  <span class="text-destructive">*</span>
                {/if}
              </div>
              <div class="flex-1">
                {#if field.value === 'debit/credit'}
                  <!-- Show separate selects for debit and credit columns -->
                  <div class="flex gap-2">
                    <div class="flex-1">
                      <Select.Root
                        type="single"
                        value={debitSelectValue}
                        onValueChange={handleDebitChange}>
                        <Select.Trigger class="w-full">
                          <span class="truncate text-xs">
                            Debit: {debitSelectValue || 'Select...'}
                          </span>
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="">None</Select.Item>
                          {#each rawColumns as column}
                            <Select.Item value={column}>{column}</Select.Item>
                          {/each}
                        </Select.Content>
                      </Select.Root>
                    </div>
                    <div class="flex-1">
                      <Select.Root
                        type="single"
                        value={creditSelectValue}
                        onValueChange={handleCreditChange}>
                        <Select.Trigger class="w-full">
                          <span class="truncate text-xs">
                            Credit: {creditSelectValue || 'Select...'}
                          </span>
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="">None</Select.Item>
                          {#each rawColumns as column}
                            <Select.Item value={column}>{column}</Select.Item>
                          {/each}
                        </Select.Content>
                      </Select.Root>
                    </div>
                  </div>
                {:else}
                  {@const fieldKey = field.value}
                  {@const currentFieldValue = fieldSelectValues[fieldKey] || ''}
                  <Select.Root
                    type="single"
                    value={currentFieldValue}
                    onValueChange={(newValue) => handleFieldChange(fieldKey, newValue || '')}>
                    <Select.Trigger class="w-full">
                      <span class="truncate">
                        {currentFieldValue || 'Select CSV column...'}
                      </span>
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="">None (skip this field)</Select.Item>
                      {#each rawColumns as column}
                        <Select.Item value={column}>{column}</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                {/if}
              </div>
              {#if selectedColumns.length > 0 && filteredSampleData.length > 0 && filteredSampleData[0]}
                <div class="w-64 text-sm text-muted-foreground truncate">
                  {#if selectedColumns.length > 1}
                    Examples: {selectedColumns.map(col => filteredSampleData[0]?.[col] || '(empty)').join(' & ')}
                  {:else if selectedColumns[0]}
                    Example: {filteredSampleData[0]?.[selectedColumns[0]] || '(empty)'}
                  {/if}
                </div>
              {/if}
            </div>
          {/if}
        {/each}
      </div>

      {#if !isValidMapping}
        <div class="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
          Please map at least Date and Amount
        </div>
      {/if}
    </Card.Content>
  </Card.Root>

  {#if filteredSampleData.length > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title>Preview</Card.Title>
        <Card.Description>
          First {Math.min(10, filteredSampleData.length)} rows with your mapping applied
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b">
                {#each Object.entries(columnMapping).filter(([col, target]) => {
                  const included = rawColumns.includes(col) && target !== '';
                  console.log(`Column "${col}" -> "${target}": rawColumns.includes=${rawColumns.includes(col)}, target="${target}", included=${included}`);
                  return included;
                }) as [, target]}
                  <th class="text-left p-2 font-medium">
                    {targetFields.find(f => f.value === target)?.label || target}
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each filteredSampleData.slice(0, 10) as row}
                <tr class="border-b">
                  {#each Object.entries(columnMapping).filter(([col, target]) => rawColumns.includes(col) && target !== '') as [rawCol, target]}
                    <td class="p-2">
                      {#if target === 'debit/credit'}
                        {@const colLower = rawCol.toLowerCase()}
                        {formatPreviewAmount(row[rawCol], colLower.includes('debit'))}
                      {:else}
                        {row[rawCol] || '-'}
                      {/if}
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <div class="flex items-center justify-between">
    <Button variant="outline" onclick={onBack}>
      Back
    </Button>
    <Button onclick={handleNext} disabled={!isValidMapping}>
      Continue to Preview
    </Button>
  </div>
</div>
