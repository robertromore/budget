<script lang="ts">
import * as Card from '$lib/components/ui/card';
import * as Table from '$lib/components/ui/table';
import {Button} from '$lib/components/ui/button';
import {Badge} from '$lib/components/ui/badge';
import {ScrollArea} from '$lib/components/ui/scroll-area';
import {Checkbox} from '$lib/components/ui/checkbox';
import CircleAlert from '@lucide/svelte/icons/circle-alert';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import Clock from '@lucide/svelte/icons/clock';
import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
import type {ImportRow} from '$lib/types/import';
import {formatCurrency} from '$lib/utils/formatters';

interface Props {
  data: ImportRow[];
  fileName: string;
  onNext: () => void;
  onBack: () => void;
  selectedRows?: Set<number>;
  onSelectionChange?: (selected: Set<number>) => void;
}

let {data, fileName, onNext, onBack, selectedRows = $bindable(new Set()), onSelectionChange}: Props = $props();

// Track if we've already initialized to prevent infinite loop
let hasInitialized = false;

// Initialize selection with all valid and warning rows
$effect(() => {
  if (!hasInitialized && selectedRows.size === 0 && data.length > 0) {
    hasInitialized = true;
    const initialSelection = new Set<number>();
    data.forEach((row) => {
      if (row.validationStatus === 'valid' || row.validationStatus === 'warning') {
        initialSelection.add(row.rowIndex);
      }
    });
    selectedRows = initialSelection;
    onSelectionChange?.(selectedRows);
  }
});

const validRowCount = $derived(
  data.filter((row) => row.validationStatus === 'valid' || row.validationStatus === 'pending')
    .length
);
const invalidRowCount = $derived(
  data.filter((row) => row.validationStatus === 'invalid').length
);
const warningRowCount = $derived(
  data.filter((row) => row.validationStatus === 'warning').length
);
const selectedCount = $derived(selectedRows.size);

function getStatusIcon(status: string) {
  switch (status) {
    case 'valid':
      return CircleCheck;
    case 'invalid':
      return CircleAlert;
    case 'warning':
      return TriangleAlert;
    default:
      return Clock;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'valid':
      return 'text-green-600';
    case 'invalid':
      return 'text-destructive';
    case 'warning':
      return 'text-yellow-600';
    default:
      return 'text-muted-foreground';
  }
}

// Get columns from first valid row with data
const columns = $derived(() => {
  if (data.length === 0) return [];
  // Find first row with normalized data that has more than just date
  // (skip beginning/ending balance rows that only have date)
  const firstValidRow = data.find(row => {
    const keys = Object.keys(row.normalizedData || {});
    return keys.length > 1; // Must have more than just 'date'
  });
  const cols = Object.keys(firstValidRow?.normalizedData || {});
  console.log('Preview table columns:', cols, 'from row:', firstValidRow);
  return cols;
});

function toggleRowSelection(rowIndex: number) {
  const newSelection = new Set(selectedRows);
  if (newSelection.has(rowIndex)) {
    newSelection.delete(rowIndex);
  } else {
    newSelection.add(rowIndex);
  }
  selectedRows = newSelection;
  onSelectionChange?.(selectedRows);
}

function toggleAllRows() {
  const selectableRows = data.filter(row => row.validationStatus !== 'invalid');
  if (selectedRows.size === selectableRows.length) {
    // Deselect all
    selectedRows = new Set();
  } else {
    // Select all valid and warning rows
    selectedRows = new Set(selectableRows.map(row => row.rowIndex));
  }
  onSelectionChange?.(selectedRows);
}

const allSelectableRowsSelected = $derived(() => {
  const selectableRows = data.filter(row => row.validationStatus !== 'invalid');
  return selectableRows.length > 0 && selectedRows.size === selectableRows.length;
});

const someRowsSelected = $derived(() => {
  return selectedRows.size > 0 && !allSelectableRowsSelected();
});
</script>

<div class="space-y-6">
  <!-- Header -->
  <div>
    <h2 class="text-2xl font-bold">Preview Import Data</h2>
    <p class="text-muted-foreground mt-1">
      Review the data from <span class="font-medium">{fileName}</span> before importing
    </p>
  </div>

  <!-- Summary Stats -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <Card.Root>
      <Card.Content class="p-6">
        <div class="text-center">
          <div class="text-3xl font-bold">{data.length}</div>
          <div class="text-sm text-muted-foreground mt-1">Total Rows</div>
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Content class="p-6">
        <div class="text-center">
          <div class="text-3xl font-bold text-green-600">{validRowCount}</div>
          <div class="text-sm text-muted-foreground mt-1">Valid Rows</div>
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Content class="p-6">
        <div class="text-center">
          <div class="text-3xl font-bold text-yellow-600">{warningRowCount}</div>
          <div class="text-sm text-muted-foreground mt-1">Warnings</div>
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Content class="p-6">
        <div class="text-center">
          <div class="text-3xl font-bold text-blue-600">{selectedCount}</div>
          <div class="text-sm text-muted-foreground mt-1">Selected</div>
        </div>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Data Table -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Imported Data</Card.Title>
      <Card.Description>
        Showing {Math.min(data.length, 50)} of {data.length} rows
      </Card.Description>
    </Card.Header>
    <Card.Content class="p-0">
      <ScrollArea class="h-[400px]">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head class="w-12">
                <Checkbox
                  checked={allSelectableRowsSelected()}
                  indeterminate={someRowsSelected()}
                  onCheckedChange={toggleAllRows}
                  aria-label="Select all rows"
                />
              </Table.Head>
              <Table.Head class="w-12">#</Table.Head>
              <Table.Head class="w-20">Status</Table.Head>
              {#each columns() as column}
                <Table.Head class="capitalize">{column}</Table.Head>
              {/each}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each data.slice(0, 50) as row}
              {@const StatusIcon = getStatusIcon(row.validationStatus)}
              {@const isInvalid = row.validationStatus === 'invalid'}
              {@const isSelected = selectedRows.has(row.rowIndex)}
              {@const hasWarning = row.validationStatus === 'warning'}
              <Table.Row class={isSelected && !isInvalid ? 'bg-blue-50' : ''}>
                <Table.Cell>
                  <Checkbox
                    checked={isSelected}
                    disabled={isInvalid}
                    onCheckedChange={() => toggleRowSelection(row.rowIndex)}
                    aria-label="Select row {row.rowIndex + 1}"
                  />
                </Table.Cell>
                <Table.Cell class="text-muted-foreground">
                  {row.rowIndex + 1}
                </Table.Cell>
                <Table.Cell>
                  <div class="flex items-center gap-2">
                    <StatusIcon
                      class={`h-4 w-4 ${getStatusColor(row.validationStatus)}`}
                    />
                    {#if hasWarning && row.validationErrors}
                      <Badge variant="outline" class="text-xs">
                        {row.validationErrors.filter(e => e.severity === 'warning').length} warning(s)
                      </Badge>
                    {/if}
                  </div>
                </Table.Cell>
                {#each columns() as column}
                  <Table.Cell>
                    {#if row.validationStatus === 'invalid' && row.validationErrors?.some((e) => e.field === column)}
                      <div class="flex items-center gap-2">
                        <span class="text-destructive">
                          {row.normalizedData[column]}
                        </span>
                        <Badge variant="destructive" class="text-xs">Error</Badge>
                      </div>
                    {:else if column === 'amount'}
                      {@const amount = row.normalizedData[column]}
                      {@const isNegative = amount < 0}
                      <span class={isNegative ? 'text-destructive' : 'text-green-600'}>
                        {formatCurrency(amount)}
                      </span>
                    {:else}
                      {row.normalizedData[column] || '—'}
                    {/if}
                  </Table.Cell>
                {/each}
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </ScrollArea>
    </Card.Content>
  </Card.Root>

  <!-- Navigation -->
  <div class="flex items-center justify-between">
    <Button variant="outline" onclick={onBack}>
      Back
    </Button>
    <div class="flex items-center gap-3">
      {#if selectedCount === 0}
        <p class="text-sm text-muted-foreground">
          No rows selected
        </p>
      {:else}
        <p class="text-sm text-muted-foreground">
          {selectedCount} row{selectedCount !== 1 ? 's' : ''} will be imported
          {#if invalidRowCount > 0}
            · {invalidRowCount} invalid row{invalidRowCount !== 1 ? 's' : ''} skipped
          {/if}
        </p>
      {/if}
      <Button onclick={onNext} disabled={selectedCount === 0}>
        Import {selectedCount} Transaction{selectedCount !== 1 ? 's' : ''}
      </Button>
    </div>
  </div>
</div>
