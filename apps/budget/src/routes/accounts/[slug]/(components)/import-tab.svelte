<script lang="ts">
import PayeeCleanupStep from '$lib/components/import/cleanup/payee-cleanup-step.svelte';
import ColumnMapper from '$lib/components/import/column-mapper.svelte';
import type { AliasCandidate } from '$lib/components/import/import-preview-columns';
import ImportPreviewTable from '$lib/components/import/import-preview-table.svelte';
import {
	createMultiFileImportState,
	MultiFileUpload,
	FileProgress,
	CombinedReview
} from './import';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { bulkCreateCategoryAliases } from '$lib/query/category-aliases';
import { bulkCreatePayeeAliases } from '$lib/query/payee-aliases';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Progress } from '$lib/components/ui/progress';
import type { ImportProfile } from '$lib/schema/import-profiles';
import { CategoriesState } from '$lib/states/entities/categories.svelte';
import { PayeesState } from '$lib/states/entities/payees.svelte';
import { currentWorkspace } from '$lib/states/current-workspace.svelte';
import { TOUR_TIMING } from '$lib/constants/tour-steps';
import { demoMode } from '$lib/states/ui/demo-mode.svelte';
import { trpc } from '$lib/trpc/client';
import type {
	CleanupState,
	ColumnMapping,
	ImportPreviewData,
	ImportResult,
	ImportRow,
	ParseResult
} from '$lib/types/import';
import {
	PAYMENT_PROCESSORS,
	countProcessorTransactions,
	detectPaymentProcessor
} from '$lib/utils/import/payment-processor-filter';
import { arePayeesSimilar } from '$lib/utils/payee-matching';
import Circle from '@lucide/svelte/icons/circle';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import Save from '@lucide/svelte/icons/save';
import Sparkles from '@lucide/svelte/icons/sparkles';
import { useQueryClient } from '@tanstack/svelte-query';
import { toast } from '$lib/utils/toast-interceptor';

let {
	accountId,
	accountSlug,
	accountName
}: {
	accountId: number;
	accountSlug: string;
	accountName: string;
} = $props();

const queryClient = useQueryClient();

// Get workspace state at component initialization (getContext must be called during init)
const workspaceState = currentWorkspace.get();
const categoryState = CategoriesState.get();
const payeeState = PayeesState.get();

// Step only tracks top-level state: upload (multi-file flow handles all sub-steps) or complete
type Step = 'upload' | 'complete';

let currentStep = $state<Step>('upload');

// Multi-file import state
const multiFileState = createMultiFileImportState();
let parseResults = $state<ParseResult | null>(null);
let columnMapping = $state<ColumnMapping | null>(null);
let importResult = $state<ImportResult | null>(null);
let isProcessing = $state(false);
let error = $state<string | null>(null);
let cleanupState = $state<CleanupState | null>(null);
let cleanupSheetOpen = $state(false);

// Import progress tracking
let importProgress = $state(0);
let importProgressMessage = $state('');
let isImportStreaming = $state(false);

// Multi-file processing message
let multiFileProcessingMessage = $state('');

// Multi-file cleanup state (per-file)
let multiFileCleanupState = $state<CleanupState | null>(null);

// Filter multi-file cleanup state to remove payee groups where ALL members are transfers
const filteredMultiFileCleanupState = $derived.by(() => {
	if (!multiFileCleanupState) return null;

	const currentFile = multiFileState.currentFile;
	const overrides = currentFile?.entityOverrides || {};

	const filteredPayeeGroups = multiFileCleanupState.payeeGroups.filter((group) => {
		return group.members.some((member) => {
			const override = overrides[member.rowIndex];
			return !override?.transferAccountId;
		});
	});

	return {
		...multiFileCleanupState,
		payeeGroups: filteredPayeeGroups
	};
});

// Create derived multi-file preview data with entity overrides merged in
const multiFilePreviewData = $derived.by(() => {
	const currentFile = multiFileState.currentFile;
	if (!currentFile || !currentFile.validatedRows) return null;

	const overrides = currentFile.entityOverrides || {};

	return currentFile.validatedRows.map((row) => {
		const override = overrides[row.rowIndex];
		const originalPayee = (row.normalizedData['originalPayee'] ?? row.normalizedData['payee']) as string | null;

		return {
			...row,
			originalPayee,
			normalizedData: {
				...row.normalizedData,
				amount: importOptions.reverseAmountSigns && row.normalizedData['amount']
					? -row.normalizedData['amount']
					: row.normalizedData['amount'],
				payee: override?.payeeName !== undefined ? override.payeeName : row.normalizedData['payee'],
				category: override?.categoryName !== undefined ? override.categoryName : row.normalizedData['category'],
				description: override?.description !== undefined
					? override.description
					: row.normalizedData['description'] || row.normalizedData['notes'],
				transferAccountId: override?.transferAccountId !== undefined
					? override.transferAccountId
					: row.normalizedData['transferAccountId'] ?? null,
				transferAccountName: override?.transferAccountName !== undefined
					? override.transferAccountName
					: row.normalizedData['transferAccountName'] ?? null,
				rememberTransferMapping: override?.rememberTransferMapping !== undefined
					? override.rememberTransferMapping
					: row.normalizedData['rememberTransferMapping'] ?? false
			}
		};
	});
});

// Payee alias tracking - records mappings from raw CSV strings to selected payees
let aliasCandidates = $state<Map<number, AliasCandidate>>(new Map());
const createAliasesMutation = bulkCreatePayeeAliases.options();
const createCategoryAliasesMutation = bulkCreateCategoryAliases.options();

// Category dismissal tracking - records when user clears AI-suggested categories (negative feedback)
interface CategoryDismissal {
	rowIndex: number;
	payeeId: number | null;
	payeeName: string;
	rawPayeeString: string; // Original payee string from import file (e.g., "APPLECARD GSBANK")
	dismissedCategoryId: number;
	dismissedCategoryName: string;
	amount?: number;
	date?: string;
}
let categoryDismissals = $state<Map<number, CategoryDismissal>>(new Map());

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
	isSaving: false
});

// Pre-set account ID from props
const selectedAccountId = $derived(accountId.toString());

// Entity overrides
let entityOverrides = $state<
	Record<
		number,
		{
			payeeId?: number | null;
			payeeName?: string | null;
			categoryId?: number | null;
			categoryName?: string | null;
			description?: string | null;
			// Transfer support - when set, this row creates a transfer instead of regular transaction
			transferAccountId?: number | null;
			transferAccountName?: string | null;
			rememberTransferMapping?: boolean;
		}
	>
>({});

// Import options
let importOptions = $state({
	createMissingPayees: true,
	createMissingCategories: true,
	allowPartialImport: true,
	reverseAmountSigns: false
});

// Compatibility aliases (for existing code that uses individual variables)
const createMissingPayees = $derived(importOptions.createMissingPayees);
const createMissingCategories = $derived(importOptions.createMissingCategories);
const allowPartialImport = $derived(importOptions.allowPartialImport);
const reverseAmountSigns = $derived(importOptions.reverseAmountSigns);

function handleImportOptionsChange(options: typeof importOptions) {
	importOptions = options;
}

// Create reactive preview data
const previewData = $derived.by(() => {
	if (!parseResults) return null;

	return {
		...parseResults,
		rows: parseResults.rows.map((row) => {
			const override = entityOverrides[row.rowIndex];
			// Store the original payee value from the CSV before any overrides
			// Use 'originalPayee' if set by infer-categories (true raw value), otherwise fall back to 'payee'
			const originalPayee = (row.normalizedData['originalPayee'] ?? row.normalizedData['payee']) as string | null;

			return {
				...row,
				// Preserve the original payee for alias tracking
				originalPayee,
				normalizedData: {
					...row.normalizedData,
					amount:
						reverseAmountSigns && row.normalizedData['amount']
							? -row.normalizedData['amount']
							: row.normalizedData['amount'],
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
					// Transfer fields - fall back to row.normalizedData for auto-accepted mappings
					transferAccountId:
						override?.transferAccountId !== undefined
							? override.transferAccountId
							: row.normalizedData['transferAccountId'] ?? null,
					transferAccountName:
						override?.transferAccountName !== undefined
							? override.transferAccountName
							: row.normalizedData['transferAccountName'] ?? null,
					rememberTransferMapping:
						override?.rememberTransferMapping !== undefined
							? override.rememberTransferMapping
							: row.normalizedData['rememberTransferMapping'] ?? false
				}
			};
		})
	};
});

// Derive temporary entities
const temporaryCategories = $derived.by(() => {
	const tempCats = new Set<string>();

	if (previewData) {
		// Use categoryState initialized at component level (getContext must be called during component init)
		const existingCategoryNames = categoryState
			? new Set(Array.from(categoryState.categories.values()).map((c) => c.name?.toLowerCase()))
			: new Set();

		previewData.rows.forEach((row) => {
			const categoryName = row.normalizedData['category'];
			if (categoryName && typeof categoryName === 'string') {
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

	if (previewData) {
		// Use payeeState initialized at component level (getContext must be called during component init)
		const existingPayeeNames = payeeState
			? new Set(Array.from(payeeState.payees.values()).map((p) => p.name?.toLowerCase()))
			: new Set();

		previewData.rows.forEach((row) => {
			const payeeName = row.normalizedData['payee'];
			if (payeeName && typeof payeeName === 'string') {
				if (!existingPayeeNames.has(payeeName.toLowerCase())) {
					tempPayees.add(payeeName);
				}
			}
		});
	}

	return Array.from(tempPayees);
});

// Handler for payee updates
function handlePayeeUpdate(rowIndex: number, payeeId: number | null, payeeName: string | null) {
	entityOverrides = {
		...entityOverrides,
		[rowIndex]: {
			...entityOverrides[rowIndex],
			payeeId,
			payeeName,
			// Clear transfer when setting payee
			transferAccountId: null,
			transferAccountName: null,
			rememberTransferMapping: false
		}
	};
}

// Handler for transfer account updates
function handleTransferAccountUpdate(
	rowIndex: number,
	accountId: number | null,
	accountName: string | null,
	rememberMapping: boolean = false
) {
	entityOverrides = {
		...entityOverrides,
		[rowIndex]: {
			...entityOverrides[rowIndex],
			// Clear payee when setting transfer
			payeeId: null,
			payeeName: null,
			// Set transfer fields
			transferAccountId: accountId,
			transferAccountName: accountName,
			rememberTransferMapping: rememberMapping
		}
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
	matches: [] as Array<{ item: any }>
});

function handlePayeeUpdateWithSimilar(
	rowIndex: number,
	payeeId: number | null,
	payeeName: string | null
) {
	if (!parseResults) return;

	const previousOverride = entityOverrides[rowIndex];
	const previousPayeeId = previousOverride?.payeeId !== undefined ? previousOverride.payeeId : null;
	const previousPayeeName =
		previousOverride?.payeeName !== undefined ? previousOverride.payeeName : null;

	handlePayeeUpdate(rowIndex, payeeId, payeeName);

	const selectedRow = parseResults.rows.find((r) => r.rowIndex === rowIndex);
	if (!selectedRow) return;

	const originalPayeeName = selectedRow.normalizedData['payee'];
	if (!originalPayeeName || typeof originalPayeeName !== 'string') return;

	const matchesToUpdate = parseResults.rows
		.filter((row) => {
			if (row.rowIndex === rowIndex) return false;
			const rowPayee = row.normalizedData['payee'];
			if (!rowPayee || typeof rowPayee !== 'string') return false;
			// Use similarity matching to catch payees with different amounts in the name
			return arePayeesSimilar(rowPayee, originalPayeeName);
		})
		.map((item) => ({ item }));

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
			matches: matchesToUpdate
		};
	}
}

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

	if (updatedCount > 0) {
		const payeeDisplay = bulkPayeeUpdateDialog.payeeName || 'None';
		toast.success(
			`Updated payee to "${payeeDisplay}" for ${updatedCount + 1} similar transaction${updatedCount + 1 > 1 ? 's' : ''}`
		);
	}

	bulkPayeeUpdateDialog.open = false;
}

function cancelBulkPayeeUpdate() {
	bulkPayeeUpdateDialog.open = false;
}

function revertPayeeUpdate() {
	const { rowIndex, previousPayeeId, previousPayeeName } = bulkPayeeUpdateDialog;
	handlePayeeUpdate(rowIndex, previousPayeeId, previousPayeeName);
	bulkPayeeUpdateDialog.open = false;
}

// State for bulk transfer update confirmation dialog
let bulkTransferUpdateDialog = $state({
	open: false,
	rowIndex: 0,
	accountId: null as number | null,
	accountName: null as string | null,
	rememberMapping: false,
	originalPayeeName: '',
	matchCount: 0,
	matches: [] as Array<{ item: any }>
});

function handleTransferAccountUpdateWithSimilar(
	rowIndex: number,
	accountId: number | null,
	accountName: string | null,
	rememberMapping: boolean = false
) {
	if (!parseResults) return;

	// Apply the update to the selected row first
	handleTransferAccountUpdate(rowIndex, accountId, accountName, rememberMapping);

	// If clearing the transfer, don't prompt for similar
	if (!accountId) return;

	const selectedRow = parseResults.rows.find((r) => r.rowIndex === rowIndex);
	if (!selectedRow) return;

	const originalPayeeName = selectedRow.normalizedData['payee'];
	if (!originalPayeeName || typeof originalPayeeName !== 'string') return;

	// Find similar payees that aren't already set as transfers
	const matchesToUpdate = parseResults.rows
		.filter((row) => {
			if (row.rowIndex === rowIndex) return false;
			const rowPayee = row.normalizedData['payee'];
			if (!rowPayee || typeof rowPayee !== 'string') return false;
			// Check if already a transfer
			const override = entityOverrides[row.rowIndex];
			if (override?.transferAccountId) return false;
			// Use similarity matching
			return arePayeesSimilar(rowPayee, originalPayeeName);
		})
		.map((item) => ({ item }));

	if (matchesToUpdate.length > 0) {
		bulkTransferUpdateDialog = {
			open: true,
			rowIndex,
			accountId,
			accountName,
			rememberMapping,
			originalPayeeName,
			matchCount: matchesToUpdate.length,
			matches: matchesToUpdate
		};
	}
}

function confirmBulkTransferUpdate() {
	if (!bulkTransferUpdateDialog.matches) return;

	let updatedCount = 0;
	bulkTransferUpdateDialog.matches.forEach((match) => {
		handleTransferAccountUpdate(
			match.item.rowIndex,
			bulkTransferUpdateDialog.accountId,
			bulkTransferUpdateDialog.accountName,
			bulkTransferUpdateDialog.rememberMapping
		);
		updatedCount++;
	});

	if (updatedCount > 0) {
		const accountDisplay = bulkTransferUpdateDialog.accountName || 'None';
		toast.success(
			`Set transfer to "${accountDisplay}" for ${updatedCount + 1} similar transaction${updatedCount + 1 > 1 ? 's' : ''}`
		);
	}

	bulkTransferUpdateDialog.open = false;
}

function cancelBulkTransferUpdate() {
	bulkTransferUpdateDialog.open = false;
}

function revertTransferUpdate() {
	const { rowIndex } = bulkTransferUpdateDialog;
	handleTransferAccountUpdate(rowIndex, null, null, false);
	bulkTransferUpdateDialog.open = false;
}

// Payment processor filter state
let processorFilterDialog = $state({
	open: false,
	selectedProcessors: new Set<string>(),
	affectedCount: 0
});

const processorAnalysis = $derived.by(() => {
	if (!parseResults) return { total: 0, byProcessor: new Map<string, number>() };

	const payeeNames = parseResults.rows
		.map((row) => row.normalizedData['payee'])
		.filter((name): name is string => typeof name === 'string');

	return countProcessorTransactions(payeeNames);
});

function openProcessorFilterDialog() {
	const preselected = new Set<string>();
	for (const [processor, count] of processorAnalysis.byProcessor) {
		if (count > 0) {
			preselected.add(processor);
		}
	}

	processorFilterDialog = {
		open: true,
		selectedProcessors: preselected,
		affectedCount: processorAnalysis.total
	};
}

function toggleProcessor(processorName: string) {
	const newSelection = new Set(processorFilterDialog.selectedProcessors);
	if (newSelection.has(processorName)) {
		newSelection.delete(processorName);
	} else {
		newSelection.add(processorName);
	}

	let count = 0;
	for (const [processor, processorCount] of processorAnalysis.byProcessor) {
		if (newSelection.has(processor)) {
			count += processorCount;
		}
	}

	processorFilterDialog = {
		...processorFilterDialog,
		selectedProcessors: newSelection,
		affectedCount: count
	};
}

function applyProcessorFilter() {
	if (!parseResults || processorFilterDialog.selectedProcessors.size === 0) {
		processorFilterDialog.open = false;
		return;
	}

	let updatedCount = 0;

	parseResults.rows.forEach((row) => {
		const payeeName = row.normalizedData['payee'];
		if (!payeeName || typeof payeeName !== 'string') return;

		const detection = detectPaymentProcessor(payeeName);
		if (detection && processorFilterDialog.selectedProcessors.has(detection.processor)) {
			const filteredName = detection.merchantName;
			handlePayeeUpdate(row.rowIndex, null, filteredName);
			updatedCount++;
		}
	});

	if (updatedCount > 0) {
		toast.success(
			`Filtered payment processors from ${updatedCount} transaction${updatedCount !== 1 ? 's' : ''}`
		);
	}

	processorFilterDialog.open = false;
}

function cancelProcessorFilter() {
	processorFilterDialog.open = false;
}

// Category update handlers
function handleCategoryUpdate(
	rowIndex: number,
	categoryId: number | null,
	categoryName: string | null
) {
	// Track dismissals: when user clears a category that was AI-suggested
	const isClearingCategory = categoryName === null || categoryName === '';

	if (isClearingCategory) {
		// Get the row data
		const row = parseResults?.rows.find(r => r.rowIndex === rowIndex);
		let dismissalTracked = false;

		// First check: alias-based categories (from infer-categories endpoint)
		// These are stored directly on normalizedData
		// Check multiple sources for category: inferredCategoryId > categoryId
		if (row) {
			// Get category ID from multiple possible sources (in priority order)
			const inferredCategoryId = row.normalizedData['inferredCategoryId'] as number | undefined;
			const categoryId = row.normalizedData['categoryId'] as number | undefined;
			const dismissCategoryId = inferredCategoryId || categoryId;

			// Get category name from multiple possible sources
			const inferredCategoryName = row.normalizedData['inferredCategory'] as string | undefined;
			const categoryName = row.normalizedData['category'] as string | undefined;
			const dismissCategoryName = inferredCategoryName || categoryName;

			const categoryConfidence = row.normalizedData['categoryConfidence'] as number | undefined;
			const originalPayee = row.normalizedData['originalPayee'] as string || row.normalizedData['payee'] as string || '';

			// Track dismissal if there was ANY auto-filled category
			// (either from inferredCategory, category, or payee default)
			if (dismissCategoryId && dismissCategoryName) {
				const payeeName = row.normalizedData['payee'] as string || '';
				const payee = payeeState?.payees
					? Array.from(payeeState.payees.values()).find(p => p.name?.toLowerCase() === payeeName.toLowerCase())
					: null;

				const newDismissals = new Map(categoryDismissals);
				newDismissals.set(rowIndex, {
					rowIndex,
					payeeId: payee?.id ?? null,
					payeeName: payeeName, // Normalized payee name
					rawPayeeString: originalPayee, // Original import string for alias matching
					dismissedCategoryId: dismissCategoryId,
					dismissedCategoryName: dismissCategoryName,
					amount: row.normalizedData['amount'] as number | undefined,
					date: row.normalizedData['date'] as string | undefined
				});
				categoryDismissals = newDismissals;
				dismissalTracked = true;
			}
		}

		// Second check: cleanupState suggestions (from cleanup analysis)
		if (!dismissalTracked && cleanupState?.categorySuggestions) {
			const suggestion = cleanupState.categorySuggestions.find(s => s.rowIndex === rowIndex);
			if (suggestion && suggestion.suggestions.length > 0) {
				const topSuggestion = suggestion.suggestions[0];
				// Only track if there was a high-confidence auto-fill (>=0.7)
				if (topSuggestion.confidence >= 0.7) {
					const payeeName = row?.normalizedData['payee'] as string || '';
					const originalPayee = row?.normalizedData['originalPayee'] as string || payeeName;
					const payee = payeeState?.payees
						? Array.from(payeeState.payees.values()).find(p => p.name?.toLowerCase() === payeeName.toLowerCase())
						: null;

					const newDismissals = new Map(categoryDismissals);
					newDismissals.set(rowIndex, {
						rowIndex,
						payeeId: payee?.id ?? null,
						payeeName: payeeName, // Normalized payee name
						rawPayeeString: originalPayee, // Original import string for alias matching
						dismissedCategoryId: topSuggestion.categoryId,
						dismissedCategoryName: topSuggestion.categoryName,
						amount: row?.normalizedData['amount'] as number | undefined,
						date: row?.normalizedData['date'] as string | undefined
					});
					categoryDismissals = newDismissals;
				}
			}
		}
	} else {
		// User selected a category, remove any previous dismissal for this row
		if (categoryDismissals.has(rowIndex)) {
			const newDismissals = new Map(categoryDismissals);
			newDismissals.delete(rowIndex);
			categoryDismissals = newDismissals;
		}
	}

	entityOverrides = {
		...entityOverrides,
		[rowIndex]: {
			...entityOverrides[rowIndex],
			categoryId,
			categoryName
		}
	};
}

function handleDescriptionUpdate(rowIndex: number, description: string | null) {
	entityOverrides = {
		...entityOverrides,
		[rowIndex]: {
			...entityOverrides[rowIndex],
			description
		}
	};
}

// Bulk category update state
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
	matchesByCategory: [] as Array<{ item: any }>
});

// Track whether bulk update is for multi-file mode
let bulkUpdateIsMultiFile = $state(false);

function handleCategoryUpdateWithSimilar(
	rowIndex: number,
	categoryId: number | null,
	categoryName: string | null
) {
	if (!parseResults) return;

	const isClearingCategory = !categoryName || categoryName.trim() === '';
	const selectedRow = parseResults.rows.find((r) => r.rowIndex === rowIndex);
	if (!selectedRow) return;

	const payeeName = selectedRow.normalizedData['payee'];
	if (!payeeName || typeof payeeName !== 'string') {
		handleCategoryUpdate(rowIndex, categoryId, categoryName);
		return;
	}

	const previousCategoryName =
		entityOverrides[rowIndex]?.categoryName || selectedRow.normalizedData['category'] || null;
	const hasRealPreviousCategory = previousCategoryName && previousCategoryName.trim() !== '';

	if (isClearingCategory && !hasRealPreviousCategory) {
		handleCategoryUpdate(rowIndex, categoryId, categoryName);
		return;
	}

	const matchesByPayee = parseResults.rows
		.filter((row) => {
			if (row.rowIndex === rowIndex) return false;
			const rowPayee = row.normalizedData['payee'];
			if (!rowPayee || typeof rowPayee !== 'string') return false;
			// Note: We include transfer rows here because the user may want to
			// clear categories from all similar-payee rows at once (even if transfers
			// don't use categories, clearing them is harmless)
			return arePayeesSimilar(rowPayee, payeeName);
		})
		.map((item) => ({ item }));

	let matchesByCategory: Array<{ item: any }> = [];

	if (hasRealPreviousCategory) {
		matchesByCategory = parseResults.rows
			.map((row, idx) => ({ item: row, index: idx }))
			.filter(({ item }) => {
				if (item.rowIndex === rowIndex) return false;
				// Exclude rows that are transfers - their "category" is leftover data
				// that won't be used, so they shouldn't be counted as "same category" matches
				const override = entityOverrides[item.rowIndex];
				if (override?.transferAccountId) return false;
				const rowCategory = override?.categoryName || item.normalizedData['category'];
				return rowCategory === previousCategoryName;
			});
	}

	if (matchesByPayee.length > 0 || matchesByCategory.length > 0) {
		bulkUpdateIsMultiFile = false;
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
			matchesByCategory
		};
	} else {
		handleCategoryUpdate(rowIndex, categoryId, categoryName);
	}
}

// Helper to apply category update in either single-file or multi-file mode
function applyBulkCategoryUpdate(rowIndex: number, categoryId: number | null, categoryName: string | null) {
	if (bulkUpdateIsMultiFile) {
		handleMultiFileCategoryUpdate(rowIndex, categoryId, categoryName);
	} else {
		handleCategoryUpdate(rowIndex, categoryId, categoryName);
	}
}

function confirmBulkUpdateJustOne() {
	applyBulkCategoryUpdate(
		bulkUpdateDialog.rowIndex,
		bulkUpdateDialog.categoryId,
		bulkUpdateDialog.categoryName
	);
	bulkUpdateDialog.open = false;
}

function confirmBulkUpdateByPayee() {
	if (!bulkUpdateDialog.matchesByPayee) return;

	applyBulkCategoryUpdate(
		bulkUpdateDialog.rowIndex,
		bulkUpdateDialog.categoryId,
		bulkUpdateDialog.categoryName
	);

	let updatedCount = 0;
	bulkUpdateDialog.matchesByPayee.forEach((match) => {
		applyBulkCategoryUpdate(
			match.item.rowIndex,
			bulkUpdateDialog.categoryId,
			bulkUpdateDialog.categoryName
		);
		updatedCount++;
	});

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

function confirmBulkUpdateByCategory() {
	if (!bulkUpdateDialog.matchesByCategory) return;

	applyBulkCategoryUpdate(
		bulkUpdateDialog.rowIndex,
		bulkUpdateDialog.categoryId,
		bulkUpdateDialog.categoryName
	);

	let updatedCount = 0;
	bulkUpdateDialog.matchesByCategory.forEach((match) => {
		applyBulkCategoryUpdate(
			match.item.rowIndex,
			bulkUpdateDialog.categoryId,
			bulkUpdateDialog.categoryName
		);
		updatedCount++;
	});

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

function confirmBulkUpdateBoth() {
	applyBulkCategoryUpdate(
		bulkUpdateDialog.rowIndex,
		bulkUpdateDialog.categoryId,
		bulkUpdateDialog.categoryName
	);

	const allMatches = [
		...(bulkUpdateDialog.matchesByPayee || []),
		...(bulkUpdateDialog.matchesByCategory || [])
	];

	const uniqueMatches = allMatches.filter(
		(match, index, self) => index === self.findIndex((m) => m.item.rowIndex === match.item.rowIndex)
	);

	let updatedCount = 0;
	uniqueMatches.forEach((match) => {
		applyBulkCategoryUpdate(
			match.item.rowIndex,
			bulkUpdateDialog.categoryId,
			bulkUpdateDialog.categoryName
		);
		updatedCount++;
	});

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

function cancelBulkUpdate() {
	bulkUpdateDialog.open = false;
}

// Smart categorization
async function applySmartCategorization() {
	if (!parseResults) return;

	// Use workspaceId from the pre-initialized workspace state
	const workspaceId = workspaceState?.workspaceId;

	try {
		const response = await fetch('/api/import/infer-categories', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				rows: parseResults.rows,
				workspaceId  // Pass workspaceId explicitly for payee alias matching
			})
		});

		if (response.ok) {
			const result = await response.json();
			parseResults.rows = result.rows;
		}
	} catch (err) {
		console.error('Failed to apply smart data enrichment:', err);
	}
}

// Smart categorization for multi-file import
async function applySmartCategorizationToFile(fileId: string, rows: ImportRow[]): Promise<ImportRow[]> {
	const workspaceId = workspaceState?.workspaceId;

	try {
		const response = await fetch('/api/import/infer-categories', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				rows,
				workspaceId
			})
		});

		if (response.ok) {
			const result = await response.json();
			return result.rows;
		}
	} catch (err) {
		console.error('Failed to apply smart data enrichment for file:', fileId, err);
	}

	return rows;
}

// Multi-file import handlers
async function handleMultiFileProcessing() {
	const currentFile = multiFileState.currentFile;
	if (!currentFile) return;

	isProcessing = true;
	multiFileProcessingMessage = 'Parsing file...';
	error = null;

	try {
		multiFileState.updateFileState(currentFile.id, { status: 'uploading' });

		const formData = new FormData();
		formData.append('importFile', currentFile.file);

		const response = await fetch(`/api/import/upload?accountId=${accountId}`, {
			method: 'POST',
			body: formData
		});

		const responseText = await response.text();

		let result;
		try {
			result = JSON.parse(responseText);
		} catch (e) {
			console.error('[MultiFileImport] Failed to parse response:', e);
			throw new Error('Invalid response from server');
		}

		if (!response.ok) {
			console.error('[MultiFileImport] Upload failed:', result);
			throw new Error(result.error || 'Upload failed');
		}

		// The API returns ParseResult directly at the top level
		// For CSV/Excel files, we need column mapping
		const needsMapping = currentFile.needsColumnMapping ?? false;
		let detectedProfileMapping: ColumnMapping | undefined;

		// Try to find a matching import profile for CSV files (to pre-populate the mapper)
		if (needsMapping && result.columns?.length > 0) {
			multiFileProcessingMessage = 'Checking for saved profiles...';
			try {
				const profile = await trpc().importProfileRoutes.findMatch.query({
					headers: result.columns,
					filename: currentFile.fileName,
					accountId: accountId
				});

				if (profile) {
					detectedProfileMapping = profile.mapping as ColumnMapping;
					matchedProfile = profile; // Track that a profile was used (hides "Save Profile" on completion)
					// Record profile usage
					trpc().importProfileRoutes.recordUsage.mutate({ id: profile.id });
				}
			} catch (profileErr) {
				console.warn('[MultiFileImport] Failed to check for matching import profile:', profileErr);
			}
		}

		// Update file state with parse result
		multiFileState.setParseResult(
			currentFile.id,
			result, // ParseResult is at top level
			needsMapping
		);
		multiFileState.setValidatedRows(currentFile.id, result.rows || []);

		// Store detected profile mapping on file state for the column mapper to use
		if (detectedProfileMapping) {
			multiFileState.setColumnMapping(currentFile.id, detectedProfileMapping);
		}

		// If auto-detected format (OFX, QIF, etc.), go to cleanup step first
		if (!needsMapping) {
			// Apply smart categorization before cleanup
			const enrichedRows = await applySmartCategorizationToFile(currentFile.id, result.rows || []);
			multiFileState.setValidatedRows(currentFile.id, enrichedRows);
			// Go to cleanup step for payee review
			multiFileState.updateFileState(currentFile.id, { status: 'cleanup' });
		}
		// If needs mapping, the UI will show the mapping step
	} catch (err) {
		multiFileState.markFileError(
			currentFile.id,
			err instanceof Error ? err.message : 'Unknown error'
		);
		toast.error(`Failed to process ${currentFile.fileName}`);
	} finally {
		isProcessing = false;
		multiFileProcessingMessage = '';
	}
}

async function handleMultiFileColumnMapping(fileId: string, mapping: ColumnMapping) {
	const file = multiFileState.files.find((f) => f.id === fileId);
	if (!file) return;

	isProcessing = true;
	multiFileProcessingMessage = 'Applying column mapping...';

	try {
		// Convert file to base64 for the remap API
		const fileBuffer = await file.file.arrayBuffer();
		const base64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

		const response = await fetch('/api/import/remap', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				file: {
					data: base64,
					name: file.fileName,
					type: file.file.type || 'text/csv'
				},
				columnMapping: mapping,
				accountId: accountId.toString()
			})
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || 'Mapping failed');
		}

		const result = await response.json();

		multiFileProcessingMessage = 'Inferring categories...';

		// Apply smart categorization to infer categories from payee patterns
		const enrichedRows = await applySmartCategorizationToFile(fileId, result.rows || []);

		multiFileState.setColumnMapping(fileId, mapping);
		// Store the enriched rows with category suggestions
		multiFileState.setValidatedRows(fileId, enrichedRows);

		// Preserve mapping info for "Save Import Profile" feature on completion
		// Use the first file's mapping and headers
		if (!columnMapping) {
			columnMapping = mapping;
			csvHeaders = file.parseResult?.columns || [];
		}

		// Go to cleanup step so user can review payee groupings before preview
		multiFileState.updateFileState(fileId, { status: 'cleanup' });
	} catch (err) {
		multiFileState.markFileError(fileId, err instanceof Error ? err.message : 'Unknown error');
		toast.error(`Failed to map columns for ${file.fileName}`);
	} finally {
		isProcessing = false;
		multiFileProcessingMessage = '';
	}
}

/**
 * Confirm preview for current file and move to next file or review
 */
async function handleMultiFilePreviewConfirm() {
	const currentFile = multiFileState.currentFile;
	if (!currentFile) return;

	multiFileState.markFileReady(currentFile.id);

	// Move to next file or review
	if (multiFileState.isLastFile) {
		multiFileState.setGlobalStep('review');
	} else {
		multiFileState.nextFile();
		await handleMultiFileProcessing();
	}
}

/**
 * Handle entity updates during multi-file preview
 */
function handleMultiFilePayeeUpdate(rowIndex: number, payeeId: number | null, payeeName: string | null) {
	const currentFile = multiFileState.currentFile;
	if (!currentFile) return;

	const overrides = { ...(currentFile.entityOverrides || {}) };
	overrides[rowIndex] = {
		...(overrides[rowIndex] || {}),
		payeeId,
		payeeName,
		// Clear transfer when setting payee
		transferAccountId: null,
		transferAccountName: null
	};
	multiFileState.setEntityOverrides(currentFile.id, overrides);
}

function handleMultiFileCategoryUpdate(rowIndex: number, categoryId: number | null, categoryName: string | null) {
	const currentFile = multiFileState.currentFile;
	if (!currentFile) return;

	const overrides = { ...(currentFile.entityOverrides || {}) };
	overrides[rowIndex] = {
		...(overrides[rowIndex] || {}),
		categoryId,
		categoryName
	};
	multiFileState.setEntityOverrides(currentFile.id, overrides);
}

function handleMultiFileCategoryUpdateWithSimilar(
	rowIndex: number,
	categoryId: number | null,
	categoryName: string | null
) {
	const currentFile = multiFileState.currentFile;
	if (!currentFile || !currentFile.validatedRows) return;

	const isClearingCategory = !categoryName || categoryName.trim() === '';
	const selectedRow = currentFile.validatedRows.find((r) => r.rowIndex === rowIndex);
	if (!selectedRow) return;

	const payeeName = selectedRow.normalizedData['payee'];
	if (!payeeName || typeof payeeName !== 'string') {
		handleMultiFileCategoryUpdate(rowIndex, categoryId, categoryName);
		return;
	}

	const overrides = currentFile.entityOverrides || {};
	const previousCategoryName =
		overrides[rowIndex]?.categoryName || selectedRow.normalizedData['category'] || null;
	const hasRealPreviousCategory = previousCategoryName && previousCategoryName.trim() !== '';

	if (isClearingCategory && !hasRealPreviousCategory) {
		handleMultiFileCategoryUpdate(rowIndex, categoryId, categoryName);
		return;
	}

	const matchesByPayee = currentFile.validatedRows
		.filter((row) => {
			if (row.rowIndex === rowIndex) return false;
			const rowPayee = row.normalizedData['payee'];
			if (!rowPayee || typeof rowPayee !== 'string') return false;
			return arePayeesSimilar(rowPayee, payeeName);
		})
		.map((item) => ({ item }));

	let matchesByCategory: Array<{ item: any }> = [];

	if (hasRealPreviousCategory) {
		matchesByCategory = currentFile.validatedRows
			.filter((item) => {
				if (item.rowIndex === rowIndex) return false;
				// Exclude rows that are transfers
				const override = overrides[item.rowIndex];
				if (override?.transferAccountId) return false;
				const rowCategory = override?.categoryName || item.normalizedData['category'];
				return rowCategory === previousCategoryName;
			})
			.map((item) => ({ item }));
	}

	if (matchesByPayee.length > 0 || matchesByCategory.length > 0) {
		bulkUpdateIsMultiFile = true;
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
			matchesByCategory
		};
	} else {
		handleMultiFileCategoryUpdate(rowIndex, categoryId, categoryName);
	}
}

function handleMultiFileDescriptionUpdate(rowIndex: number, description: string | null) {
	const currentFile = multiFileState.currentFile;
	if (!currentFile) return;

	const overrides = { ...(currentFile.entityOverrides || {}) };
	overrides[rowIndex] = {
		...(overrides[rowIndex] || {}),
		description
	};
	multiFileState.setEntityOverrides(currentFile.id, overrides);
}

function handleMultiFileTransferUpdate(
	rowIndex: number,
	transferAccountId: number | null,
	transferAccountName: string | null,
	rememberMapping?: boolean
) {
	const currentFile = multiFileState.currentFile;
	if (!currentFile) return;

	const overrides = { ...(currentFile.entityOverrides || {}) };
	if (transferAccountId) {
		// Setting a transfer - clear payee and category
		overrides[rowIndex] = {
			...(overrides[rowIndex] || {}),
			payeeId: null,
			payeeName: null,
			categoryId: null,
			categoryName: null,
			transferAccountId,
			transferAccountName,
			rememberTransferMapping: rememberMapping
		};
	} else {
		// Clearing a transfer - just remove transfer fields, keep everything else
		overrides[rowIndex] = {
			...(overrides[rowIndex] || {}),
			transferAccountId: null,
			transferAccountName: null,
			rememberTransferMapping: false
		};
	}
	multiFileState.setEntityOverrides(currentFile.id, overrides);
}

async function handleMultiFileImport() {
	isProcessing = true;
	isImportStreaming = true;
	importProgress = 0;
	importProgressMessage = 'Preparing import...';

	try {
		// Collect all validated rows from all files
		const allRows = multiFileState.getAllValidatedRows();
		const allOverrides = multiFileState.getAllEntityOverrides();

		// Apply entity overrides to rows
		const rowsWithOverrides = allRows.map((row, index) => {
			const override = allOverrides[index];
			// Extract originalPayee from normalizedData (set by infer-categories) for transfer mapping
			const originalPayee = (row.normalizedData['originalPayee'] ?? row.normalizedData['payee']) as string | null;
			if (override) {
				return {
					...row,
					// IMPORTANT: Set originalPayee at top level for import orchestrator to find
					originalPayee,
					normalizedData: {
						...row.normalizedData,
						payeeId: override.payeeId,
						payeeName: override.payeeName,
						// Also set 'payee' - the import orchestrator reads this field for payee matching
						payee: override.payeeName ?? row.normalizedData['payee'],
						categoryId: override.categoryId,
						categoryName: override.categoryName,
						// Also set 'category' - the import orchestrator reads this field for category matching
						category: override.categoryName ?? row.normalizedData['category'],
						description: override.description,
						transferAccountId: override.transferAccountId,
						transferAccountName: override.transferAccountName,
						rememberTransferMapping: override.rememberTransferMapping
					}
				};
			}
			return { ...row, originalPayee };
		});

		importProgressMessage = `Importing ${rowsWithOverrides.length} transactions...`;

		// Use streaming API for progress updates
		const response = await fetch('/api/import/process?stream=true', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				accountId,
				rows: rowsWithOverrides,
				options: importOptions
			})
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || 'Import failed');
		}

		// Process Server-Sent Events stream
		const reader = response.body?.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		if (reader) {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });

				// Process complete SSE messages
				const lines = buffer.split('\n\n');
				buffer = lines.pop() || ''; // Keep incomplete message in buffer

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						try {
							const data = JSON.parse(line.slice(6));

							if (data.type === 'progress') {
								const progress = data.progress;
								const percent = progress.totalRows > 0
									? Math.round((progress.currentRow / progress.totalRows) * 100)
									: 0;
								importProgress = percent;
								importProgressMessage = `Creating transactions... ${progress.currentRow}/${progress.totalRows}`;
							} else if (data.type === 'complete') {
								importResult = data.result;
							} else if (data.type === 'error') {
								throw new Error(data.error);
							}
						} catch (parseError) {
							console.error('Failed to parse SSE message:', parseError);
						}
					}
				}
			}
		}

		if (!importResult) {
			throw new Error('Import completed but no result received');
		}

		multiFileState.setGlobalStep('complete');
		currentStep = 'complete';

		// Invalidate queries - must include payees and categories since import creates new entities
		await queryClient.invalidateQueries({ queryKey: ['transactions'] });
		await queryClient.invalidateQueries({ queryKey: ['accounts'] });
		await queryClient.invalidateQueries({ queryKey: ['payees'] });
		await queryClient.invalidateQueries({ queryKey: ['categories'] });

		// Persist cleanup choices (payee aliases and transfer mappings) for future imports
		await persistCleanupChoices(importResult);

		toast.success(
			`Successfully imported ${importResult.transactionsCreated} transactions from ${multiFileState.files.length} files`
		);
	} catch (err) {
		toast.error(err instanceof Error ? err.message : 'Import failed');
	} finally {
		isProcessing = false;
		isImportStreaming = false;
		importProgress = 0;
		importProgressMessage = '';
	}
}

function resetMultiFileImport() {
	multiFileState.reset();
	multiFileCleanupState = null;
	lastAnalyzedFileId = null;
	currentStep = 'upload';
}


// Run cleanup analysis for multi-file imports
async function runMultiFileCleanupAnalysis() {
	const currentFile = multiFileState.currentFile;
	if (!currentFile || !currentFile.validatedRows || multiFileCleanupState?.isAnalyzing) return;

	// Initialize cleanup state
	multiFileCleanupState = {
		payeeGroups: [],
		categorySuggestions: [],
		isAnalyzing: true,
		analysisProgress: 0,
		analysisPhase: 'grouping_payees'
	};

	try {
		// Extract payee data from rows
		const payeeInputs = currentFile.validatedRows
			.filter((row) => row.normalizedData['payee'])
			.map((row) => {
				const data = row.normalizedData as Record<string, any>;
				const originalPayee = (row as any).originalPayee || data['originalPayee'] as string | undefined;
				return {
					rowIndex: row.rowIndex,
					payeeName: data['payee'] as string,
					originalPayee,
					amount: data['amount'] as number,
					date: data['date'] as string,
					memo: data['description'] || data['notes']
				};
			});

		if (payeeInputs.length === 0) {
			multiFileCleanupState = { ...multiFileCleanupState, isAnalyzing: false };
			return;
		}

		multiFileCleanupState = { ...multiFileCleanupState, analysisProgress: 20 };

		// Call the combined analysis endpoint
		const result = await trpc().importCleanupRoutes.analyzeImport.mutate({
			rows: payeeInputs
		});

		multiFileCleanupState = {
			...multiFileCleanupState,
			analysisProgress: 80,
			analysisPhase: 'suggesting_categories'
		};

		// Update state with results
		multiFileCleanupState = {
			payeeGroups: result.payeeGroups,
			categorySuggestions: result.categorySuggestions,
			isAnalyzing: false,
			analysisProgress: 100,
			analysisPhase: undefined
		};

		// Apply high-confidence category suggestions to multi-file entity overrides
		// Skip rows that are suggested transfers (transfers don't have categories)
		const currentOverrides = { ...(currentFile.entityOverrides || {}) };
		for (const suggestion of result.categorySuggestions) {
			if (suggestion.suggestions.length > 0) {
				const topSuggestion = suggestion.suggestions[0];
				if (topSuggestion.confidence >= 0.7) {
					// Check if this row has a suggested transfer - if so, skip category
					const row = currentFile.validatedRows?.find(r => r.rowIndex === suggestion.rowIndex);
					const isTransfer = row?.normalizedData['suggestedTransferAccountId'] ||
						currentOverrides[suggestion.rowIndex]?.transferAccountId;

					if (!isTransfer) {
						currentOverrides[suggestion.rowIndex] = {
							...currentOverrides[suggestion.rowIndex],
							categoryId: topSuggestion.categoryId,
							categoryName: topSuggestion.categoryName
						};
					}
				}
			}
		}
		multiFileState.setEntityOverrides(currentFile.id, currentOverrides);
	} catch (err) {
		console.error('Failed to analyze multi-file import data:', err);
		toast.error('Failed to analyze import data');
		if (multiFileCleanupState) {
			multiFileCleanupState = { ...multiFileCleanupState, isAnalyzing: false };
		}
	}
}

// Track which file ID we last ran cleanup analysis for
let lastAnalyzedFileId = $state<string | null>(null);

// Trigger cleanup analysis when entering multi-file preview step
$effect(() => {
	const currentFile = multiFileState.currentFile;
	if (
		multiFileState.globalStep === 'processing' &&
		currentFile?.status === 'preview' &&
		currentFile.validatedRows &&
		currentFile.id !== lastAnalyzedFileId
	) {
		lastAnalyzedFileId = currentFile.id;
		multiFileCleanupState = null; // Reset for new file
		runMultiFileCleanupAnalysis();
	}
});

// Watch for demo mode import trigger
let lastDemoTrigger = 0;
$effect(() => {
	const trigger = demoMode.triggerImportUpload;
	if (trigger > lastDemoTrigger && demoMode.isActive) {
		lastDemoTrigger = trigger;
		loadDemoImportData();
	}
});

// Watch for demo mode cleanup sheet trigger
let lastCleanupTrigger = 0;
$effect(() => {
	const trigger = demoMode.triggerCleanupSheet;
	if (trigger > lastCleanupTrigger && demoMode.isActive) {
		lastCleanupTrigger = trigger;
		cleanupSheetOpen = true;
	}
});

// Watch for demo mode wizard step trigger (multi-file flow)
let lastWizardStepTrigger = 0;
$effect(() => {
	const trigger = demoMode.triggerWizardStep;
	if (trigger.count > lastWizardStepTrigger && demoMode.isActive) {
		lastWizardStepTrigger = trigger.count;
		const step = trigger.step;

		// Handle multi-file flow steps
		if (step === 'processing') {
			// Processing is handled automatically by loadDemoImportData
			demoMode.setImportStep('processing');
		} else if (step === 'review') {
			// Advance all files to ready and go to review
			for (const file of multiFileState.files) {
				multiFileState.markFileReady(file.id);
			}
			multiFileState.setGlobalStep('review');
			demoMode.setImportStep('review');
		} else if (step === 'complete') {
			// Create mock import result for demo
			importResult = {
				success: true,
				transactionsCreated: 6,
				entitiesCreated: { payees: 1, categories: 1 },
				errors: [],
				warnings: [],
				duplicatesDetected: [],
				summary: {
					totalRows: 6,
					validRows: 6,
					invalidRows: 0,
					skippedRows: 0
				}
			};
			multiFileState.setGlobalStep('complete');
			currentStep = 'complete';
			demoMode.setImportStep('complete');
		}
	}
});

// Load demo CSV data for the tour (uses multi-file flow)
async function loadDemoImportData() {
	isProcessing = true;
	error = null;

	try {
		const csvContent = demoMode.demoImportCSV;
		if (!csvContent) {
			throw new Error('Demo CSV not available');
		}

		// Create a File object from the demo CSV content
		const demoFile = new File([csvContent], 'demo-transactions.csv', { type: 'text/csv' });

		// Reset multi-file state and add the demo file
		multiFileState.reset();
		const { added, rejected } = multiFileState.addFiles([demoFile]);

		if (rejected.length > 0 || added.length === 0) {
			throw new Error('Failed to add demo file to import queue');
		}

		// Small delay for visual feedback
		await new Promise(resolve => setTimeout(resolve, TOUR_TIMING.DEMO_IMPORT_INTERNAL_DELAY));

		// Start the multi-file processing flow
		multiFileState.startProcessing();
		await handleMultiFileProcessing();

		// Sync with demoMode so tour navigation knows we've loaded data
		demoMode.setImportStep('processing');

		toast.success('Demo file loaded', {
			description: `${added[0].file.name} ready for column mapping.`
		});

	} catch (err) {
		error = err instanceof Error ? err.message : 'Failed to load demo data';
		console.error('[ImportTab] Demo import error:', err);
	} finally {
		isProcessing = false;
	}
}

// Handler for alias candidates from payee cell selection
function handlePayeeAliasCandidate(rowIndex: number, alias: AliasCandidate) {
	const newCandidates = new Map(aliasCandidates);
	newCandidates.set(rowIndex, alias);
	aliasCandidates = newCandidates;
}

function startNewImport() {
	currentStep = 'upload';
	parseResults = null;
	importResult = null;
	error = null;
	columnMapping = null;
	csvHeaders = [];
	matchedProfile = null;
	cleanupState = null;
	aliasCandidates = new Map();
	// Reset multi-file state
	multiFileState.reset();
	multiFileCleanupState = null;
	lastAnalyzedFileId = null;
}

/**
 * Persist cleanup step choices (payee aliases, transfer mappings, and category aliases) for future imports.
 * This allows the system to remember user decisions so they don't need to be re-selected.
 */
async function persistCleanupChoices(result: ImportResult) {
	if (!multiFileCleanupState || !workspaceState?.workspace?.id) {
		return;
	}

	const aliasRecords: Array<{ rawString: string; payeeId: number; sourceAccountId?: number }> = [];
	const transferRecords: Array<{ rawPayeeString: string; targetAccountId: number; sourceAccountId?: number }> = [];
	const categoryAliasRecords: Array<{ rawString: string; categoryId: number; sourceAccountId?: number }> = [];

	// Build a map of canonical names to payee IDs from the import result
	const payeeMap = new Map<string, number>();
	if (result.createdPayeeMappings) {
		for (const mapping of result.createdPayeeMappings) {
			payeeMap.set(mapping.normalizedName.toLowerCase(), mapping.payeeId);
		}
	}

	for (const group of multiFileCleanupState.payeeGroups) {
		// Skip rejected groups - user chose not to clean these
		if (group.userDecision === 'reject') continue;

		// Get the payee ID for this group
		const finalName = group.customName || group.canonicalName;
		const payeeId = group.existingMatch?.id || payeeMap.get(finalName.toLowerCase());

		if (group.transferAccountId) {
			// Record transfer mappings for all members
			for (const member of group.members) {
				transferRecords.push({
					rawPayeeString: member.originalPayee,
					targetAccountId: group.transferAccountId,
					sourceAccountId: accountId
				});
			}
		} else if (payeeId) {
			// Record payee aliases for all members
			for (const member of group.members) {
				// Only record if raw string differs from canonical name
				if (member.originalPayee.toLowerCase() !== finalName.toLowerCase()) {
					aliasRecords.push({
						rawString: member.originalPayee,
						payeeId,
						sourceAccountId: accountId
					});
				}
			}
		}
	}

	// Collect category aliases and row-level transfer mappings from entity overrides
	// This remembers which category/transfer the user selected for each payee string
	const allRows = multiFileState.getAllValidatedRows();
	const allOverrides = multiFileState.getAllEntityOverrides();
	const seenCategoryAliases = new Set<string>(); // Dedupe by rawString+categoryId
	const seenTransferMappings = new Set<string>(); // Dedupe by rawString+targetAccountId

	for (let i = 0; i < allRows.length; i++) {
		const row = allRows[i];
		const override = allOverrides[i];

		// Get the original payee string
		const originalPayee = (row.normalizedData['originalPayee'] ?? row.normalizedData['payee']) as string | undefined;
		if (!originalPayee) continue;

		// Check if this row was converted to a transfer (row-level override, not group-level)
		if (override?.transferAccountId) {
			// Record transfer mapping if user wants to remember it (default to true)
			if (override.rememberTransferMapping !== false) {
				const key = `${originalPayee.toLowerCase()}:${override.transferAccountId}`;
				if (!seenTransferMappings.has(key)) {
					seenTransferMappings.add(key);
					transferRecords.push({
						rawPayeeString: originalPayee,
						targetAccountId: override.transferAccountId,
						sourceAccountId: accountId
					});
				}
			}
			continue; // Transfers don't have categories
		}

		// Get the category from override or from the validated data
		const categoryId = override?.categoryId || (row.normalizedData['inferredCategoryId'] as number | undefined);
		if (!categoryId) continue;

		// Dedupe - only record each rawString+categoryId pair once
		const key = `${originalPayee.toLowerCase()}:${categoryId}`;
		if (seenCategoryAliases.has(key)) continue;
		seenCategoryAliases.add(key);

		categoryAliasRecords.push({
			rawString: originalPayee,
			categoryId,
			sourceAccountId: accountId
		});
	}

	// Bulk persist via tRPC
	try {
		const promises: Promise<unknown>[] = [];
		if (aliasRecords.length > 0) {
			promises.push(trpc().payeeAliasRoutes.bulkCreate.mutate({ aliases: aliasRecords }));
		}
		if (transferRecords.length > 0) {
			promises.push(trpc().transferMappingRoutes.bulkCreate.mutate({ mappings: transferRecords }));
		}
		if (categoryAliasRecords.length > 0) {
			promises.push(trpc().categoryAliasRoutes.bulkCreate.mutate({ aliases: categoryAliasRecords }));
		}
		if (promises.length > 0) {
			await Promise.all(promises);
		}
	} catch (err) {
		// Don't fail the import if alias/mapping persistence fails - just log it
		console.error('[Import] Failed to persist cleanup choices:', err);
	}
}

// Save profile dialog helpers
function openSaveProfileDialog() {
	// Use current file name from multi-file state for defaults
	const fileName = multiFileState.currentFile?.fileName;
	const defaultName = fileName
		? fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
		: 'New Import Profile';

	const defaultPattern = fileName
		? fileName.replace(/\d{4}[-_]?\d{2}[-_]?\d{2}/g, '*').replace(/\d+/g, '*')
		: '';

	saveProfileDialog = {
		open: true,
		profileName: defaultName,
		saveAsAccountDefault: false,
		saveFilenamePattern: false,
		filenamePattern: defaultPattern,
		isSaving: false
	};
}

async function saveImportProfile() {
	if (!columnMapping || !saveProfileDialog.profileName.trim()) return;

	saveProfileDialog.isSaving = true;

	try {
		let columnSignature: string | null = null;
		if (csvHeaders.length > 0) {
			const result = await trpc().importProfileRoutes.generateSignature.query({
				headers: csvHeaders
			});
			columnSignature = result.signature;
		}

		await trpc().importProfileRoutes.create.mutate({
			name: saveProfileDialog.profileName.trim(),
			columnSignature,
			filenamePattern: saveProfileDialog.saveFilenamePattern
				? saveProfileDialog.filenamePattern.trim() || null
				: null,
			accountId: saveProfileDialog.saveAsAccountDefault ? accountId : null,
			isAccountDefault: saveProfileDialog.saveAsAccountDefault,
			mapping: columnMapping
		});

		toast.success('Import profile saved', {
			description: `"${saveProfileDialog.profileName}" will be used for future imports with matching columns.`
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
	{ id: 'cleanup-payees', label: 'Cleanup Payees' },
	{ id: 'preview', label: 'Preview Data' },
	{ id: 'review-schedules', label: 'Review Schedules' },
	{ id: 'review-entities', label: 'Review Entities' },
	{ id: 'complete', label: 'Complete' }
];

// Map multi-file globalStep to step index
const currentStepIndex = $derived.by(() => {
	// Multi-file mode: map globalStep to steps
	if (currentStep === 'upload') {
		const globalStep = multiFileState.globalStep;
		if (globalStep === 'upload') return 0; // Upload File
		if (globalStep === 'processing') {
			// Check if current file is in preview mode vs mapping mode
			if (multiFileState.currentFile?.status === 'preview') {
				return 3; // Preview Data (after cleanup-payees)
			}
			return 1; // Map Columns
		}
		if (globalStep === 'review') return 3; // Preview Data (after cleanup-payees)
	}
	// Single-file mode: use currentStep directly
	return steps.findIndex((s) => s.id === currentStep);
});

$effect(() => {
	window.scrollTo({ top: 0, behavior: 'smooth' });
});
</script>

<div class="space-y-6">
	<!-- Progress Steps -->
	<div class="mb-8">
		<div class="flex items-center justify-center">
			{#each steps as step, index}
				{@const isComplete = index < currentStepIndex}
				{@const isCurrent = index === currentStepIndex}
				<div class="relative">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all {isCurrent
							? 'bg-primary text-primary-foreground shadow-md'
							: isComplete
								? 'bg-green-500 text-white'
								: 'bg-muted text-muted-foreground'}">
						{#if isComplete}
							<CircleCheck class="h-5 w-5" />
						{:else if isCurrent}
							<Circle class="h-5 w-5 fill-current" />
						{:else}
							<span class="text-sm font-semibold">{index + 1}</span>
						{/if}
					</div>
					<div
						class="absolute left-1/2 top-full mt-2 hidden -translate-x-1/2 whitespace-nowrap text-xs font-medium transition-colors md:block {isCurrent
							? 'text-primary'
							: isComplete
								? 'text-green-600'
								: 'text-muted-foreground'}">
						{step.label}
					</div>
				</div>
				{#if index < steps.length - 1}
					<div
						class="mx-2 h-1 w-16 rounded-full transition-all md:mx-4 md:w-24 {isComplete
							? 'bg-green-500'
							: 'bg-muted'}">
					</div>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Error Message -->
	{#if error}
		<Card.Root class="border-destructive">
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
		<div class="space-y-6" data-tour-id="import-upload-zone">
			<div>
				<h2 class="text-xl font-bold">Import Transactions</h2>
				<p class="text-muted-foreground mt-1 text-sm">
					Upload financial data to import into <strong>{accountName}</strong>
				</p>
			</div>

			{#if multiFileState.globalStep === 'upload'}
					<MultiFileUpload
						importState={multiFileState}
						onContinue={() => {
							multiFileState.startProcessing();
							handleMultiFileProcessing();
						}}
					/>
				{:else if multiFileState.globalStep === 'processing'}
					<FileProgress
						files={multiFileState.files}
						currentIndex={multiFileState.currentFileIndex}
						onFileClick={(index) => multiFileState.goToFile(index)}
					/>
					<!-- Current file column mapping if needed -->
					{#if multiFileState.currentFile?.status === 'mapping' && multiFileState.currentFile.parseResult}
						{@const currentFile = multiFileState.currentFile}
						{@const currentParseResult = currentFile.parseResult!}
						<div class="mt-4">
							<ColumnMapper
								rawColumns={currentParseResult.columns}
								sampleData={currentParseResult.rows.slice(0, 5).map(r => r.rawData)}
								initialMapping={currentFile.columnMapping}
								onNext={(mapping) => handleMultiFileColumnMapping(currentFile.id, mapping)}
								onBack={() => {
									if (multiFileState.isFirstFile) {
										multiFileState.setGlobalStep('upload');
									} else {
										multiFileState.previousFile();
									}
								}}
							/>
						</div>
					{:else if multiFileState.currentFile?.status === 'cleanup' && multiFileState.currentFile.validatedRows}
						{@const currentFile = multiFileState.currentFile}
						{@const validatedRows = currentFile.validatedRows!}
						<div class="mt-4">
							<PayeeCleanupStep
								rows={validatedRows}
								currentAccountId={accountId}
								onNext={(state) => {
									// IMPORTANT: Update multiFileCleanupState with user's final selections
									// This is used by persistCleanupChoices to save aliases and transfer mappings
									multiFileCleanupState = state;

									// Apply cleanup to the file's rows before moving to preview
									// We apply canonical names for all groups EXCEPT 'reject' (user explicitly skipped)
									const payeeOverrides = new Map<number, {
										payeeId: number | null;
										payeeName: string;
										transferAccountId?: number;
										transferAccountName?: string;
									}>();
									for (const group of state.payeeGroups) {
										// Skip rejected groups - user explicitly chose not to clean them
										if (group.userDecision === 'reject') continue;

										// Check if this is a transfer
										if (group.transferAccountId && group.transferAccountName) {
											for (const member of group.members) {
												payeeOverrides.set(member.rowIndex, {
													payeeId: null,
													payeeName: group.transferAccountName,
													transferAccountId: group.transferAccountId,
													transferAccountName: group.transferAccountName
												});
											}
										} else {
											// Regular payee - use custom name if set, otherwise canonical name
											const payeeName = group.userDecision === 'custom' && group.customName
												? group.customName
												: group.canonicalName;
											// Only use existingMatch.id when accepting the canonical name as-is
											// For custom or pending groups, set to null so the cleaned name is used
											const payeeId = group.userDecision === 'accept' && group.existingMatch?.id
												? group.existingMatch.id
												: null;
											for (const member of group.members) {
												payeeOverrides.set(member.rowIndex, { payeeId, payeeName });
											}
										}
									}

									if (payeeOverrides.size > 0) {
										// Update validated rows with cleanup decisions
										const updatedRows = currentFile.validatedRows!.map((row) => {
											const override = payeeOverrides.get(row.rowIndex);
											if (override) {
												if (override.transferAccountId) {
													// Transfer row - clear category fields too
													return {
														...row,
														normalizedData: {
															...row.normalizedData,
															transferAccountId: override.transferAccountId,
															transferAccountName: override.transferAccountName,
															payee: override.transferAccountName,
															payeeId: null,
															category: null,
															categoryId: null,
															inferredCategory: null,
															inferredCategoryId: null,
															originalPayee: row.normalizedData['originalPayee'] ?? row.normalizedData['payee']
														}
													};
												} else {
													// Regular payee row
													return {
														...row,
														normalizedData: {
															...row.normalizedData,
															payee: override.payeeName,
															payeeId: override.payeeId,
															originalPayee: row.normalizedData['originalPayee'] ?? row.normalizedData['payee']
														}
													};
												}
											}
											return row;
										});
										multiFileState.setValidatedRows(currentFile.id, updatedRows);
									}
									multiFileState.updateFileState(currentFile.id, { status: 'preview' });
								}}
								onBack={() => {
									if (currentFile.needsColumnMapping) {
										multiFileState.updateFileState(currentFile.id, { status: 'mapping' });
									} else if (multiFileState.isFirstFile) {
										multiFileState.setGlobalStep('upload');
									} else {
										multiFileState.previousFile();
									}
								}}
								onSkip={() => {
									multiFileState.updateFileState(currentFile.id, { status: 'preview' });
								}}
							/>
						</div>
					{:else if multiFileState.currentFile?.status === 'preview' && multiFilePreviewData}
						{@const currentFile = multiFileState.currentFile}
						<div class="mt-4 space-y-4">
							<div class="flex items-center justify-between">
								<div>
									<h3 class="text-lg font-semibold">Preview: {currentFile.fileName}</h3>
									<p class="text-muted-foreground text-sm">
										{multiFilePreviewData.length} transactions - edit payees, categories, and descriptions as needed
									</p>
								</div>
							</div>

							<ImportPreviewTable
								data={multiFilePreviewData}
								{importOptions}
								{accountId}
								onImportOptionsChange={(opts) => importOptions = opts}
								cleanupState={filteredMultiFileCleanupState}
								onCleanupStateChange={(state) => multiFileCleanupState = state}
								onPayeeUpdate={handleMultiFilePayeeUpdate}
								onCategoryUpdate={handleMultiFileCategoryUpdateWithSimilar}
								onDescriptionUpdate={handleMultiFileDescriptionUpdate}
								onTransferAccountUpdate={handleMultiFileTransferUpdate}
							/>

							<div class="flex items-center justify-between pt-4">
								<Button
									variant="outline"
									onclick={() => {
										multiFileState.updateFileState(currentFile.id, { status: 'mapping' });
									}}
								>
									Back to Mapping
								</Button>
								<Button onclick={handleMultiFilePreviewConfirm}>
									{#if multiFileState.isLastFile}
										Finish & Review All
									{:else}
										Continue to Next File
									{/if}
								</Button>
							</div>
						</div>
					{:else if isProcessing}
						<div class="mt-4 py-8 text-center">
							<div class="border-primary inline-block h-8 w-8 animate-spin rounded-full border-b-2"></div>
							<p class="text-muted-foreground mx-auto mt-4 max-w-xs truncate text-sm" title={multiFileState.currentFile?.fileName}>
								Processing {multiFileState.currentFile?.fileName}...
							</p>
						</div>
					{/if}

					<!-- Processing overlay for multi-file mapping/category inference -->
					{#if isProcessing && multiFileProcessingMessage}
						<div class="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
							<Card.Root class="w-80 max-w-[90vw]">
								<Card.Content class="pt-6">
									<div class="text-center">
										<div class="border-primary mb-4 inline-block h-12 w-12 animate-spin rounded-full border-b-2"></div>
										<p class="font-medium">{multiFileProcessingMessage}</p>
										<p class="text-muted-foreground mt-2 truncate px-2 text-sm" title={multiFileState.currentFile?.fileName}>
											{multiFileState.currentFile?.fileName}
										</p>
									</div>
								</Card.Content>
							</Card.Root>
						</div>
					{/if}
				{:else if multiFileState.globalStep === 'review'}
					<CombinedReview
						files={multiFileState.files}
						totalTransactions={multiFileState.totalTransactions}
						isImporting={isProcessing}
						onImport={handleMultiFileImport}
						onBack={() => {
							const lastFileIndex = multiFileState.files.length - 1;
							const lastFile = multiFileState.files[lastFileIndex];
							// Set file back to 'preview' status so it renders correctly
							if (lastFile) {
								multiFileState.updateFileState(lastFile.id, { status: 'preview' });
							}
							multiFileState.goToFile(lastFileIndex);
							multiFileState.setGlobalStep('processing');
						}}
						onEditFile={(index) => {
							const file = multiFileState.files[index];
							if (file) {
								// Set file status back to 'preview' so user can edit transactions
								multiFileState.updateFileState(file.id, { status: 'preview' });
								multiFileState.goToFile(index);
							}
						}}
					/>
			{/if}
		</div>
	{:else if currentStep === 'complete' && importResult}
		<div class="space-y-6" data-tour-id="import-complete">
			<div class="text-center">
				<div
					class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
					<CircleCheck class="h-8 w-8 text-green-600" />
				</div>
				<h2 class="text-2xl font-bold">Import Complete!</h2>
				<p class="text-muted-foreground mt-2">
					Your transactions have been successfully imported to {accountName}
				</p>
			</div>

			<Card.Root>
				<Card.Header>
					<Card.Title>Import Summary</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
						<div>
							<div class="text-2xl font-bold text-green-600">
								{importResult.transactionsCreated ?? 0}
							</div>
							<div class="text-muted-foreground text-sm">Transactions Created</div>
						</div>
						{#if importResult.reconciled && importResult.reconciled > 0}
							<div>
								<div class="text-2xl font-bold text-blue-600">
									{importResult.reconciled}
								</div>
								<div class="text-muted-foreground text-sm">Transfers Reconciled</div>
							</div>
						{/if}
						{#if importResult.entitiesCreated}
							<div>
								<div class="text-2xl font-bold">
									{(importResult.entitiesCreated.payees ?? 0) + (importResult.entitiesCreated.categories ?? 0)}
								</div>
								<div class="text-muted-foreground text-sm">Entities Created</div>
							</div>
						{/if}
					</div>

					{#if importResult.reconciledTransactions && importResult.reconciledTransactions.length > 0}
						<div class="border-t pt-4">
							<p class="mb-2 text-sm font-medium text-blue-600">
								Reconciled with Existing Transfers
							</p>
							<p class="text-muted-foreground text-xs mb-2">
								These imported transactions matched existing transfers and were merged instead of creating duplicates.
							</p>
							{#each importResult.reconciledTransactions.slice(0, 5) as reconciled}
								<p class="text-muted-foreground text-xs">
									Row {reconciled.rowIndex + 1}: Matched transfer from {reconciled.sourceAccountName}
								</p>
							{/each}
							{#if importResult.reconciledTransactions.length > 5}
								<p class="text-muted-foreground text-xs italic">
									... and {importResult.reconciledTransactions.length - 5} more
								</p>
							{/if}
						</div>
					{/if}

					{#if importResult.errors && importResult.errors.length > 0}
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

			{#if columnMapping && csvHeaders.length > 0 && !matchedProfile}
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<Save class="h-4 w-4" />
							Save Column Mapping
						</Card.Title>
						<Card.Description>
							Save this column mapping as a profile for future imports
						</Card.Description>
					</Card.Header>
					<Card.Content>
						<Button variant="outline" onclick={openSaveProfileDialog}>
							Save as Import Profile
						</Button>
					</Card.Content>
				</Card.Root>
			{/if}

			<div class="flex items-center gap-4">
				<Button class="flex-1" onclick={startNewImport}>Import Another File</Button>
				<Button class="flex-1" variant="outline" href="/accounts/{accountSlug}">
					View Transactions
				</Button>
			</div>
		</div>
	{/if}
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
						<p class="text-muted-foreground text-xs">Auto-match files with similar names</p>
					</div>
				</div>
				{#if saveProfileDialog.saveFilenamePattern}
					<Input
						bind:value={saveProfileDialog.filenamePattern}
						placeholder="e.g., chase_*.csv"
						class="ml-6" />
				{/if}
			</div>

			<div class="flex items-start gap-2">
				<Checkbox
					id="save-account-default"
					checked={saveProfileDialog.saveAsAccountDefault}
					onCheckedChange={(checked) => (saveProfileDialog.saveAsAccountDefault = !!checked)} />
				<div class="grid gap-1.5 leading-none">
					<Label for="save-account-default" class="text-sm font-medium">
						Set as default for this account
					</Label>
					<p class="text-muted-foreground text-xs">Use this profile when importing to {accountName}</p>
				</div>
			</div>
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
						You're <strong>removing the category</strong> from this transaction. How would you like
						to apply this change?
					</p>
				{/if}

				{#if bulkUpdateDialog.matchCountByPayee > 0 && bulkUpdateDialog.matchCountByCategory > 0}
					<div class="space-y-2 text-sm">
						<p>
							* <strong>{bulkUpdateDialog.matchCountByPayee}</strong> other transaction{bulkUpdateDialog.matchCountByPayee !==
							1
								? 's'
								: ''} with the same payee "<strong>{bulkUpdateDialog.payeeName}</strong>"
						</p>
						<p>
							* <strong>{bulkUpdateDialog.matchCountByCategory}</strong> other transaction{bulkUpdateDialog.matchCountByCategory !==
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

<!-- Bulk Transfer Update Confirmation Dialog -->
<AlertDialog.Root bind:open={bulkTransferUpdateDialog.open}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Convert Similar Transactions to Transfers?</AlertDialog.Title>
			<AlertDialog.Description>
				Found {bulkTransferUpdateDialog.matchCount} other transaction{bulkTransferUpdateDialog.matchCount !== 1 ? 's' : ''} with similar payee "{bulkTransferUpdateDialog.originalPayeeName}".
				<br /><br />
				Would you like to also convert {bulkTransferUpdateDialog.matchCount !== 1 ? 'them' : 'it'} to transfer{bulkTransferUpdateDialog.matchCount !== 1 ? 's' : ''} to "{bulkTransferUpdateDialog.accountName}"?
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer class="flex-col gap-2 sm:flex-col">
			<AlertDialog.Action onclick={confirmBulkTransferUpdate} class="w-full">
				Yes, Convert All Similar
			</AlertDialog.Action>
			<AlertDialog.Cancel onclick={cancelBulkTransferUpdate} class="w-full">
				No, Just This One
			</AlertDialog.Cancel>
			<Button variant="outline" onclick={revertTransferUpdate} class="w-full">
				Cancel & Revert
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- Payment Processor Filter Dialog -->
<AlertDialog.Root bind:open={processorFilterDialog.open}>
	<AlertDialog.Content class="max-w-lg">
		<AlertDialog.Header>
			<AlertDialog.Title>Filter Payment Processors</AlertDialog.Title>
			<AlertDialog.Description>
				Select which payment processors to filter out from payee names.
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
						<div class="text-muted-foreground whitespace-nowrap text-sm">
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
