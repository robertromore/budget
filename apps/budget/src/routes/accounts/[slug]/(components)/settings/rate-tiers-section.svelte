<script lang="ts">
import { rpc } from '$lib/query';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Table from '$lib/components/ui/table';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { formatCurrency } from '$lib/utils/formatters';
import { USAGE_UNIT_LABELS, type UsageUnit } from '$lib/schema/utility-usage';
import type { Account } from '$lib/schema';
import Plus from '@lucide/svelte/icons/plus';
import Trash2 from '@lucide/svelte/icons/trash-2';
import Save from '@lucide/svelte/icons/save';
import X from '@lucide/svelte/icons/x';
import Layers from '@lucide/svelte/icons/layers';
import { toast } from 'svelte-sonner';

interface Props {
	account: Account;
}

let { account }: Props = $props();

// Edit mode state
let isEditing = $state(false);

// Local editable tiers
let editableTiers = $state<
	Array<{
		tierName: string;
		tierOrder: number;
		usageMin: number;
		usageMax: number | undefined;
		ratePerUnit: number;
		effectiveDate: string;
		expirationDate?: string;
	}>
>([]);

// Query existing rate tiers
const rateTiersQuery = rpc.utility.getRateTiers(account.id).options();
const rateTiers = $derived(rateTiersQuery.data ?? []);

// Set rate tiers mutation
const setTiersMutation = rpc.utility.setRateTiers.options();

// Get usage unit label
const usageUnit = $derived(
	account.utilitySubtype
		? USAGE_UNIT_LABELS[
				({
					electric: 'kwh',
					gas: 'therms',
					water: 'gallons',
					internet: 'gb',
					sewer: 'gallons',
					trash: 'units',
					other: 'units'
				}[account.utilitySubtype] ?? 'units') as UsageUnit
			]?.shortLabel ?? 'units'
		: 'units'
);

// Start editing
function startEditing() {
	// Clone current tiers for editing
	editableTiers = rateTiers.map((tier) => ({
		tierName: tier.tierName,
		tierOrder: tier.tierOrder,
		usageMin: tier.usageMin,
		usageMax: tier.usageMax ?? undefined,
		ratePerUnit: tier.ratePerUnit,
		effectiveDate: tier.effectiveDate,
		expirationDate: tier.expirationDate ?? undefined
	}));

	// If no tiers exist, create a default one
	if (editableTiers.length === 0) {
		addTier();
	}

	isEditing = true;
}

// Cancel editing
function cancelEditing() {
	isEditing = false;
	editableTiers = [];
}

// Add a new tier
function addTier() {
	const lastTier = editableTiers[editableTiers.length - 1];
	const newMin = lastTier?.usageMax ?? 0;

	editableTiers = [
		...editableTiers,
		{
			tierName: `Tier ${editableTiers.length + 1}`,
			tierOrder: editableTiers.length + 1,
			usageMin: newMin,
			usageMax: undefined,
			ratePerUnit: lastTier?.ratePerUnit ?? 0.1,
			effectiveDate: new Date().toISOString().split('T')[0]
		}
	];
}

// Remove a tier
function removeTier(index: number) {
	editableTiers = editableTiers.filter((_, i) => i !== index);
	// Reorder remaining tiers
	editableTiers = editableTiers.map((tier, i) => ({
		...tier,
		tierOrder: i + 1
	}));
}

// Save tiers
async function saveTiers() {
	// Validate tiers
	for (let i = 0; i < editableTiers.length; i++) {
		const tier = editableTiers[i];
		if (!tier.tierName.trim()) {
			toast.error(`Tier ${i + 1} needs a name`);
			return;
		}
		if (tier.ratePerUnit <= 0) {
			toast.error(`Tier ${i + 1} needs a positive rate`);
			return;
		}
	}

	try {
		await setTiersMutation.mutateAsync({
			accountId: account.id,
			tiers: editableTiers.map((tier) => ({
				tierName: tier.tierName,
				tierOrder: tier.tierOrder,
				usageMin: tier.usageMin,
				usageMax: tier.usageMax,
				ratePerUnit: tier.ratePerUnit,
				effectiveDate: tier.effectiveDate,
				expirationDate: tier.expirationDate
			}))
		});

		isEditing = false;
		editableTiers = [];
	} catch (error) {
		// Error is handled by the mutation's error handler
	}
}

// Update tier field
function updateTier(
	index: number,
	field: keyof (typeof editableTiers)[0],
	value: string | number | undefined
) {
	editableTiers = editableTiers.map((tier, i) => {
		if (i !== index) return tier;
		return { ...tier, [field]: value };
	});

	// Auto-update next tier's min when max changes
	if (field === 'usageMax' && typeof value === 'number' && index < editableTiers.length - 1) {
		editableTiers = editableTiers.map((tier, i) => {
			if (i !== index + 1) return tier;
			return { ...tier, usageMin: value };
		});
	}
}
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Layers class="text-muted-foreground h-5 w-5" />
				<div>
					<Card.Title>Rate Tiers</Card.Title>
					<Card.Description>
						Configure tiered pricing for this utility (e.g., higher rates for higher usage)
					</Card.Description>
				</div>
			</div>
			{#if !isEditing}
				<Button variant="outline" size="sm" onclick={startEditing}>
					{rateTiers.length > 0 ? 'Edit Tiers' : 'Add Tiers'}
				</Button>
			{/if}
		</div>
	</Card.Header>
	<Card.Content>
		{#if isEditing}
			<!-- Edit Mode -->
			<div class="space-y-4">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-32">Name</Table.Head>
							<Table.Head class="w-28">From ({usageUnit})</Table.Head>
							<Table.Head class="w-28">To ({usageUnit})</Table.Head>
							<Table.Head class="w-32">Rate (/{usageUnit})</Table.Head>
							<Table.Head class="w-10"></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each editableTiers as tier, index}
							<Table.Row>
								<Table.Cell>
									<Input
										value={tier.tierName}
										oninput={(e) => updateTier(index, 'tierName', e.currentTarget.value)}
										placeholder="Tier name"
										class="h-8"
									/>
								</Table.Cell>
								<Table.Cell>
									<Input
										type="number"
										value={tier.usageMin}
										oninput={(e) => updateTier(index, 'usageMin', parseFloat(e.currentTarget.value) || 0)}
										min="0"
										step="1"
										class="h-8"
										disabled={index > 0}
									/>
								</Table.Cell>
								<Table.Cell>
									<Input
										type="number"
										value={tier.usageMax ?? ''}
										oninput={(e) => {
											const val = e.currentTarget.value;
											updateTier(index, 'usageMax', val ? parseFloat(val) : undefined);
										}}
										min={tier.usageMin}
										step="1"
										placeholder="No limit"
										class="h-8"
									/>
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-1">
										<span class="text-muted-foreground text-sm">$</span>
										<Input
											type="number"
											value={tier.ratePerUnit}
											oninput={(e) => updateTier(index, 'ratePerUnit', parseFloat(e.currentTarget.value) || 0)}
											min="0"
											step="0.001"
											class="h-8"
										/>
									</div>
								</Table.Cell>
								<Table.Cell>
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8 text-destructive"
										onclick={() => removeTier(index)}
										disabled={editableTiers.length === 1}
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>

				<div class="flex items-center justify-between">
					<Button variant="outline" size="sm" onclick={addTier}>
						<Plus class="mr-1 h-4 w-4" />
						Add Tier
					</Button>
					<div class="flex gap-2">
						<Button variant="ghost" size="sm" onclick={cancelEditing}>
							<X class="mr-1 h-4 w-4" />
							Cancel
						</Button>
						<Button size="sm" onclick={saveTiers} disabled={setTiersMutation.isPending}>
							<Save class="mr-1 h-4 w-4" />
							Save Tiers
						</Button>
					</div>
				</div>
			</div>
		{:else if rateTiers.length > 0}
			<!-- View Mode -->
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Tier</Table.Head>
						<Table.Head>Usage Range</Table.Head>
						<Table.Head>Rate</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each rateTiers as tier}
						<Table.Row>
							<Table.Cell class="font-medium">{tier.tierName}</Table.Cell>
							<Table.Cell>
								{tier.usageMin.toLocaleString()} - {tier.usageMax ? tier.usageMax.toLocaleString() : '+'} {usageUnit}
							</Table.Cell>
							<Table.Cell>{formatCurrency(tier.ratePerUnit)}/{usageUnit}</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{:else}
			<!-- Empty State -->
			<div class="text-muted-foreground py-6 text-center">
				<Layers class="mx-auto mb-2 h-8 w-8 opacity-50" />
				<p>No rate tiers configured</p>
				<p class="text-sm">Add tiers to track tiered pricing (use more, pay more per unit)</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
