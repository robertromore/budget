<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Select from '$lib/components/ui/select';
import type { ColumnMapping } from '$lib/types/import';
import { formatPreviewAmount } from '$lib/utils/import';
import { normalize } from '$lib/utils/string-utilities';

interface Props {
  rawColumns: string[];
  initialMapping?: ColumnMapping | undefined;
  sampleData?: Record<string, any>[] | undefined;
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

  const isHeaderRow = rawColumns.every((col) => firstRow[col] === col);

  return isHeaderRow ? sampleData.slice(1) : sampleData;
});

// Available target fields - dynamically generated based on detected columns
const targetFields = $derived(
  (() => {
    const fields = [
      { value: '', label: 'Skip Column' },
      { value: 'date', label: 'Date' },
    ];

    // Check if we have both debit and credit columns in the CSV
    const hasDebitCol = rawColumns.some((col) => col.toLowerCase().includes('debit'));
    const hasCreditCol = rawColumns.some((col) => col.toLowerCase().includes('credit'));

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
      { value: 'status', label: 'Status' }
    );

    console.log('Generated fields:', fields);

    return fields;
  })()
);

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
    // Profile stores mappings as { fieldType: columnName } (e.g., { date: "Transaction Date" })
    // But columnMapping expects { columnName: fieldType } (e.g., { "Transaction Date": "date" })
    // So we need to invert the mapping
    const invertedMapping: Record<string, string> = {};
    Object.entries(initialMapping).forEach(([field, column]) => {
      if (column && typeof column === 'string') {
        // Handle field name differences between profile schema and component
        let mappedField = field;
        // Profile uses 'memo'/'description', component uses 'notes'
        if (field === 'memo' || field === 'description') {
          mappedField = 'notes';
        }
        // Profile uses 'inflow'/'outflow' (or legacy 'debit'/'credit'), component uses 'debit/credit'
        else if (field === 'inflow' || field === 'outflow' || field === 'debit' || field === 'credit') {
          mappedField = 'debit/credit';
        }
        invertedMapping[column] = mappedField;
      }
    });
    columnMapping = invertedMapping;
    console.log('Inverted profile mapping:', invertedMapping);
  } else {
    // Check if we have both debit and credit columns
    const hasDebitCol = rawColumns.some((col) => col.toLowerCase().includes('debit'));
    const hasCreditCol = rawColumns.some((col) => col.toLowerCase().includes('credit'));
    const useDebitCredit = hasDebitCol && hasCreditCol;

    // Track which fields have been assigned (only one column per field)
    const assignedFields = new Set<string>();

    // Auto-detect mappings based on column names
    // Only assign one column per field (first match wins)
    rawColumns.forEach((col) => {
      const colLower = normalize(col);

      if (colLower.includes('date') && !assignedFields.has('date')) {
        columnMapping[col] = 'date';
        assignedFields.add('date');
      } else if (useDebitCredit && (colLower.includes('debit') || colLower.includes('credit'))) {
        // Special case: debit/credit allows two columns (one for each)
        columnMapping[col] = 'debit/credit';
        console.log(`Auto-mapped "${col}" to debit/credit`);
      } else if (colLower.includes('amount') && !assignedFields.has('amount')) {
        columnMapping[col] = 'amount';
        assignedFields.add('amount');
      } else if (
        (colLower.includes('payee') ||
          colLower.includes('merchant') ||
          colLower.includes('name')) &&
        !assignedFields.has('payee')
      ) {
        columnMapping[col] = 'payee';
        assignedFields.add('payee');
      } else if (
        (colLower.includes('note') ||
          colLower.includes('memo') ||
          colLower.includes('description')) &&
        !assignedFields.has('notes')
      ) {
        columnMapping[col] = 'notes';
        assignedFields.add('notes');
      } else if (colLower.includes('category') && !assignedFields.has('category')) {
        columnMapping[col] = 'category';
        assignedFields.add('category');
      } else if (colLower.includes('status') && !assignedFields.has('status')) {
        columnMapping[col] = 'status';
        assignedFields.add('status');
      } else {
        columnMapping[col] = '';
      }
    });

    console.log('Final column mapping:', columnMapping);
  }

  // Initialize select values based on column mapping
  Object.entries(columnMapping).forEach(([col, target]) => {
    if (target === 'debit/credit') {
      const colLower = col.toLowerCase();
      // Handle both debit/credit and outflow/inflow naming conventions
      if (colLower.includes('debit') || colLower.includes('outflow')) {
        debitSelectValue = col;
      } else if (colLower.includes('credit') || colLower.includes('inflow')) {
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
  // Create a new mapping, excluding existing debit/outflow mappings
  let newMapping: Record<string, string> = {};

  Object.entries(columnMapping).forEach(([col, target]) => {
    const colLower = col.toLowerCase();
    const isDebitMapping =
      target === 'debit/credit' && (colLower.includes('debit') || colLower.includes('outflow'));
    if (!isDebitMapping) {
      newMapping[col] = target;
    }
  });

  // Set new debit mapping
  if (newValue) {
    newMapping[newValue] = 'debit/credit';
  }

  columnMapping = newMapping;
  debitSelectValue = newValue;
}

function handleCreditChange(newValue: string) {
  // Create a new mapping, excluding existing credit/inflow mappings
  let newMapping: Record<string, string> = {};

  Object.entries(columnMapping).forEach(([col, target]) => {
    const colLower = col.toLowerCase();
    const isCreditMapping =
      target === 'debit/credit' && (colLower.includes('credit') || colLower.includes('inflow'));
    if (!isCreditMapping) {
      newMapping[col] = target;
    }
  });

  // Set new credit mapping
  if (newValue) {
    newMapping[newValue] = 'debit/credit';
  }

  columnMapping = newMapping;
  creditSelectValue = newValue;
}

function handleFieldChange(field: string, newValue: string) {
  // Create a new mapping object, excluding columns mapped to this target field
  let newMapping: Record<string, string> = {};

  Object.entries(columnMapping).forEach(([col, target]) => {
    if (target !== field) {
      newMapping[col] = target;
    }
  });

  // If the new column was already mapped to another field, update that field's select value
  if (newValue && newMapping[newValue] && newMapping[newValue] !== field) {
    const oldField = newMapping[newValue];
    delete newMapping[newValue];

    // Find if there's another column still mapped to the old field
    const remainingColumn = Object.entries(newMapping).find(([, target]) => target === oldField)?.[0];
    fieldSelectValues[oldField] = remainingColumn || '';
  }

  // Set new mapping
  if (newValue) {
    newMapping[newValue] = field;
  }

  fieldSelectValues[field] = newValue;
  columnMapping = newMapping;
}

// Check if mapping is valid (at minimum needs date and either amount OR debit/credit)
const isValidMapping = $derived.by(() => {
  const mappedFields = Object.values(columnMapping).filter((v) => v);
  const hasDate = mappedFields.includes('date');
  const hasAmount = mappedFields.includes('amount');
  const hasDebitCredit = mappedFields.includes('debit/credit');

  // Valid if we have date and either amount or debit/credit
  return hasDate && (hasAmount || hasDebitCredit);
});

// Compute preview mappings reactively
const previewMappings = $derived.by(() => {
  return targetFields
    .filter((f) => f.value !== '')
    .flatMap((f) => {
      if (f.value === 'debit/credit') {
        const cols = Object.entries(columnMapping)
          .filter(([c, target]) => target === f.value && rawColumns.includes(c))
          .map(([c]) => c);
        return cols.map((col) => {
          const colLower = col.toLowerCase();
          const isDebit = colLower.includes('debit') || colLower.includes('outflow');
          return {
            field: { value: 'debit/credit', label: isDebit ? 'Debit' : 'Credit' },
            column: col,
            isDebit
          };
        });
      }
      const col = Object.entries(columnMapping)
        .find(([c, target]) => target === f.value && rawColumns.includes(c))?.[0];
      return col ? [{ field: f, column: col, isDebit: false }] : [];
    });
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
        if (colLower.includes('debit') || colLower.includes('outflow')) {
          mapping.debit = rawCol;
        } else if (colLower.includes('credit') || colLower.includes('inflow')) {
          mapping.credit = rawCol;
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
    <p class="text-muted-foreground mt-1 text-sm">
      Match your CSV columns to the transaction fields
    </p>
  </div>

  <Card.Root>
    <Card.Header>
      <Card.Title>Column Mapping</Card.Title>
      <Card.Description>
        Select which field each column should map to. At minimum, Date and Amount are required. For
        files with separate debit/credit columns, both will be mapped automatically as Debit/Credit.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="space-y-4">
        {#each targetFields as field}
          {#if field.value !== ''}
            {@const selectedColumns = Object.entries(columnMapping)
              .filter(([, target]) => target === field.value)
              .map(([col]) => col)}
            <div class="flex items-center gap-4">
              <div class="w-48 text-sm font-medium">
                {field.label}
                {#if field.value === 'date' || (field.value === 'amount' && !targetFields.some((f) => f.value === 'debit/credit')) || field.value === 'debit/credit'}
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
                <div class="text-muted-foreground w-64 truncate text-sm">
                  {#if selectedColumns.length > 1}
                    Examples: {selectedColumns
                      .map((col) => filteredSampleData[0]?.[col] || '(empty)')
                      .join(' & ')}
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
        <div class="bg-destructive/10 text-destructive mt-4 rounded-md p-3 text-sm">
          Please map at least Date and Amount
        </div>
      {/if}
    </Card.Content>
  </Card.Root>

  {#if filteredSampleData.length > 0 && previewMappings.length > 0}
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
                {#each previewMappings as mapping}
                  <th class="p-2 text-left font-medium">
                    {mapping.field.label}
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each filteredSampleData.slice(0, 10) as row}
                <tr class="border-b">
                  {#each previewMappings as mapping}
                    <td class="p-2">
                      {#if mapping.column}
                        {#if mapping.field.value === 'debit/credit'}
                          {formatPreviewAmount(row[mapping.column], mapping.isDebit)}
                        {:else}
                          {row[mapping.column] || '-'}
                        {/if}
                      {:else}
                        -
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
    <Button variant="outline" onclick={onBack}>Back</Button>
    <Button onclick={handleNext} disabled={!isValidMapping}>Continue to Preview</Button>
  </div>
</div>
