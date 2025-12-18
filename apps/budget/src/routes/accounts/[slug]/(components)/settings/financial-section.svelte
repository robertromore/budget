<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Button } from '$lib/components/ui/button';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import { toast } from 'svelte-sonner';
import { trpc } from '$lib/trpc/client';
import { useQueryClient } from '@tanstack/svelte-query';
import type { Account } from '$lib/schema';
import { isDebtAccount } from '$lib/schema/accounts';
import Info from '@lucide/svelte/icons/info';

interface Props {
	account: Account;
	onAccountUpdated?: () => void;
}

let { account, onAccountUpdated }: Props = $props();

const queryClient = useQueryClient();

// Determine if this is a debt account (credit card or loan)
const isDebt = $derived(isDebtAccount(account.accountType || 'checking'));

// Form state
let initialBalance = $state(account.initialBalance || 0);
let debtLimit = $state((account as any).debtLimit || null);
let minimumPayment = $state((account as any).minimumPayment || null);
let paymentDueDay = $state((account as any).paymentDueDay || null);
let interestRate = $state((account as any).interestRate || null);

let isSaving = $state(false);

async function handleSave() {
	isSaving = true;
	try {
		await trpc().accountRoutes.save.mutate({
			id: account.id,
			initialBalance,
			debtLimit: isDebt ? debtLimit : null,
			minimumPayment: isDebt ? minimumPayment : null,
			paymentDueDay: isDebt ? paymentDueDay : null,
			interestRate: isDebt ? interestRate : null
		});

		toast.success('Financial settings updated');
		await queryClient.invalidateQueries({ queryKey: ['accounts'] });
		// Invalidate transactions to recalculate running balances with new initial balance
		await queryClient.invalidateQueries({ queryKey: ['transactions', 'account', account.id] });
		await queryClient.invalidateQueries({ queryKey: ['transactions', 'all', account.id] });
		onAccountUpdated?.();
	} catch (error) {
		console.error('Failed to update financial settings:', error);
		toast.error('Failed to update financial settings');
	} finally {
		isSaving = false;
	}
}
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold">Financial Settings</h2>
		<p class="text-muted-foreground text-sm">
			Manage balance and {isDebt ? 'debt-related details' : 'financial information'} for this account.
		</p>
	</div>

	<!-- Initial Balance -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Initial Balance</Card.Title>
			<Card.Description>
				The starting balance for this account. This is used as a reference point for calculating running balances.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="max-w-xs space-y-2">
				<Label for="initial-balance">Initial Balance</Label>
				<NumericInput bind:value={initialBalance} buttonClass="w-full" />
			</div>
			<div class="text-muted-foreground mt-3 flex items-start gap-2 text-sm">
				<Info class="mt-0.5 h-4 w-4 shrink-0" />
				<p>
					Changing the initial balance will affect all running balance calculations for this account.
				</p>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Debt Account Details (Credit Cards & Loans) -->
	{#if isDebt}
		<Card.Root>
			<Card.Header>
				<Card.Title>
					{account.accountType === 'credit_card' ? 'Credit Card' : 'Loan'} Details
				</Card.Title>
				<Card.Description>
					{account.accountType === 'credit_card'
						? 'Track your credit limit, interest rate, and payment information.'
						: 'Track your loan amount, interest rate, and payment schedule.'}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<!-- Credit Limit / Loan Amount -->
					<div class="space-y-2">
						<Label for="debt-limit">
							{account.accountType === 'credit_card' ? 'Credit Limit' : 'Loan Amount'}
						</Label>
						<NumericInput bind:value={debtLimit} buttonClass="w-full" />
						<p class="text-muted-foreground text-xs">
							{account.accountType === 'credit_card'
								? 'Maximum credit available on this card'
								: 'Total principal amount borrowed'}
						</p>
					</div>

					<!-- Interest Rate -->
					<div class="space-y-2">
						<Label for="interest-rate">Interest Rate (APR %)</Label>
						<Input
							id="interest-rate"
							type="number"
							step="0.01"
							bind:value={interestRate}
							placeholder="0.00" />
						<p class="text-muted-foreground text-xs">Annual percentage rate</p>
					</div>

					<!-- Minimum Payment -->
					<div class="space-y-2">
						<Label for="min-payment">Minimum Payment</Label>
						<NumericInput bind:value={minimumPayment} buttonClass="w-full" />
						<p class="text-muted-foreground text-xs">Minimum monthly payment required</p>
					</div>

					<!-- Payment Due Day -->
					<div class="space-y-2">
						<Label for="due-day">Payment Due Day</Label>
						<Input
							id="due-day"
							type="number"
							min="1"
							max="31"
							bind:value={paymentDueDay}
							placeholder="e.g., 15" />
						<p class="text-muted-foreground text-xs">Day of month payment is due (1-31)</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Header>
				<Card.Title>Account Balance Information</Card.Title>
				<Card.Description>
					This account type doesn't have additional debt-related settings.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<p class="text-muted-foreground text-sm">
					For credit cards and loans, additional settings like credit limit, interest rate, and payment due dates are available.
				</p>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Save Button -->
	<div class="flex justify-end">
		<Button onclick={handleSave} disabled={isSaving}>
			{isSaving ? 'Saving...' : 'Save Changes'}
		</Button>
	</div>
</div>
