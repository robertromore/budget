<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Checkbox } from '$lib/components/ui/checkbox';
import * as Command from '$lib/components/ui/command';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Progress } from '$lib/components/ui/progress';
import { ScrollArea } from '$lib/components/ui/scroll-area';
import { Separator } from '$lib/components/ui/separator';
import * as Popover from '$lib/components/ui/popover';
import type {
	CleanupState,
	PayeeGroup,
	CategorySuggestion
} from '$lib/types/import';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { trpc } from '$lib/trpc/client';
import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
import Check from '@lucide/svelte/icons/check';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import ChevronUp from '@lucide/svelte/icons/chevron-up';
import Edit3 from '@lucide/svelte/icons/edit-3';
import Loader2 from '@lucide/svelte/icons/loader-2';
import Merge from '@lucide/svelte/icons/merge';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Users from '@lucide/svelte/icons/users';
import X from '@lucide/svelte/icons/x';
import { toast } from 'svelte-sonner';
import Fuse from 'fuse.js';

interface Props {
	rows: Array<{
		rowIndex: number;
		normalizedData: Record<string, any>;
	}>;
	onNext: (cleanupState: CleanupState) => void;
	onBack: () => void;
	onSkip: () => void;
	/** Current account being imported into (excluded from transfer options) */
	currentAccountId?: number;
}

let { rows, onNext, onBack, onSkip, currentAccountId }: Props = $props();

// State
let cleanupState = $state<CleanupState>({
	payeeGroups: [],
	categorySuggestions: [],
	isAnalyzing: true,
	analysisProgress: 0,
	analysisPhase: 'grouping_payees'
});

let expandedGroups = $state(new Set<string>());
let editingGroup = $state<string | null>(null);
let editingName = $state('');

// Account search value per group
let groupAccountSearch = $state<Record<string, string>>({});
// Track which group's popover is open
let groupPopoverOpen = $state<Record<string, boolean>>({});

// Get accounts for transfer selection
const accountsState = AccountsState.get();
const accountsArray = $derived(
	accountsState?.all
		.filter((a) => a.id !== currentAccountId && !a.closed)
		.map((a) => ({
			id: a.id,
			name: a.name,
			accountIcon: a.accountIcon,
			accountColor: a.accountColor
		})) ?? []
);

// Fuse for account search
const accountsFused = $derived(
	new Fuse(accountsArray, { keys: ['name'], includeScore: true, threshold: 0.3 })
);

function getFilteredAccounts(groupId: string) {
	const searchValue = groupAccountSearch[groupId] || '';
	if (!searchValue) return accountsArray;
	return accountsFused.search(searchValue).map((r) => r.item);
}

function markGroupAsTransfer(groupId: string, account: { id: number; name: string }) {
	cleanupState.payeeGroups = cleanupState.payeeGroups.map((g) =>
		g.groupId === groupId
			? {
					...g,
					userDecision: 'accept' as const,
					transferAccountId: account.id,
					transferAccountName: account.name
				}
			: g
	);
	// Clear search
	groupAccountSearch = { ...groupAccountSearch, [groupId]: '' };
}

function clearGroupTransfer(groupId: string) {
	cleanupState.payeeGroups = cleanupState.payeeGroups.map((g) =>
		g.groupId === groupId
			? { ...g, transferAccountId: undefined, transferAccountName: undefined }
			: g
	);
}

// Derived stats
const stats = $derived.by(() => {
	const groups = cleanupState.payeeGroups;
	const accepted = groups.filter((g) => g.userDecision === 'accept' && !g.transferAccountId).length;
	const rejected = groups.filter((g) => g.userDecision === 'reject').length;
	const pending = groups.filter((g) => g.userDecision === 'pending').length;
	const withExisting = groups.filter((g) => g.existingMatch).length;
	const transfers = groups.filter((g) => g.transferAccountId).length;

	const catSuggestions = cleanupState.categorySuggestions;
	const autoFilled = catSuggestions.filter((s) => s.selectedCategoryId && !s.userOverride).length;
	const needsReview = catSuggestions.filter((s) => !s.selectedCategoryId).length;

	return {
		totalGroups: groups.length,
		accepted,
		rejected,
		pending,
		withExisting,
		transfers,
		autoFilled,
		needsReview
	};
});

// Run analysis on mount
$effect(() => {
	analyzeData();
});

async function analyzeData() {
	cleanupState.isAnalyzing = true;
	cleanupState.analysisProgress = 0;
	cleanupState.analysisPhase = 'grouping_payees';

	try {
		// Extract payee data from rows
		const payeeInputs = rows
			.filter((row) => row.normalizedData['payee'])
			.map((row) => ({
				rowIndex: row.rowIndex,
				payeeName: row.normalizedData['payee'] as string,
				// Pass the raw CSV payee string for alias tracking
				originalPayee: (row.normalizedData['originalPayee'] || row.normalizedData['payee']) as string,
				amount: row.normalizedData['amount'] as number,
				date: row.normalizedData['date'] as string,
				memo: row.normalizedData['description'] || row.normalizedData['notes']
			}));

		if (payeeInputs.length === 0) {
			cleanupState.isAnalyzing = false;
			return;
		}

		cleanupState.analysisProgress = 20;

		// Call the combined analysis endpoint
		const result = await trpc().importCleanupRoutes.analyzeImport.mutate({
			rows: payeeInputs
		});

		cleanupState.analysisProgress = 80;
		cleanupState.analysisPhase = 'suggesting_categories';

		// Update state with results
		cleanupState.payeeGroups = result.payeeGroups;
		cleanupState.categorySuggestions = result.categorySuggestions;
		cleanupState.analysisProgress = 100;
	} catch (error) {
		console.error('Failed to analyze import data:', error);
		toast.error('Failed to analyze import data');
	} finally {
		cleanupState.isAnalyzing = false;
	}
}

function toggleGroup(groupId: string) {
	const newExpanded = new Set(expandedGroups);
	if (newExpanded.has(groupId)) {
		newExpanded.delete(groupId);
	} else {
		newExpanded.add(groupId);
	}
	expandedGroups = newExpanded;
}

function acceptGroup(groupId: string) {
	cleanupState.payeeGroups = cleanupState.payeeGroups.map((g) =>
		g.groupId === groupId ? { ...g, userDecision: 'accept' as const } : g
	);
}

function rejectGroup(groupId: string) {
	cleanupState.payeeGroups = cleanupState.payeeGroups.map((g) =>
		g.groupId === groupId ? { ...g, userDecision: 'reject' as const } : g
	);
}

function startEditGroup(group: PayeeGroup) {
	editingGroup = group.groupId;
	editingName = group.customName || group.canonicalName;
}

function saveEditGroup(groupId: string) {
	if (editingName.trim()) {
		cleanupState.payeeGroups = cleanupState.payeeGroups.map((g) =>
			g.groupId === groupId
				? { ...g, userDecision: 'custom' as const, customName: editingName.trim() }
				: g
		);
	}
	editingGroup = null;
	editingName = '';
}

function cancelEditGroup() {
	editingGroup = null;
	editingName = '';
}

function acceptAllHighConfidence() {
	cleanupState.payeeGroups = cleanupState.payeeGroups.map((g) =>
		g.confidence >= 0.85 && g.userDecision === 'pending'
			? { ...g, userDecision: 'accept' as const }
			: g
	);
	toast.success('Accepted all high-confidence groups');
}

function resetAllDecisions() {
	cleanupState.payeeGroups = cleanupState.payeeGroups.map((g) => ({
		...g,
		userDecision: g.confidence >= 0.95 ? ('accept' as const) : ('pending' as const),
		customName: undefined
	}));
	toast.info('Reset all decisions');
}

function resetGroup(groupId: string) {
	cleanupState.payeeGroups = cleanupState.payeeGroups.map((g) =>
		g.groupId === groupId
			? {
					...g,
					userDecision: g.confidence >= 0.95 ? ('accept' as const) : ('pending' as const),
					customName: undefined,
					transferAccountId: undefined,
					transferAccountName: undefined
				}
			: g
	);
}

function getConfidenceColor(confidence: number): string {
	if (confidence >= 0.9) return 'text-green-600 dark:text-green-400';
	if (confidence >= 0.8) return 'text-yellow-600 dark:text-yellow-400';
	if (confidence >= 0.7) return 'text-orange-600 dark:text-orange-400';
	return 'text-red-600 dark:text-red-400';
}

function getConfidenceBadgeVariant(
	confidence: number
): 'default' | 'secondary' | 'destructive' | 'outline' {
	if (confidence >= 0.9) return 'default';
	if (confidence >= 0.8) return 'secondary';
	return 'outline';
}

function handleProceed() {
	onNext(cleanupState);
}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<div class="mb-2 flex items-center gap-3">
			<Sparkles class="text-primary h-8 w-8" />
			<h2 class="text-2xl font-bold">Cleanup & Review</h2>
		</div>
		<p class="text-muted-foreground">
			Review and merge similar payees, and check category suggestions before importing.
		</p>
	</div>

	{#if cleanupState.isAnalyzing}
		<!-- Analysis Progress -->
		<Card.Root>
			<Card.Content class="py-8">
				<div class="flex flex-col items-center justify-center space-y-4">
					<Loader2 class="text-primary h-8 w-8 animate-spin" />
					<div class="text-center">
						<p class="font-medium">Analyzing import data...</p>
						<p class="text-muted-foreground text-sm">
							{#if cleanupState.analysisPhase === 'grouping_payees'}
								Grouping similar payees
							{:else if cleanupState.analysisPhase === 'matching_existing'}
								Matching to existing payees
							{:else}
								Suggesting categories
							{/if}
						</p>
					</div>
					<Progress value={cleanupState.analysisProgress} class="w-64" />
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Summary Stats -->
		<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
			<Card.Root>
				<Card.Content class="p-4">
					<div class="flex items-center gap-3">
						<div class="bg-primary/10 rounded-lg p-2">
							<Users class="text-primary h-5 w-5" />
						</div>
						<div>
							<p class="text-2xl font-bold">{stats.totalGroups}</p>
							<p class="text-muted-foreground text-xs">Payee Groups</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-4">
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-green-500/10 p-2">
							<Merge class="h-5 w-5 text-green-600" />
						</div>
						<div>
							<p class="text-2xl font-bold">{stats.withExisting}</p>
							<p class="text-muted-foreground text-xs">Existing Matches</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-4">
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-blue-500/10 p-2">
							<Sparkles class="h-5 w-5 text-blue-600" />
						</div>
						<div>
							<p class="text-2xl font-bold">{stats.autoFilled}</p>
							<p class="text-muted-foreground text-xs">Categories Auto-filled</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-4">
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-yellow-500/10 p-2">
							<Edit3 class="h-5 w-5 text-yellow-600" />
						</div>
						<div>
							<p class="text-2xl font-bold">{stats.pending}</p>
							<p class="text-muted-foreground text-xs">Pending Review</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Bulk Actions -->
		{#if stats.pending > 0}
			<Card.Root>
				<Card.Content class="py-3">
					<div class="flex flex-wrap items-center gap-2">
						<span class="text-muted-foreground text-sm">Quick actions:</span>
						<Button variant="outline" size="sm" onclick={acceptAllHighConfidence}>
							<Check class="mr-1 h-3 w-3" />
							Accept High Confidence
						</Button>
						<Button variant="ghost" size="sm" onclick={resetAllDecisions}>Reset All</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Payee Groups -->
		{#if cleanupState.payeeGroups.length > 0}
			<Card.Root>
				<Card.Header class="pb-3">
					<Card.Title class="text-base">Payee Groups</Card.Title>
					<Card.Description>
						Review similar payees and decide how to handle them.
					</Card.Description>
				</Card.Header>
				<Card.Content class="overflow-hidden">
					<ScrollArea class="h-[400px]">
						<div class="space-y-2 pr-4">
							{#each cleanupState.payeeGroups as group (group.groupId)}
								{@const isExpanded = expandedGroups.has(group.groupId)}
								{@const isEditing = editingGroup === group.groupId}
								{@const displayName =
									group.userDecision === 'custom' && group.customName
										? group.customName
										: group.transferAccountName || group.canonicalName}
								{@const isTransfer = !!group.transferAccountId}
								{@const filteredAccounts = getFilteredAccounts(group.groupId)}

								<div
									class="rounded-lg border p-3 transition-colors {isTransfer
										? 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950'
										: group.userDecision === 'accept'
											? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
											: group.userDecision === 'reject'
												? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
												: group.userDecision === 'custom'
													? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
													: ''}">
									<div class="flex items-start gap-3">
										<!-- Expand/Collapse Toggle -->
										<button
											type="button"
											class="text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
											onclick={() => toggleGroup(group.groupId)}>
											{#if isExpanded}
												<ChevronUp class="h-4 w-4" />
											{:else}
												<ChevronDown class="h-4 w-4" />
											{/if}
										</button>

										<!-- Main Content -->
										<div class="min-w-0 flex-1">
											<!-- Header with name and badge -->
											<div class="mb-2 flex items-center gap-2">
												{#if isTransfer}
													<ArrowRightLeft class="h-4 w-4 text-purple-600" />
												{/if}
												<span class="font-medium">{displayName}</span>
												<Badge
													variant={getConfidenceBadgeVariant(group.confidence)}
													class="text-xs">
													{Math.round(group.confidence * 100)}%
												</Badge>
												{#if group.members.length > 1}
													<span class="text-muted-foreground text-xs">
														({group.members.length} variations)
													</span>
												{/if}
												{#if isTransfer}
													<Badge variant="secondary" class="text-xs">Transfer</Badge>
												{/if}
											</div>

											{#if group.existingMatch && !isTransfer}
												<p class="text-muted-foreground mb-2 text-xs">
													Matches existing: <span class="font-medium"
														>{group.existingMatch.name}</span>
													({Math.round(group.existingMatch.confidence * 100)}% match)
												</p>
											{/if}

											<!-- Action Buttons -->
											{#if isEditing}
												<div class="flex items-center gap-2">
													<Input
														bind:value={editingName}
														class="h-8"
														placeholder="Enter custom name"
														onkeydown={(e) => {
															if (e.key === 'Enter') saveEditGroup(group.groupId);
															if (e.key === 'Escape') cancelEditGroup();
														}} />
													<Button
														variant="ghost"
														size="sm"
														onclick={() => saveEditGroup(group.groupId)}>
														<Check class="h-4 w-4" />
													</Button>
													<Button variant="ghost" size="sm" onclick={cancelEditGroup}>
														<X class="h-4 w-4" />
													</Button>
												</div>
											{:else if group.userDecision === 'custom' && group.customName}
												<!-- Custom name set - show confirmation state -->
												<div class="flex flex-wrap items-center gap-2">
													<div class="flex items-center gap-1.5 rounded-md bg-blue-100 px-2 py-1 text-sm text-blue-700 dark:bg-blue-900 dark:text-blue-300">
														<Check class="h-3 w-3" />
														<span>Renamed</span>
													</div>
													<Button
														variant="outline"
														size="sm"
														class="h-7"
														onclick={() => startEditGroup(group)}>
														<Edit3 class="mr-1 h-3 w-3" />
														Edit
													</Button>
													<!-- Transfer popover -->
													<Popover.Root
														open={groupPopoverOpen[group.groupId] ?? false}
														onOpenChange={(open) => {
															groupPopoverOpen = { ...groupPopoverOpen, [group.groupId]: open };
														}}>
														<Popover.Trigger>
															{#snippet child({ props })}
																<Button {...props} variant="ghost" size="sm" class="h-7">
																	<ArrowRightLeft class="mr-1 h-3 w-3" />
																	Transfer
																</Button>
															{/snippet}
														</Popover.Trigger>
														<Popover.Content class="w-64 p-2" align="start">
															<div class="space-y-2">
																<Input
																	placeholder="Search accounts..."
																	class="h-8"
																	value={groupAccountSearch[group.groupId] || ''}
																	oninput={(e) => {
																		groupAccountSearch = {
																			...groupAccountSearch,
																			[group.groupId]: e.currentTarget.value
																		};
																	}} />
																<div class="max-h-40 space-y-1 overflow-y-auto">
																	{#each filteredAccounts.slice(0, 6) as account (account.id)}
																		<button
																			type="button"
																			class="hover:bg-muted flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm"
																			onclick={() => {
																				markGroupAsTransfer(group.groupId, account);
																				groupPopoverOpen = {
																					...groupPopoverOpen,
																					[group.groupId]: false
																				};
																			}}>
																			<ArrowRightLeft class="h-3 w-3 text-purple-600" />
																			<span>{account.name}</span>
																		</button>
																	{:else}
																		<p class="text-muted-foreground py-2 text-center text-xs">
																			No accounts found
																		</p>
																	{/each}
																</div>
															</div>
														</Popover.Content>
													</Popover.Root>
													<Button
														variant="ghost"
														size="sm"
														class="h-7"
														onclick={() => resetGroup(group.groupId)}>
														Reset
													</Button>
												</div>
											{:else if group.userDecision === 'accept' && !isTransfer}
												<!-- Accepted - show confirmation state -->
												<div class="flex flex-wrap items-center gap-2">
													<div class="flex items-center gap-1.5 rounded-md bg-green-100 px-2 py-1 text-sm text-green-700 dark:bg-green-900 dark:text-green-300">
														<Check class="h-3 w-3" />
														<span>Accepted</span>
													</div>
													<Button
														variant="outline"
														size="sm"
														class="h-7"
														onclick={() => startEditGroup(group)}>
														<Edit3 class="mr-1 h-3 w-3" />
														Edit
													</Button>
													<!-- Transfer popover -->
													<Popover.Root
														open={groupPopoverOpen[group.groupId] ?? false}
														onOpenChange={(open) => {
															groupPopoverOpen = { ...groupPopoverOpen, [group.groupId]: open };
														}}>
														<Popover.Trigger>
															{#snippet child({ props })}
																<Button {...props} variant="ghost" size="sm" class="h-7">
																	<ArrowRightLeft class="mr-1 h-3 w-3" />
																	Transfer
																</Button>
															{/snippet}
														</Popover.Trigger>
														<Popover.Content class="w-64 p-2" align="start">
															<div class="space-y-2">
																<Input
																	placeholder="Search accounts..."
																	class="h-8"
																	value={groupAccountSearch[group.groupId] || ''}
																	oninput={(e) => {
																		groupAccountSearch = {
																			...groupAccountSearch,
																			[group.groupId]: e.currentTarget.value
																		};
																	}} />
																<div class="max-h-40 space-y-1 overflow-y-auto">
																	{#each filteredAccounts.slice(0, 6) as account (account.id)}
																		<button
																			type="button"
																			class="hover:bg-muted flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm"
																			onclick={() => {
																				markGroupAsTransfer(group.groupId, account);
																				groupPopoverOpen = {
																					...groupPopoverOpen,
																					[group.groupId]: false
																				};
																			}}>
																			<ArrowRightLeft class="h-3 w-3 text-purple-600" />
																			<span>{account.name}</span>
																		</button>
																	{:else}
																		<p class="text-muted-foreground py-2 text-center text-xs">
																			No accounts found
																		</p>
																	{/each}
																</div>
															</div>
														</Popover.Content>
													</Popover.Root>
													<Button
														variant="ghost"
														size="sm"
														class="h-7"
														onclick={() => resetGroup(group.groupId)}>
														Reset
													</Button>
												</div>
											{:else if group.userDecision === 'reject'}
												<!-- Rejected - show confirmation state -->
												<div class="flex flex-wrap items-center gap-2">
													<div class="flex items-center gap-1.5 rounded-md bg-red-100 px-2 py-1 text-sm text-red-700 dark:bg-red-900 dark:text-red-300">
														<X class="h-3 w-3" />
														<span>Skipped</span>
													</div>
													<Button
														variant="ghost"
														size="sm"
														class="h-7"
														onclick={() => resetGroup(group.groupId)}>
														Undo
													</Button>
												</div>
											{:else if isTransfer}
												<!-- Transfer set - show confirmation state -->
												<div class="flex flex-wrap items-center gap-2">
													<div class="flex items-center gap-1.5 rounded-md bg-purple-100 px-2 py-1 text-sm text-purple-700 dark:bg-purple-900 dark:text-purple-300">
														<ArrowRightLeft class="h-3 w-3" />
														<span>Transfer to {group.transferAccountName}</span>
													</div>
													<Button
														variant="ghost"
														size="sm"
														class="h-7"
														onclick={() => clearGroupTransfer(group.groupId)}>
														Clear
													</Button>
												</div>
											{:else}
												<!-- Pending - show full action buttons -->
												<div class="flex flex-wrap items-center gap-1">
													<Button
														variant="default"
														size="sm"
														class="h-7"
														onclick={() => {
															clearGroupTransfer(group.groupId);
															acceptGroup(group.groupId);
														}}>
														<Check class="mr-1 h-3 w-3" />
														Accept
													</Button>
													<Button
														variant="outline"
														size="sm"
														class="h-7"
														onclick={() => startEditGroup(group)}>
														<Edit3 class="mr-1 h-3 w-3" />
														Edit
													</Button>
													<Button
														variant="outline"
														size="sm"
														class="h-7"
														onclick={() => {
															clearGroupTransfer(group.groupId);
															rejectGroup(group.groupId);
														}}>
														<X class="mr-1 h-3 w-3" />
														Skip
													</Button>

													<!-- Transfer button with popover -->
													<Popover.Root
														open={groupPopoverOpen[group.groupId] ?? false}
														onOpenChange={(open) => {
															groupPopoverOpen = { ...groupPopoverOpen, [group.groupId]: open };
														}}>
														<Popover.Trigger>
															{#snippet child({ props })}
																<Button
																	{...props}
																	variant="outline"
																	size="sm"
																	class="h-7">
																	<ArrowRightLeft class="mr-1 h-3 w-3" />
																	Transfer
																</Button>
															{/snippet}
														</Popover.Trigger>
														<Popover.Content class="w-64 p-2" align="start">
															<div class="space-y-2">
																<Input
																	placeholder="Search accounts..."
																	class="h-8"
																	value={groupAccountSearch[group.groupId] || ''}
																	oninput={(e) => {
																		groupAccountSearch = {
																			...groupAccountSearch,
																			[group.groupId]: e.currentTarget.value
																		};
																	}} />
																<div class="max-h-40 space-y-1 overflow-y-auto">
																	{#each filteredAccounts.slice(0, 6) as account (account.id)}
																		<button
																			type="button"
																			class="hover:bg-muted flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm"
																			onclick={() => {
																				markGroupAsTransfer(group.groupId, account);
																				groupPopoverOpen = {
																					...groupPopoverOpen,
																					[group.groupId]: false
																				};
																			}}>
																			<ArrowRightLeft class="h-3 w-3 text-purple-600" />
																			<span>{account.name}</span>
																		</button>
																	{:else}
																		<p class="text-muted-foreground py-2 text-center text-xs">
																			No accounts found
																		</p>
																	{/each}
																</div>
															</div>
														</Popover.Content>
													</Popover.Root>
												</div>
											{/if}

											<!-- Expanded Members -->
											{#if isExpanded && group.members.length > 0}
												<div class="mt-3 space-y-1 border-t pt-3">
													<p class="text-muted-foreground mb-2 text-xs font-medium uppercase">
														Original names:
													</p>
													{#each group.members as member}
														<div class="text-muted-foreground flex items-center gap-2 text-sm">
															<span class="text-muted-foreground/50">•</span>
															<span class="font-mono text-xs">{member.originalPayee}</span>
														</div>
													{/each}
												</div>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					</ScrollArea>
				</Card.Content>
			</Card.Root>
		{:else}
			<Card.Root>
				<Card.Content class="py-8 text-center">
					<p class="text-muted-foreground">No payee groups to review.</p>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Navigation -->
		<div class="flex items-center justify-between">
			<Button variant="outline" onclick={onBack}>Back</Button>
			<div class="flex items-center gap-2">
				<Button variant="ghost" onclick={onSkip}>Skip Cleanup</Button>
				<Button onclick={handleProceed}>Continue</Button>
			</div>
		</div>
	{/if}
</div>
