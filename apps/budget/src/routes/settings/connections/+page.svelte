<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Switch } from '$lib/components/ui/switch';
	import { rpc } from '$lib/query';
	import type { TellerProviderSettings } from '$lib/schema/workspaces';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Building2 from '@lucide/svelte/icons/building-2';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import Clock from '@lucide/svelte/icons/clock';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Wallet from '@lucide/svelte/icons/wallet';

	// Query provider settings
	const settingsQuery = rpc.connections.getProviderSettings().options();

	// Mutations (defineMutation returns object directly, no () needed)
	const updateTellerMutation = rpc.connections.updateTellerSettings.options();
	const updateAutoSyncMutation = rpc.connections.updateAutoSyncSettings.options();
	const updateSimplefinMutation = rpc.connections.updateSimplefinSettings.options();

	// Local state
	let tellerSettings = $state<TellerProviderSettings>({
		enabled: false,
		applicationId: undefined,
		environment: 'sandbox'
	});
	let autoSyncEnabled = $state(false);
	let autoSyncInterval = $state(24);
	let simplefinAccessUrl = $state('');
	let hasSimplefinUrl = $state(false);

	// Sync with query data
	$effect(() => {
		if (settingsQuery.data) {
			tellerSettings = { ...settingsQuery.data.teller };
			autoSyncEnabled = settingsQuery.data.autoSync.enabled;
			autoSyncInterval = settingsQuery.data.autoSync.intervalHours;
			hasSimplefinUrl = settingsQuery.data.simplefin.hasAccessUrl ?? false;
		}
	});

	// Environment options for Teller
	const environmentOptions = [
		{ value: 'sandbox', label: 'Sandbox', description: 'Test with mock data' },
		{ value: 'development', label: 'Development', description: 'Test with real banks (limited)' },
		{ value: 'production', label: 'Production', description: 'Full production access' }
	] as const;

	// Interval options for auto-sync
	const intervalOptions = [
		{ value: 1, label: 'Every hour' },
		{ value: 6, label: 'Every 6 hours' },
		{ value: 12, label: 'Every 12 hours' },
		{ value: 24, label: 'Once daily' },
		{ value: 48, label: 'Every 2 days' },
		{ value: 168, label: 'Weekly' }
	];

	function handleTellerToggle(enabled: boolean) {
		tellerSettings.enabled = enabled;
		saveTellerSettings();
	}

	function handleTellerEnvironmentChange(value: string | undefined) {
		if (value) {
			tellerSettings.environment = value as 'sandbox' | 'development' | 'production';
			saveTellerSettings();
		}
	}

	function saveTellerSettings() {
		updateTellerMutation.mutate({
			enabled: tellerSettings.enabled,
			applicationId: tellerSettings.applicationId,
			environment: tellerSettings.environment
		});
	}

	function handleAutoSyncToggle(enabled: boolean) {
		autoSyncEnabled = enabled;
		saveAutoSyncSettings();
	}

	function handleIntervalChange(value: string | undefined) {
		if (value) {
			autoSyncInterval = parseInt(value, 10);
			saveAutoSyncSettings();
		}
	}

	function saveAutoSyncSettings() {
		updateAutoSyncMutation.mutate({
			enabled: autoSyncEnabled,
			intervalHours: autoSyncInterval
		});
	}

	function saveSimplefinUrl() {
		if (!simplefinAccessUrl.trim()) return;
		updateSimplefinMutation.mutate(
			{ accessUrl: simplefinAccessUrl },
			{
				onSuccess: () => {
					simplefinAccessUrl = '';
				}
			}
		);
	}

	function clearSimplefinUrl() {
		updateSimplefinMutation.mutate({ clearAccessUrl: true });
	}

	const selectedEnvironment = $derived(
		environmentOptions.find((o) => o.value === tellerSettings.environment)
	);
	const selectedInterval = $derived(intervalOptions.find((o) => o.value === autoSyncInterval));
</script>

<svelte:head>
	<title>Bank Connections - Settings</title>
	<meta name="description" content="Configure bank connection providers and sync settings" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h2 class="text-lg font-semibold">Bank Connections</h2>
		<p class="text-muted-foreground text-sm">
			Configure bank connection providers and automatic sync settings.
		</p>
	</div>

	{#if settingsQuery.isLoading}
		<div class="space-y-4">
			<Skeleton class="h-40 w-full" />
			<Skeleton class="h-40 w-full" />
			<Skeleton class="h-40 w-full" />
		</div>
	{:else if settingsQuery.error}
		<Card.Root class="border-destructive">
			<Card.Content class="pt-6">
				<div class="text-destructive flex items-center gap-2">
					<AlertTriangle class="h-5 w-5" />
					<p>Failed to load connection settings</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- SimpleFIN Provider -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-3">
					<div class="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
						<Wallet class="text-primary h-5 w-5" />
					</div>
					<div>
						<Card.Title class="text-base">SimpleFIN</Card.Title>
						<Card.Description>Connect to 16,000+ US institutions via MX</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="bg-muted/50 rounded-lg p-4">
					<p class="text-sm">
						Get your Access URL from
						<a
							href="https://beta-bridge.simplefin.org/"
							target="_blank"
							rel="noopener noreferrer"
							class="text-primary inline-flex items-center gap-1 underline"
						>
							simplefin.org
							<ExternalLink class="h-3 w-3" />
						</a>
						($15/year subscription).
					</p>
				</div>

				<Separator />

				<!-- Shared Access URL -->
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<Label for="simplefin-url">Shared Access URL (Optional)</Label>
						{#if hasSimplefinUrl}
							<div class="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
								<CheckCircle class="h-4 w-4" />
								<span>Configured</span>
							</div>
						{/if}
					</div>

					{#if hasSimplefinUrl}
						<div class="flex items-center gap-2">
							<div class="bg-muted flex-1 rounded-md border px-3 py-2">
								<span class="text-muted-foreground text-sm">Access URL is saved (encrypted)</span>
							</div>
							<Button
								variant="outline"
								size="sm"
								onclick={clearSimplefinUrl}
								disabled={updateSimplefinMutation.isPending}
							>
								<Trash2 class="mr-2 h-4 w-4" />
								Clear
							</Button>
						</div>
					{:else}
						<div class="flex gap-2">
							<Input
								id="simplefin-url"
								type="password"
								placeholder="https://...@beta-bridge.simplefin.org/simplefin"
								bind:value={simplefinAccessUrl}
							/>
							<Button
								onclick={saveSimplefinUrl}
								disabled={!simplefinAccessUrl.trim() || updateSimplefinMutation.isPending}
							>
								{#if updateSimplefinMutation.isPending}
									<RefreshCw class="mr-2 h-4 w-4 animate-spin" />
								{/if}
								Save
							</Button>
						</div>
					{/if}

					<p class="text-muted-foreground text-xs">
						Save a shared Access URL to auto-fill when connecting new accounts. If not set, you'll
						enter it each time you connect an account.
					</p>
				</div>

				<div class="flex items-center gap-2">
					<div class="h-2 w-2 rounded-full bg-green-500"></div>
					<span class="text-muted-foreground text-sm">Always available</span>
					{#if updateSimplefinMutation.isPending}
						<RefreshCw class="text-muted-foreground h-3 w-3 animate-spin" />
					{/if}
				</div>

				<!-- Where credentials are entered -->
				<div class="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
					<p class="text-xs text-blue-700 dark:text-blue-300">
						<strong>Where to connect:</strong> Go to an account's Settings tab &rarr; Bank Connection
						section to connect it with SimpleFIN.
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Teller Provider -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
							<Building2 class="text-primary h-5 w-5" />
						</div>
						<div>
							<Card.Title class="text-base">Teller</Card.Title>
							<Card.Description>Connect to 7,000+ institutions via official APIs</Card.Description>
						</div>
					</div>
					<Switch
						checked={tellerSettings.enabled}
						onCheckedChange={handleTellerToggle}
						disabled={updateTellerMutation.isPending}
					/>
				</div>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="bg-muted/50 rounded-lg p-4">
					<p class="text-sm">
						Requires a developer account from
						<a
							href="https://teller.io/"
							target="_blank"
							rel="noopener noreferrer"
							class="text-primary inline-flex items-center gap-1 underline"
						>
							teller.io
							<ExternalLink class="h-3 w-3" />
						</a>
						. Free tier includes 100 live connections.
					</p>
				</div>

				{#if tellerSettings.enabled}
					<Separator />

					<div class="space-y-4">
						<div class="space-y-2">
							<Label for="teller-app-id">Application ID</Label>
							<Input
								id="teller-app-id"
								placeholder="app_..."
								bind:value={tellerSettings.applicationId}
								onblur={saveTellerSettings}
							/>
							<p class="text-muted-foreground text-xs">
								Find this in your Teller dashboard under Settings.
							</p>
						</div>

						<div class="space-y-2">
							<Label>Environment</Label>
							<Select.Root
								type="single"
								value={selectedEnvironment?.value}
								onValueChange={handleTellerEnvironmentChange}
							>
								<Select.Trigger class="w-full">
									{selectedEnvironment?.label ?? 'Select environment'}
								</Select.Trigger>
								<Select.Content>
									{#each environmentOptions as option}
										<Select.Item value={option.value}>
											<div>
												<div>{option.label}</div>
												<div class="text-muted-foreground text-xs">{option.description}</div>
											</div>
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					</div>
				{/if}

				<div class="flex items-center gap-2">
					{#if tellerSettings.enabled}
						<div class="h-2 w-2 rounded-full bg-green-500"></div>
						<span class="text-muted-foreground text-sm">Enabled</span>
					{:else}
						<div class="h-2 w-2 rounded-full bg-gray-400"></div>
						<span class="text-muted-foreground text-sm">Disabled</span>
					{/if}
					{#if updateTellerMutation.isPending}
						<RefreshCw class="text-muted-foreground h-3 w-3 animate-spin" />
					{/if}
				</div>

				<!-- Where credentials are entered -->
				<div class="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
					<p class="text-xs text-blue-700 dark:text-blue-300">
						<strong>Where to connect:</strong> Configure the Application ID above, then go to an
						account's Settings tab &rarr; Bank Connection to connect via Teller.
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Auto-Sync Settings -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
							<Clock class="text-primary h-5 w-5" />
						</div>
						<div>
							<Card.Title class="text-base">Automatic Sync</Card.Title>
							<Card.Description>
								Automatically sync transactions from connected accounts
							</Card.Description>
						</div>
					</div>
					<Switch
						checked={autoSyncEnabled}
						onCheckedChange={handleAutoSyncToggle}
						disabled={updateAutoSyncMutation.isPending}
					/>
				</div>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if autoSyncEnabled}
					<div class="space-y-2">
						<Label>Sync Interval</Label>
						<Select.Root
							type="single"
							value={String(selectedInterval?.value)}
							onValueChange={handleIntervalChange}
						>
							<Select.Trigger class="w-full">
								{selectedInterval?.label ?? 'Select interval'}
							</Select.Trigger>
							<Select.Content>
								{#each intervalOptions as option}
									<Select.Item value={String(option.value)}>
										{option.label}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				{/if}

				<div class="bg-muted/50 rounded-lg p-4">
					<p class="text-muted-foreground text-sm">
						{#if autoSyncEnabled}
							Connected accounts will sync automatically {selectedInterval?.label.toLowerCase()}.
						{:else}
							Enable auto-sync to keep transactions up-to-date automatically.
						{/if}
					</p>
				</div>

				<div class="flex items-center gap-2">
					{#if autoSyncEnabled}
						<div class="h-2 w-2 rounded-full bg-green-500"></div>
						<span class="text-muted-foreground text-sm">Enabled</span>
					{:else}
						<div class="h-2 w-2 rounded-full bg-gray-400"></div>
						<span class="text-muted-foreground text-sm">Disabled</span>
					{/if}
					{#if updateAutoSyncMutation.isPending}
						<RefreshCw class="text-muted-foreground h-3 w-3 animate-spin" />
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Info Section -->
		<Card.Root class="bg-muted/30">
			<Card.Content class="pt-6">
				<div class="space-y-3">
					<h3 class="text-sm font-medium">About Bank Connections</h3>
					<ul class="text-muted-foreground space-y-1 text-xs">
						<li>
							* <strong>SimpleFIN</strong> - Subscribe at simplefin.org ($15/year). Save your Access
							URL here or enter it when connecting each account.
						</li>
						<li>
							* <strong>Teller</strong> - Get a free developer account at teller.io (100
							connections). Configure Application ID above.
						</li>
						<li>* Connections are made per-account in each account's Settings tab.</li>
						<li>* All credentials are encrypted at rest using workspace-specific keys.</li>
					</ul>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
