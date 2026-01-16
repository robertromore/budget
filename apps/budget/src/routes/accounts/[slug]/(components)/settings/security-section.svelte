<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Label } from '$lib/components/ui/label';
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import * as RadioGroup from '$lib/components/ui/radio-group';
import { toast } from '$lib/utils/toast-interceptor';
import {
	getAccountEncryptionSettings,
	updateAccountEncryptionSettings,
	getEffectiveEncryptionLevel
} from '$lib/query/security';
import type { Account } from '$lib/schema';
import type { EncryptionLevel } from '$lib/types/encryption';
import Shield from '@lucide/svelte/icons/shield';
import ShieldCheck from '@lucide/svelte/icons/shield-check';
import Lock from '@lucide/svelte/icons/lock';
import ShieldAlert from '@lucide/svelte/icons/shield-alert';
import AlertCircle from '@lucide/svelte/icons/alert-circle';
import Info from '@lucide/svelte/icons/info';

interface Props {
	account: Account;
}

let { account }: Props = $props();

// Queries
const settingsQuery = getAccountEncryptionSettings(account.id).options();
const effectiveLevelQuery = getEffectiveEncryptionLevel({ accountId: account.id }).options();

// Mutations
const updateSettingsMutation = updateAccountEncryptionSettings.options();

// Form state
let selectedLevel = $state<string>('inherit');
let isSaving = $state(false);

// Sync state with loaded settings
$effect(() => {
	if (settingsQuery.data) {
		selectedLevel = settingsQuery.data.encryptionLevel;
	}
});

// Encryption level options
const levelOptions = [
	{
		value: 'inherit',
		label: 'Inherit from Workspace',
		description: 'Use the encryption level set at the workspace level',
		icon: Shield
	},
	{
		value: '1',
		label: 'Basic Encrypted',
		description: 'Sensitive fields encrypted with your personal key',
		icon: ShieldCheck
	},
	{
		value: '2',
		label: 'Enhanced PII',
		description: 'Additional encryption for personal information',
		icon: Lock
	},
	{
		value: '3',
		label: 'Maximum Field',
		description: 'All text fields encrypted (limited search)',
		icon: Lock
	},
	{
		value: '4',
		label: 'Zero-Knowledge',
		description: 'Client-side encryption (features disabled)',
		icon: ShieldAlert,
		dangerous: true
	}
];

function getLevelIcon(level: EncryptionLevel) {
	switch (level) {
		case 0:
			return Shield;
		case 1:
			return ShieldCheck;
		case 2:
		case 3:
			return Lock;
		case 4:
			return ShieldAlert;
		default:
			return Shield;
	}
}

async function handleSave() {
	isSaving = true;
	try {
		await updateSettingsMutation.mutateAsync({
			accountId: account.id,
			encryptionLevel: selectedLevel as 'inherit' | '0' | '1' | '2' | '3' | '4'
		});
		toast.success('Security settings updated');
	} catch (error) {
		console.error('Failed to update security settings:', error);
		toast.error('Failed to update security settings');
	} finally {
		isSaving = false;
	}
}

const hasChanges = $derived(settingsQuery.data && selectedLevel !== settingsQuery.data.encryptionLevel);
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold">Security Settings</h2>
		<p class="text-muted-foreground text-sm">
			Configure encryption for this account's sensitive data.
		</p>
	</div>

	<!-- Effective Level Display -->
	{#if effectiveLevelQuery.data}
		{@const EffectiveIcon = getLevelIcon(effectiveLevelQuery.data.level)}
		<Card.Root class="border-primary/20 bg-primary/5">
			<Card.Content class="pt-6">
				<div class="flex items-start gap-4">
					<div class="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
						<EffectiveIcon class="text-primary h-5 w-5" />
					</div>
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<span class="font-medium">Current Protection Level</span>
							<Badge variant="secondary">{effectiveLevelQuery.data.levelName}</Badge>
						</div>
						<p class="text-muted-foreground mt-1 text-sm">
							{#if effectiveLevelQuery.data.source === 'account'}
								Set specifically for this account
							{:else if effectiveLevelQuery.data.source === 'workspace'}
								Inherited from workspace settings
							{:else}
								Using your default user settings
							{/if}
						</p>
						{#if effectiveLevelQuery.data.requiresKey}
							<p class="mt-2 text-sm text-amber-600 dark:text-amber-400">
								<AlertCircle class="mr-1 inline h-4 w-4" />
								Encryption key required to access data
							</p>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Encryption Level Selection -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Encryption Level</Card.Title>
			<Card.Description>
				Choose the encryption level for this account. Higher levels can only be set, not decreased.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if settingsQuery.isLoading}
				<p class="text-muted-foreground">Loading settings...</p>
			{:else}
				<RadioGroup.Root bind:value={selectedLevel} class="space-y-2">
					{#each levelOptions as option}
						{@const Icon = option.icon}
						<label
							class="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50 {selectedLevel === option.value ? 'border-primary bg-primary/5' : ''}">
							<RadioGroup.Item value={option.value} class="mt-0.5" />
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<Icon class="h-4 w-4" />
									<span class="font-medium">{option.label}</span>
									{#if option.dangerous}
										<Badge variant="destructive" class="text-xs">Advanced</Badge>
									{/if}
								</div>
								<p class="text-muted-foreground text-sm">{option.description}</p>
							</div>
						</label>
					{/each}
				</RadioGroup.Root>

				<div class="text-muted-foreground flex items-start gap-2 text-sm">
					<Info class="mt-0.5 h-4 w-4 shrink-0" />
					<p>
						Account-level encryption can only increase the protection level from what's set at the
						workspace level. This ensures sensitive accounts always have at least as much protection
						as the workspace default.
					</p>
				</div>

				<div class="flex justify-end">
					<Button onclick={handleSave} disabled={!hasChanges || isSaving} variant="outline" size="sm">
						{isSaving ? 'Saving...' : 'Save'}
					</Button>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Feature Availability -->
	{#if effectiveLevelQuery.data && effectiveLevelQuery.data.level > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Feature Availability</Card.Title>
				<Card.Description>
					Features affected by the current encryption level.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="grid gap-2 sm:grid-cols-2">
					{#each Object.entries(effectiveLevelQuery.data.features) as [feature, status]}
						{@const statusConfig = {
							available: { variant: 'secondary' as const, label: 'Available', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
							limited: { variant: 'outline' as const, label: 'Limited', class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
							disabled: { variant: 'destructive' as const, label: 'Disabled', class: '' }
						}[status]}
						<div class="flex items-center justify-between rounded-md border p-2 text-sm">
							<span class="capitalize">{feature.replace(/([A-Z])/g, ' $1').trim()}</span>
							<Badge variant={statusConfig.variant} class={statusConfig.class}>
								{statusConfig.label}
							</Badge>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Warnings -->
	{#if effectiveLevelQuery.data?.warnings.length}
		<Card.Root class="border-amber-200 dark:border-amber-900/50">
			<Card.Content class="pt-6">
				<div class="space-y-2">
					{#each effectiveLevelQuery.data.warnings as warning}
						<div class="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
							<AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
							<span>{warning}</span>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
