/**
 * Multi-File Import State Manager
 *
 * Provides reactive state management for importing multiple files in a single session.
 * Uses Svelte 5 runes for fine-grained reactivity.
 */

import type {
  ColumnMapping,
  EntityOverride,
  ImportFile,
  ImportFileType,
  ImportRow,
  MultiFileGlobalStep,
  ParseResult
} from '$lib/types/import';

/**
 * Detects the file type from a file's extension
 */
export function detectFileType(file: File): ImportFileType {
	const extension = file.name.split('.').pop()?.toLowerCase();

	switch (extension) {
		case 'csv':
			return 'csv';
		case 'xlsx':
		case 'xls':
			return 'excel';
		case 'ofx':
			return 'ofx';
		case 'qfx':
			return 'qfx';
		case 'qif':
			return 'qif';
		case 'iif':
			return 'iif';
		case 'qbo':
			return 'qbo';
		default:
			return 'csv'; // Default to CSV
	}
}

/**
 * Get human-readable name for file type
 */
export function getFileTypeName(type: ImportFileType): string {
	switch (type) {
		case 'csv':
			return 'CSV';
		case 'excel':
			return 'Excel';
		case 'ofx':
			return 'OFX (Open Financial Exchange)';
		case 'qfx':
			return 'QFX (Quicken)';
		case 'qif':
			return 'QIF (Quicken Interchange)';
		case 'iif':
			return 'IIF (Intuit Interchange)';
		case 'qbo':
			return 'QBO (QuickBooks Online)';
	}
}

/**
 * Check if a file type requires column mapping
 */
export function requiresColumnMapping(type: ImportFileType): boolean {
	return type === 'csv' || type === 'excel';
}

/**
 * Creates a reactive multi-file import state manager
 */
export function createMultiFileImportState() {
	// Core state
	let files = $state<ImportFile[]>([]);
	let currentFileIndex = $state(0);
	let globalStep = $state<MultiFileGlobalStep>('upload');
	let enforceFileType = $state<ImportFileType | null>(null);

	// Derived values
	const currentFile = $derived(files[currentFileIndex] ?? null);
	const totalFiles = $derived(files.length);
	const isFirstFile = $derived(currentFileIndex === 0);
	const isLastFile = $derived(currentFileIndex === files.length - 1);
	const allFilesReady = $derived(files.every((f) => f.status === 'ready'));
	const hasErrors = $derived(files.some((f) => f.status === 'error'));

	const totalTransactions = $derived(
		files.reduce((sum, f) => sum + (f.validatedRows?.length ?? 0), 0)
	);

	const processingProgress = $derived.by(() => {
		if (files.length === 0) return 0;
		const readyCount = files.filter((f) => f.status === 'ready').length;
		return Math.round((readyCount / files.length) * 100);
	});

	/**
	 * Add new files to the import session
	 * @throws Error if file types don't match the enforced type
	 */
	function addFiles(newFiles: File[]): { added: ImportFile[]; rejected: string[] } {
		const added: ImportFile[] = [];
		const rejected: string[] = [];

		for (const file of newFiles) {
			const fileType = detectFileType(file);

			// Check file type consistency
			if (enforceFileType && fileType !== enforceFileType) {
				rejected.push(
					`${file.name}: Expected ${getFileTypeName(enforceFileType)} format, got ${getFileTypeName(fileType)}`
				);
				continue;
			}

			// Set enforced file type from first file
			if (!enforceFileType) {
				enforceFileType = fileType;
			}

			const importFile: ImportFile = {
				id: crypto.randomUUID(),
				file,
				fileName: file.name,
				fileType,
				status: 'pending',
				needsColumnMapping: requiresColumnMapping(fileType)
			};

			added.push(importFile);
		}

		if (added.length > 0) {
			files = [...files, ...added];
		}

		return { added, rejected };
	}

	/**
	 * Remove a file from the import session
	 */
	function removeFile(id: string) {
		const index = files.findIndex((f) => f.id === id);
		if (index === -1) return;

		files = files.filter((f) => f.id !== id);

		// Reset enforced type if no files remain
		if (files.length === 0) {
			enforceFileType = null;
			currentFileIndex = 0;
			globalStep = 'upload';
		} else if (currentFileIndex >= files.length) {
			// Adjust current index if needed
			currentFileIndex = Math.max(0, files.length - 1);
		}
	}

	/**
	 * Update a file's state
	 */
	function updateFileState(id: string, updates: Partial<ImportFile>) {
		const index = files.findIndex((f) => f.id === id);
		if (index === -1) return;

		files = files.map((f) => (f.id === id ? { ...f, ...updates } : f));
	}

	/**
	 * Set parse result for a file
	 */
	function setParseResult(id: string, parseResult: ParseResult, needsMapping: boolean) {
		updateFileState(id, {
			parseResult,
			needsColumnMapping: needsMapping,
			status: needsMapping ? 'mapping' : 'preview',
			scheduleMatches: parseResult.scheduleMatches
		});
	}

	/**
	 * Set column mapping for a file (does not change status - call updateFileState separately)
	 */
	function setColumnMapping(id: string, mapping: ColumnMapping) {
		updateFileState(id, {
			columnMapping: mapping
		});
	}

	/**
	 * Set validated rows for a file
	 */
	function setValidatedRows(id: string, rows: ImportRow[]) {
		updateFileState(id, {
			validatedRows: rows
		});
	}

	/**
	 * Set entity overrides for a file
	 */
	function setEntityOverrides(id: string, overrides: Record<number, EntityOverride>) {
		updateFileState(id, {
			entityOverrides: overrides
		});
	}

	/**
	 * Mark a file as ready for import
	 */
	function markFileReady(id: string) {
		updateFileState(id, { status: 'ready' });
	}

	/**
	 * Mark a file as having an error
	 */
	function markFileError(id: string, error: string) {
		updateFileState(id, { status: 'error', error });
	}

	/**
	 * Move to the next file
	 */
	function nextFile() {
		if (currentFileIndex < files.length - 1) {
			currentFileIndex++;
		} else {
			// All files processed, move to review
			globalStep = 'review';
		}
	}

	/**
	 * Move to the previous file
	 */
	function previousFile() {
		if (currentFileIndex > 0) {
			currentFileIndex--;
		}
	}

	/**
	 * Go to a specific file by index
	 */
	function goToFile(index: number) {
		if (index >= 0 && index < files.length) {
			currentFileIndex = index;
			globalStep = 'processing';
		}
	}

	/**
	 * Set the global step
	 */
	function setGlobalStep(step: MultiFileGlobalStep) {
		globalStep = step;
	}

	/**
	 * Start processing files
	 */
	function startProcessing() {
		if (files.length > 0) {
			currentFileIndex = 0;
			globalStep = 'processing';
		}
	}

	/**
	 * Get all validated rows from all files, with source file annotation
	 */
	function getAllValidatedRows(): Array<ImportRow & { sourceFileId: string; sourceFileName: string }> {
		return files.flatMap((file) =>
			(file.validatedRows ?? []).map((row) => ({
				...row,
				sourceFileId: file.id,
				sourceFileName: file.fileName
			}))
		);
	}

	/**
	 * Get all entity overrides from all files, keyed by global row index
	 */
	function getAllEntityOverrides(): Record<number, EntityOverride & { sourceFileId: string }> {
		const result: Record<number, EntityOverride & { sourceFileId: string }> = {};
		let globalRowIndex = 0;

		for (const file of files) {
			const rows = file.validatedRows ?? [];
			const overrides = file.entityOverrides ?? {};

			for (let i = 0; i < rows.length; i++) {
				if (overrides[i]) {
					result[globalRowIndex] = {
						...overrides[i],
						sourceFileId: file.id
					};
				}
				globalRowIndex++;
			}
		}

		return result;
	}

	/**
	 * Reset all state
	 */
	function reset() {
		files = [];
		currentFileIndex = 0;
		globalStep = 'upload';
		enforceFileType = null;
	}

	return {
		// State (reactive getters)
		get files() {
			return files;
		},
		get currentFileIndex() {
			return currentFileIndex;
		},
		get currentFile() {
			return currentFile;
		},
		get globalStep() {
			return globalStep;
		},
		get enforceFileType() {
			return enforceFileType;
		},

		// Derived values
		get totalFiles() {
			return totalFiles;
		},
		get isFirstFile() {
			return isFirstFile;
		},
		get isLastFile() {
			return isLastFile;
		},
		get allFilesReady() {
			return allFilesReady;
		},
		get hasErrors() {
			return hasErrors;
		},
		get totalTransactions() {
			return totalTransactions;
		},
		get processingProgress() {
			return processingProgress;
		},

		// Actions
		addFiles,
		removeFile,
		updateFileState,
		setParseResult,
		setColumnMapping,
		setValidatedRows,
		setEntityOverrides,
		markFileReady,
		markFileError,
		nextFile,
		previousFile,
		goToFile,
		setGlobalStep,
		startProcessing,
		getAllValidatedRows,
		getAllEntityOverrides,
		reset
	};
}

/**
 * Type for the return value of createMultiFileImportState
 */
export type MultiFileImportStateManager = ReturnType<typeof createMultiFileImportState>;
