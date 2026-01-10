<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import { formatCurrency } from '$lib/utils/formatters';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import FileText from '@lucide/svelte/icons/file-text';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import type { ImportFile, ImportRow } from '$lib/types/import';

	interface Props {
		files: ImportFile[];
		totalTransactions: number;
		isImporting?: boolean;
		onImport: () => void;
		onBack: () => void;
		onEditFile?: (index: number) => void;
		class?: string;
	}

	let {
		files,
		totalTransactions,
		isImporting = false,
		onImport,
		onBack,
		onEditFile,
		class: className
	}: Props = $props();

	// Track which files are expanded - expand all files by default
	let expandedFiles = $state<Set<string>>(new Set());

	// Expand all files when files are provided
	$effect(() => {
		if (files.length > 0 && expandedFiles.size === 0) {
			expandedFiles = new Set(files.map(f => f.id));
		}
	});

	function toggleFile(id: string) {
		const newSet = new Set(expandedFiles);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		expandedFiles = newSet;
	}

	// Find potential cross-file duplicates
	const crossFileDuplicates = $derived.by(() => {
		const seen = new Map<string, { fileId: string; rowIndex: number }>();
		const duplicates: Array<{
			key: string;
			files: Array<{ fileId: string; fileName: string; rowIndex: number }>;
		}> = [];

		for (const file of files) {
			for (const row of file.validatedRows ?? []) {
				const key = `${row.normalizedData.date}-${row.normalizedData.amount}-${row.normalizedData.payee ?? ''}`;
				const existing = seen.get(key);

				if (existing && existing.fileId !== file.id) {
					// Found duplicate across files
					const existingFile = files.find((f) => f.id === existing.fileId);
					duplicates.push({
						key,
						files: [
							{
								fileId: existing.fileId,
								fileName: existingFile?.fileName ?? 'Unknown',
								rowIndex: existing.rowIndex
							},
							{ fileId: file.id, fileName: file.fileName, rowIndex: row.rowIndex }
						]
					});
				} else {
					seen.set(key, { fileId: file.id, rowIndex: row.rowIndex });
				}
			}
		}

		return duplicates;
	});

	function getFileStats(file: ImportFile) {
		const rows = file.validatedRows ?? [];
		const valid = rows.filter((r) => r.validationStatus === 'valid').length;
		const duplicates = rows.filter((r) => r.validationStatus === 'duplicate').length;
		const warnings = rows.filter((r) => r.validationStatus === 'warning').length;
		const errors = rows.filter((r) => r.validationStatus === 'invalid').length;

		const totalAmount = rows.reduce((sum, r) => {
			const amount = parseFloat(r.normalizedData.amount);
			return sum + (isNaN(amount) ? 0 : amount);
		}, 0);

		return { total: rows.length, valid, duplicates, warnings, errors, totalAmount };
	}
</script>

<div class={cn('space-y-6', className)}>
	<!-- Header -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Review All Transactions</Card.Title>
					<Card.Description>
						{totalTransactions} transactions from {files.length} file{files.length > 1 ? 's' : ''}
					</Card.Description>
				</div>
				<div class="flex items-center gap-2">
					{#if crossFileDuplicates.length > 0}
						<Badge variant="outline" class="border-yellow-500 text-yellow-600">
							<AlertTriangle class="mr-1 h-3 w-3" />
							{crossFileDuplicates.length} potential duplicates
						</Badge>
					{/if}
				</div>
			</div>
		</Card.Header>
	</Card.Root>

	<!-- Cross-file duplicates warning -->
	{#if crossFileDuplicates.length > 0}
		<Card.Root class="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
			<Card.Header class="pb-2">
				<Card.Title class="flex items-center gap-2 text-base text-yellow-700 dark:text-yellow-400">
					<AlertTriangle class="h-4 w-4" />
					Potential Duplicates Across Files
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<p class="text-muted-foreground mb-2 text-sm">
					Found transactions that appear in multiple files. These may be duplicates from overlapping
					date ranges.
				</p>
				<ul class="text-muted-foreground space-y-1 text-xs">
					{#each crossFileDuplicates.slice(0, 5) as dup}
						<li>
							Same transaction in: {dup.files.map((f) => f.fileName).join(' and ')}
						</li>
					{/each}
					{#if crossFileDuplicates.length > 5}
						<li class="font-medium">...and {crossFileDuplicates.length - 5} more</li>
					{/if}
				</ul>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- File summaries -->
	<div class="space-y-3">
		{#each files as file, index (file.id)}
			{@const stats = getFileStats(file)}
			{@const isExpanded = expandedFiles.has(file.id)}

			<Card.Root>
				<Collapsible.Root open={isExpanded} onOpenChange={() => toggleFile(file.id)}>
					<Collapsible.Trigger>
						{#snippet child({ props })}
							<button
								{...props}
								class="flex w-full items-center justify-between p-4 text-left hover:bg-muted/30"
							>
								<div class="flex items-center gap-3">
									<div class="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
										<FileText class="text-primary h-5 w-5" />
									</div>
									<div>
										<p class="font-medium">{file.fileName}</p>
										<div class="text-muted-foreground flex items-center gap-3 text-sm">
											<span>{stats.total} transactions</span>
											<span>{formatCurrency(stats.totalAmount)}</span>
										</div>
									</div>
								</div>

								<div class="flex items-center gap-3">
									<!-- Status badges -->
									<div class="flex items-center gap-2">
										{#if stats.valid > 0}
											<Badge variant="secondary" class="bg-green-100 text-green-700 dark:bg-green-900/30">
												<CheckCircle class="mr-1 h-3 w-3" />
												{stats.valid} ready
											</Badge>
										{/if}
										{#if stats.duplicates > 0}
											<Badge variant="secondary" class="bg-yellow-100 text-yellow-700">
												{stats.duplicates} duplicates
											</Badge>
										{/if}
										{#if stats.errors > 0}
											<Badge variant="destructive">
												{stats.errors} errors
											</Badge>
										{/if}
									</div>

									<!-- Expand/collapse icon -->
									{#if isExpanded}
										<ChevronDown class="text-muted-foreground h-5 w-5" />
									{:else}
										<ChevronRight class="text-muted-foreground h-5 w-5" />
									{/if}
								</div>
							</button>
						{/snippet}
					</Collapsible.Trigger>

					<Collapsible.Content>
						<div class="border-t px-4 py-3">
							<!-- Transaction summary table -->
							<div class="bg-muted/30 max-h-64 overflow-auto rounded-lg border">
								<table class="w-full text-sm">
									<thead class="bg-muted/50 sticky top-0">
										<tr>
											<th class="px-3 py-2 text-left font-medium">Date</th>
											<th class="px-3 py-2 text-left font-medium">Payee</th>
											<th class="px-3 py-2 text-right font-medium">Amount</th>
											<th class="px-3 py-2 text-center font-medium">Status</th>
										</tr>
									</thead>
									<tbody class="divide-y">
										{#each (file.validatedRows ?? []).slice(0, 10) as row}
											<tr class="hover:bg-muted/20">
												<td class="px-3 py-2">{row.normalizedData.date}</td>
												<td class="max-w-48 truncate px-3 py-2">
													{row.normalizedData.payee ?? '-'}
												</td>
												<td class="px-3 py-2 text-right font-mono">
													{formatCurrency(parseFloat(row.normalizedData.amount) || 0)}
												</td>
												<td class="px-3 py-2 text-center">
													{#if row.validationStatus === 'valid'}
														<Badge variant="outline" class="text-green-600">Valid</Badge>
													{:else if row.validationStatus === 'duplicate'}
														<Badge variant="outline" class="text-yellow-600">Duplicate</Badge>
													{:else if row.validationStatus === 'invalid'}
														<Badge variant="destructive">Error</Badge>
													{:else}
														<Badge variant="secondary">{row.validationStatus}</Badge>
													{/if}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
								{#if (file.validatedRows?.length ?? 0) > 10}
									<div class="text-muted-foreground border-t bg-muted/30 px-3 py-2 text-center text-xs">
										...and {(file.validatedRows?.length ?? 0) - 10} more transactions
									</div>
								{/if}
							</div>

							<!-- Edit button -->
							{#if onEditFile}
								<div class="mt-3 flex justify-end">
									<Button variant="outline" size="sm" onclick={() => onEditFile(index)}>
										Edit Transactions
									</Button>
								</div>
							{/if}
						</div>
					</Collapsible.Content>
				</Collapsible.Root>
			</Card.Root>
		{/each}
	</div>

	<!-- Action buttons -->
	<div class="flex items-center justify-between pt-4">
		<Button variant="outline" onclick={onBack} disabled={isImporting}>
			Back to Files
		</Button>
		<Button onclick={onImport} disabled={isImporting || totalTransactions === 0} size="lg">
			{#if isImporting}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				Importing...
			{:else}
				Import All ({totalTransactions} transactions)
			{/if}
		</Button>
	</div>
</div>
