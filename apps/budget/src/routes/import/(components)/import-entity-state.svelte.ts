/**
 * Import Entity State Module
 *
 * Encapsulates entity override mutation logic for the import page,
 * including payee, category, transfer, and description overrides
 * along with bulk update dialog state and handlers.
 */

import type { AliasCandidate, ImportRow } from '$lib/types/import';
import { arePayeesSimilar } from '$lib/utils/payee-matching';
import { toast } from '$lib/utils/toast-interceptor';

export interface EntityOverride {
	payeeId?: number | null;
	payeeName?: string | null;
	categoryId?: number | null;
	categoryName?: string | null;
	description?: string | null;
	transferAccountId?: number | null;
	transferAccountName?: string | null;
	rememberTransferMapping?: boolean;
}

export function createImportEntityState(getPreviewRows: () => ImportRow[]) {
	let entityOverrides = $state<Record<number, EntityOverride>>({});
	let aliasCandidates = $state<Map<number, AliasCandidate>>(new Map());

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

	// State for bulk transfer update confirmation dialog
	let bulkTransferUpdateDialog = $state({
		open: false,
		rowIndex: 0,
		accountId: null as number | null,
		accountName: null as string | null,
		rememberMapping: false,
		originalPayeeName: '',
		matchCount: 0,
		matches: [] as Array<{ item: any }>,
	});

	// State for bulk category update confirmation dialog
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

	// --- Payee Handlers ---

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
				rememberTransferMapping: false,
			},
		};
	}

	function handlePayeeAliasCandidate(rowIndex: number, alias: AliasCandidate) {
		const newCandidates = new Map(aliasCandidates);
		newCandidates.set(rowIndex, alias);
		aliasCandidates = newCandidates;
	}

	function handlePayeeUpdateWithSimilar(
		rowIndex: number,
		payeeId: number | null,
		payeeName: string | null
	) {
		const rows = getPreviewRows();
		if (rows.length === 0) return;

		// Capture the previous value before updating (for potential revert)
		const previousOverride = entityOverrides[rowIndex];
		const previousPayeeId =
			previousOverride?.payeeId !== undefined ? previousOverride.payeeId : null;
		const previousPayeeName =
			previousOverride?.payeeName !== undefined ? previousOverride.payeeName : null;

		// First update the selected row
		handlePayeeUpdate(rowIndex, payeeId, payeeName);

		// Get the original payee name for the selected row
		const selectedRow = rows.find((r) => r.rowIndex === rowIndex);
		if (!selectedRow) return;

		const originalPayeeName = selectedRow.normalizedData['payee'];
		if (!originalPayeeName || typeof originalPayeeName !== 'string') return;

		// Use similarity matching to catch payees with different amounts in the name
		const matchesToUpdate = rows
			.filter((row) => {
				if (row.rowIndex === rowIndex) return false;
				const rowPayee = row.normalizedData['payee'];
				if (!rowPayee || typeof rowPayee !== 'string') return false;
				return arePayeesSimilar(rowPayee, originalPayeeName);
			})
			.map((item) => ({ item }));

		// If there are similar transactions, ask user if they want to update them
		if (matchesToUpdate.length > 0) {
			Object.assign(bulkPayeeUpdateDialog, {
				open: true,
				rowIndex,
				payeeId,
				payeeName,
				originalPayeeName,
				previousPayeeId,
				previousPayeeName,
				matchCount: matchesToUpdate.length,
				matches: matchesToUpdate,
			});
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

	// --- Category Handlers ---

	function handleCategoryUpdate(
		rowIndex: number,
		categoryId: number | null,
		categoryName: string | null
	) {
		entityOverrides = {
			...entityOverrides,
			[rowIndex]: {
				...entityOverrides[rowIndex],
				categoryId,
				categoryName,
			},
		};
	}

	function handleCategoryUpdateWithSimilar(
		rowIndex: number,
		categoryId: number | null,
		categoryName: string | null
	) {
		const rows = getPreviewRows();
		if (rows.length === 0) return;

		// Check if we're clearing the category (setting to null/empty)
		const isClearingCategory = !categoryName || categoryName.trim() === '';

		// Get the selected row info BEFORE updating it
		const selectedRow = rows.find((r) => r.rowIndex === rowIndex);
		if (!selectedRow) return;

		// Use overridden payee name if available (in case user renamed the payee)
		const payeeName =
			entityOverrides[rowIndex]?.payeeName ?? selectedRow.normalizedData['payee'];
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
		const matchesByPayee = rows
			.filter((row) => {
				if (row.rowIndex === rowIndex) return false;
				const rowPayee =
					entityOverrides[row.rowIndex]?.payeeName ?? row.normalizedData['payee'];
				if (!rowPayee || typeof rowPayee !== 'string') return false;
				return arePayeesSimilar(rowPayee, payeeName);
			})
			.map((item) => ({ item }));

		// Find matches by previous category (for "rename category" option)
		let matchesByCategory: Array<{ item: any }> = [];

		if (hasRealPreviousCategory) {
			matchesByCategory = rows
				.map((row, idx) => ({ item: row, index: idx }))
				.filter(({ item }) => {
					if (item.rowIndex === rowIndex) return false;
					const rowCategory =
						entityOverrides[item.rowIndex]?.categoryName || item.normalizedData['category'];
					return rowCategory === previousCategoryName;
				});
		}

		// If there are potential bulk updates, show dialog (don't update yet!)
		if (matchesByPayee.length > 0 || matchesByCategory.length > 0) {
			Object.assign(bulkUpdateDialog, {
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
			});
		} else {
			// No matches, just update this one transaction
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
			(match, index, self) =>
				index === self.findIndex((m) => m.item.rowIndex === match.item.rowIndex)
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

	// --- Description Handler ---

	function handleDescriptionUpdate(rowIndex: number, description: string | null) {
		entityOverrides = {
			...entityOverrides,
			[rowIndex]: {
				...entityOverrides[rowIndex],
				description,
			},
		};
	}

	// --- Transfer Handlers ---

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
				// Clear payee and category when setting transfer
				payeeId: null,
				payeeName: null,
				categoryId: null,
				categoryName: null,
				// Set transfer fields
				transferAccountId: accountId,
				transferAccountName: accountName,
				rememberTransferMapping: rememberMapping,
			},
		};
	}

	function handleTransferAccountUpdateWithSimilar(
		rowIndex: number,
		accountId: number | null,
		accountName: string | null,
		rememberMapping: boolean = false
	) {
		const rows = getPreviewRows();
		if (rows.length === 0) return;

		// Apply the update to the selected row first
		handleTransferAccountUpdate(rowIndex, accountId, accountName, rememberMapping);

		// If clearing the transfer, don't prompt for similar
		if (!accountId) return;

		const selectedRow = rows.find((r) => r.rowIndex === rowIndex);
		if (!selectedRow) return;

		const originalPayeeName = selectedRow.normalizedData['payee'];
		if (!originalPayeeName || typeof originalPayeeName !== 'string') return;

		// Find similar payees that aren't already set as transfers
		const matchesToUpdate = rows
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
			Object.assign(bulkTransferUpdateDialog, {
				open: true,
				rowIndex,
				accountId,
				accountName,
				rememberMapping,
				originalPayeeName,
				matchCount: matchesToUpdate.length,
				matches: matchesToUpdate,
			});
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

	return {
		get entityOverrides() {
			return entityOverrides;
		},
		set entityOverrides(v: Record<number, EntityOverride>) {
			entityOverrides = v;
		},
		get aliasCandidates() {
			return aliasCandidates;
		},
		set aliasCandidates(v: Map<number, AliasCandidate>) {
			aliasCandidates = v;
		},
		get bulkPayeeUpdateDialog() {
			return bulkPayeeUpdateDialog;
		},
		get bulkTransferUpdateDialog() {
			return bulkTransferUpdateDialog;
		},
		get bulkUpdateDialog() {
			return bulkUpdateDialog;
		},
		reset() {
			entityOverrides = {};
			aliasCandidates = new Map();
			Object.assign(bulkPayeeUpdateDialog, {
				open: false, rowIndex: 0, payeeId: null, payeeName: null,
				originalPayeeName: '', previousPayeeId: null, previousPayeeName: null,
				matchCount: 0, matches: [],
			});
			Object.assign(bulkTransferUpdateDialog, {
				open: false, rowIndex: 0, accountId: null, accountName: null,
				rememberMapping: false, originalPayeeName: '', matchCount: 0, matches: [],
			});
			Object.assign(bulkUpdateDialog, {
				open: false, rowIndex: 0, categoryId: null, categoryName: null,
				previousCategoryName: null, payeeName: '', matchCountByPayee: 0,
				matchCountByCategory: 0, matchesByPayee: [], matchesByCategory: [],
			});
		},
		// Payee handlers
		handlePayeeUpdate,
		handlePayeeAliasCandidate,
		handlePayeeUpdateWithSimilar,
		confirmBulkPayeeUpdate,
		cancelBulkPayeeUpdate,
		revertPayeeUpdate,
		// Category handlers
		handleCategoryUpdate,
		handleCategoryUpdateWithSimilar,
		confirmBulkUpdateJustOne,
		confirmBulkUpdateByPayee,
		confirmBulkUpdateByCategory,
		confirmBulkUpdateBoth,
		cancelBulkUpdate,
		// Description handler
		handleDescriptionUpdate,
		// Transfer handlers
		handleTransferAccountUpdate,
		handleTransferAccountUpdateWithSimilar,
		confirmBulkTransferUpdate,
		cancelBulkTransferUpdate,
		revertTransferUpdate,
	};
}
