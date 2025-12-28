<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Alert from '$lib/components/ui/alert';
	import { encryptionUnlock, type CachePreference } from '$lib/states/ui/encryption-unlock.svelte';
	import Lock from '@lucide/svelte/icons/lock';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';

	// Local state
	let keyType = $state<'token' | 'passphrase'>('token');
	let userKey = $state('');
	let cachePreference = $state<CachePreference>('session');
	let showKey = $state(false);

	// Derived state from singleton
	const isOpen = $derived(encryptionUnlock.isDialogOpen);
	const errorMessage = $derived(encryptionUnlock.errorMessage);
	const isVerifying = $derived(encryptionUnlock.isVerifying);
	const unlockContext = $derived(encryptionUnlock.unlockContext);

	// Reset form when dialog opens
	$effect(() => {
		if (isOpen) {
			userKey = '';
			showKey = false;
			encryptionUnlock.clearError();
		}
	});

	async function handleUnlock() {
		if (!userKey.trim()) return;
		await encryptionUnlock.submitKey(userKey.trim(), cachePreference);
	}

	function handleClose() {
		encryptionUnlock.closeDialog();
	}

	function handleOpenChange(open: boolean) {
		if (!open) {
			handleClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !isVerifying && userKey.trim()) {
			e.preventDefault();
			handleUnlock();
		}
	}
</script>

<Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Lock class="h-5 w-5" />
				Unlock Encrypted Data
			</Dialog.Title>
			<Dialog.Description>
				{#if unlockContext?.operation}
					Enter your encryption key to {unlockContext.operation.toLowerCase()}.
				{:else}
					Enter your encryption key to access your encrypted data.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-6 py-4">
			<!-- Key Type Tabs -->
			<Tabs.Root bind:value={keyType}>
				<Tabs.List class="grid w-full grid-cols-2">
					<Tabs.Trigger value="token" class="flex items-center gap-2">
						<KeyRound class="h-4 w-4" />
						Token
					</Tabs.Trigger>
					<Tabs.Trigger value="passphrase" class="flex items-center gap-2">
						<Lock class="h-4 w-4" />
						Passphrase
					</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="token" class="mt-4 space-y-2">
					<Label for="token-input">Encryption Token</Label>
					<div class="relative">
						<Input
							id="token-input"
							type={showKey ? 'text' : 'password'}
							placeholder="bud_ek_..."
							bind:value={userKey}
							onkeydown={handleKeydown}
							class="pr-10 font-mono"
						/>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							class="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
							onclick={() => (showKey = !showKey)}>
							{#if showKey}
								<EyeOff class="h-4 w-4 text-muted-foreground" />
							{:else}
								<Eye class="h-4 w-4 text-muted-foreground" />
							{/if}
						</Button>
					</div>
					<p class="text-xs text-muted-foreground">
						Enter the encryption token you saved when enabling encryption.
					</p>
				</Tabs.Content>

				<Tabs.Content value="passphrase" class="mt-4 space-y-2">
					<Label for="passphrase-input">Encryption Passphrase</Label>
					<div class="relative">
						<Input
							id="passphrase-input"
							type={showKey ? 'text' : 'password'}
							placeholder="Enter your passphrase"
							bind:value={userKey}
							onkeydown={handleKeydown}
							class="pr-10"
						/>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							class="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
							onclick={() => (showKey = !showKey)}>
							{#if showKey}
								<EyeOff class="h-4 w-4 text-muted-foreground" />
							{:else}
								<Eye class="h-4 w-4 text-muted-foreground" />
							{/if}
						</Button>
					</div>
					<p class="text-xs text-muted-foreground">
						Enter the passphrase you created when enabling encryption.
					</p>
				</Tabs.Content>
			</Tabs.Root>

			<!-- Cache Preference -->
			<div class="space-y-3">
				<Label>Remember key</Label>
				<RadioGroup.Root bind:value={cachePreference} class="space-y-2">
					<div class="flex items-center space-x-3">
						<RadioGroup.Item value="never" id="cache-never" />
						<Label for="cache-never" class="cursor-pointer font-normal">
							Never (ask every time)
						</Label>
					</div>
					<div class="flex items-center space-x-3">
						<RadioGroup.Item value="session" id="cache-session" />
						<Label for="cache-session" class="cursor-pointer font-normal">
							For this session (until tab closes)
						</Label>
					</div>
					<div class="flex items-center space-x-3">
						<RadioGroup.Item value="device" id="cache-device" />
						<Label for="cache-device" class="cursor-pointer font-normal">
							On this device (encrypted storage)
						</Label>
					</div>
				</RadioGroup.Root>
			</div>

			<!-- Error Message -->
			{#if errorMessage}
				<Alert.Root variant="destructive">
					<AlertCircle class="h-4 w-4" />
					<Alert.Title>Error</Alert.Title>
					<Alert.Description>{errorMessage}</Alert.Description>
				</Alert.Root>
			{/if}
		</div>

		<Dialog.Footer class="flex-col gap-2 sm:flex-row">
			<Button variant="outline" onclick={handleClose} disabled={isVerifying}>Cancel</Button>
			<Button onclick={handleUnlock} disabled={isVerifying || !userKey.trim()}>
				{#if isVerifying}
					<span class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
					Verifying...
				{:else}
					Unlock
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
