<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Switch } from '$lib/components/ui/switch';
import { Label } from '$lib/components/ui/label';
import { Button } from '$lib/components/ui/button';
import { toast } from 'svelte-sonner';
import { trpc } from '$lib/trpc/client';
import { useQueryClient } from '@tanstack/svelte-query';
import type { Account } from '$lib/schema';
import Info from '@lucide/svelte/icons/info';

interface Props {
	account: Account;
}

let { account }: Props = $props();

const queryClient = useQueryClient();

// Form state
let onBudget = $state(account.onBudget ?? true);
let isSaving = $state(false);

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
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold">Budget Settings</h2>
		<p class="text-muted-foreground text-sm">
			Control whether this account is included in budget calculations.
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
</div>
