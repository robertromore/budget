<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Separator } from '$lib/components/ui/separator';
	import { Switch } from '$lib/components/ui/switch';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import {
		getEncryptionLevelOptions,
		getUserEncryptionPreferences,
		updateUserEncryptionPreferences,
		generateUserEncryptionKey,
		getTrustedDevices,
		revokeDeviceTrust
	} from '$lib/query/security';
	import { toast } from 'svelte-sonner';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Check from '@lucide/svelte/icons/check';
	import Copy from '@lucide/svelte/icons/copy';
	import Key from '@lucide/svelte/icons/key';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Lock from '@lucide/svelte/icons/lock';
	import Monitor from '@lucide/svelte/icons/monitor';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Shield from '@lucide/svelte/icons/shield';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import X from '@lucide/svelte/icons/x';
	import type { EncryptionLevel, EncryptionKeyType } from '$lib/types/encryption';

	// Queries - these return QueryWrapper objects that need .options() called
	const levelOptionsQuery = getEncryptionLevelOptions().options();
	const userPrefsQuery = getUserEncryptionPreferences().options();
	const trustedDevicesQuery = getTrustedDevices().options();

	// Mutations - these return MutationWrapper objects that need .options() called
	const updatePrefsMutation = updateUserEncryptionPreferences.options();
	const generateKeyMutation = generateUserEncryptionKey.options();
	const revokeDeviceMutation = revokeDeviceTrust.options();

	// State
	let selectedLevelStr = $state<string>('0');
	let riskFactorsEnabled = $state(false);
	let keyType = $state<EncryptionKeyType>('token');
	let passphrase = $state('');
	let confirmPassphrase = $state('');
	let showKeyDialog = $state(false);
	let generatedKey = $state('');
	let keyCopied = $state(false);

	// Derived encryption level as number
	const selectedLevel = $derived(parseInt(selectedLevelStr, 10) as EncryptionLevel);

	// Risk factors
	let riskFactors = $state({
		ip: true,
		location: true,
		device: true,
		timePattern: true
	});

	// Sync state with loaded preferences
	$effect(() => {
		if (userPrefsQuery.data) {
			selectedLevelStr = String(userPrefsQuery.data.encryption.defaultLevel ?? 0);
			riskFactorsEnabled = userPrefsQuery.data.encryption.riskFactorsEnabled ?? false;
			if (userPrefsQuery.data.encryption.riskFactors) {
				riskFactors = { ...userPrefsQuery.data.encryption.riskFactors };
			}
		}
	});

	// Helper to get level icon
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

	// Helper to get feature status badge
	function getFeatureBadge(status: 'available' | 'limited' | 'disabled') {
		switch (status) {
			case 'available':
				return { variant: 'secondary' as const, label: 'Available', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
			case 'limited':
				return { variant: 'outline' as const, label: 'Limited', class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
			case 'disabled':
				return { variant: 'destructive' as const, label: 'Disabled', class: '' };
		}
	}

	async function handleSavePreferences() {
		try {
			await updatePrefsMutation.mutateAsync({
				defaultLevel: selectedLevel,
				riskFactorsEnabled,
				riskFactors
			});
			toast.success('Security preferences updated');
		} catch (error) {
			toast.error('Failed to update preferences');
		}
	}

	async function handleGenerateKey() {
		try {
			if (keyType === 'passphrase') {
				if (passphrase.length < 12) {
					toast.error('Passphrase must be at least 12 characters');
					return;
				}
				if (passphrase !== confirmPassphrase) {
					toast.error('Passphrases do not match');
					return;
				}
			}

			const result = await generateKeyMutation.mutateAsync({
				keyType,
				passphrase: keyType === 'passphrase' ? passphrase : undefined
			});

			generatedKey = result.userKey;
			showKeyDialog = true;

			// Reset form
			passphrase = '';
			confirmPassphrase = '';
		} catch (error) {
			toast.error('Failed to generate encryption key');
		}
	}

	async function copyKey() {
		await navigator.clipboard.writeText(generatedKey);
		keyCopied = true;
		toast.success('Key copied to clipboard');
		setTimeout(() => (keyCopied = false), 2000);
	}

	async function handleRevokeDevice(deviceId: number) {
		try {
			await revokeDeviceMutation.mutateAsync({ deviceId });
			toast.success('Device trust revoked');
		} catch (error) {
			toast.error('Failed to revoke device');
		}
	}

	function formatDate(date: string): string {
		return new Date(date).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	const hasChanges = $derived(
		userPrefsQuery.data &&
			(selectedLevel !== userPrefsQuery.data.encryption.defaultLevel ||
				riskFactorsEnabled !== userPrefsQuery.data.encryption.riskFactorsEnabled)
	);

	const passphraseValid = $derived(
		keyType !== 'passphrase' ||
			(passphrase.length >= 12 && passphrase === confirmPassphrase)
	);
</script>

<svelte:head>
	<title>Security - Settings</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold">Security</h2>
		<p class="text-muted-foreground text-sm">Manage encryption and security settings</p>
	</div>

	<Tabs.Root value="encryption">
		<Tabs.List class="grid w-full grid-cols-3">
			<Tabs.Trigger value="encryption">
				<Lock class="mr-2 h-4 w-4" />
				Encryption
			</Tabs.Trigger>
			<Tabs.Trigger value="keys">
				<Key class="mr-2 h-4 w-4" />
				Keys
			</Tabs.Trigger>
			<Tabs.Trigger value="devices">
				<Monitor class="mr-2 h-4 w-4" />
				Devices
			</Tabs.Trigger>
		</Tabs.List>

		<!-- Encryption Level Tab -->
		<Tabs.Content value="encryption" class="space-y-6 pt-4">
			<Card.Root>
				<Card.Header>
					<Card.Title>Encryption Level</Card.Title>
					<Card.Description>
						Choose how your data is encrypted. Higher levels provide more protection but may limit
						some features.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if levelOptionsQuery.isLoading}
						<p class="text-muted-foreground">Loading options...</p>
					{:else if levelOptionsQuery.data}
						<RadioGroup.Root bind:value={selectedLevelStr} class="space-y-3">
							{#each levelOptionsQuery.data as option}
								{@const Icon = getLevelIcon(option.value)}
								<label
								class="flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 {selectedLevel === option.value ? 'border-primary bg-primary/5' : ''}">
								<RadioGroup.Item value={String(option.value)} class="mt-1" />
								<div class="flex-1 space-y-2">
									<div class="flex items-center gap-2">
											<Icon class="h-4 w-4" />
											<span class="font-medium">{option.label}</span>
											{#if option.recommended}
												<Badge variant="secondary" class="text-xs">Recommended</Badge>
											{/if}
											{#if option.dangerous}
												<Badge variant="destructive" class="text-xs">Advanced</Badge>
											{/if}
										</div>
										<p class="text-muted-foreground text-sm">{option.description}</p>

										{#if selectedLevel === option.value && option.warnings.length > 0}
											<div class="mt-2 space-y-1 rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
												{#each option.warnings as warning}
													<div class="flex items-start gap-2 text-sm text-yellow-700 dark:text-yellow-400">
														<AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
														<span>{warning}</span>
													</div>
												{/each}
											</div>
										{/if}
									</div>
								</label>
							{/each}
						</RadioGroup.Root>

						<!-- Feature Availability -->
						{#if selectedLevel > 0}
							{@const currentOption = levelOptionsQuery.data.find((o) => o.value === selectedLevel)}
							{#if currentOption}
								<div class="mt-6">
									<h4 class="mb-3 font-medium">Feature Availability</h4>
									<div class="grid gap-2 sm:grid-cols-2">
										{#each Object.entries(currentOption.features) as [feature, status]}
											{@const badge = getFeatureBadge(status)}
											<div class="flex items-center justify-between rounded-md border p-2 text-sm">
												<span class="capitalize">{feature.replace(/([A-Z])/g, ' $1').trim()}</span>
												<Badge variant={badge.variant} class={badge.class}>
													{badge.label}
												</Badge>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						{/if}
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Risk-Based Authentication -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Risk-Based Authentication</Card.Title>
					<Card.Description>
						Enable adaptive security that analyzes login patterns and may require additional
						verification for unusual access.
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="flex items-center justify-between">
						<div>
							<Label for="risk-toggle" class="text-base">Enable Risk Assessment</Label>
							<p class="text-muted-foreground text-sm">
								Analyze login patterns to detect unusual access
							</p>
						</div>
						<Switch id="risk-toggle" bind:checked={riskFactorsEnabled} />
					</div>

					{#if riskFactorsEnabled}
						<Separator />
						<div class="space-y-3">
							<h4 class="text-sm font-medium">Risk Factors</h4>
							<div class="grid gap-3 sm:grid-cols-2">
								<div class="flex items-center justify-between rounded-md border p-3">
									<Label for="factor-ip" class="cursor-pointer">IP Address</Label>
									<Switch id="factor-ip" bind:checked={riskFactors.ip} />
								</div>
								<div class="flex items-center justify-between rounded-md border p-3">
									<Label for="factor-location" class="cursor-pointer">Geographic Location</Label>
									<Switch id="factor-location" bind:checked={riskFactors.location} />
								</div>
								<div class="flex items-center justify-between rounded-md border p-3">
									<Label for="factor-device" class="cursor-pointer">Device Fingerprint</Label>
									<Switch id="factor-device" bind:checked={riskFactors.device} />
								</div>
								<div class="flex items-center justify-between rounded-md border p-3">
									<Label for="factor-time" class="cursor-pointer">Time Patterns</Label>
									<Switch id="factor-time" bind:checked={riskFactors.timePattern} />
								</div>
							</div>
						</div>
					{/if}
				</Card.Content>
				<Card.Footer>
					<Button onclick={handleSavePreferences} disabled={!hasChanges || updatePrefsMutation.isPending}>
						{updatePrefsMutation.isPending ? 'Saving...' : 'Save Changes'}
					</Button>
				</Card.Footer>
			</Card.Root>
		</Tabs.Content>

		<!-- Keys Tab -->
		<Tabs.Content value="keys" class="space-y-6 pt-4">
			<Card.Root>
				<Card.Header>
					<Card.Title>Encryption Key</Card.Title>
					<Card.Description>
						{#if userPrefsQuery.data?.hasEncryptionKey}
							You have an encryption key configured. Use it to decrypt your data.
						{:else}
							Generate a personal encryption key to enable data encryption.
						{/if}
					</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if userPrefsQuery.data?.hasEncryptionKey}
						<div class="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-900/20">
							<div class="flex items-center gap-3">
								<div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
									<KeyRound class="h-5 w-5 text-green-600 dark:text-green-400" />
								</div>
								<div>
									<p class="font-medium text-green-700 dark:text-green-400">Encryption Key Active</p>
									<p class="text-sm text-green-600 dark:text-green-500">
										Type: {userPrefsQuery.data.encryption.keyType ?? 'token'}
									</p>
								</div>
							</div>
							<Button variant="outline" size="sm">
								<RefreshCw class="mr-2 h-4 w-4" />
								Rotate Key
							</Button>
						</div>
					{:else}
						<div class="space-y-4">
							<div class="space-y-3">
								<Label>Key Type</Label>
								<RadioGroup.Root bind:value={keyType} class="space-y-2">
									<label class="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/50" class:border-primary={keyType === 'token'}>
										<RadioGroup.Item value="token" />
										<div>
											<span class="font-medium">Random Token</span>
											<p class="text-muted-foreground text-sm">
												Like a GitHub PAT - most secure, you'll receive a key to save
											</p>
										</div>
									</label>
									<label class="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/50" class:border-primary={keyType === 'passphrase'}>
										<RadioGroup.Item value="passphrase" />
										<div>
											<span class="font-medium">Passphrase</span>
											<p class="text-muted-foreground text-sm">
												Easier to remember, still secure - must be at least 12 characters
											</p>
										</div>
									</label>
									<label class="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/50" class:border-primary={keyType === 'keypair'}>
										<RadioGroup.Item value="keypair" />
										<div>
											<span class="font-medium">SSH-Style Keypair</span>
											<p class="text-muted-foreground text-sm">
												Maximum security - familiar to developers
											</p>
										</div>
									</label>
								</RadioGroup.Root>
							</div>

							{#if keyType === 'passphrase'}
								<div class="space-y-3">
									<div class="space-y-1.5">
										<Label for="passphrase">Passphrase</Label>
										<Input
											id="passphrase"
											type="password"
											bind:value={passphrase}
											placeholder="Enter a memorable passphrase (min 12 chars)"
										/>
									</div>
									<div class="space-y-1.5">
										<Label for="confirm-passphrase">Confirm Passphrase</Label>
										<Input
											id="confirm-passphrase"
											type="password"
											bind:value={confirmPassphrase}
											placeholder="Confirm your passphrase"
										/>
										{#if confirmPassphrase && passphrase !== confirmPassphrase}
											<p class="text-destructive text-sm">Passphrases do not match</p>
										{/if}
									</div>
								</div>
							{/if}

							<div class="rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
								<div class="flex gap-2 text-sm text-yellow-700 dark:text-yellow-400">
									<AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
									<div>
										<p class="font-medium">Important</p>
										<p>
											Save your encryption key securely. If you lose it, your encrypted data cannot
											be recovered.
										</p>
									</div>
								</div>
							</div>

							<Button onclick={handleGenerateKey} disabled={!passphraseValid || generateKeyMutation.isPending}>
								<Key class="mr-2 h-4 w-4" />
								{generateKeyMutation.isPending ? 'Generating...' : 'Generate Encryption Key'}
							</Button>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Devices Tab -->
		<Tabs.Content value="devices" class="space-y-6 pt-4">
			<Card.Root>
				<Card.Header>
					<Card.Title>Trusted Devices</Card.Title>
					<Card.Description>
						Devices you've explicitly trusted for authentication. Trusted devices may bypass
						additional verification.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if trustedDevicesQuery.isLoading}
						<p class="text-muted-foreground">Loading devices...</p>
					{:else if trustedDevicesQuery.data && trustedDevicesQuery.data.length > 0}
						<div class="space-y-3">
							{#each trustedDevicesQuery.data as device}
								<div class="flex items-center justify-between rounded-lg border p-3">
									<div class="flex items-center gap-3">
										<div class="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
											{#if device.label?.toLowerCase().includes('phone') || device.label?.toLowerCase().includes('mobile')}
												<Smartphone class="h-5 w-5" />
											{:else}
												<Monitor class="h-5 w-5" />
											{/if}
										</div>
										<div>
											<div class="flex items-center gap-2">
												<p class="font-medium">{device.label ?? 'Unknown Device'}</p>
												{#if device.explicitlyTrusted}
													<Badge variant="secondary" class="text-xs">
														<Check class="mr-1 h-3 w-3" />
														Trusted
													</Badge>
												{/if}
											</div>
											<p class="text-muted-foreground text-sm">
												Last seen: {formatDate(device.lastSeenAt)}
											</p>
										</div>
									</div>
									<Tooltip.Root>
										<Tooltip.Trigger>
											{#snippet child({ props })}
												<Button
													{...props}
													variant="ghost"
													size="icon"
													onclick={() => handleRevokeDevice(device.id)}
													disabled={revokeDeviceMutation.isPending}>
													<X class="h-4 w-4" />
												</Button>
											{/snippet}
										</Tooltip.Trigger>
										<Tooltip.Content>Revoke trust</Tooltip.Content>
									</Tooltip.Root>
								</div>
							{/each}
						</div>
					{:else}
						<div class="py-8 text-center">
							<Monitor class="text-muted-foreground mx-auto h-12 w-12" />
							<p class="text-muted-foreground mt-2">No trusted devices</p>
							<p class="text-muted-foreground text-sm">
								Devices will appear here when you trust them during login
							</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- Generated Key Dialog -->
<Dialog.Root bind:open={showKeyDialog}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<KeyRound class="h-5 w-5 text-green-500" />
				Encryption Key Generated
			</Dialog.Title>
			<Dialog.Description>
				Save this key securely. You will need it to decrypt your data. This key will not be shown
				again.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<div class="space-y-2">
				<Label>Your Encryption Key</Label>
				<div class="relative">
					<pre class="bg-muted overflow-x-auto rounded-md p-3 pr-12 text-sm break-all whitespace-pre-wrap">{generatedKey}</pre>
					<Button
						variant="ghost"
						size="icon"
						class="absolute right-2 top-2"
						onclick={copyKey}>
						{#if keyCopied}
							<Check class="h-4 w-4 text-green-500" />
						{:else}
							<Copy class="h-4 w-4" />
						{/if}
					</Button>
				</div>
			</div>

			<div class="rounded-md border border-destructive/50 bg-destructive/10 p-3">
				<div class="flex gap-2 text-sm text-destructive">
					<AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
					<div>
						<p class="font-medium">Save this key now!</p>
						<ul class="mt-1 list-inside list-disc space-y-1">
							<li>Store it in a password manager (1Password, Bitwarden)</li>
							<li>Save it to a secure notes app</li>
							<li>Print and store in a safe location</li>
						</ul>
					</div>
				</div>
			</div>
		</div>

		<Dialog.Footer>
			<Button onclick={() => (showKeyDialog = false)}>I've saved my key</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
