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
import {
	createEncryptedFieldState,
	encryptFieldValue,
	isFieldEncrypted,
} from '$lib/utils/use-encryption.svelte';
import Lock from '@lucide/svelte/icons/lock';

interface Props {
	account: Account;
	onAccountUpdated?: () => void;
}

let { account, onAccountUpdated }: Props = $props();

const queryClient = useQueryClient();

// Encrypted field state for sensitive data
const nameState = createEncryptedFieldState(
	() => account.name,
	{ operation: 'View account name' }
);

const notesState = createEncryptedFieldState(
	() => account.notes,
	{ operation: 'View account notes' }
);

// Check if fields are encrypted
const nameIsEncrypted = $derived(isFieldEncrypted('accounts.name'));
const notesIsEncrypted = $derived(isFieldEncrypted('accounts.notes'));
const needsUnlock = $derived(nameState.needsUnlock || notesState.needsUnlock);

// Form state - initialized from decrypted values or original
let name = $state(account.name);
let accountType = $state<AccountType>(account.accountType || 'checking');
let institution = $state(account.institution || '');
let accountNumberLast4 = $state(String((account as any).accountNumberLast4 || ''));
let notes = $state(account.notes || '');
let accountIcon = $state(account.accountIcon || '');
let accountColor = $state(account.accountColor || '#3b82f6');

let isSaving = $state(false);

// Initialize form with decrypted values when available
$effect(() => {
	if (nameState.value && nameState.isEncrypted) {
		name = nameState.value;
	}
});

$effect(() => {
	if (notesState.value !== null && notesState.isEncrypted) {
		notes = notesState.value;
	}
});

// Unlock encrypted fields for editing
async function handleUnlockFields() {
	await nameState.unlock();
	await notesState.unlock();
}

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
		// Encrypt fields if encryption is enabled for this workspace
		let saveName = name.trim();
		let saveNotes = notes.trim() || null;

		if (nameIsEncrypted) {
			saveName = await encryptFieldValue(saveName, { operation: 'Save account name' });
		}
		if (notesIsEncrypted && saveNotes) {
			saveNotes = await encryptFieldValue(saveNotes, { operation: 'Save account notes' });
		}

		await trpc().accountRoutes.save.mutate({
			id: account.id,
			name: saveName,
			accountType,
			institution: institution.trim() || null,
			accountNumberLast4: accountNumberLast4.trim() || null,
			notes: saveNotes,
			accountIcon: accountIcon || null,
			accountColor: accountColor || null
		});

		toast.success('Account updated');
		await queryClient.invalidateQueries({ queryKey: ['accounts'] });
		onAccountUpdated?.();
	} catch (error) {
		if (error instanceof Error && error.message === 'USER_CANCELLED') {
			// User cancelled encryption unlock
			return;
		}
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
	<div class="flex items-start justify-between">
		<div>
			<h2 class="text-xl font-semibold">General Settings</h2>
			<p class="text-muted-foreground text-sm">
				Manage your account's basic information and appearance.
			</p>
		</div>
		{#if needsUnlock}
			<Button variant="outline" size="sm" onclick={handleUnlockFields}>
				<Lock class="mr-2 h-4 w-4" />
				Unlock Encrypted Fields
			</Button>
		{/if}
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
					<Label for="account-name" class="flex items-center gap-2">
						Account Name
						{#if nameIsEncrypted}
							<Lock class="h-3 w-3 text-muted-foreground" />
						{/if}
					</Label>
					{#if nameState.isEncrypted && nameState.needsUnlock}
						<div class="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted text-muted-foreground">
							<Lock class="h-4 w-4" />
							<span class="text-sm">Encrypted - unlock to edit</span>
						</div>
					{:else if nameState.isLoading}
						<div class="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted text-muted-foreground">
							<span class="text-sm">Decrypting...</span>
						</div>
					{:else}
						<Input
							id="account-name"
							bind:value={name}
							placeholder="e.g., Chase Checking" />
					{/if}
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
			<Card.Title class="flex items-center gap-2">
				Notes
				{#if notesIsEncrypted}
					<Lock class="h-3 w-3 text-muted-foreground" />
				{/if}
			</Card.Title>
			<Card.Description>
				Add any additional information or notes about this account.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if notesState.isEncrypted && notesState.needsUnlock}
				<div class="flex items-center gap-2 min-h-[100px] px-3 py-2 border rounded-md bg-muted text-muted-foreground">
					<Lock class="h-4 w-4" />
					<span class="text-sm">Encrypted - unlock to view and edit</span>
				</div>
			{:else if notesState.isLoading}
				<div class="flex items-center gap-2 min-h-[100px] px-3 py-2 border rounded-md bg-muted text-muted-foreground">
					<span class="text-sm">Decrypting...</span>
				</div>
			{:else}
				<Textarea
					bind:value={notes}
					placeholder="Optional notes about this account..."
					rows={4} />
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Save Button -->
	<div class="flex justify-end">
		<Button onclick={handleSave} disabled={isSaving}>
			{isSaving ? 'Saving...' : 'Save Changes'}
		</Button>
	</div>
</div>
