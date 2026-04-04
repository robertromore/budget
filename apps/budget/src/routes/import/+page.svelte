<script lang="ts">
import ColumnMapper from '$lib/components/import/column-mapper.svelte';
import EntityReview from '$lib/components/import/entity-review.svelte';
import ImportPreviewTable from '$lib/components/import/import-preview-table.svelte';
import { bulkCreateCategoryAliases } from '$lib/query/category-aliases';
import { bulkCreatePayeeAliases } from '$lib/query/payee-aliases';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Empty from '$lib/components/ui/empty';
import type { Account } from '$lib/schema/accounts';
import type { ImportProfile } from '$lib/schema/import-profiles';
import { CategoriesState } from '$lib/states/entities/categories.svelte';
import { PayeesState } from '$lib/states/entities/payees.svelte';
import { trpc } from '$lib/trpc/client';
import type {
  CleanupState,
  ColumnMapping,
  ImportPreviewData,
  ImportResult,
  ImportRow,
  ParseResult,
  ScheduleMatch,
} from '$lib/types/import';
import type { Table } from '@tanstack/table-core';
import {
  PAYMENT_PROCESSORS,
  countProcessorTransactions,
  detectPaymentProcessor,
} from '$lib/utils/import/payment-processor-filter';
import Circle from '@lucide/svelte/icons/circle';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Wallet from '@lucide/svelte/icons/wallet';
import { useQueryClient } from '@tanstack/svelte-query';
import { toast } from '$lib/utils/toast-interceptor';
import ImportResultSummary from './(components)/import-result-summary.svelte';
import SaveProfileDialog from './(components)/save-profile-dialog.svelte';
import BulkPayeeUpdateDialog from './(components)/bulk-payee-update-dialog.svelte';
import BulkTransferUpdateDialog from './(components)/bulk-transfer-update-dialog.svelte';
import BulkCategoryUpdateDialog from './(components)/bulk-category-update-dialog.svelte';
import ScheduleMatchReview from './(components)/schedule-match-review.svelte';
import ProcessorFilterDialog from './(components)/processor-filter-dialog.svelte';
import { createImportEntityState } from './(components)/import-entity-state.svelte';
import UploadStep from './(components)/upload-step.svelte';

let { data } = $props();
const queryClient = useQueryClient();

const _data = (() => {
  return data;
})();

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
let fileData = $state<File | null>(null);
let parseResults = $state<ParseResult | null>(null);
let rawCSVData = $state<Record<string, any>[] | null>(null);
let columnMapping = $state<ColumnMapping | null>(null);
let entityPreview = $state<ImportPreviewData | null>(null);
let importResult = $state<ImportResult | null>(null);
let isProcessing = $state(false);
let error = $state<string | null>(null);
let selectedRows = $state<Set<number>>(new Set());
let previewTable = $state<Table<ImportRow> | undefined>(undefined);
let scheduleMatches = $state<ScheduleMatch[]>([]);
let scheduleMatchThreshold = $state(0.75); // Default to 75% minimum match

// Import profile state
let matchedProfile = $state<ImportProfile | null>(null);
let detectedMapping = $state<ColumnMapping | null>(null);
let csvHeaders = $state<string[]>([]);
let saveProfileDialogOpen = $state(false);

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

// Entity override state module (payee, category, transfer, description overrides + bulk dialogs)
const entityState = createImportEntityState(() => parseResults?.rows ?? []);

// Import options
let importOptions = $state({
  createMissingPayees: true,
  createMissingCategories: true,
  allowPartialImport: true,
  reverseAmountSigns: false,
});

// Compatibility aliases (for existing code that uses individual variables)
const createMissingPayees = $derived(importOptions.createMissingPayees);
const createMissingCategories = $derived(importOptions.createMissingCategories);
const allowPartialImport = $derived(importOptions.allowPartialImport);
const reverseAmountSigns = $derived(importOptions.reverseAmountSigns);

// Cleanup state for the preview table
let cleanupState = $state<CleanupState | null>(null);

// Initialize the mutation for bulk creating aliases
const createAliasesMutation = bulkCreatePayeeAliases.options();
const createCategoryAliasesMutation = bulkCreateCategoryAliases.options();

function handleImportOptionsChange(options: typeof importOptions) {
  importOptions = options;
}

function handleCleanupStateChange(state: CleanupState) {
  cleanupState = state;

  // Apply cleanup decisions to entityOverrides and create alias candidates
  for (const group of state.payeeGroups) {
    if (group.userDecision === 'accept' || group.userDecision === 'custom') {
      const payeeName =
        group.userDecision === 'custom' && group.customName
          ? group.customName
          : group.canonicalName;
      const payeeId = group.existingMatch?.id ?? null;

      for (const member of group.members) {
        // Apply the cleanup decision to entityOverrides
        entityState.entityOverrides = {
          ...entityState.entityOverrides,
          [member.rowIndex]: {
            ...entityState.entityOverrides[member.rowIndex],
            payeeId,
            payeeName,
          },
        };

        // Create alias candidate for both existing and new payees
        // For existing payees: track payeeId
        // For new payees: track payeeName (will be resolved to ID after import)
        if (member.originalPayee && member.originalPayee !== payeeName) {
          const newCandidates = new Map(entityState.aliasCandidates);
          newCandidates.set(member.rowIndex, {
            rawString: member.originalPayee,
            payeeId: payeeId ?? undefined, // null for new payees
            payeeName, // Track name for resolution after import
          });
          entityState.aliasCandidates = newCandidates;
        }
      }
    }
  }

  // Apply category suggestions
  for (const suggestion of state.categorySuggestions) {
    if (suggestion.selectedCategoryId) {
      const selectedSuggestion = suggestion.suggestions.find(
        (s) => s.categoryId === suggestion.selectedCategoryId
      );
      if (selectedSuggestion) {
        entityState.entityOverrides = {
          ...entityState.entityOverrides,
          [suggestion.rowIndex]: {
            ...entityState.entityOverrides[suggestion.rowIndex],
            categoryId: suggestion.selectedCategoryId,
            categoryName: selectedSuggestion.categoryName,
          },
        };
      }
    }
  }
}

// Create reactive preview data that applies amount reversal and entity overrides
const previewData = $derived.by(() => {
  if (!parseResults) return null;

  // Apply transformations to the rows
  return {
    ...parseResults,
    rows: parseResults.rows.map((row) => {
      const override = entityState.entityOverrides[row.rowIndex];
      // Store the original payee value from the CSV before any overrides
      // Use 'originalPayee' if set by infer-categories (true raw value), otherwise fall back to 'payee'
      const originalPayee = (row.normalizedData['originalPayee'] ?? row.normalizedData['payee']) as
        | string
        | null;

      return {
        ...row,
        // Preserve the original payee for alias tracking
        originalPayee,
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
          // Clear categoryId when category is overridden to prevent server using original
          categoryId:
            override?.categoryId !== undefined
              ? override.categoryId
              : override?.categoryName !== undefined
                ? null
                : row.normalizedData['categoryId'],
          description:
            override?.description !== undefined
              ? override.description
              : row.normalizedData['description'] || row.normalizedData['notes'],
          // Apply transfer overrides
          transferAccountId:
            override?.transferAccountId !== undefined
              ? override.transferAccountId
              : row.normalizedData['transferAccountId'],
          transferAccountName:
            override?.transferAccountName !== undefined
              ? override.transferAccountName
              : row.normalizedData['transferAccountName'],
          rememberTransferMapping: override?.rememberTransferMapping ?? false,
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

// Analyze payee names for payment processors
const processorAnalysis = $derived.by(() => {
  if (!parseResults) return { total: 0, byProcessor: new Map<string, number>() };

  const payeeNames = parseResults.rows
    .map((row) => row.normalizedData['payee'])
    .filter((name): name is string => typeof name === 'string');

  return countProcessorTransactions(payeeNames);
});

// Open payment processor filter dialog
let processorFilterDialogOpen = $state(false);

function openProcessorFilterDialog() {
  processorFilterDialogOpen = true;
}

// Apply payment processor filtering to all matching transactions
function applyProcessorFilter(selectedProcessors: Set<string>) {
  if (!parseResults || selectedProcessors.size === 0) {
    return;
  }

  let updatedCount = 0;

  // Iterate through all rows and filter payee names
  parseResults.rows.forEach((row) => {
    const payeeName = row.normalizedData['payee'];
    if (!payeeName || typeof payeeName !== 'string') return;

    const detection = detectPaymentProcessor(payeeName);
    if (detection && selectedProcessors.has(detection.processor)) {
      // Filter out the payment processor
      const filteredName = detection.merchantName;
      entityState.handlePayeeUpdate(row.rowIndex, null, filteredName);
      updatedCount++;
    }
  });

  // Notify user
  if (updatedCount > 0) {
    toast.success(
      `Filtered payment processors from ${updatedCount} transaction${updatedCount !== 1 ? 's' : ''}`
    );
  }
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

// Apply smart categorization and payee normalization using the backend matcher
async function applySmartCategorization() {
  if (!parseResults) return;

  try {
    // Get workspaceId from layout data for alias lookups
    const workspaceId = data.currentWorkspace?.id;
    const accountId = selectedAccountId ? parseInt(selectedAccountId, 10) : undefined;

    const response = await fetch('/api/import/infer-categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rows: parseResults.rows,
        workspaceId, // Include workspaceId to enable payee alias matching
        accountId,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      // Update parseResults with normalized payees and inferred categories
      // This now includes alias-matched payees with their IDs and default categories
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
    // Store file for later re-processing during column remapping
    fileData = file;

    // Parse file and move to preview step
    const formData = new FormData();
    formData.append('importFile', file);

    // Add accountId and reverseAmountSigns as query parameters for duplicate checking
    const url = new URL('/api/import/upload', window.location.origin);
    if (selectedAccountId) {
      url.searchParams.set('accountId', selectedAccountId);
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
    const remapForm = new FormData();
    remapForm.append('importFile', fileData!);
    remapForm.append('columnMapping', JSON.stringify(mapping));
    if (selectedAccountId) {
      remapForm.append('accountId', selectedAccountId);
    }
    if (importOptions.reverseAmountSigns) {
      remapForm.append('reverseAmountSigns', 'true');
    }

    const response = await fetch('/api/import/remap', {
      method: 'POST',
      body: remapForm,
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
  if (!parseResults || !selectedAccountId || !previewData) {
    return;
  }

  isProcessing = true;
  error = null;

  try {
    // selectedRows already contains row.rowIndex values from ImportPreviewTable
    const selectedRowsData = previewData.rows.filter((row) => selectedRows.has(row.rowIndex));

    const response = await fetch('/api/import/preview-entities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rows: selectedRowsData,
        accountId: parseInt(selectedAccountId, 10),
      }),
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
  // Note: previewTable is no longer required here - we use persisted selectedRows
  if (!parseResults || !selectedAccountId || !entityPreview || !previewData) return;

  // Verify we have selected rows (persisted from proceedToEntityReview)
  if (selectedRows.size === 0) {
    error = 'No rows selected for import';
    return;
  }

  isProcessing = true;
  error = null;

  try {
    // Use persisted selectedRows (captured when leaving preview step)
    // The preview table is no longer mounted at this point

    // Filter rows to only include selected ones (with entity overrides applied, but NOT amount reversal)
    // Amount reversal will be applied by the backend based on the reverseAmountSigns flag
    const selectedRowsData = parseResults.rows
      .filter((row) => selectedRows.has(row.rowIndex))
      .map((row) => {
        const override = entityState.entityOverrides[row.rowIndex];
        return {
          ...row,
          normalizedData: {
            ...row.normalizedData,
            // Apply entity overrides (but NOT amount reversal - backend will handle that)
            payee:
              override?.payeeName !== undefined ? override.payeeName : row.normalizedData['payee'],
            // Include explicit payeeId if user selected an existing payee
            payeeId: override?.payeeId ?? row.normalizedData['payeeId'] ?? null,
            category:
              override?.categoryName !== undefined
                ? override.categoryName
                : row.normalizedData['category'],
            // Clear categoryId when category is overridden to prevent server using original
            categoryId:
              override?.categoryId !== undefined
                ? override.categoryId
                : override?.categoryName !== undefined
                  ? null // Clear categoryId if categoryName was overridden (even to null)
                  : (row.normalizedData['categoryId'] ?? null),
            description:
              override?.description !== undefined
                ? override.description
                : row.normalizedData['description'] || row.normalizedData['notes'],
            // Include transfer account overrides for transfer creation
            transferAccountId:
              override?.transferAccountId !== undefined
                ? override.transferAccountId
                : (row.normalizedData['transferAccountId'] ?? null),
            transferAccountName:
              override?.transferAccountName !== undefined
                ? override.transferAccountName
                : (row.normalizedData['transferAccountName'] ?? null),
            rememberTransferMapping:
              override?.rememberTransferMapping ??
              row.normalizedData['rememberTransferMapping'] ??
              false,
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

      // Record payee aliases from user confirmations during import
      // This handles both existing payees (with payeeId) and newly created payees (resolved by name)
      if (entityState.aliasCandidates.size > 0) {
        try {
          // Build lookups from created payee mappings
          // Priority: user-selected name > normalized name > original import string
          const nameToIdMap = new Map<string, number>();
          const originalToIdMap = new Map<string, number>();
          if (result.result.createdPayeeMappings) {
            for (const mapping of result.result.createdPayeeMappings) {
              // Normalized name (what's stored in DB) - lower priority
              nameToIdMap.set(mapping.normalizedName.toLowerCase(), mapping.payeeId);
              // Original import string - for fallback matching
              originalToIdMap.set(mapping.originalName.toLowerCase(), mapping.payeeId);
            }
          }

          // Resolve aliases - for existing payees use payeeId, for new payees look up by name
          const aliasesToCreate = Array.from(entityState.aliasCandidates.values())
            .map((alias) => {
              // If we already have a payeeId (existing payee), use it
              if (alias.payeeId) {
                return {
                  rawString: alias.rawString,
                  payeeId: alias.payeeId,
                  sourceAccountId: selectedAccountId ? parseInt(selectedAccountId) : undefined,
                };
              }

              // Try to resolve by user-selected payee name first (higher priority)
              if (alias.payeeName) {
                const resolvedId = nameToIdMap.get(alias.payeeName.toLowerCase());
                if (resolvedId) {
                  return {
                    rawString: alias.rawString,
                    payeeId: resolvedId,
                    sourceAccountId: selectedAccountId ? parseInt(selectedAccountId) : undefined,
                  };
                }
              }

              // Fallback: try to match by the original import string
              if (alias.rawString) {
                const resolvedId = originalToIdMap.get(alias.rawString.toLowerCase());
                if (resolvedId) {
                  return {
                    rawString: alias.rawString,
                    payeeId: resolvedId,
                    sourceAccountId: selectedAccountId ? parseInt(selectedAccountId) : undefined,
                  };
                }
              }

              // Could not resolve - skip this alias
              return null;
            })
            .filter(
              (
                alias
              ): alias is {
                rawString: string;
                payeeId: number;
                sourceAccountId: number | undefined;
              } => alias !== null && !!alias.rawString
            );

          if (aliasesToCreate.length > 0) {
            await createAliasesMutation.mutateAsync({ aliases: aliasesToCreate });
          }
        } catch (aliasError) {
          // Non-critical - don't fail the import if alias recording fails
          console.warn('Failed to record payee aliases:', aliasError);
        }
      }

      // Record category aliases from import
      // This records raw string → category mappings for future imports
      if (
        result.result.createdCategoryMappings &&
        result.result.createdCategoryMappings.length > 0
      ) {
        try {
          const categoryAliasesToCreate = result.result.createdCategoryMappings.map(
            (mapping: {
              rawString: string;
              categoryId: number;
              payeeId?: number;
              wasAiSuggested?: boolean;
            }) => ({
              rawString: mapping.rawString,
              categoryId: mapping.categoryId,
              payeeId: mapping.payeeId,
              sourceAccountId: selectedAccountId ? parseInt(selectedAccountId) : undefined,
              wasAiSuggested: mapping.wasAiSuggested,
            })
          );

          await createCategoryAliasesMutation.mutateAsync({ aliases: categoryAliasesToCreate });
        } catch (categoryAliasError) {
          console.warn('Failed to record category aliases:', categoryAliasError);
        }
      }

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
        // Invalidate analytics/chart queries that depend on transaction data
        await queryClient.invalidateQueries({
          queryKey: ['transactions', 'analytics'],
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
  fileData = null;
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
  previewTable = undefined;
  entityState.reset();
  cleanupState = null;
}

// Save profile dialog helpers
function openSaveProfileDialog() {
  saveProfileDialogOpen = true;
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

// Derived count of selected rows - uses the bound state from ImportPreviewTable
const selectedRowCount = $derived(selectedRows.size);

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
  <div data-help-id="import-page" data-help-title="Import Page" data-tour-id="import-page">
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
                class="absolute top-full left-1/2 mt-3 -translate-x-1/2 text-sm font-medium whitespace-nowrap transition-colors {isCurrent
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
        <UploadStep
          accounts={importableAccounts}
          bind:selectedAccountId
          {isProcessing}
          onFileSelected={handleFileSelected}
          onFileRejected={handleFileRejected} />
      {:else if currentStep === 'map-columns' && parseResults && rawCSVData}
        {#if matchedProfile}
          <div
            class="bg-primary/10 border-primary/20 mb-4 flex items-center justify-between rounded-lg border p-3">
            <div class="flex items-center gap-2">
              <Sparkles class="text-primary h-4 w-4" />
              <span class="text-sm">
                Using saved profile: <strong>{matchedProfile.name}</strong>
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onclick={() => {
                matchedProfile = null;
                detectedMapping = null;
              }}>
              Undo
            </Button>
          </div>
        {/if}
        {#key matchedProfile?.id}
          <ColumnMapper
            rawColumns={Object.keys(rawCSVData[0] || {})}
            initialMapping={detectedMapping ?? undefined}
            sampleData={rawCSVData}
            onNext={handleColumnMappingComplete}
            onBack={goBackToUpload} />
        {/key}
      {:else if currentStep === 'preview' && parseResults}
        <div class="space-y-6">
          <!-- Preview Table -->
          {#if previewData}
            <ImportPreviewTable
              data={previewData.rows}
              {importOptions}
              accountId={selectedAccountId ? parseInt(selectedAccountId) : undefined}
              onImportOptionsChange={handleImportOptionsChange}
              {cleanupState}
              onCleanupStateChange={handleCleanupStateChange}
              onPayeeUpdate={entityState.handlePayeeUpdateWithSimilar}
              onPayeeAliasCandidate={entityState.handlePayeeAliasCandidate}
              onCategoryUpdate={entityState.handleCategoryUpdateWithSimilar}
              onDescriptionUpdate={entityState.handleDescriptionUpdate}
              onTransferAccountUpdate={entityState.handleTransferAccountUpdateWithSimilar}
              {temporaryCategories}
              {temporaryPayees}
              processorCount={processorAnalysis.total}
              onOpenProcessorFilter={openProcessorFilterDialog}
              bind:table={previewTable}
              bind:selectedRows />

            <!-- Navigation Buttons -->
            <div class="flex items-center justify-between pt-4">
              <Button variant="outline" onclick={goBackToUpload}>Back</Button>
              <div class="flex items-center gap-2">
                <span class="text-muted-foreground text-sm">
                  {selectedRowCount} of {previewData.rows.length} selected
                </span>
                <Button onclick={proceedToScheduleReview} disabled={selectedRowCount === 0}>
                  Continue
                </Button>
              </div>
            </div>
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
        <ScheduleMatchReview
          {scheduleMatches}
          {filteredScheduleMatches}
          {groupedScheduleMatches}
          bind:threshold={scheduleMatchThreshold}
          onToggleMatch={(rowIndex, selected) => handleScheduleMatchToggle(rowIndex, selected)}
          onSelectAll={selectAllScheduleMatches}
          onDeselectAll={deselectAllScheduleMatches}
          onBack={goBackToPreview}
          onNext={proceedToEntityReview} />
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
        <ImportResultSummary
          {importResult}
          onStartNewImport={startNewImport}
          onOpenSaveProfile={openSaveProfileDialog}
          {columnMapping}
          {csvHeaders}
          {matchedProfile}
          selectedAccountSlug={selectedAccount()?.slug} />
      {/if}
    {/if}
  </div>
</div>

<!-- Save Import Profile Dialog -->
<SaveProfileDialog
  bind:open={saveProfileDialogOpen}
  {columnMapping}
  {csvHeaders}
  accountId={selectedAccountId ? parseInt(selectedAccountId) : null}
  accountName={selectedAccount()?.name}
  {matchedProfile}
  {selectedFile}
  onSaved={() => {}} />

<!-- Bulk Category Update Confirmation Dialog -->
<BulkCategoryUpdateDialog
  bind:open={entityState.bulkUpdateDialog.open}
  categoryName={entityState.bulkUpdateDialog.categoryName}
  payeeName={entityState.bulkUpdateDialog.payeeName}
  matchCountByPayee={entityState.bulkUpdateDialog.matchCountByPayee}
  matchCountByCategory={entityState.bulkUpdateDialog.matchCountByCategory}
  previousCategoryName={entityState.bulkUpdateDialog.previousCategoryName}
  onConfirmJustOne={entityState.confirmBulkUpdateJustOne}
  onConfirmByPayee={entityState.confirmBulkUpdateByPayee}
  onConfirmByCategory={entityState.confirmBulkUpdateByCategory}
  onConfirmBoth={entityState.confirmBulkUpdateBoth}
  onCancel={entityState.cancelBulkUpdate} />

<!-- Bulk Payee Update Confirmation Dialog -->
<BulkPayeeUpdateDialog
  bind:open={entityState.bulkPayeeUpdateDialog.open}
  matchCount={entityState.bulkPayeeUpdateDialog.matchCount}
  payeeName={entityState.bulkPayeeUpdateDialog.payeeName}
  originalPayeeName={entityState.bulkPayeeUpdateDialog.originalPayeeName}
  onConfirmBulk={entityState.confirmBulkPayeeUpdate}
  onKeepSingle={entityState.cancelBulkPayeeUpdate}
  onRevert={entityState.revertPayeeUpdate} />

<!-- Payment Processor Filter Dialog -->
<ProcessorFilterDialog
  bind:open={processorFilterDialogOpen}
  {processorAnalysis}
  onApply={applyProcessorFilter}
  {PAYMENT_PROCESSORS} />

<!-- Bulk Transfer Update Confirmation Dialog -->
<BulkTransferUpdateDialog
  bind:open={entityState.bulkTransferUpdateDialog.open}
  matchCount={entityState.bulkTransferUpdateDialog.matchCount}
  accountName={entityState.bulkTransferUpdateDialog.accountName}
  originalPayeeName={entityState.bulkTransferUpdateDialog.originalPayeeName}
  onConfirmBulk={entityState.confirmBulkTransferUpdate}
  onKeepSingle={entityState.cancelBulkTransferUpdate}
  onRevert={entityState.revertTransferUpdate} />
