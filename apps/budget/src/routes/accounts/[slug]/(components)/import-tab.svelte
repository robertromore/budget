<script lang="ts">
import ColumnMapper from '$lib/components/import/column-mapper.svelte';
import EntityReview from '$lib/components/import/entity-review.svelte';
import FileUploadDropzone from '$lib/components/import/file-upload-dropzone.svelte';
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
import * as Badge from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Slider } from '$lib/components/ui/slider';
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
	ParseResult,
	ScheduleMatch
} from '$lib/types/import';
import {
	PAYMENT_PROCESSORS,
	countProcessorTransactions,
	detectPaymentProcessor
} from '$lib/utils/import/payment-processor-filter';
import { arePayeesSimilar } from '$lib/utils/payee-matching';
import CalendarClock from '@lucide/svelte/icons/calendar-clock';
import Circle from '@lucide/svelte/icons/circle';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import Save from '@lucide/svelte/icons/save';
import Sparkles from '@lucide/svelte/icons/sparkles';
import { useQueryClient } from '@tanstack/svelte-query';
import { toast } from 'svelte-sonner';

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

type Step =
	| 'upload'
	| 'map-columns'
	| 'preview'
	| 'review-schedules'
	| 'review-entities'
	| 'complete';

let currentStep = $state<Step>('upload');
let selectedFile = $state<File | null>(null);

// Multi-file import state
const multiFileState = createMultiFileImportState();
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
let scheduleMatchThreshold = $state(0.75);
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

// Filter cleanupState to remove payee groups where ALL members are transfers
// This ensures groups without remaining non-transfer transactions are hidden from cleanup UI
const filteredCleanupState = $derived.by(() => {
	if (!cleanupState) return null;

	// Filter out payee groups where ALL members have been set as transfers
	const filteredPayeeGroups = cleanupState.payeeGroups.filter((group) => {
		// Keep the group if at least one member is NOT a transfer
		return group.members.some((member) => {
			const override = entityOverrides[member.rowIndex];
			return !override?.transferAccountId;
		});
	});

	return {
		...cleanupState,
		payeeGroups: filteredPayeeGroups
	};
});

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
				matches: []
			});
		}
		grouped.get(match.scheduleId)!.matches.push(match);
	});

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
				avgScore
			};
		})
		.sort((a, b) => b.avgScore - a.avgScore);
});

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

// Schedule match handlers
function handleScheduleMatchToggle(rowIndex: number, selected: boolean) {
	scheduleMatches = scheduleMatches.map((match) =>
		match.rowIndex === rowIndex ? { ...match, selected } : match
	);
}

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

// Category update handlers
function handleCategoryUpdate(
	rowIndex: number,
	categoryId: number | null,
	categoryName: string | null
) {
	// Track dismissals: when user clears a category that was AI-suggested
	const isClearingCategory = categoryName === null || categoryName === '';

	console.log(`[CategoryUpdate] Row ${rowIndex}: categoryId=${categoryId}, categoryName=${categoryName}, isClearingCategory=${isClearingCategory}`);

	if (isClearingCategory) {
		// Get the row data
		const row = parseResults?.rows.find(r => r.rowIndex === rowIndex);
		let dismissalTracked = false;

		console.log(`[CategoryUpdate] Row ${rowIndex} ALL category data:`, row ? {
			// All category-related fields
			category: row.normalizedData['category'],
			categoryId: row.normalizedData['categoryId'],
			inferredCategory: row.normalizedData['inferredCategory'],
			inferredCategoryId: row.normalizedData['inferredCategoryId'],
			categoryConfidence: row.normalizedData['categoryConfidence'],
			categoryFromPayeeDefault: row.normalizedData['categoryFromPayeeDefault'],
			categoryMatchedByAlias: row.normalizedData['categoryMatchedByAlias'],
			// Payee fields
			originalPayee: row.normalizedData['originalPayee'],
			payee: row.normalizedData['payee'],
			payeeId: row.normalizedData['payeeId'],
			matchedByAlias: row.normalizedData['matchedByAlias']
		} : 'row not found');

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
				console.log(`[CategoryUpdate] Dismissal tracked for row ${rowIndex}:`, {
					payeeName,
					rawPayeeString: originalPayee,
					dismissCategoryId,
					dismissCategoryName,
					source: inferredCategoryId ? 'inferredCategoryId' : 'categoryId'
				});
			} else {
				console.log(`[CategoryUpdate] No dismissal tracked - no category ID found. inferredCategoryId=${inferredCategoryId}, categoryId=${categoryId}`);
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

function confirmBulkUpdateJustOne() {
	handleCategoryUpdate(
		bulkUpdateDialog.rowIndex,
		bulkUpdateDialog.categoryId,
		bulkUpdateDialog.categoryName
	);
	bulkUpdateDialog.open = false;
}

function confirmBulkUpdateByPayee() {
	if (!bulkUpdateDialog.matchesByPayee) return;

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
	handleCategoryUpdate(
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
		handleCategoryUpdate(
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

// File handling
async function handleFileSelected(file: File) {
	selectedFile = file;
	isProcessing = true;
	error = null;
	matchedProfile = null;
	detectedMapping = null;
	csvHeaders = [];

	try {
		const arrayBuffer = await file.arrayBuffer();
		const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
		fileData = {
			data: base64,
			name: file.name,
			type: file.type
		};

		const formData = new FormData();
		formData.append('importFile', file);

		const url = new URL('/api/import/upload', window.location.origin);
		url.searchParams.set('accountId', selectedAccountId);
		url.searchParams.set('reverseAmountSigns', reverseAmountSigns.toString());

		const response = await fetch(url.toString(), {
			method: 'POST',
			body: formData
		});

		const result = await response.json();

		if (response.ok) {
			parseResults = result;
			rawCSVData = result.rows.map((row: any) => row.rawData);

			if (result.scheduleMatches) {
				scheduleMatches = result.scheduleMatches;
			}

			await applySmartCategorization();

			const fileExtension = file.name.split('.').pop()?.toLowerCase();
			if (fileExtension === 'csv' && rawCSVData && rawCSVData.length > 0) {
				csvHeaders = Object.keys(rawCSVData[0] ?? {});

				try {
					const profile = await trpc().importProfileRoutes.findMatch.query({
						headers: csvHeaders,
						filename: file.name,
						accountId: accountId
					});

					if (profile) {
						matchedProfile = profile;
						detectedMapping = profile.mapping;

						trpc().importProfileRoutes.recordUsage.mutate({ id: profile.id });
					}
				} catch (profileErr) {
					console.warn('Failed to check for matching import profile:', profileErr);
				}
			}

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

// Multi-file import handlers
async function handleMultiFileProcessing() {
	const currentFile = multiFileState.currentFile;
	if (!currentFile) return;

	isProcessing = true;
	multiFileProcessingMessage = 'Parsing file...';
	error = null;

	try {
		multiFileState.updateFileState(currentFile.id, { status: 'uploading' });

		console.log('[MultiFileImport] Uploading file:', currentFile.fileName, 'to account:', accountId);

		const formData = new FormData();
		formData.append('importFile', currentFile.file);

		const response = await fetch(`/api/import/upload?accountId=${accountId}`, {
			method: 'POST',
			body: formData
		});

		console.log('[MultiFileImport] Response status:', response.status, response.ok);

		const responseText = await response.text();
		console.log('[MultiFileImport] Response body:', responseText.substring(0, 500));

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
		const needsMapping = currentFile.needsColumnMapping;
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
					console.log('[MultiFileImport] Found matching profile:', profile.name, '- will pre-populate mapper');
					detectedProfileMapping = profile.mapping as ColumnMapping;
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

		console.log('[MultiFileImport] Parse complete, needsMapping:', needsMapping, 'rows:', result.rows?.length, 'hasProfileMapping:', !!detectedProfileMapping);

		// If auto-detected format (OFX, QIF, etc.), mark as ready and move to next
		if (!needsMapping) {
			multiFileState.markFileReady(currentFile.id);
			if (multiFileState.isLastFile) {
				multiFileState.setGlobalStep('review');
			} else {
				multiFileState.nextFile();
				// Process next file
				await handleMultiFileProcessing();
			}
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

		console.log('[MultiFileImport] Remap complete, rows:', result.rows?.length);

		multiFileProcessingMessage = 'Inferring categories...';

		// Apply smart categorization to infer categories from payee patterns
		const enrichedRows = await applySmartCategorizationToFile(fileId, result.rows || []);

		console.log('[MultiFileImport] Smart categorization complete, enriched rows:', enrichedRows.length);

		multiFileState.setColumnMapping(fileId, mapping);
		// Store the enriched rows with category suggestions
		multiFileState.setValidatedRows(fileId, enrichedRows);
		// Go to preview step so user can edit transactions
		multiFileState.updateFileState(fileId, { status: 'preview' });
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
	overrides[rowIndex] = {
		...(overrides[rowIndex] || {}),
		// Clear payee when setting transfer
		payeeId: null,
		payeeName: null,
		transferAccountId,
		transferAccountName,
		rememberTransferMapping: rememberMapping
	};
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
						categoryId: override.categoryId,
						categoryName: override.categoryName,
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

		// Invalidate queries
		await queryClient.invalidateQueries({ queryKey: ['transactions'] });
		await queryClient.invalidateQueries({ queryKey: ['accounts'] });

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
	cleanupState = null;
	// Reset multi-file state
	multiFileState.reset();
	multiFileCleanupState = null;
	lastAnalyzedFileId = null;
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
		const response = await fetch('/api/import/remap', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				file: fileData,
				columnMapping: mapping,
				accountId: selectedAccountId
			})
		});

		const result = await response.json();

		if (response.ok) {
			parseResults = result;
			rawCSVData = result.rows.map((row: any) => row.rawData);

			if (result.scheduleMatches) {
				scheduleMatches = result.scheduleMatches;
			}

			// Apply smart categorization with the remapped data
			// This handles payee alias matching and category inference
			await applySmartCategorization();

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

// Run cleanup analysis when entering preview step
async function runCleanupAnalysis() {
	if (!previewData || cleanupState?.isAnalyzing) return;

	// Initialize cleanup state
	cleanupState = {
		payeeGroups: [],
		categorySuggestions: [],
		isAnalyzing: true,
		analysisProgress: 0,
		analysisPhase: 'grouping_payees'
	};

	try {
		// Extract payee data from rows
		const payeeInputs = previewData.rows
			.filter((row) => row.normalizedData['payee'])
			.map((row) => {
				const data = row.normalizedData as Record<string, any>;
				const originalPayee = (row as any).originalPayee || data['originalPayee'] as string | undefined;
				return {
					rowIndex: row.rowIndex,
					payeeName: data['payee'] as string,
					// Pass the raw CSV payee string for alias tracking
					originalPayee,
					amount: data['amount'] as number,
					date: data['date'] as string,
					memo: data['description'] || data['notes']
				};
			});

		if (payeeInputs.length === 0) {
			cleanupState = { ...cleanupState, isAnalyzing: false };
			return;
		}

		cleanupState = { ...cleanupState, analysisProgress: 20 };

		// Call the combined analysis endpoint
		const result = await trpc().importCleanupRoutes.analyzeImport.mutate({
			rows: payeeInputs
		});

		cleanupState = {
			...cleanupState,
			analysisProgress: 80,
			analysisPhase: 'suggesting_categories'
		};

		// Update state with results
		cleanupState = {
			payeeGroups: result.payeeGroups,
			categorySuggestions: result.categorySuggestions,
			isAnalyzing: false,
			analysisProgress: 100,
			analysisPhase: undefined
		};

		// Apply high-confidence category suggestions to entityOverrides
		for (const suggestion of result.categorySuggestions) {
			if (suggestion.suggestions.length > 0) {
				const topSuggestion = suggestion.suggestions[0];
				// Auto-fill if confidence >= 0.7 (70%)
				if (topSuggestion.confidence >= 0.7) {
					entityOverrides = {
						...entityOverrides,
						[suggestion.rowIndex]: {
							...entityOverrides[suggestion.rowIndex],
							categoryId: topSuggestion.categoryId,
							categoryName: topSuggestion.categoryName
						}
					};
				}
			}
		}
	} catch (err) {
		console.error('Failed to analyze import data:', err);
		toast.error('Failed to analyze import data');
		if (cleanupState) {
			cleanupState = { ...cleanupState, isAnalyzing: false };
		}
	}
}

// Trigger cleanup analysis when entering preview step
$effect(() => {
	if (currentStep === 'preview' && previewData && !cleanupState) {
		runCleanupAnalysis();
	}
});

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
		const currentOverrides = { ...(currentFile.entityOverrides || {}) };
		for (const suggestion of result.categorySuggestions) {
			if (suggestion.suggestions.length > 0) {
				const topSuggestion = suggestion.suggestions[0];
				if (topSuggestion.confidence >= 0.7) {
					currentOverrides[suggestion.rowIndex] = {
						...currentOverrides[suggestion.rowIndex],
						categoryId: topSuggestion.categoryId,
						categoryName: topSuggestion.categoryName
					};
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

// Watch for demo mode wizard step trigger
let lastWizardStepTrigger = 0;
$effect(() => {
	const trigger = demoMode.triggerWizardStep;
	if (trigger.count > lastWizardStepTrigger && demoMode.isActive) {
		lastWizardStepTrigger = trigger.count;
		const step = trigger.step as Step;
		if (step) {
			currentStep = step;
			// Sync with demoMode so tour navigation knows the current step
			demoMode.setImportStep(step as any);
			// For preview, ensure cleanup state is initialized with demo data
			if (step === 'preview' && !cleanupState) {
				cleanupState = {
					payeeGroups: [
						{
							groupId: 'demo-group-1',
							canonicalName: 'Whole Foods Market',
							confidence: 0.95,
							members: [
								{ rowIndex: 0, originalPayee: 'WHOLE FOODS MKT #123', normalizedPayee: 'Whole Foods Market' }
							],
							existingMatch: { id: 1, name: 'Whole Foods', confidence: 0.92 },
							userDecision: 'pending'
						},
						{
							groupId: 'demo-group-2',
							canonicalName: 'Shell Gas Station',
							confidence: 0.88,
							members: [
								{ rowIndex: 1, originalPayee: 'SHELL SERVICE STN', normalizedPayee: 'Shell Gas Station' }
							],
							existingMatch: { id: 2, name: 'Shell', confidence: 0.85 },
							userDecision: 'pending'
						},
						{
							groupId: 'demo-group-3',
							canonicalName: 'Amazon',
							confidence: 0.78,
							members: [
								{ rowIndex: 3, originalPayee: 'AMAZON.COM*AB12CD34', normalizedPayee: 'Amazon' }
							],
							userDecision: 'pending'
						}
					],
					categorySuggestions: [],
					isAnalyzing: false,
					analysisProgress: 100
				};
			}
			// For schedule review, create mock schedule matches
			if (step === 'review-schedules' && scheduleMatches.length === 0) {
				const today = new Date();
				scheduleMatches = [
					{
						rowIndex: 0,
						scheduleId: 1,
						scheduleName: 'Monthly Groceries',
						score: 0.92,
						confidence: 'high' as const,
						selected: true,
						matchedOn: ['payee', 'amount'],
						reasons: ['Payee matches: Whole Foods Market', 'Amount within 5% tolerance'],
						transactionData: {
							date: today.toISOString().split('T')[0],
							amount: -67.45,
							payee: 'Whole Foods Market'
						},
						scheduleData: {
							name: 'Monthly Groceries',
							amount: -70.0,
							amount_type: 'approximate' as const,
							recurring: true
						}
					},
					{
						rowIndex: 1,
						scheduleId: 2,
						scheduleName: 'Gas Fill-up',
						score: 0.85,
						confidence: 'high' as const,
						selected: false,
						matchedOn: ['payee', 'amount'],
						reasons: ['Payee matches: Shell', 'Amount within 10% tolerance'],
						transactionData: {
							date: new Date(today.getTime() - 86400000).toISOString().split('T')[0],
							amount: -42.50,
							payee: 'Shell Gas Station'
						},
						scheduleData: {
							name: 'Gas Fill-up',
							amount: -45.0,
							amount_type: 'approximate' as const,
							recurring: true
						}
					}
				];
			}
			// For entity review, create mock entity preview data
			if (step === 'review-entities' && !entityPreview) {
				entityPreview = {
					payees: [
						{
							name: 'Whole Foods Market',
							source: 'import' as const,
							occurrences: 2,
							selected: false,
							existing: { id: 1, name: 'Whole Foods' }
						},
						{
							name: 'Shell Gas Station',
							source: 'import' as const,
							occurrences: 1,
							selected: false,
							existing: { id: 2, name: 'Shell' }
						},
						{
							name: 'Amazon',
							source: 'import' as const,
							occurrences: 1,
							selected: true
						}
					],
					categories: [
						{
							name: 'Groceries',
							source: 'inferred' as const,
							occurrences: 2,
							selected: false,
							existing: { id: 10, name: 'Groceries' }
						},
						{
							name: 'Transportation',
							source: 'inferred' as const,
							occurrences: 1,
							selected: false,
							existing: { id: 11, name: 'Transportation' }
						},
						{
							name: 'Shopping',
							source: 'inferred' as const,
							occurrences: 1,
							selected: true
						}
					],
					transactions: {
						total: 6,
						valid: 6,
						duplicates: 0,
						errors: 0
					}
				};
			}
			// For complete, create mock import result
			if (step === 'complete' && !importResult) {
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
			}
		}
	}
});

// Load demo CSV data for the tour
async function loadDemoImportData() {
	isProcessing = true;
	error = null;

	try {
		const csvContent = demoMode.demoImportCSV;
		if (!csvContent) {
			throw new Error('Demo CSV not available');
		}

		// Parse CSV manually
		const lines = csvContent.trim().split('\n');
		const headers = lines[0].split(',').map(h => h.trim());
		csvHeaders = headers;

		const rows = lines.slice(1).map((line, index) => {
			const values = line.split(',').map(v => v.trim());
			const rawData: Record<string, string> = {};
			headers.forEach((header, i) => {
				rawData[header] = values[i] || '';
			});

			// Parse amount (remove $ and handle negatives)
			const amountStr = rawData['Amount'] || '0';
			const amount = parseFloat(amountStr.replace(/[$,]/g, ''));

			return {
				rowIndex: index,
				rawData,
				normalizedData: {
					date: rawData['Date'],
					payee: rawData['Description'],
					amount: amount,
					notes: ''
				},
				validationStatus: 'valid' as const,
				validationErrors: []
			};
		});

		rawCSVData = rows.map(r => r.rawData);

		// Create parseResults structure matching ParseResult type
		parseResults = {
			fileName: 'demo-transactions.csv',
			fileSize: csvContent.length,
			fileType: 'text/csv',
			rowCount: rows.length,
			columns: headers,
			rows,
			parseErrors: []
		};

		// Set a detected mapping for demo
		detectedMapping = {
			date: 'Date',
			amount: 'Amount',
			payee: 'Description',
			notes: null,
			category: null
		};

		// Create fake file data for display
		selectedFile = new File([csvContent], 'demo-transactions.csv', { type: 'text/csv' });
		fileData = {
			data: btoa(csvContent),
			name: 'demo-transactions.csv',
			type: 'text/csv'
		};

		// Small delay for visual feedback, then advance to column mapping
		// This delay is the source of truth - TOUR_TIMING.DEMO_IMPORT_WAIT must exceed this
		await new Promise(resolve => setTimeout(resolve, TOUR_TIMING.DEMO_IMPORT_INTERNAL_DELAY));
		currentStep = 'map-columns';

		// Sync with demoMode so tour navigation knows we've loaded data
		demoMode.setImportStep('map-columns');

		toast.success('Demo file loaded', {
			description: `${rows.length} transactions ready for import.`
		});

	} catch (err) {
		error = err instanceof Error ? err.message : 'Failed to load demo data';
		console.error('[ImportTab] Demo import error:', err);
	} finally {
		isProcessing = false;
	}
}

// Handle cleanup state changes from the toolbar component
function handleCleanupStateChange(state: CleanupState) {
	cleanupState = state;
	// Apply cleanup decisions to entityOverrides and create alias candidates
	for (const group of state.payeeGroups) {
		if (group.userDecision === 'accept' || group.userDecision === 'custom') {
			const payeeName = group.userDecision === 'custom' && group.customName
				? group.customName
				: group.canonicalName;
			const payeeId = group.existingMatch?.id ?? null;

			for (const member of group.members) {
				entityOverrides = {
					...entityOverrides,
					[member.rowIndex]: {
						...entityOverrides[member.rowIndex],
						payeeId,
						payeeName
					}
				};

				// Create alias candidate for both existing and new payees
				// For existing payees: track payeeId
				// For new payees: track payeeName (will be resolved to ID after import)
				if (member.originalPayee && member.originalPayee !== payeeName) {
					const newCandidates = new Map(aliasCandidates);
					newCandidates.set(member.rowIndex, {
						rawString: member.originalPayee,
						payeeId: payeeId ?? undefined,  // null for new payees
						payeeName,  // Track name for resolution after import
					});
					aliasCandidates = newCandidates;
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
				entityOverrides = {
					...entityOverrides,
					[suggestion.rowIndex]: {
						...entityOverrides[suggestion.rowIndex],
						categoryId: suggestion.selectedCategoryId,
						categoryName: selectedSuggestion.categoryName
					}
				};
			}
		}
	}
}

// Handler for alias candidates from payee cell selection
function handlePayeeAliasCandidate(rowIndex: number, alias: AliasCandidate) {
	const newCandidates = new Map(aliasCandidates);
	newCandidates.set(rowIndex, alias);
	aliasCandidates = newCandidates;
}

function proceedToScheduleReview() {
	if (!parseResults) return;

	if (scheduleMatches.length > 0) {
		currentStep = 'review-schedules';
	} else {
		proceedToEntityReview();
	}
}

async function proceedToEntityReview() {
	if (!parseResults || !previewData) return;

	isProcessing = true;
	error = null;

	try {
		const selectedRowsData = previewData.rows.filter((row) => selectedRows.has(row.rowIndex));

		const response = await fetch('/api/import/preview-entities', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ rows: selectedRowsData })
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
	if (!parseResults || !entityPreview || !previewData) return;

	isProcessing = true;
	error = null;

	try {
		const selectedRowsData = parseResults.rows
			.filter((row) => selectedRows.has(row.rowIndex))
			.map((row) => {
				const override = entityOverrides[row.rowIndex];
				// Extract originalPayee from normalizedData (set by infer-categories) for transfer mapping
				const originalPayee = (row.normalizedData['originalPayee'] ?? row.normalizedData['payee']) as string | null;
				return {
					...row,
					// IMPORTANT: Set originalPayee at top level for import orchestrator to find
					originalPayee,
					normalizedData: {
						...row.normalizedData,
						payee:
							override?.payeeName !== undefined ? override.payeeName : row.normalizedData['payee'],
						category:
							override?.categoryName !== undefined
								? override.categoryName
								: row.normalizedData['category'],
						// IMPORTANT: Also clear categoryId when category is overridden
						// This prevents the server from using the original inferred category
						categoryId:
							override?.categoryId !== undefined
								? override.categoryId
								: (override?.categoryName !== undefined
									? null // Clear categoryId if categoryName was overridden (even to null)
									: row.normalizedData['categoryId']),
						description:
							override?.description !== undefined
								? override.description
								: row.normalizedData['description'] || row.normalizedData['notes'],
						// Transfer fields - when set, this row creates a transfer instead of regular transaction
						// Must fall back to row.normalizedData for auto-accepted mappings
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
			});

		const selectedPayeeNames = entityPreview.payees.filter((p) => p.selected).map((p) => p.name);
		const selectedCategoryNames = entityPreview.categories
			.filter((c) => c.selected)
			.map((c) => c.name);

		const dismissalsArray = Array.from(categoryDismissals.values());
		console.log(`[ProcessImport] Sending ${dismissalsArray.length} category dismissals:`, dismissalsArray);

		// Log transfer data being sent
		const transferRows = selectedRowsData.filter(r => r.normalizedData?.transferAccountId);
		if (transferRows.length > 0) {
			console.log('[ProcessImport] Sending transfer rows:', transferRows.map(r => ({
				rowIndex: r.rowIndex,
				transferAccountId: r.normalizedData?.transferAccountId,
				rememberTransferMapping: r.normalizedData?.rememberTransferMapping,
				payee: r.normalizedData?.payee,
				originalPayee: r.originalPayee,
			})));
		}

		const importData = {
			accountId: accountId,
			data: selectedRowsData,
			selectedEntities: {
				payees: selectedPayeeNames,
				categories: selectedCategoryNames
			},
			scheduleMatches: scheduleMatches.filter((m) => m.selected),
			// Include category dismissals for learning (negative feedback)
			categoryDismissals: dismissalsArray,
			options: {
				allowPartialImport,
				createMissingEntities: createMissingPayees || createMissingCategories,
				createMissingPayees,
				createMissingCategories,
				reverseAmountSigns,
				fileName: previewData?.fileName
			}
		};

		const response = await fetch('/api/import/process', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(importData)
		});

		const result = await response.json();

		if (response.ok) {
			importResult = result.result;
			currentStep = 'complete';

			// Record payee aliases from user confirmations during import
			// This handles both existing payees (with payeeId) and newly created payees (resolved by name)
			if (aliasCandidates.size > 0) {
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
					const aliasesToCreate = Array.from(aliasCandidates.values())
						.map((alias) => {
							// If we already have a payeeId (existing payee), use it
							if (alias.payeeId) {
								return {
									rawString: alias.rawString,
									payeeId: alias.payeeId,
									sourceAccountId: accountId,
								};
							}

							// Try to resolve by user-selected payee name first (higher priority)
							if (alias.payeeName) {
								const payeeId = nameToIdMap.get(alias.payeeName.toLowerCase());
								if (payeeId) {
									return {
										rawString: alias.rawString,
										payeeId,
										sourceAccountId: accountId,
									};
								}
							}

							// Fallback: try to match by the original import string
							if (alias.rawString) {
								const payeeId = originalToIdMap.get(alias.rawString.toLowerCase());
								if (payeeId) {
									return {
										rawString: alias.rawString,
										payeeId,
										sourceAccountId: accountId,
									};
								}
							}

							return null; // Could not resolve
						})
						.filter((alias): alias is NonNullable<typeof alias> => alias !== null);

					if (aliasesToCreate.length > 0) {
						await createAliasesMutation.mutateAsync({ aliases: aliasesToCreate });
					}
				} catch (aliasError) {
					console.warn('Failed to record payee aliases:', aliasError);
				}
			}

			// Record category aliases from import
			// This records raw string → category mappings for future imports
			if (result.result.createdCategoryMappings && result.result.createdCategoryMappings.length > 0) {
				try {
					const categoryAliasesToCreate = result.result.createdCategoryMappings.map((mapping: { rawString: string; categoryId: number; payeeId?: number; wasAiSuggested?: boolean }) => ({
						rawString: mapping.rawString,
						categoryId: mapping.categoryId,
						payeeId: mapping.payeeId,
						sourceAccountId: accountId,
						wasAiSuggested: mapping.wasAiSuggested,
					}));

					await createCategoryAliasesMutation.mutateAsync({ aliases: categoryAliasesToCreate });
				} catch (categoryAliasError) {
					console.warn('Failed to record category aliases:', categoryAliasError);
				}
			}

			// Invalidate all relevant queries to ensure the UI updates
			// Use refetchType: 'all' to force refetch of all matching queries
			await queryClient.invalidateQueries({
				queryKey: ['accounts'],
				refetchType: 'all'
			});
			// Invalidate account-specific transaction queries
			await queryClient.invalidateQueries({
				queryKey: ['transactions', 'all', accountId],
				refetchType: 'all'
			});
			await queryClient.invalidateQueries({
				queryKey: ['transactions', 'account', accountId],
				refetchType: 'all'
			});
			await queryClient.invalidateQueries({
				queryKey: ['transactions', 'summary', accountId],
				refetchType: 'all'
			});
			// Invalidate analytics/chart queries that depend on transaction data
			await queryClient.invalidateQueries({
				queryKey: ['transactions', 'analytics'],
				refetchType: 'all'
			});
			// Also invalidate general transaction queries
			await queryClient.invalidateQueries({
				queryKey: ['transactions'],
				refetchType: 'all'
			});
			await queryClient.invalidateQueries({
				queryKey: ['payees'],
				refetchType: 'all'
			});
			await queryClient.invalidateQueries({
				queryKey: ['categories'],
				refetchType: 'all'
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
	selectedRows = new Set();
	scheduleMatches = [];
	error = null;
	matchedProfile = null;
	detectedMapping = null;
	csvHeaders = [];
	columnMapping = null;
	cleanupState = null;
	aliasCandidates = new Map();
	// Reset multi-file state
	multiFileState.reset();
	multiFileCleanupState = null;
	lastAnalyzedFileId = null;
}

// Save profile dialog helpers
function openSaveProfileDialog() {
	const defaultName = selectedFile
		? selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
		: 'New Import Profile';

	const defaultPattern = selectedFile
		? selectedFile.name.replace(/\d{4}[-_]?\d{2}[-_]?\d{2}/g, '*').replace(/\d+/g, '*')
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
				return 2; // Preview Data
			}
			return 1; // Map Columns
		}
		if (globalStep === 'review') return 2; // Preview Data
	}
	// Single-file mode: use currentStep directly
	return steps.findIndex((s) => s.id === currentStep);
});

$effect(() => {
	currentStep;
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
								onCategoryUpdate={handleMultiFileCategoryUpdate}
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
							multiFileState.goToFile(multiFileState.files.length - 1);
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
	{:else if currentStep === 'map-columns' && parseResults && rawCSVData}
		<div data-tour-id="import-column-mapping">
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
		</div>
	{:else if currentStep === 'preview' && parseResults && previewData}
		<div class="space-y-4" data-tour-id="import-preview-table">
			<!-- Preview Table with integrated toolbar -->
			<ImportPreviewTable
				data={previewData.rows}
				{importOptions}
				{accountId}
				onImportOptionsChange={handleImportOptionsChange}
				cleanupState={filteredCleanupState}
				onCleanupStateChange={handleCleanupStateChange}
				onPayeeUpdate={handlePayeeUpdateWithSimilar}
				onPayeeAliasCandidate={handlePayeeAliasCandidate}
				onCategoryUpdate={handleCategoryUpdateWithSimilar}
				onDescriptionUpdate={handleDescriptionUpdate}
				onTransferAccountUpdate={handleTransferAccountUpdateWithSimilar}
				{temporaryCategories}
				{temporaryPayees}
				processorCount={processorAnalysis.total}
				onOpenProcessorFilter={openProcessorFilterDialog}
				bind:cleanupSheetOpen
				bind:selectedRows
			/>

			<!-- Navigation -->
			<div class="flex items-center justify-between pt-4">
				<Button variant="outline" onclick={goBackToUpload}>Back</Button>
				<Button onclick={proceedToScheduleReview}>Continue</Button>
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
							<p class="font-medium">Analyzing Entities</p>
							<p class="text-muted-foreground mt-2 text-sm">Checking payees and categories...</p>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		{/if}
	{:else if currentStep === 'review-schedules'}
		<div class="space-y-6" data-tour-id="import-schedules">
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
						Adjust to show matches above {Math.round(scheduleMatchThreshold * 100)}% confidence ·
						Showing {filteredScheduleMatches.length} of {scheduleMatches.length} matches
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

			<div class="flex items-center justify-between">
				<Button variant="outline" onclick={goBackToPreview}>Back</Button>
				<Button onclick={proceedToEntityReview}>Continue to Entity Review</Button>
			</div>
		</div>
	{:else if currentStep === 'review-entities' && entityPreview}
		<div class="space-y-6" data-tour-id="import-entities">
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

			<div class="flex items-center justify-between">
				<Button variant="outline" onclick={goBackToPreview} disabled={isProcessing}> Back </Button>
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

		{#if isProcessing || isImportStreaming}
			<div
				class="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
				<Card.Root class="w-96 max-w-[90vw]">
					<Card.Content class="pt-6">
						<div class="text-center">
							<div
								class="border-primary mb-4 inline-block h-12 w-12 animate-spin rounded-full border-b-2">
							</div>
							<p class="truncate px-2 font-medium">{importProgressMessage || 'Processing Import'}</p>
							{#if importProgress > 0}
								<Progress value={importProgress} class="mt-4" />
								<p class="text-muted-foreground mt-2 text-sm">{importProgress}% complete</p>
							{:else}
								<p class="text-muted-foreground mt-2 text-sm">Creating transactions...</p>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		{/if}
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
