<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Switch } from '$lib/components/ui/switch';
import { Label } from '$lib/components/ui/label';
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import * as Empty from '$lib/components/ui/empty';
import { toast } from 'svelte-sonner';
import { trpc } from '$lib/trpc/client';
import { useQueryClient } from '@tanstack/svelte-query';
import { getByAccount as getBudgetsByAccount } from '$lib/query/budgets';
import type { Account } from '$lib/schema';
import type { BudgetWithRelations } from '$lib/server/domains/budgets';
import Wallet from '@lucide/svelte/icons/wallet';
import Info from '@lucide/svelte/icons/info';
import ExternalLink from '@lucide/svelte/icons/external-link';
import { goto } from '$app/navigation';

interface Props {
	account: Account;
}

let { account }: Props = $props();

const queryClient = useQueryClient();

// Form state
let onBudget = $state(account.onBudget ?? true);
let isSaving = $state(false);

// Fetch budgets for this account
const budgetsQuery = $derived(getBudgetsByAccount(account.id).options());
const budgets = $derived((budgetsQuery?.data ?? []) as BudgetWithRelations[]);
const isLoadingBudgets = $derived(budgetsQuery?.isLoading ?? false);

async function handleSave() {
	isSaving = true;
	try {
		await trpc().accountRoutes.save.mutate({
			id: account.id,
			onBudget
		});

		toast.success('Budget settings updated');
		await queryClient.invalidateQueries({ queryKey: ['accounts'] });
	} catch (error) {
		console.error('Failed to update budget settings:', error);
		toast.error('Failed to update budget settings');
	} finally {
		isSaving = false;
	}
}

function getBudgetStatusColor(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
	switch (status) {
		case 'active':
			return 'default';
		case 'paused':
			return 'secondary';
		case 'archived':
			return 'outline';
		default:
			return 'default';
	}
}
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold">Budget Settings</h2>
		<p class="text-muted-foreground text-sm">
			Control whether this account is included in budget calculations and view associated budgets.
		</p>
	</div>

	<!-- On/Off Budget Toggle -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Budget Inclusion</Card.Title>
			<Card.Description>
				Control whether transactions from this account are included in budget calculations.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="flex items-center space-x-3">
				<Switch id="on-budget" bind:checked={onBudget} />
				<div class="flex-1">
					<Label
						for="on-budget"
						class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
						Include in budget calculations
					</Label>
					<p class="text-muted-foreground mt-1 text-sm">
						{#if onBudget}
							This account is included in your budget totals and spending reports.
						{:else}
							This account is only tracked for net worth (e.g., investments, loans).
						{/if}
					</p>
				</div>
			</div>

			<div class="text-muted-foreground flex items-start gap-2 text-sm">
				<Info class="mt-0.5 h-4 w-4 shrink-0" />
				<p>
					Off-budget accounts are typically used for tracking investments, loans, or other accounts
					where you want to track the balance but not include spending in your budget.
				</p>
			</div>

			<div class="flex justify-end">
				<Button onclick={handleSave} disabled={isSaving} variant="outline" size="sm">
					{isSaving ? 'Saving...' : 'Save'}
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Associated Budgets -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Associated Budgets</Card.Title>
			<Card.Description>
				Budgets that are linked to this account for spending tracking.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if isLoadingBudgets}
				<div class="space-y-3">
					{#each Array(3) as _}
						<div class="bg-muted h-16 animate-pulse rounded-lg"></div>
					{/each}
				</div>
			{:else if budgets.length === 0}
				<Empty.Empty class="py-8">
					<Empty.EmptyMedia variant="icon">
						<Wallet class="size-6" />
					</Empty.EmptyMedia>
					<Empty.EmptyHeader>
						<Empty.EmptyTitle>No Budgets Associated</Empty.EmptyTitle>
						<Empty.EmptyDescription>
							This account doesn't have any budgets associated with it yet.
						</Empty.EmptyDescription>
					</Empty.EmptyHeader>
					<Empty.EmptyContent>
						<Button variant="outline" size="sm" href="/budgets/new?accountId={account.id}">
							Create Budget
						</Button>
					</Empty.EmptyContent>
				</Empty.Empty>
			{:else}
				<div class="space-y-3">
					{#each budgets as budget}
						<button
							type="button"
							class="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors"
							onclick={() => goto(`/budgets/${budget.slug}`)}>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span class="truncate font-medium">{budget.name}</span>
									<Badge variant={getBudgetStatusColor(budget.status)}>
										{budget.status}
									</Badge>
								</div>
								<div class="text-muted-foreground mt-1 text-sm">
									{budget.type.replace('-', ' ')}
								</div>
							</div>
							<ExternalLink class="text-muted-foreground h-4 w-4 shrink-0" />
						</button>
					{/each}
				</div>
				<div class="mt-4 flex justify-end">
					<Button variant="outline" size="sm" href="/budgets/new?accountId={account.id}">
						Create New Budget
					</Button>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
