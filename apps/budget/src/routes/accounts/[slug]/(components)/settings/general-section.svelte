<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Textarea } from '$lib/components/ui/textarea';
import * as Select from '$lib/components/ui/select';
import { Button } from '$lib/components/ui/button';
import { IconPicker } from '$lib/components/ui/icon-picker';
import { ColorPicker } from '$lib/components/ui/color-picker';
import { toast } from 'svelte-sonner';
import { trpc } from '$lib/trpc/client';
import { useQueryClient } from '@tanstack/svelte-query';
import type { Account, AccountType } from '$lib/schema';
import { accountTypeEnum } from '$lib/schema';

interface Props {
	account: Account;
	onAccountUpdated?: () => void;
}

let { account, onAccountUpdated }: Props = $props();

const queryClient = useQueryClient();

// Form state - using $derived for reactive initial values
let name = $state(account.name);
let accountType = $state<AccountType>(account.accountType || 'checking');
let institution = $state(account.institution || '');
let accountNumberLast4 = $state(String((account as any).accountNumberLast4 || ''));
let notes = $state(account.notes || '');
let accountIcon = $state(account.accountIcon || '');
let accountColor = $state(account.accountColor || '#3b82f6');

let isSaving = $state(false);

// Account type labels
const accountTypeLabels: Record<string, string> = {
	checking: 'Checking',
	savings: 'Savings',
	investment: 'Investment',
	credit_card: 'Credit Card',
	loan: 'Loan',
	cash: 'Cash',
	hsa: 'Health Savings Account',
	other: 'Other'
};

const accountTypeOptions = accountTypeEnum.map((type) => ({
	value: type,
	label: accountTypeLabels[type] || type
}));

async function handleSave() {
	if (!name.trim()) {
		toast.error('Account name is required');
		return;
	}

	isSaving = true;
	try {
		await trpc().accountRoutes.save.mutate({
			id: account.id,
			name: name.trim(),
			accountType,
			institution: institution.trim() || null,
			accountNumberLast4: accountNumberLast4.trim() || null,
			notes: notes.trim() || null,
			accountIcon: accountIcon || null,
			accountColor: accountColor || null
		});

		toast.success('Account updated');
		await queryClient.invalidateQueries({ queryKey: ['accounts'] });
		onAccountUpdated?.();
	} catch (error) {
		console.error('Failed to update account:', error);
		toast.error('Failed to update account');
	} finally {
		isSaving = false;
	}
}

function handleIconChange(event: CustomEvent<{ value: string; icon: any }>) {
	accountIcon = event.detail.value;
}

function handleColorChange(event: CustomEvent<{ value: string }>) {
	accountColor = event.detail.value;
}
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold">General Settings</h2>
		<p class="text-muted-foreground text-sm">
			Manage your account's basic information and appearance.
		</p>
	</div>

	<!-- Account Information -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Account Information</Card.Title>
			<Card.Description>
				Basic details about this account including name, type, and institution.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<!-- Account Name -->
				<div class="space-y-2">
					<Label for="account-name">Account Name</Label>
					<Input
						id="account-name"
						bind:value={name}
						placeholder="e.g., Chase Checking" />
				</div>

				<!-- Account Type -->
				<div class="space-y-2">
					<Label for="account-type">Account Type</Label>
					<Select.Root type="single" bind:value={accountType}>
						<Select.Trigger id="account-type">
							{accountTypeOptions.find((opt) => opt.value === accountType)?.label || 'Select type'}
						</Select.Trigger>
						<Select.Content>
							{#each accountTypeOptions as option}
								<Select.Item value={option.value}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<!-- Institution -->
				<div class="space-y-2">
					<Label for="institution">Bank/Institution</Label>
					<Input
						id="institution"
						bind:value={institution}
						placeholder="e.g., Chase Bank" />
				</div>

				<!-- Account Number Last 4 -->
				<div class="space-y-2">
					<Label for="account-number">Last 4 Digits</Label>
					<Input
						id="account-number"
						bind:value={accountNumberLast4}
						placeholder="1234"
						maxlength={4}
						type="text"
						inputmode="numeric" />
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Visual Customization -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Visual Customization</Card.Title>
			<Card.Description>
				Choose an icon and color to help identify this account visually.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<!-- Account Icon -->
				<div class="space-y-2">
					<Label>Account Icon</Label>
					<IconPicker
						value={accountIcon}
						placeholder="Select an icon..."
						onchange={handleIconChange} />
				</div>

				<!-- Account Color -->
				<div class="space-y-2">
					<Label>Account Color</Label>
					<ColorPicker
						value={accountColor}
						placeholder="Choose account color"
						onchange={handleColorChange} />
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Notes -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Notes</Card.Title>
			<Card.Description>
				Add any additional information or notes about this account.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<Textarea
				bind:value={notes}
				placeholder="Optional notes about this account..."
				rows={4} />
		</Card.Content>
	</Card.Root>

	<!-- Save Button -->
	<div class="flex justify-end">
		<Button onclick={handleSave} disabled={isSaving}>
			{isSaving ? 'Saving...' : 'Save Changes'}
		</Button>
	</div>
</div>
