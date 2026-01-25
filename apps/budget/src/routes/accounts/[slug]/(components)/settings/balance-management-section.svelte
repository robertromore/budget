<script lang="ts">
import * as Card from '$lib/components/ui/card';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Button, buttonVariants } from '$lib/components/ui/button';
import { Label } from '$lib/components/ui/label';
import { Textarea } from '$lib/components/ui/textarea';
import DateInput from '$lib/components/input/date-input.svelte';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import { toast } from '$lib/utils/toast-interceptor';
import { trpc } from '$lib/trpc/client';
import { useQueryClient } from '@tanstack/svelte-query';
import type { Account } from '$lib/schema';
import { type DateValue, parseDate, getLocalTimeZone } from '@internationalized/date';
import { timezone } from '$lib/utils/dates';
import { currencyFormatter } from '$lib/utils/formatters';
import { formatDate } from '$lib/utils/date-formatters';
import { isDebtAccount } from '$lib/schema/accounts';
import Calendar from '@lucide/svelte/icons/calendar';
import Archive from '@lucide/svelte/icons/archive';
import FileCheck from '@lucide/svelte/icons/file-check';
import Scale from '@lucide/svelte/icons/scale';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
import Info from '@lucide/svelte/icons/info';
import Trash2 from '@lucide/svelte/icons/trash-2';

interface Props {
	account: Account;
}

let { account }: Props = $props();

const queryClient = useQueryClient();
const isDebt = $derived(account.accountType ? isDebtAccount(account.accountType) : false);

// Balance management info state
let balanceInfo = $state<{
	balanceResetDate: string | null;
	balanceAtResetDate: number | null;
	reconciledBalance: number | null;
	reconciledDate: string | null;
	archivedTransactionCount: number;
	transactionsBeforeResetDate: number;
} | null>(null);
let isLoadingInfo = $state(true);

// Form states for Option 1: Balance Reset
let resetDate = $state<DateValue | undefined>(undefined);
let resetBalance = $state<number>(0);
let isSavingResetDate = $state(false);

// Form states for Option 2: Archive
let archiveBeforeDate = $state<DateValue | undefined>(undefined);
let isArchiving = $state(false);
let archiveConfirmDialog = $state({ open: false });

// Form states for Option 3: Reconciliation
let reconcileDate = $state<DateValue | undefined>(undefined);
let reconciledBalance = $state<number>(0);
let isSavingReconcile = $state(false);

// Form states for Option 4: Balance Adjustment
let targetBalance = $state<number>(0);
let adjustmentReason = $state('');
let adjustmentDate = $state<DateValue | undefined>(undefined);
let isCreatingAdjustment = $state(false);

// Current balance for adjustment calculation
let currentBalance = $state<number | null>(null);
let adjustmentAmount = $derived.by(() => {
	if (currentBalance === null || targetBalance === 0) return null;
	return targetBalance - currentBalance;
});

// Load balance management info
$effect(() => {
	loadBalanceInfo();
});

async function loadBalanceInfo() {
	isLoadingInfo = true;
	try {
		balanceInfo = await trpc().accountRoutes.getBalanceManagementInfo.query({
			accountId: account.id
		});

		// Initialize form fields from current values
		if (balanceInfo.balanceResetDate) {
			resetDate = parseDate(balanceInfo.balanceResetDate);
			resetBalance = balanceInfo.balanceAtResetDate || 0;
		}
		if (balanceInfo.reconciledDate) {
			reconcileDate = parseDate(balanceInfo.reconciledDate);
			reconciledBalance = balanceInfo.reconciledBalance || 0;
		}

		// Get current balance for adjustment calculation (use API-calculated balance, not stale prop)
		currentBalance = balanceInfo.currentBalance ?? account.balance ?? null;
	} catch (error) {
		console.error('Failed to load balance management info:', error);
		toast.error('Failed to load balance info');
	} finally {
		isLoadingInfo = false;
	}
}

// Option 1: Set Balance Reset Date
async function handleSetResetDate() {
	if (!resetDate) {
		toast.error('Please select a date');
		return;
	}

	isSavingResetDate = true;
	try {
		const dateStr = resetDate.toDate(timezone).toISOString().split('T')[0];
		await trpc().accountRoutes.setBalanceResetDate.mutate({
			accountId: account.id,
			resetDate: dateStr,
			balanceAtDate: resetBalance
		});

		toast.success('Balance reset date set');
		await loadBalanceInfo();
		await queryClient.invalidateQueries({ queryKey: ['accounts'] });
		await queryClient.invalidateQueries({ queryKey: ['transactions'] });
	} catch (error) {
		console.error('Failed to set balance reset date:', error);
		toast.error('Failed to set balance reset date');
	} finally {
		isSavingResetDate = false;
	}
}

async function handleClearResetDate() {
	isSavingResetDate = true;
	try {
		await trpc().accountRoutes.clearBalanceResetDate.mutate({
			accountId: account.id
		});

		toast.success('Balance reset date cleared');
		resetDate = undefined;
		resetBalance = 0;
		await loadBalanceInfo();
		await queryClient.invalidateQueries({ queryKey: ['accounts'] });
		await queryClient.invalidateQueries({ queryKey: ['transactions'] });
	} catch (error) {
		console.error('Failed to clear balance reset date:', error);
		toast.error('Failed to clear balance reset date');
	} finally {
		isSavingResetDate = false;
	}
}

// Option 2: Archive Transactions
async function handleArchiveBeforeDate() {
	if (!archiveBeforeDate) {
		toast.error('Please select a date');
		return;
	}

	isArchiving = true;
	try {
		const dateStr = archiveBeforeDate.toDate(timezone).toISOString().split('T')[0];
		const result = await trpc().transactionRoutes.archiveBeforeDate.mutate({
			accountId: account.id,
			beforeDate: dateStr
		});

		toast.success(`${result.archivedCount} transactions archived`);
		archiveConfirmDialog.open = false;
		archiveBeforeDate = undefined;
		await loadBalanceInfo();
		await queryClient.invalidateQueries({ queryKey: ['accounts'] });
		await queryClient.invalidateQueries({ queryKey: ['transactions'] });
	} catch (error) {
		console.error('Failed to archive transactions:', error);
		toast.error('Failed to archive transactions');
	} finally {
		isArchiving = false;
	}
}

// Option 3: Set Reconciled Balance
async function handleSetReconcile() {
	if (!reconcileDate || reconciledBalance === 0) {
		toast.error('Please enter both a date and balance');
		return;
	}

	isSavingReconcile = true;
	try {
		const dateStr = reconcileDate.toDate(timezone).toISOString().split('T')[0];
		await trpc().accountRoutes.setReconciledBalance.mutate({
			accountId: account.id,
			reconciledDate: dateStr,
			reconciledBalance: reconciledBalance
		});

		toast.success('Reconciled balance set');
		await loadBalanceInfo();
		await queryClient.invalidateQueries({ queryKey: ['accounts'] });
		await queryClient.invalidateQueries({ queryKey: ['transactions'] });
	} catch (error) {
		console.error('Failed to set reconciled balance:', error);
		toast.error('Failed to set reconciled balance');
	} finally {
		isSavingReconcile = false;
	}
}

async function handleClearReconcile() {
	isSavingReconcile = true;
	try {
		await trpc().accountRoutes.clearReconciledBalance.mutate({
			accountId: account.id
		});

		toast.success('Reconciled balance cleared');
		reconcileDate = undefined;
		reconciledBalance = 0;
		await loadBalanceInfo();
		await queryClient.invalidateQueries({ queryKey: ['accounts'] });
		await queryClient.invalidateQueries({ queryKey: ['transactions'] });
	} catch (error) {
		console.error('Failed to clear reconciled balance:', error);
		toast.error('Failed to clear reconciled balance');
	} finally {
		isSavingReconcile = false;
	}
}

// Option 4: Create Balance Adjustment
async function handleCreateAdjustment() {
	if (targetBalance === 0 || !adjustmentReason.trim()) {
		toast.error('Please enter both a target balance and reason');
		return;
	}

	isCreatingAdjustment = true;
	try {
		const dateStr = adjustmentDate
			? adjustmentDate.toDate(timezone).toISOString().split('T')[0]
			: undefined;
		await trpc().transactionRoutes.createBalanceAdjustment.mutate({
			accountId: account.id,
			targetBalance: targetBalance,
			reason: adjustmentReason.trim(),
			date: dateStr
		});

		toast.success('Balance adjustment created');
		targetBalance = 0;
		adjustmentReason = '';
		adjustmentDate = undefined;
		await loadBalanceInfo();
		await queryClient.invalidateQueries({ queryKey: ['accounts'] });
		await queryClient.invalidateQueries({ queryKey: ['transactions'] });
	} catch (error) {
		console.error('Failed to create balance adjustment:', error);
		toast.error('Failed to create balance adjustment');
	} finally {
		isCreatingAdjustment = false;
	}
}

function formatBalance(amount: number | null | undefined): string {
	if (amount === null || amount === undefined) return '$0.00';
	return currencyFormatter.format(amount);
}

function formatDateString(dateStr: string | null | undefined): string {
	if (!dateStr) return '';
	return formatDate(parseDate(dateStr).toDate(getLocalTimeZone()));
}
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold">Balance Management</h2>
		<p class="text-muted-foreground text-sm">
			Correct balance discrepancies after importing historical transactions.
			{#if isDebt}
				<span class="text-amber-600 dark:text-amber-400">
					For credit accounts, enter positive values for amounts owed.
				</span>
			{/if}
		</p>
	</div>

	{#if isLoadingInfo}
		<div class="space-y-4">
			{#each Array(4) as _}
				<div class="bg-muted h-24 animate-pulse rounded-lg"></div>
			{/each}
		</div>
	{:else}
		<!-- Current Status Overview -->
		{#if balanceInfo?.balanceResetDate || balanceInfo?.reconciledDate || (balanceInfo?.archivedTransactionCount ?? 0) > 0}
			<Card.Root class="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
				<Card.Content class="pt-4">
					<div class="flex items-start gap-3">
						<Info class="text-blue-600 dark:text-blue-400 mt-0.5 h-5 w-5 shrink-0" />
						<div class="space-y-1 text-sm">
							<p class="font-medium text-blue-900 dark:text-blue-100">Active Balance Settings</p>
							<ul class="text-blue-700 dark:text-blue-300 space-y-1">
								{#if balanceInfo?.reconciledDate}
									<li>Reconciled on {formatDateString(balanceInfo.reconciledDate)} at {formatBalance(balanceInfo.reconciledBalance)}</li>
								{/if}
								{#if balanceInfo?.balanceResetDate}
									<li>Balance reset from {formatDateString(balanceInfo.balanceResetDate)} ({balanceInfo.transactionsBeforeResetDate} transactions excluded)</li>
								{/if}
								{#if (balanceInfo?.archivedTransactionCount ?? 0) > 0}
									<li>{balanceInfo?.archivedTransactionCount} archived transactions excluded from balance</li>
								{/if}
							</ul>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Option 1: Balance Reset Date -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-3">
					<Calendar class="h-5 w-5 text-muted-foreground" />
					<div>
						<Card.Title class="text-base">Balance Reset Date</Card.Title>
						<Card.Description>Start fresh from a known date and balance</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content class="space-y-4">
				<p class="text-sm text-muted-foreground">
					Set a date and balance to ignore all transactions before that date. Useful when you have a known
					statement balance but incomplete transaction history before that date.
				</p>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="space-y-2">
						<Label>Reset Date</Label>
						<DateInput bind:value={resetDate} />
					</div>
					<div class="space-y-2">
						<Label>Balance at Reset Date</Label>
						<NumericInput bind:value={resetBalance} buttonClass="w-full" />
					</div>
				</div>

				{#if balanceInfo?.balanceResetDate}
					<div class="rounded-md bg-muted p-3 text-sm">
						<p>
							Currently set: Transactions before <strong>{formatDateString(balanceInfo.balanceResetDate)}</strong> are excluded.
							Starting balance: <strong>{formatBalance(balanceInfo.balanceAtResetDate)}</strong>
						</p>
						<p class="text-muted-foreground mt-1">
							{balanceInfo.transactionsBeforeResetDate} transactions excluded from balance.
						</p>
					</div>
				{/if}

				<div class="flex justify-end gap-2">
					{#if balanceInfo?.balanceResetDate}
						<Button
							variant="outline"
							onclick={handleClearResetDate}
							disabled={isSavingResetDate}
						>
							<Trash2 class="mr-2 h-4 w-4" />
							Clear Reset
						</Button>
					{/if}
					<Button
						onclick={handleSetResetDate}
						disabled={isSavingResetDate || !resetDate || resetBalance === 0}
					>
						{isSavingResetDate ? 'Saving...' : balanceInfo?.balanceResetDate ? 'Update Reset Date' : 'Set Reset Date'}
					</Button>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Option 2: Archive Transactions -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-3">
					<Archive class="h-5 w-5 text-muted-foreground" />
					<div>
						<Card.Title class="text-base">Archive Transactions</Card.Title>
						<Card.Description>Keep for history but exclude from balance</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content class="space-y-4">
				<p class="text-sm text-muted-foreground">
					Archive old transactions to keep them for reference while excluding them from balance calculations.
					Archived transactions appear grayed out in the transaction list.
				</p>

				{#if (balanceInfo?.archivedTransactionCount ?? 0) > 0}
					<div class="rounded-md bg-muted p-3 text-sm">
						<p>
							<strong>{balanceInfo?.archivedTransactionCount}</strong> transactions are currently archived.
						</p>
					</div>
				{/if}

				<div class="space-y-2">
					<Label>Archive All Before Date</Label>
					<DateInput bind:value={archiveBeforeDate} />
				</div>

				<div class="flex justify-end">
					<Button
						variant="destructive"
						onclick={() => archiveConfirmDialog.open = true}
						disabled={!archiveBeforeDate || isArchiving}
					>
						<Archive class="mr-2 h-4 w-4" />
						Archive Transactions
					</Button>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Option 3: Reconciliation -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-3">
					<FileCheck class="h-5 w-5 text-muted-foreground" />
					<div>
						<Card.Title class="text-base">Reconciliation Checkpoint</Card.Title>
						<Card.Description>Standard accounting reconciliation</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content class="space-y-4">
				<p class="text-sm text-muted-foreground">
					Set a reconciliation checkpoint using your bank or credit card statement. The balance builds
					from this checkpoint, ensuring accuracy going forward.
				</p>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="space-y-2">
						<Label>Statement Date</Label>
						<DateInput bind:value={reconcileDate} />
					</div>
					<div class="space-y-2">
						<Label>Statement Balance</Label>
						<NumericInput bind:value={reconciledBalance} buttonClass="w-full" />
					</div>
				</div>

				{#if balanceInfo?.reconciledDate}
					<div class="rounded-md bg-muted p-3 text-sm">
						<p>
							Last reconciled: <strong>{formatDateString(balanceInfo.reconciledDate)}</strong> at{' '}
							<strong>{formatBalance(balanceInfo.reconciledBalance)}</strong>
						</p>
					</div>
				{/if}

				<div class="flex justify-end gap-2">
					{#if balanceInfo?.reconciledDate}
						<Button
							variant="outline"
							onclick={handleClearReconcile}
							disabled={isSavingReconcile}
						>
							<Trash2 class="mr-2 h-4 w-4" />
							Clear Reconciliation
						</Button>
					{/if}
					<Button
						onclick={handleSetReconcile}
						disabled={isSavingReconcile || !reconcileDate || reconciledBalance === 0}
					>
						{isSavingReconcile ? 'Saving...' : balanceInfo?.reconciledDate ? 'Update Reconciliation' : 'Set Reconciliation'}
					</Button>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Option 4: Balance Adjustment -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-3">
					<Scale class="h-5 w-5 text-muted-foreground" />
					<div>
						<Card.Title class="text-base">Balance Adjustment</Card.Title>
						<Card.Description>Create an adjustment transaction</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content class="space-y-4">
				<p class="text-sm text-muted-foreground">
					Create an adjustment transaction to correct the balance. This creates a real transaction
					with an audit trail, useful for one-time corrections.
				</p>

				<div class="rounded-md bg-muted p-3 text-sm">
					<p>
						Current balance: <strong>{formatBalance(currentBalance)}</strong>
					</p>
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="space-y-2">
						<Label>Target Balance</Label>
						<NumericInput bind:value={targetBalance} buttonClass="w-full" />
					</div>
					<div class="space-y-2">
						<Label>Adjustment Date (optional)</Label>
						<DateInput bind:value={adjustmentDate} />
					</div>
				</div>

				{#if adjustmentAmount !== null}
					<div class="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-sm">
						<p class="text-amber-800 dark:text-amber-200">
							This will create an adjustment of{' '}
							<strong>{formatBalance(adjustmentAmount)}</strong>
						</p>
					</div>
				{/if}

				<div class="space-y-2">
					<Label>Reason for Adjustment</Label>
					<Textarea
						bind:value={adjustmentReason}
						placeholder="e.g., Correction for missing transactions from statement period 01/2024"
						rows={2}
					/>
				</div>

				<div class="flex justify-end">
					<Button
						onclick={handleCreateAdjustment}
						disabled={isCreatingAdjustment || targetBalance === 0 || !adjustmentReason.trim()}
					>
						{isCreatingAdjustment ? 'Creating...' : 'Create Adjustment'}
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<!-- Archive Confirmation Dialog -->
<AlertDialog.Root bind:open={archiveConfirmDialog.open}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title class="flex items-center gap-2">
				<AlertTriangle class="text-destructive h-5 w-5" />
				Archive Transactions?
			</AlertDialog.Title>
			<AlertDialog.Description>
				This will archive all transactions before{' '}
				<strong>{archiveBeforeDate ? formatDate(archiveBeforeDate.toDate(timezone)) : ''}</strong>.
				Archived transactions will be excluded from balance calculations but remain visible in
				the transaction list.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={isArchiving}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class={buttonVariants({ variant: 'destructive' })}
				onclick={handleArchiveBeforeDate}
				disabled={isArchiving}
			>
				{isArchiving ? 'Archiving...' : 'Archive Transactions'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
