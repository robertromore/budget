<script lang="ts">
import ColumnMapper from '$lib/components/import/column-mapper.svelte';
import EntityReview from '$lib/components/import/entity-review.svelte';
import FileUploadDropzone from '$lib/components/import/file-upload-dropzone.svelte';
import ImportDataTable from '$lib/components/import/import-data-table.svelte';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import * as Badge from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Checkbox } from '$lib/components/ui/checkbox';
import * as Empty from '$lib/components/ui/empty';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as Select from '$lib/components/ui/select';
import { Slider } from '$lib/components/ui/slider';
import type { Account } from '$lib/schema/accounts';
import type { ImportProfile } from '$lib/schema/import-profiles';
import { CategoriesState } from '$lib/states/entities/categories.svelte';
import { PayeesState } from '$lib/states/entities/payees.svelte';
import { trpc } from '$lib/trpc/client';
import type {
  ColumnMapping,
  ImportPreviewData,
  ImportResult,
  ParseResult,
  ScheduleMatch,
} from '$lib/types/import';
import {
  PAYMENT_PROCESSORS,
  countProcessorTransactions,
  detectPaymentProcessor,
} from '$lib/utils/import/payment-processor-filter';
import { arePayeesSimilar } from '$lib/utils/payee-matching';
import CalendarClock from '@lucide/svelte/icons/calendar-clock';
import Circle from '@lucide/svelte/icons/circle';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import Save from '@lucide/svelte/icons/save';
import Settings from '@lucide/svelte/icons/settings';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Wallet from '@lucide/svelte/icons/wallet';
import { useQueryClient } from '@tanstack/svelte-query';
import { toast } from 'svelte-sonner';

let { data } = $props();
const queryClient = useQueryClient();

const _data = (() => { return data })();

// Initialize entity states for the import page
PayeesState.set(_data.payees);
CategoriesState.set(_data.categories);
const accounts = $derived(_data.accounts);

// Filter out HSA accounts since they can't be imported into
const importableAccounts = $derived(accounts.filter((a: Account) => a.accountType !== 'hsa'));
const hasImportableAccounts = $derived(importableAccounts.length > 0);

type Step =
  | 'upload'
  | 'map-columns'
  | 'preview'
  | 'review-schedules'
  | 'review-entities'
  | 'complete';

let currentStep = $state<Step>('upload');
let selectedFile = $state<File | null>(null);
let fileData = $state<{ data: string; name: string; type: string } | null>(null);
let parseResults = $state<ParseResult | null>(null);
let rawCSVData = $state<Record<string, any>[] | null>(null);
let columnMapping = $state<ColumnMapping | null>(null);
let entityPreview = $state<ImportPreviewData | null>(null);
let importResult = $state<ImportResult | null>(null);
let isProcessing = $state(false);
let error = $state<string | null>(null);
let selectedRows = $state<Set<number>>(new Set());
let scheduleMatches = $state<ScheduleMatch[]>([]);
let scheduleMatchThreshold = $state(0.75); // Default to 75% minimum match (array for Slider component)

// Import profile state
let matchedProfile = $state<ImportProfile | null>(null);
let detectedMapping = $state<ColumnMapping | null>(null);
let csvHeaders = $state<string[]>([]);
let saveProfileDialog = $state({
  open: false,
  profileName: '',
  saveAsAccountDefault: false,
  saveFilenamePattern: false,
  filenamePattern: '',
  isSaving: false,
});

// Filter schedule matches based on threshold
const filteredScheduleMatches = $derived(
  scheduleMatches.filter((match) => match.score >= scheduleMatchThreshold)
);

// Group schedule matches by schedule ID
const groupedScheduleMatches = $derived.by(() => {
  const grouped = new Map<number, { scheduleName: string; matches: ScheduleMatch[] }>();

  filteredScheduleMatches.forEach((match) => {
    if (!grouped.has(match.scheduleId)) {
      grouped.set(match.scheduleId, {
        scheduleName: match.scheduleName,
        matches: [],
      });
    }
    grouped.get(match.scheduleId)!.matches.push(match);
  });

  // Convert to array and sort by average match score (highest first)
  return Array.from(grouped.entries())
    .map(([scheduleId, data]) => {
      const sortedMatches = data.matches.sort(
        (a, b) =>
          new Date(a.transactionData.date).getTime() - new Date(b.transactionData.date).getTime()
      );
      const avgScore = sortedMatches.reduce((sum, m) => sum + m.score, 0) / sortedMatches.length;
      return {
        scheduleId,
        scheduleName: data.scheduleName,
        matches: sortedMatches,
        avgScore,
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore); // Sort by average score descending
});

// Entity overrides - track user-selected payee/category/description for each row
let entityOverrides = $state<
  Record<
    number,
    {
      payeeId?: number | null;
      payeeName?: string | null;
      categoryId?: number | null;
      categoryName?: string | null;
      description?: string | null;
    }
  >
>({});

// Import options
let createMissingPayees = $state(true);
let createMissingCategories = $state(true);
let allowPartialImport = $state(true);
let reverseAmountSigns = $state(false);

// Create reactive preview data that applies amount reversal and entity overrides
const previewData = $derived.by(() => {
  if (!parseResults) return null;

  // Apply transformations to the rows
  return {
    ...parseResults,
    rows: parseResults.rows.map((row) => {
      const override = entityOverrides[row.rowIndex];

      return {
        ...row,
        normalizedData: {
          ...row.normalizedData,
          // Apply amount reversal if enabled
          amount:
            reverseAmountSigns && row.normalizedData['amount']
              ? -row.normalizedData['amount']
              : row.normalizedData['amount'],
          // Apply entity overrides if set
          payee:
            override?.payeeName !== undefined ? override.payeeName : row.normalizedData['payee'],
          category:
            override?.categoryName !== undefined
              ? override.categoryName
              : row.normalizedData['category'],
          description:
            override?.description !== undefined
              ? override.description
              : row.normalizedData['description'] || row.normalizedData['notes'],
        },
      };
    }),
  };
});

// Derive temporary entities (created during preview but not yet in database)
const temporaryCategories = $derived.by(() => {
  const tempCats = new Set<string>();

  // Use previewData (which includes overrides) to determine actual temporary categories
  if (previewData) {
    const categoryState = CategoriesState.get();
    const existingCategoryNames = categoryState
      ? new Set(Array.from(categoryState.categories.values()).map((c) => c.name?.toLowerCase()))
      : new Set();

    previewData.rows.forEach((row) => {
      const categoryName = row.normalizedData['category'];
      if (categoryName && typeof categoryName === 'string') {
        // Only add if it's not an existing category
        if (!existingCategoryNames.has(categoryName.toLowerCase())) {
          tempCats.add(categoryName);
        }
      }
    });
  }

  return Array.from(tempCats);
});

const temporaryPayees = $derived.by(() => {
  const tempPayees = new Set<string>();

  // Use previewData (which includes overrides) to determine actual temporary payees
  if (previewData) {
    const payeeState = PayeesState.get();
    const existingPayeeNames = payeeState
      ? new Set(Array.from(payeeState.payees.values()).map((p) => p.name?.toLowerCase()))
      : new Set();

    previewData.rows.forEach((row) => {
      const payeeName = row.normalizedData['payee'];
      if (payeeName && typeof payeeName === 'string') {
        // Only add if it's not an existing payee
        if (!existingPayeeNames.has(payeeName.toLowerCase())) {
          tempPayees.add(payeeName);
        }
      }
    });
  }

  return Array.from(tempPayees);
});

// Handler for payee updates from the table
function handlePayeeUpdate(rowIndex: number, payeeId: number | null, payeeName: string | null) {
  entityOverrides = {
    ...entityOverrides,
    [rowIndex]: {
      ...entityOverrides[rowIndex],
      payeeId,
      payeeName,
    },
  };
}

// State for bulk payee update confirmation dialog
let bulkPayeeUpdateDialog = $state({
  open: false,
  rowIndex: 0,
  payeeId: null as number | null,
  payeeName: null as string | null,
  originalPayeeName: '',
  previousPayeeId: null as number | null,
  previousPayeeName: null as string | null,
  matchCount: 0,
  matches: [] as Array<{ item: any }>,
});

// Apply payee update to all similar transactions (fuzzy matched by original payee)
function handlePayeeUpdateWithSimilar(
  rowIndex: number,
  payeeId: number | null,
  payeeName: string | null
) {
  if (!parseResults) return;

  // Capture the previous value before updating (for potential revert)
  const previousOverride = entityOverrides[rowIndex];
  const previousPayeeId = previousOverride?.payeeId !== undefined ? previousOverride.payeeId : null;
  const previousPayeeName =
    previousOverride?.payeeName !== undefined ? previousOverride.payeeName : null;

  // First update the selected row
  handlePayeeUpdate(rowIndex, payeeId, payeeName);

  // Get the original payee name for the selected row
  const selectedRow = parseResults.rows.find((r) => r.rowIndex === rowIndex);
  if (!selectedRow) return;

  const originalPayeeName = selectedRow.normalizedData['payee'];
  if (!originalPayeeName || typeof originalPayeeName !== 'string') return;

  // Use similarity matching to catch payees with different amounts in the name
  // Example: "Amazon - $25.99" should match "Amazon - $12.50"
  const matchesToUpdate = parseResults.rows
    .filter((row) => {
      if (row.rowIndex === rowIndex) return false;
      const rowPayee = row.normalizedData['payee'];
      if (!rowPayee || typeof rowPayee !== 'string') return false;
      return arePayeesSimilar(rowPayee, originalPayeeName);
    })
    .map((item) => ({ item }));

  // If there are similar transactions, ask user if they want to update them
  if (matchesToUpdate.length > 0) {
    bulkPayeeUpdateDialog = {
      open: true,
      rowIndex,
      payeeId,
      payeeName,
      originalPayeeName,
      previousPayeeId,
      previousPayeeName,
      matchCount: matchesToUpdate.length,
      matches: matchesToUpdate,
    };
  }
}

// Confirm and apply bulk payee update
function confirmBulkPayeeUpdate() {
  if (!bulkPayeeUpdateDialog.matches) return;

  let updatedCount = 0;
  bulkPayeeUpdateDialog.matches.forEach((match) => {
    handlePayeeUpdate(
      match.item.rowIndex,
      bulkPayeeUpdateDialog.payeeId,
      bulkPayeeUpdateDialog.payeeName
    );
    updatedCount++;
  });

  // Notify user of bulk update
  if (updatedCount > 0) {
    const payeeDisplay = bulkPayeeUpdateDialog.payeeName || 'None';
    toast.success(
      `Updated payee to "${payeeDisplay}" for ${updatedCount + 1} similar transaction${updatedCount + 1 > 1 ? 's' : ''}`
    );
  }

  // Close dialog
  bulkPayeeUpdateDialog.open = false;
}

// Cancel bulk payee update (keep single row update)
function cancelBulkPayeeUpdate() {
  bulkPayeeUpdateDialog.open = false;
}

// Revert the payee update entirely
function revertPayeeUpdate() {
  const { rowIndex, previousPayeeId, previousPayeeName } = bulkPayeeUpdateDialog;

  // Revert the single row to its previous value
  handlePayeeUpdate(rowIndex, previousPayeeId, previousPayeeName);

  bulkPayeeUpdateDialog.open = false;
}

// State for payment processor filter dialog
let processorFilterDialog = $state({
  open: false,
  selectedProcessors: new Set<string>(),
  affectedCount: 0,
});

// Analyze payee names for payment processors
const processorAnalysis = $derived.by(() => {
  if (!parseResults) return { total: 0, byProcessor: new Map<string, number>() };

  const payeeNames = parseResults.rows
    .map((row) => row.normalizedData['payee'])
    .filter((name): name is string => typeof name === 'string');

  return countProcessorTransactions(payeeNames);
});

// Open payment processor filter dialog
function openProcessorFilterDialog() {
  // Pre-select all processors that have transactions
  const preselected = new Set<string>();
  for (const [processor, count] of processorAnalysis.byProcessor) {
    if (count > 0) {
      preselected.add(processor);
    }
  }

  processorFilterDialog = {
    open: true,
    selectedProcessors: preselected,
    affectedCount: processorAnalysis.total,
  };
}

// Toggle processor selection
function toggleProcessor(processorName: string) {
  const newSelection = new Set(processorFilterDialog.selectedProcessors);
  if (newSelection.has(processorName)) {
    newSelection.delete(processorName);
  } else {
    newSelection.add(processorName);
  }

  // Calculate affected count
  let count = 0;
  for (const [processor, processorCount] of processorAnalysis.byProcessor) {
    if (newSelection.has(processor)) {
      count += processorCount;
    }
  }

  processorFilterDialog = {
    ...processorFilterDialog,
    selectedProcessors: newSelection,
    affectedCount: count,
  };
}

// Apply payment processor filtering to all matching transactions
function applyProcessorFilter() {
  if (!parseResults || processorFilterDialog.selectedProcessors.size === 0) {
    processorFilterDialog.open = false;
    return;
  }

  let updatedCount = 0;

  // Iterate through all rows and filter payee names
  parseResults.rows.forEach((row) => {
    const payeeName = row.normalizedData['payee'];
    if (!payeeName || typeof payeeName !== 'string') return;

    const detection = detectPaymentProcessor(payeeName);
    if (detection && processorFilterDialog.selectedProcessors.has(detection.processor)) {
      // Filter out the payment processor
      const filteredName = detection.merchantName;
      handlePayeeUpdate(row.rowIndex, null, filteredName);
      updatedCount++;
    }
  });

  // Notify user
  if (updatedCount > 0) {
    toast.success(
      `Filtered payment processors from ${updatedCount} transaction${updatedCount !== 1 ? 's' : ''}`
    );
  }

  processorFilterDialog.open = false;
}

// Cancel processor filter
function cancelProcessorFilter() {
  processorFilterDialog.open = false;
}

// Handler for schedule match toggle
function handleScheduleMatchToggle(rowIndex: number, selected: boolean) {
  scheduleMatches = scheduleMatches.map((match) =>
    match.rowIndex === rowIndex ? { ...match, selected } : match
  );
}

// Select all schedule matches
function selectAllScheduleMatches() {
  scheduleMatches = scheduleMatches.map((match) => ({ ...match, selected: true }));
}

// Deselect all schedule matches
function deselectAllScheduleMatches() {
  scheduleMatches = scheduleMatches.map((match) => ({ ...match, selected: false }));
}

// Get confidence badge color
function getConfidenceBadgeVariant(
  confidence: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (confidence) {
    case 'exact':
      return 'default';
    case 'high':
      return 'secondary';
    default:
      return 'outline';
  }
}

function getScoreBorderColor(score: number): string {
  if (score >= 0.9) return 'border-l-4 border-l-green-500';
  if (score >= 0.8) return 'border-l-4 border-l-green-400';
  if (score >= 0.75) return 'border-l-4 border-l-yellow-500';
  if (score >= 0.65) return 'border-l-4 border-l-orange-500';
  return 'border-l-4 border-l-red-500';
}

function getScoreAllBorderColor(score: number): string {
  if (score >= 0.9) return 'border-green-500 border-l-4';
  if (score >= 0.8) return 'border-green-400 border-l-4';
  if (score >= 0.75) return 'border-yellow-500 border-l-4';
  if (score >= 0.65) return 'border-orange-500 border-l-4';
  return 'border-red-500 border-l-4';
}

// Handler for category updates from the table
function handleCategoryUpdate(
  rowIndex: number,
  categoryId: number | null,
  categoryName: string | null
) {
  // Create a new object to trigger reactivity
  entityOverrides = {
    ...entityOverrides,
    [rowIndex]: {
      ...entityOverrides[rowIndex],
      categoryId,
      categoryName,
    },
  };
}

// Handler for description updates from the table
function handleDescriptionUpdate(rowIndex: number, description: string | null) {
  // Create a new object to trigger reactivity
  entityOverrides = {
    ...entityOverrides,
    [rowIndex]: {
      ...entityOverrides[rowIndex],
      description,
    },
  };
}

// State for bulk update confirmation dialog
let bulkUpdateDialog = $state({
  open: false,
  rowIndex: 0,
  categoryId: null as number | null,
  categoryName: null as string | null,
  previousCategoryName: null as string | null,
  payeeName: '',
  matchCountByPayee: 0,
  matchCountByCategory: 0,
  matchesByPayee: [] as Array<{ item: any }>,
  matchesByCategory: [] as Array<{ item: any }>,
});

// Apply category update to all similar transactions (fuzzy matched by payee)
function handleCategoryUpdateWithSimilar(
  rowIndex: number,
  categoryId: number | null,
  categoryName: string | null
) {
  if (!parseResults) return;

  // Check if we're clearing the category (setting to null/empty)
  const isClearingCategory = !categoryName || categoryName.trim() === '';

  // Get the selected row info BEFORE updating it
  const selectedRow = parseResults.rows.find((r) => r.rowIndex === rowIndex);
  if (!selectedRow) return;

  const payeeName = selectedRow.normalizedData['payee'];
  if (!payeeName || typeof payeeName !== 'string') {
    // No payee, just update this one transaction
    handleCategoryUpdate(rowIndex, categoryId, categoryName);
    return;
  }

  // Get the previous category for this row
  const previousCategoryName =
    entityOverrides[rowIndex]?.categoryName || selectedRow.normalizedData['category'] || null;

  // Check if previous category was real (not null/empty)
  const hasRealPreviousCategory = previousCategoryName && previousCategoryName.trim() !== '';

  // If clearing category and there's no real previous category, just update without asking
  if (isClearingCategory && !hasRealPreviousCategory) {
    handleCategoryUpdate(rowIndex, categoryId, categoryName);
    return;
  }

  // Find matches by payee (for "update all transactions with same payee" option)
  // Use similarity matching to catch payees with different amounts in the name
  const matchesByPayee = parseResults.rows
    .filter((row) => {
      if (row.rowIndex === rowIndex) return false;
      const rowPayee = row.normalizedData['payee'];
      if (!rowPayee || typeof rowPayee !== 'string') return false;
      return arePayeesSimilar(rowPayee, payeeName);
    })
    .map((item) => ({ item }));

  // Find matches by previous category (for "rename category" option)
  // Only allow this if the previous category was a real category (not uncategorized/null/empty)
  let matchesByCategory: Array<{ item: any }> = [];

  if (hasRealPreviousCategory) {
    matchesByCategory = parseResults.rows
      .map((row, idx) => ({ item: row, index: idx }))
      .filter(({ item, index }) => {
        if (item.rowIndex === rowIndex) return false;
        const rowCategory =
          entityOverrides[item.rowIndex]?.categoryName || item.normalizedData['category'];
        return rowCategory === previousCategoryName;
      });
  }

  // If there are potential bulk updates, show dialog (don't update yet!)
  if (matchesByPayee.length > 0 || matchesByCategory.length > 0) {
    bulkUpdateDialog = {
      open: true,
      rowIndex,
      categoryId,
      categoryName,
      previousCategoryName,
      payeeName,
      matchCountByPayee: matchesByPayee.length,
      matchCountByCategory: matchesByCategory.length,
      matchesByPayee,
      matchesByCategory,
    };
  } else {
    // No matches, just update this one transaction
    handleCategoryUpdate(rowIndex, categoryId, categoryName);
  }
}

// Update just the selected row
function confirmBulkUpdateJustOne() {
  // Only update the original row
  handleCategoryUpdate(
    bulkUpdateDialog.rowIndex,
    bulkUpdateDialog.categoryId,
    bulkUpdateDialog.categoryName
  );
  bulkUpdateDialog.open = false;
}

// Apply bulk update by payee only
function confirmBulkUpdateByPayee() {
  if (!bulkUpdateDialog.matchesByPayee) return;

  // Update the original row first
  handleCategoryUpdate(
    bulkUpdateDialog.rowIndex,
    bulkUpdateDialog.categoryId,
    bulkUpdateDialog.categoryName
  );

  let updatedCount = 0;
  bulkUpdateDialog.matchesByPayee.forEach((match) => {
    handleCategoryUpdate(
      match.item.rowIndex,
      bulkUpdateDialog.categoryId,
      bulkUpdateDialog.categoryName
    );
    updatedCount++;
  });

  // Notify user of bulk update
  if (updatedCount > 0) {
    if (bulkUpdateDialog.categoryName) {
      toast.success(
        `Updated category to "${bulkUpdateDialog.categoryName}" for ${updatedCount + 1} transaction${updatedCount + 1 > 1 ? 's' : ''} with payee "${bulkUpdateDialog.payeeName}"`
      );
    } else {
      toast.success(
        `Removed category from ${updatedCount + 1} transaction${updatedCount + 1 > 1 ? 's' : ''} with payee "${bulkUpdateDialog.payeeName}"`
      );
    }
  }

  bulkUpdateDialog.open = false;
}

// Apply bulk update by previous category (rename category)
function confirmBulkUpdateByCategory() {
  if (!bulkUpdateDialog.matchesByCategory) return;

  // Update the original row first
  handleCategoryUpdate(
    bulkUpdateDialog.rowIndex,
    bulkUpdateDialog.categoryId,
    bulkUpdateDialog.categoryName
  );

  let updatedCount = 0;
  bulkUpdateDialog.matchesByCategory.forEach((match) => {
    handleCategoryUpdate(
      match.item.rowIndex,
      bulkUpdateDialog.categoryId,
      bulkUpdateDialog.categoryName
    );
    updatedCount++;
  });

  // Notify user of bulk update
  if (updatedCount > 0) {
    if (bulkUpdateDialog.categoryName) {
      toast.success(
        `Renamed category "${bulkUpdateDialog.previousCategoryName}" to "${bulkUpdateDialog.categoryName}" for ${updatedCount + 1} transaction${updatedCount + 1 > 1 ? 's' : ''}`
      );
    } else {
      toast.success(
        `Removed category "${bulkUpdateDialog.previousCategoryName}" from ${updatedCount + 1} transaction${updatedCount + 1 > 1 ? 's' : ''}`
      );
    }
  }

  bulkUpdateDialog.open = false;
}

// Apply bulk update to both payee matches and category matches
function confirmBulkUpdateBoth() {
  // Update the original row first
  handleCategoryUpdate(
    bulkUpdateDialog.rowIndex,
    bulkUpdateDialog.categoryId,
    bulkUpdateDialog.categoryName
  );

  const allMatches = [
    ...(bulkUpdateDialog.matchesByPayee || []),
    ...(bulkUpdateDialog.matchesByCategory || []),
  ];

  // Remove duplicates (transactions that match both criteria)
  const uniqueMatches = allMatches.filter(
    (match, index, self) => index === self.findIndex((m) => m.item.rowIndex === match.item.rowIndex)
  );

  let updatedCount = 0;
  uniqueMatches.forEach((match) => {
    handleCategoryUpdate(
      match.item.rowIndex,
      bulkUpdateDialog.categoryId,
      bulkUpdateDialog.categoryName
    );
    updatedCount++;
  });

  // Notify user of bulk update
  if (updatedCount > 0) {
    if (bulkUpdateDialog.categoryName) {
      toast.success(
        `Updated category to "${bulkUpdateDialog.categoryName}" for ${updatedCount + 1} transaction${updatedCount + 1 > 1 ? 's' : ''}`
      );
    } else {
      toast.success(
        `Removed category from ${updatedCount + 1} transaction${updatedCount + 1 > 1 ? 's' : ''}`
      );
    }
  }

  bulkUpdateDialog.open = false;
}

// Cancel bulk update - don't apply any changes
function cancelBulkUpdate() {
  bulkUpdateDialog.open = false;
}

// Apply smart categorization and payee normalization using the backend matcher
async function applySmartCategorization() {
  if (!parseResults) return;

  try {
    const response = await fetch('/api/import/infer-categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rows: parseResults.rows }),
    });

    if (response.ok) {
      const result = await response.json();
      // Update parseResults with normalized payees and inferred categories
      parseResults.rows = result.rows;
    }
  } catch (err) {
    console.error('Failed to apply smart data enrichment:', err);
    // Continue anyway - this is non-critical
  }
}

// Pre-select account from query parameter if provided
let selectedAccountId = $state<string>(_data.preselectedAccountId || '');
const selectedAccount = $derived(() =>
  importableAccounts.find((a: Account) => a.id.toString() === selectedAccountId)
);

// Note: reverseAmountSigns should generally NOT be used for QFX/OFX files from credit cards
// QFX files already have the correct signs: charges are negative, payments are positive
// Only enable this manually for CSV files where signs are inverted from what you want

async function handleFileSelected(file: File) {
  selectedFile = file;
  isProcessing = true;
  error = null;
  matchedProfile = null;
  detectedMapping = null;
  csvHeaders = [];

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

    // Add accountId and reverseAmountSigns as query parameters for duplicate checking
    const url = new URL('/api/import/upload', window.location.origin);
    console.log('[Client] File upload - selectedAccountId:', selectedAccountId);
    console.log(
      '[Client] Selected account:',
      importableAccounts.find((a: Account) => a.id.toString() === selectedAccountId)
    );
    if (selectedAccountId) {
      url.searchParams.set('accountId', selectedAccountId);
      console.log('[Client] Upload URL:', url.toString());
    }
    // Pass reverseAmountSigns so duplicate detection can compare final amounts
    url.searchParams.set('reverseAmountSigns', reverseAmountSigns.toString());

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (response.ok) {
      parseResults = result;
      rawCSVData = result.rows.map((row: any) => row.rawData);

      // Store schedule matches if detected
      if (result.scheduleMatches) {
        scheduleMatches = result.scheduleMatches;
      }

      // Apply smart categorization to rows without explicit categories
      await applySmartCategorization();

      // Extract CSV headers for profile matching (only for CSV files)
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension === 'csv' && rawCSVData && rawCSVData.length > 0 && rawCSVData[0]) {
        csvHeaders = Object.keys(rawCSVData[0]);

        // Try to find a matching import profile
        try {
          const profile = await trpc().importProfileRoutes.findMatch.query({
            headers: csvHeaders,
            filename: file.name,
            accountId: selectedAccountId ? parseInt(selectedAccountId) : undefined,
          });

          if (profile) {
            matchedProfile = profile;
            detectedMapping = profile.mapping;
            toast.success(`Matched import profile: "${profile.name}"`, {
              description: 'Column mapping has been auto-filled from your saved profile.',
              icon: Sparkles,
            });

            // Record usage of this profile
            trpc().importProfileRoutes.recordUsage.mutate({ id: profile.id });
          }
        } catch (profileErr) {
          // Profile matching is non-critical, continue without it
          console.warn('Failed to check for matching import profile:', profileErr);
        }
      }

      // Skip column mapping for QIF, OFX files (they have fixed formats)
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
  matchedProfile = null;
  detectedMapping = null;
  csvHeaders = [];
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

    if (response.ok) {
      parseResults = result;
      // Update raw data with remapped results
      rawCSVData = result.rows.map((row: any) => row.rawData);

      // Store schedule matches if detected
      if (result.scheduleMatches) {
        scheduleMatches = result.scheduleMatches;
      }

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

function proceedToScheduleReview() {
  if (!parseResults) return;

  // If there are schedule matches, go to schedule review
  if (scheduleMatches.length > 0) {
    currentStep = 'review-schedules';
  } else {
    // Otherwise skip directly to entity review
    proceedToEntityReview();
  }
}

async function proceedToEntityReview() {
  if (!parseResults || !selectedAccountId || !previewData) return;

  isProcessing = true;
  error = null;

  try {
    // Filter rows to only include selected ones (with entity overrides applied)
    const selectedRowsData = previewData.rows.filter((row) => selectedRows.has(row.rowIndex));

    const response = await fetch('/api/import/preview-entities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rows: selectedRowsData }),
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
  if (!parseResults || !selectedAccountId || !entityPreview || !previewData) return;

  isProcessing = true;
  error = null;

  try {
    // Filter rows to only include selected ones (with entity overrides applied, but NOT amount reversal)
    // Amount reversal will be applied by the backend based on the reverseAmountSigns flag
    const selectedRowsData = parseResults.rows
      .filter((row) => selectedRows.has(row.rowIndex))
      .map((row) => {
        const override = entityOverrides[row.rowIndex];
        return {
          ...row,
          normalizedData: {
            ...row.normalizedData,
            // Apply entity overrides (but NOT amount reversal - backend will handle that)
            payee:
              override?.payeeName !== undefined ? override.payeeName : row.normalizedData['payee'],
            category:
              override?.categoryName !== undefined
                ? override.categoryName
                : row.normalizedData['category'],
            description:
              override?.description !== undefined
                ? override.description
                : row.normalizedData['description'] || row.normalizedData['notes'],
          },
        };
      });

    // Get selected entity names (include both new and existing)
    const selectedPayeeNames = entityPreview.payees.filter((p) => p.selected).map((p) => p.name);

    const selectedCategoryNames = entityPreview.categories
      .filter((c) => c.selected)
      .map((c) => c.name);

    const importData = {
      accountId: parseInt(selectedAccountId),
      data: selectedRowsData,
      selectedEntities: {
        payees: selectedPayeeNames,
        categories: selectedCategoryNames,
      },
      scheduleMatches: scheduleMatches.filter((m) => m.selected),
      options: {
        allowPartialImport,
        createMissingEntities: createMissingPayees || createMissingCategories,
        createMissingPayees,
        createMissingCategories,
        reverseAmountSigns,
        fileName: previewData?.fileName,
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

      // Invalidate all relevant queries to ensure the UI updates
      // Use refetchType: 'all' to force refetch of all matching queries
      const accountIdNum = selectedAccountId ? parseInt(selectedAccountId) : undefined;
      await queryClient.invalidateQueries({
        queryKey: ['accounts'],
        refetchType: 'all',
      });
      // Invalidate account-specific transaction queries if we have an account
      if (accountIdNum) {
        await queryClient.invalidateQueries({
          queryKey: ['transactions', 'all', accountIdNum],
          refetchType: 'all',
        });
        await queryClient.invalidateQueries({
          queryKey: ['transactions', 'account', accountIdNum],
          refetchType: 'all',
        });
        await queryClient.invalidateQueries({
          queryKey: ['transactions', 'summary', accountIdNum],
          refetchType: 'all',
        });
      }
      // Also invalidate general transaction queries
      await queryClient.invalidateQueries({
        queryKey: ['transactions'],
        refetchType: 'all',
      });
      await queryClient.invalidateQueries({
        queryKey: ['payees'],
        refetchType: 'all',
      });
      await queryClient.invalidateQueries({
        queryKey: ['categories'],
        refetchType: 'all',
      });
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
  scheduleMatches = [];
  error = null;
  matchedProfile = null;
  detectedMapping = null;
  csvHeaders = [];
  columnMapping = null;
}

// Save profile dialog helpers
function openSaveProfileDialog() {
  // Generate a default name based on filename
  const defaultName = selectedFile
    ? selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
    : 'New Import Profile';

  // Generate a default filename pattern
  const defaultPattern = selectedFile
    ? selectedFile.name.replace(/\d{4}[-_]?\d{2}[-_]?\d{2}/g, '*').replace(/\d+/g, '*')
    : '';

  saveProfileDialog = {
    open: true,
    profileName: defaultName,
    saveAsAccountDefault: false,
    saveFilenamePattern: false,
    filenamePattern: defaultPattern,
    isSaving: false,
  };
}

async function saveImportProfile() {
  if (!columnMapping || !saveProfileDialog.profileName.trim()) return;

  saveProfileDialog.isSaving = true;

  try {
    // Generate column signature from headers
    let columnSignature: string | null = null;
    if (csvHeaders.length > 0) {
      const result = await trpc().importProfileRoutes.generateSignature.query({
        headers: csvHeaders,
      });
      columnSignature = result.signature;
    }

    await trpc().importProfileRoutes.create.mutate({
      name: saveProfileDialog.profileName.trim(),
      columnSignature,
      filenamePattern: saveProfileDialog.saveFilenamePattern
        ? saveProfileDialog.filenamePattern.trim() || null
        : null,
      accountId: saveProfileDialog.saveAsAccountDefault && selectedAccountId
        ? parseInt(selectedAccountId)
        : null,
      isAccountDefault: saveProfileDialog.saveAsAccountDefault,
      mapping: columnMapping,
    });

    toast.success('Import profile saved', {
      description: `"${saveProfileDialog.profileName}" will be used for future imports with matching columns.`,
    });

    saveProfileDialog.open = false;
  } catch (err) {
    console.error('Failed to save import profile:', err);
    toast.error('Failed to save import profile');
  } finally {
    saveProfileDialog.isSaving = false;
  }
}

function closeSaveProfileDialog() {
  saveProfileDialog.open = false;
}

const steps = [
  { id: 'upload', label: 'Upload File' },
  { id: 'map-columns', label: 'Map Columns' },
  { id: 'preview', label: 'Preview Data' },
  { id: 'review-schedules', label: 'Review Schedules' },
  { id: 'review-entities', label: 'Review Entities' },
  { id: 'complete', label: 'Complete' },
];

const currentStepIndex = $derived(steps.findIndex((s) => s.id === currentStep));

// Scroll to top when step changes
$effect(() => {
  currentStep;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
</script>

<svelte:head>
  <title>Import Transactions - Budget App</title>
  <meta
    name="description"
    content="Import financial data from CSV, Excel, QIF, OFX, IIF, or QBO files" />
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
            You need to create at least one account before you can import transactions. HSA accounts
            cannot be imported into directly.
          </Empty.EmptyDescription>
        </Empty.EmptyHeader>
        <Empty.EmptyContent>
          <Button href="/accounts/new">Create an Account</Button>
        </Empty.EmptyContent>
      </Empty.Empty>
    {:else}
      <!-- Progress Steps -->
      <div class="mb-8">
        <div class="flex items-center justify-center">
          {#each steps as step, index}
            {@const isComplete = index < currentStepIndex}
            {@const isCurrent = index === currentStepIndex}
            <div class="relative">
              <div
                class="flex h-12 w-12 items-center justify-center rounded-full text-sm font-medium transition-all {isCurrent
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : isComplete
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'}">
                {#if isComplete}
                  <CircleCheck class="h-6 w-6" />
                {:else if isCurrent}
                  <Circle class="h-6 w-6 fill-current" />
                {:else}
                  <span class="text-sm font-semibold">{index + 1}</span>
                {/if}
              </div>
              <div
                class="absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap text-sm font-medium transition-colors {isCurrent
                  ? 'text-primary'
                  : isComplete
                    ? 'text-green-600'
                    : 'text-muted-foreground'}">
                {step.label}
              </div>
            </div>
            {#if index < steps.length - 1}
              <div
                class="mx-4 h-1 w-32 rounded-full transition-all {isComplete
                  ? 'bg-green-500'
                  : 'bg-muted'}">
              </div>
            {/if}
          {/each}
        </div>
      </div>

      <!-- Error Message -->
      {#if error}
        <Card.Root class="border-destructive mb-6">
          <Card.Content class="pt-6">
            <div class="flex items-start gap-3">
              <div class="text-destructive">
                <Circle class="h-5 w-5 fill-current" />
              </div>
              <div class="flex-1">
                <p class="text-destructive font-medium">Error</p>
                <p class="text-muted-foreground mt-1 text-sm">{error}</p>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {/if}

      <!-- Step Content -->
      {#if currentStep === 'upload'}
        <div class="space-y-6">
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-3xl font-bold">Import Financial Data</h1>
              <p class="text-muted-foreground mt-2">
                Upload your financial data from CSV, Excel (.xlsx, .xls), QIF, OFX/QFX, IIF, or QBO
                files
              </p>
            </div>
            <Button variant="outline" size="sm" href="/settings/import-profiles">
              <Settings class="mr-2 h-4 w-4" />
              Manage Profiles
            </Button>
          </div>

          <!-- Account Selection -->
          <Card.Root>
            <Card.Header>
              <Card.Title>Select Account</Card.Title>
              <Card.Description>Choose the account to import transactions into</Card.Description>
            </Card.Header>
            <Card.Content>
              <Select.Root type="single" bind:value={selectedAccountId}>
                <Select.Trigger class="w-full">
                  <span class="truncate">
                    {#if selectedAccountId}
                      {importableAccounts.find(
                        (a: Account) => a.id.toString() === selectedAccountId
                      )?.name || 'Choose an account...'}
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
            acceptedFormats={[
              '.csv',
              '.txt',
              '.xlsx',
              '.xls',
              '.qif',
              '.ofx',
              '.qfx',
              '.iif',
              '.qbo',
            ]}
            maxFileSize={10 * 1024 * 1024}
            onFileSelected={handleFileSelected}
            onFileRejected={handleFileRejected}
            showPreview={true} />

          {#if isProcessing}
            <div class="py-8 text-center">
              <div class="border-primary inline-block h-8 w-8 animate-spin rounded-full border-b-2">
              </div>
              <p class="text-muted-foreground mt-4 text-sm">Processing file...</p>
            </div>
          {/if}
        </div>
      {:else if currentStep === 'map-columns' && parseResults && rawCSVData}
        {#if matchedProfile}
          <div class="bg-primary/10 border-primary/20 mb-4 flex items-center gap-2 rounded-lg border p-3">
            <Sparkles class="text-primary h-4 w-4" />
            <span class="text-sm">
              Using saved profile: <strong>{matchedProfile.name}</strong>
            </span>
          </div>
        {/if}
        <ColumnMapper
          rawColumns={Object.keys(rawCSVData[0] || {})}
          initialMapping={detectedMapping ?? undefined}
          sampleData={rawCSVData}
          onNext={handleColumnMappingComplete}
          onBack={goBackToUpload} />
      {:else if currentStep === 'preview' && parseResults}
        <div class="space-y-6">
          <!-- Import Options - Horizontal Layout -->
          <Card.Root>
            <Card.Header class="pb-3">
              <Card.Title class="text-base">Import Options</Card.Title>
            </Card.Header>
            <Card.Content>
              <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
                <label class="flex items-center gap-2">
                  <Checkbox id="create-payees" bind:checked={createMissingPayees} />
                  <span class="text-sm">Auto-create payees</span>
                </label>

                <label class="flex items-center gap-2">
                  <Checkbox id="create-categories" bind:checked={createMissingCategories} />
                  <span class="text-sm">Auto-create categories</span>
                </label>

                <label class="flex items-center gap-2">
                  <Checkbox id="partial-import" bind:checked={allowPartialImport} />
                  <span class="text-sm">Allow partial import</span>
                </label>

                <label class="flex items-center gap-2">
                  <Checkbox id="reverse-amounts" bind:checked={reverseAmountSigns} />
                  <span class="text-sm">Reverse amount signs</span>
                </label>

                {#if processorAnalysis.total > 0}
                  <div class="border-l pl-6">
                    <Button variant="outline" size="sm" onclick={openProcessorFilterDialog}>
                      Filter Processors ({processorAnalysis.total})
                    </Button>
                  </div>
                {/if}
              </div>
            </Card.Content>
          </Card.Root>

          <!-- Preview Table -->
          {#if previewData}
            <ImportDataTable
              data={previewData.rows}
              fileName={previewData.fileName}
              onNext={proceedToScheduleReview}
              onBack={goBackToUpload}
              bind:selectedRows
              onPayeeUpdate={handlePayeeUpdateWithSimilar}
              onCategoryUpdate={handleCategoryUpdateWithSimilar}
              onDescriptionUpdate={handleDescriptionUpdate}
              {temporaryCategories}
              {temporaryPayees} />
          {/if}
        </div>

        {#if isProcessing}
          <div
            class="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
            <Card.Root class="w-96">
              <Card.Content class="pt-6">
                <div class="text-center">
                  <div
                    class="border-primary mb-4 inline-block h-12 w-12 animate-spin rounded-full border-b-2">
                  </div>
                  <p class="font-medium">Analyzing Entities</p>
                  <p class="text-muted-foreground mt-2 text-sm">
                    Checking payees and categories...
                  </p>
                </div>
              </Card.Content>
            </Card.Root>
          </div>
        {/if}
      {:else if currentStep === 'review-schedules'}
        <div class="space-y-6">
          <div>
            <div class="mb-2 flex items-center gap-3">
              <CalendarClock class="text-primary h-8 w-8" />
              <h2 class="text-2xl font-bold">Review Schedule Matches</h2>
            </div>
            <p class="text-muted-foreground mt-2">
              We found {scheduleMatches.length} transaction{scheduleMatches.length !== 1 ? 's' : ''}
              that match existing schedules. Select which ones you'd like to link.
            </p>
          </div>

          <!-- Match Threshold Slider -->
          <Card.Root>
            <Card.Header class="pb-4">
              <Card.Title class="text-base">Match Threshold</Card.Title>
              <Card.Description class="text-sm">
                Adjust to show matches above {Math.round(scheduleMatchThreshold * 100)}% confidence
                · Showing {filteredScheduleMatches.length} of {scheduleMatches.length} matches
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <div class="space-y-4">
                <Slider
                  type="single"
                  bind:value={scheduleMatchThreshold}
                  min={0.2}
                  max={1.0}
                  step={0.05}
                  class="w-full" />
                <div class="text-muted-foreground flex justify-between text-xs">
                  <span>20%</span>
                  <span>40%</span>
                  <span>60%</span>
                  <span>80%</span>
                  <span>100%</span>
                </div>
              </div>
            </Card.Content>
          </Card.Root>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {#each groupedScheduleMatches as group (group.scheduleId)}
              <Card.Root class="flex flex-col {getScoreBorderColor(group.avgScore)}">
                <Card.Header class="pb-3">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex min-w-0 items-start gap-2">
                      <CalendarClock class="text-primary mt-0.5 h-5 w-5 shrink-0" />
                      <div class="min-w-0">
                        <Card.Title class="truncate text-base">{group.scheduleName}</Card.Title>
                        <Card.Description class="text-xs">
                          {group.matches.length} match{group.matches.length !== 1 ? 'es' : ''} · {Math.round(
                            group.avgScore * 100
                          )}% avg
                        </Card.Description>
                      </div>
                    </div>
                    <div class="flex shrink-0 flex-col gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        class="h-7 px-2 text-xs"
                        onclick={() => {
                          group.matches.forEach((match) => {
                            match.selected = true;
                          });
                          scheduleMatches = [...scheduleMatches];
                        }}>
                        All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        class="h-7 px-2 text-xs"
                        onclick={() => {
                          group.matches.forEach((match) => {
                            match.selected = false;
                          });
                          scheduleMatches = [...scheduleMatches];
                        }}>
                        None
                      </Button>
                    </div>
                  </div>
                </Card.Header>
                <Card.Content>
                  <div class="space-y-3">
                    {#each group.matches as match (match.rowIndex)}
                      <div
                        class="flex cursor-pointer items-start gap-2 rounded-lg border p-2 transition-colors {getScoreAllBorderColor(
                          match.score
                        )}
                             {match.selected ? 'bg-primary/5' : 'bg-card hover:bg-accent/50'}"
                        onclick={() => handleScheduleMatchToggle(match.rowIndex, !match.selected)}
                        onkeydown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleScheduleMatchToggle(match.rowIndex, !match.selected);
                          }
                        }}
                        role="button"
                        tabindex="0"
                        aria-pressed={match.selected}>
                        <Checkbox
                          checked={match.selected}
                          onCheckedChange={(checked) =>
                            handleScheduleMatchToggle(match.rowIndex, checked === true)}
                          class="mt-1" />
                        <div class="min-w-0 flex-1">
                          <div class="mb-2 flex items-center justify-between gap-2">
                            <div class="truncate text-sm font-medium">
                              {new Date(match.transactionData.date).toLocaleDateString()}
                            </div>
                            <Badge.Badge
                              variant={getConfidenceBadgeVariant(match.confidence)}
                              class="shrink-0">
                              {Math.round(match.score * 100)}%
                            </Badge.Badge>
                          </div>
                          <div class="space-y-1">
                            <div class="flex items-center justify-between text-sm">
                              <span class="text-muted-foreground text-xs">Transaction</span>
                              <span class="font-mono font-medium"
                                >${Math.abs(match.transactionData.amount).toFixed(2)}</span>
                            </div>
                            <div class="flex items-center justify-between text-sm">
                              <span class="text-muted-foreground text-xs">Schedule</span>
                              <span class="font-mono"
                                >${Math.abs(match.scheduleData.amount).toFixed(2)}</span>
                            </div>
                          </div>
                          {#if match.transactionData.payee}
                            <div class="text-muted-foreground mt-2 truncate text-xs">
                              {match.transactionData.payee}
                            </div>
                          {/if}
                        </div>
                      </div>
                    {/each}
                  </div>
                </Card.Content>
              </Card.Root>
            {/each}
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between">
            <Button variant="outline" onclick={goBackToPreview}>Back</Button>
            <Button onclick={proceedToEntityReview}>Continue to Entity Review</Button>
          </div>
        </div>
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
            onDeselectAllCategories={deselectAllCategories} />

          <!-- Actions -->
          <div class="flex items-center justify-between">
            <Button variant="outline" onclick={goBackToPreview} disabled={isProcessing}>
              Back
            </Button>
            <Button onclick={processImport} disabled={isProcessing}>
              {#if isProcessing}
                <div
                  class="border-primary-foreground mr-2 inline-block h-4 w-4 animate-spin rounded-full border-b-2">
                </div>
                Processing...
              {:else}
                Import Transactions
              {/if}
            </Button>
          </div>
        </div>

        {#if isProcessing}
          <div
            class="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
            <Card.Root class="w-96">
              <Card.Content class="pt-6">
                <div class="text-center">
                  <div
                    class="border-primary mb-4 inline-block h-12 w-12 animate-spin rounded-full border-b-2">
                  </div>
                  <p class="font-medium">Processing Import</p>
                  <p class="text-muted-foreground mt-2 text-sm">Creating transactions...</p>
                </div>
              </Card.Content>
            </Card.Root>
          </div>
        {/if}
      {:else if currentStep === 'complete' && importResult}
        <div class="space-y-6">
          <div class="text-center">
            <div
              class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
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
                  <div class="text-muted-foreground text-sm">Transactions Created</div>
                </div>
                <div>
                  <div class="text-2xl font-bold">
                    {importResult.entitiesCreated.payees + importResult.entitiesCreated.categories}
                  </div>
                  <div class="text-muted-foreground text-sm">Entities Created</div>
                </div>
              </div>

              {#if importResult.errors.length > 0}
                <div class="border-t pt-4">
                  <p class="text-destructive mb-2 text-sm font-medium">
                    {importResult.errors.length} Error(s)
                  </p>
                  {#each importResult.errors.slice(0, 5) as error}
                    <p class="text-muted-foreground text-xs">
                      Row {error.row}: {error.message}
                    </p>
                  {/each}
                </div>
              {/if}
            </Card.Content>
          </Card.Root>

          <!-- Save Import Profile Card - only show for CSV files without matched profile -->
          {#if columnMapping && csvHeaders.length > 0 && !matchedProfile}
            <Card.Root>
              <Card.Header>
                <Card.Title class="flex items-center gap-2">
                  <Save class="h-4 w-4" />
                  Save Column Mapping
                </Card.Title>
                <Card.Description>
                  Save this column mapping as a profile for future imports with similar files
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <Button variant="outline" onclick={openSaveProfileDialog}>
                  Save as Import Profile
                </Button>
              </Card.Content>
            </Card.Root>
          {/if}

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

<!-- Save Import Profile Dialog -->
<AlertDialog.Root bind:open={saveProfileDialog.open}>
  <AlertDialog.Content class="max-w-md">
    <AlertDialog.Header>
      <AlertDialog.Title>Save Import Profile</AlertDialog.Title>
      <AlertDialog.Description>
        Create a profile to automatically use this column mapping for future imports.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <div class="space-y-4 py-4">
      <div class="space-y-2">
        <Label for="profile-name">Profile Name</Label>
        <Input
          id="profile-name"
          bind:value={saveProfileDialog.profileName}
          placeholder="e.g., Chase Credit Card" />
      </div>

      <div class="space-y-3">
        <div class="flex items-start gap-2">
          <Checkbox
            id="save-filename-pattern"
            checked={saveProfileDialog.saveFilenamePattern}
            onCheckedChange={(checked) => (saveProfileDialog.saveFilenamePattern = !!checked)} />
          <div class="grid gap-1.5 leading-none">
            <Label for="save-filename-pattern" class="text-sm font-medium">
              Match by filename pattern
            </Label>
            <p class="text-muted-foreground text-xs">
              Auto-match files with similar names
            </p>
          </div>
        </div>
        {#if saveProfileDialog.saveFilenamePattern}
          <Input
            bind:value={saveProfileDialog.filenamePattern}
            placeholder="e.g., chase_*.csv"
            class="ml-6" />
        {/if}
      </div>

      {#if selectedAccountId}
        <div class="flex items-start gap-2">
          <Checkbox
            id="save-account-default"
            checked={saveProfileDialog.saveAsAccountDefault}
            onCheckedChange={(checked) => (saveProfileDialog.saveAsAccountDefault = !!checked)} />
          <div class="grid gap-1.5 leading-none">
            <Label for="save-account-default" class="text-sm font-medium">
              Set as default for this account
            </Label>
            <p class="text-muted-foreground text-xs">
              Use this profile when importing to {selectedAccount()?.name}
            </p>
          </div>
        </div>
      {/if}
    </div>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={closeSaveProfileDialog}>Cancel</AlertDialog.Cancel>
      <Button
        onclick={saveImportProfile}
        disabled={saveProfileDialog.isSaving || !saveProfileDialog.profileName.trim()}>
        {#if saveProfileDialog.isSaving}
          Saving...
        {:else}
          Save Profile
        {/if}
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Bulk Update Confirmation Dialog -->
<AlertDialog.Root bind:open={bulkUpdateDialog.open}>
  <AlertDialog.Content class="max-w-2xl">
    <AlertDialog.Header>
      <AlertDialog.Title>Update Similar Transactions?</AlertDialog.Title>
      <AlertDialog.Description class="space-y-3">
        {#if bulkUpdateDialog.categoryName}
          <p>
            You're changing the category to "<strong>{bulkUpdateDialog.categoryName}</strong>". How
            would you like to apply this change?
          </p>
        {:else}
          <p>
            You're <strong>removing the category</strong> from this transaction. How would you like to
            apply this change?
          </p>
        {/if}

        {#if bulkUpdateDialog.matchCountByPayee > 0 && bulkUpdateDialog.matchCountByCategory > 0}
          <div class="space-y-2 text-sm">
            <p>
              • <strong>{bulkUpdateDialog.matchCountByPayee}</strong> other transaction{bulkUpdateDialog.matchCountByPayee !==
              1
                ? 's'
                : ''} with the same payee "<strong>{bulkUpdateDialog.payeeName}</strong>"
            </p>
            <p>
              • <strong>{bulkUpdateDialog.matchCountByCategory}</strong> other transaction{bulkUpdateDialog.matchCountByCategory !==
              1
                ? 's'
                : ''} with the category "<strong>{bulkUpdateDialog.previousCategoryName}</strong>"
            </p>
          </div>
        {:else if bulkUpdateDialog.matchCountByPayee > 0}
          <p class="text-sm">
            Found <strong>{bulkUpdateDialog.matchCountByPayee}</strong> other transaction{bulkUpdateDialog.matchCountByPayee !==
            1
              ? 's'
              : ''} with the same payee "<strong>{bulkUpdateDialog.payeeName}</strong>".
          </p>
        {:else if bulkUpdateDialog.matchCountByCategory > 0}
          <p class="text-sm">
            Found <strong>{bulkUpdateDialog.matchCountByCategory}</strong> other transaction{bulkUpdateDialog.matchCountByCategory !==
            1
              ? 's'
              : ''} with the category "<strong>{bulkUpdateDialog.previousCategoryName}</strong>".
          </p>
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer class="flex-col gap-2 sm:flex-col">
      {#if bulkUpdateDialog.matchCountByPayee > 0 && bulkUpdateDialog.matchCountByCategory > 0}
        <AlertDialog.Action onclick={confirmBulkUpdateBoth} class="w-full">
          Update All ({bulkUpdateDialog.matchCountByPayee + bulkUpdateDialog.matchCountByCategory} transactions)
        </AlertDialog.Action>
        <AlertDialog.Action
          onclick={confirmBulkUpdateByPayee}
          class="bg-secondary text-secondary-foreground hover:bg-secondary/80 w-full">
          Only Same Payee ({bulkUpdateDialog.matchCountByPayee + 1} transactions)
        </AlertDialog.Action>
        <AlertDialog.Action
          onclick={confirmBulkUpdateByCategory}
          class="bg-secondary text-secondary-foreground hover:bg-secondary/80 w-full">
          Rename Category ({bulkUpdateDialog.matchCountByCategory + 1} transactions)
        </AlertDialog.Action>
      {:else if bulkUpdateDialog.matchCountByPayee > 0}
        <AlertDialog.Action onclick={confirmBulkUpdateByPayee} class="w-full">
          Update All Same Payee ({bulkUpdateDialog.matchCountByPayee + 1} transactions)
        </AlertDialog.Action>
      {:else if bulkUpdateDialog.matchCountByCategory > 0}
        <AlertDialog.Action onclick={confirmBulkUpdateByCategory} class="w-full">
          Rename Category ({bulkUpdateDialog.matchCountByCategory + 1} transactions)
        </AlertDialog.Action>
      {/if}
      <AlertDialog.Action
        onclick={confirmBulkUpdateJustOne}
        class="bg-secondary text-secondary-foreground hover:bg-secondary/80 w-full">
        Just This One
      </AlertDialog.Action>
      <AlertDialog.Cancel onclick={cancelBulkUpdate} class="w-full">Cancel</AlertDialog.Cancel>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Bulk Payee Update Confirmation Dialog -->
<AlertDialog.Root bind:open={bulkPayeeUpdateDialog.open}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Update Similar Transactions?</AlertDialog.Title>
      <AlertDialog.Description>
        Found {bulkPayeeUpdateDialog.matchCount} other transaction{bulkPayeeUpdateDialog.matchCount !==
        1
          ? 's'
          : ''} with similar payee "{bulkPayeeUpdateDialog.originalPayeeName}".
        <br /><br />
        Would you like to update {bulkPayeeUpdateDialog.matchCount !== 1 ? 'them' : 'it'} to payee "{bulkPayeeUpdateDialog.payeeName ||
          'None'}" as well?
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer class="flex-col gap-2 sm:flex-col">
      <AlertDialog.Action onclick={confirmBulkPayeeUpdate} class="w-full"
        >Yes, Update All Similar</AlertDialog.Action>
      <AlertDialog.Cancel onclick={cancelBulkPayeeUpdate} class="w-full"
        >No, Just This One</AlertDialog.Cancel>
      <Button variant="outline" onclick={revertPayeeUpdate} class="w-full">Cancel & Revert</Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Payment Processor Filter Dialog -->
<AlertDialog.Root bind:open={processorFilterDialog.open}>
  <AlertDialog.Content class="max-w-lg">
    <AlertDialog.Header>
      <AlertDialog.Title>Filter Payment Processors</AlertDialog.Title>
      <AlertDialog.Description>
        Select which payment processors and vendor providers to filter out from payee names. This
        will extract the actual merchant name from transactions like "PayPal - Acme tools" → "Acme
        tools".
      </AlertDialog.Description>
    </AlertDialog.Header>

    <div class="space-y-3 py-4">
      {#each PAYMENT_PROCESSORS as processor}
        {@const count = processorAnalysis.byProcessor.get(processor.name) || 0}
        {#if count > 0}
          <div class="flex items-start justify-between gap-3">
            <div class="flex flex-1 items-start gap-3">
              <Checkbox
                id={`processor-${processor.name}`}
                checked={processorFilterDialog.selectedProcessors.has(processor.name)}
                onCheckedChange={() => toggleProcessor(processor.name)} />
              <label for={`processor-${processor.name}`} class="flex-1 cursor-pointer">
                <div class="text-sm font-medium">{processor.name}</div>
                <div class="text-muted-foreground text-xs">{processor.description}</div>
              </label>
            </div>
            <div class="text-muted-foreground text-sm whitespace-nowrap">
              {count} transaction{count !== 1 ? 's' : ''}
            </div>
          </div>
        {/if}
      {/each}
    </div>

    {#if processorFilterDialog.affectedCount > 0}
      <div class="bg-muted rounded-md p-3">
        <p class="text-sm">
          <strong>{processorFilterDialog.affectedCount}</strong>
          transaction{processorFilterDialog.affectedCount !== 1 ? 's' : ''} will be updated
        </p>
      </div>
    {/if}

    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={cancelProcessorFilter}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={applyProcessorFilter}
        disabled={processorFilterDialog.selectedProcessors.size === 0}>
        Apply Filter
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
