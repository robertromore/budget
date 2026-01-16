<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Separator } from '$lib/components/ui/separator';
	import {
		getEncryptionLevelOptions,
		getWorkspaceEncryptionSettings,
		updateWorkspaceEncryptionSettings,
		getUserEncryptionPreferences
	} from '$lib/query/security';
	import { currentWorkspace } from '$lib/states/current-workspace.svelte';
	import { toast } from '$lib/utils/toast-interceptor';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Info from '@lucide/svelte/icons/info';
	import Lock from '@lucide/svelte/icons/lock';
	import Shield from '@lucide/svelte/icons/shield';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import type { EncryptionLevel } from '$lib/types/encryption';

	// Get current workspace
	const workspace = currentWorkspace.get();
	const workspaceId = $derived(workspace?.workspaceId);

	// Queries
	const levelOptionsQuery = getEncryptionLevelOptions().options();
	const userPrefsQuery = getUserEncryptionPreferences().options();

	// Workspace settings query - depends on workspaceId
	let workspaceSettingsQuery = $derived(
		workspaceId ? getWorkspaceEncryptionSettings(workspaceId).options() : null
	);

	// Mutation
	const updateSettingsMutation = updateWorkspaceEncryptionSettings.options();

	// State - "inherit" or level number as string
	let selectedLevelStr = $state<string>('inherit');

	// Derived values
	const selectedLevel = $derived(
		selectedLevelStr === 'inherit' ? 'inherit' : (parseInt(selectedLevelStr, 10) as EncryptionLevel)
	);

	const userLevel = $derived(userPrefsQuery.data?.encryption.defaultLevel ?? 0);
	const effectiveLevel = $derived(
		selectedLevel === 'inherit' ? userLevel : selectedLevel
	);

	// Sync state with loaded settings
	$effect(() => {
		if (workspaceSettingsQuery?.data) {
			const data = workspaceSettingsQuery.data;
			selectedLevelStr = data.encryption.level === 'inherit'
				? 'inherit'
				: String(data.encryption.level);
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

	async function handleSave() {
		if (!workspaceId) return;

		try {
			await updateSettingsMutation.mutateAsync({
				workspaceId,
				level: selectedLevel
			});
			toast.success('Workspace security settings updated');
		} catch (error) {
			toast.error('Failed to update settings');
		}
	}

	const hasChanges = $derived(
		workspaceSettingsQuery?.data &&
			(selectedLevelStr !== (workspaceSettingsQuery.data.encryption.level === 'inherit'
				? 'inherit'
				: String(workspaceSettingsQuery.data.encryption.level)))
	);

	const hasEncryptionKey = $derived(userPrefsQuery.data?.hasEncryptionKey ?? false);
</script>

<svelte:head>
	<title>Security - Workspace Settings</title>
</svelte:head>

<div class="space-y-6">
	<!-- User Key Status -->
	{#if !hasEncryptionKey}
		<Card.Root class="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-900/10">
			<Card.Content class="flex items-start gap-3 pt-6">
				<AlertCircle class="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
				<div class="space-y-1">
					<p class="font-medium text-yellow-800 dark:text-yellow-200">
						No encryption key configured
					</p>
					<p class="text-sm text-yellow-700 dark:text-yellow-300">
						You need to generate a personal encryption key before enabling workspace encryption.
						<a href="/settings/security" class="underline hover:no-underline">
							Go to Security Settings
						</a>
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Encryption Level -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Workspace Encryption Level</Card.Title>
			<Card.Description>
				Choose the encryption level for this workspace. This setting can override your personal default or inherit from it.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if !workspaceId}
				<p class="text-muted-foreground">Loading workspace...</p>
			{:else if workspaceSettingsQuery?.isLoading || levelOptionsQuery.isLoading}
				<p class="text-muted-foreground">Loading options...</p>
			{:else if levelOptionsQuery.data}
				<RadioGroup.Root bind:value={selectedLevelStr} class="space-y-3">
					<!-- Inherit Option -->
					<label
						class="flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 {selectedLevelStr === 'inherit' ? 'border-primary bg-primary/5' : ''}"
					>
						<RadioGroup.Item value="inherit" class="mt-1" />
						<div class="flex-1 space-y-2">
							<div class="flex items-center gap-2">
								<ArrowRight class="h-4 w-4" />
								<span class="font-medium">Inherit from Personal Settings</span>
								<Badge variant="outline" class="text-xs">Default</Badge>
							</div>
							<p class="text-muted-foreground text-sm">
								Use your personal encryption level (currently Level {userLevel}).
								Changes to your personal settings will apply to this workspace.
							</p>
						</div>
					</label>

					<Separator class="my-4" />
					<p class="text-sm text-muted-foreground mb-2">Or choose a specific level for this workspace:</p>

					<!-- Level Options -->
					{#each levelOptionsQuery.data as option (option.value)}
						{@const Icon = getLevelIcon(option.value)}
						<label
							class="flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 {selectedLevel === option.value ? 'border-primary bg-primary/5' : ''}"
							class:opacity-50={!hasEncryptionKey && option.value > 0}
						>
							<RadioGroup.Item
								value={String(option.value)}
								class="mt-1"
								disabled={!hasEncryptionKey && option.value > 0}
							/>
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
										{#each option.warnings as warning, i (i)}
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

				<!-- Feature Availability for effective level -->
				{#if effectiveLevel > 0}
					{@const currentOption = levelOptionsQuery.data.find((o) => o.value === effectiveLevel)}
					{#if currentOption}
						<div class="mt-6">
							<h4 class="mb-3 font-medium flex items-center gap-2">
								Feature Availability
								{#if selectedLevel === 'inherit'}
									<Badge variant="outline" class="text-xs">Based on inherited level</Badge>
								{/if}
							</h4>
							<div class="grid gap-2 sm:grid-cols-2">
								{#each Object.entries(currentOption.features) as [feature, status] (feature)}
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
		<Card.Footer>
			<Button
				onclick={handleSave}
				disabled={!hasChanges || updateSettingsMutation.isPending || !workspaceId}
			>
				{updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
			</Button>
		</Card.Footer>
	</Card.Root>

	<!-- Info about workspace vs user encryption -->
	<Card.Root class="bg-muted/30">
		<Card.Content class="flex items-start gap-3 pt-6">
			<Info class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
			<div class="space-y-2 text-sm text-muted-foreground">
				<p class="font-medium text-foreground">About Workspace Encryption</p>
				<ul class="list-disc list-inside space-y-1">
					<li>Workspace encryption uses your personal encryption key</li>
					<li>All members with access to the workspace will need their own keys to view encrypted data</li>
					<li>If you select "Inherit", changes to your personal security settings will automatically apply</li>
					<li>Choosing a specific level overrides your personal default for this workspace only</li>
				</ul>
			</div>
		</Card.Content>
	</Card.Root>
</div>
