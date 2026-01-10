<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Badge } from '$lib/components/ui/badge';
import { ResponsiveSheet } from '$lib/components/ui/responsive-sheet';
import { rpc } from '$lib/query';
import type { Account } from '$lib/schema';
import type { ExternalAccount } from '$lib/schema/account-connections';
import ExternalLink from '@lucide/svelte/icons/external-link';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import ArrowRight from '@lucide/svelte/icons/arrow-right';
import CheckCircle from '@lucide/svelte/icons/check-circle';
import RefreshCw from '@lucide/svelte/icons/refresh-cw';
import AlertCircle from '@lucide/svelte/icons/alert-circle';
import Building2 from '@lucide/svelte/icons/building-2';
import Wallet from '@lucide/svelte/icons/wallet';
import Settings from '@lucide/svelte/icons/settings';

interface Props {
	open: boolean;
	account: Account;
	onOpenChange?: (open: boolean) => void;
	onSuccess?: () => void;
}

let { open = $bindable(), account, onOpenChange, onSuccess }: Props = $props();

// Query for shared access URL from settings
const sharedUrlQuery = rpc.connections.getSimplefinAccessUrl().options();

// Wizard state
type Step = 'instructions' | 'enter-url' | 'select-account' | 'confirm';
let currentStep = $state<Step>('instructions');
let accessUrl = $state('');
let accessUrlError = $state<string | null>(null);
let selectedExternalAccount = $state<ExternalAccount | null>(null);
let externalAccounts = $state<ExternalAccount[]>([]);
let isLoadingAccounts = $state(false);
let accountsError = $state<string | null>(null);
let usedSharedUrl = $state(false);

// Mutations
const fetchAccountsMutation = rpc.connections.getSimplefinAccounts.options();
const createConnectionMutation = rpc.connections.createSimplefinConnection.options();

// Derived state
let isCreating = $derived(createConnectionMutation.isPending);
let hasSharedUrl = $derived(!!sharedUrlQuery.data?.accessUrl);

// Pre-fill access URL from shared settings when available
$effect(() => {
	if (open && sharedUrlQuery.data?.accessUrl && !accessUrl) {
		accessUrl = sharedUrlQuery.data.accessUrl;
		usedSharedUrl = true;
	}
});

// Reset state when opening/closing
$effect(() => {
	if (!open) {
		// Reset after close animation
		setTimeout(() => {
			currentStep = 'instructions';
			accessUrl = '';
			accessUrlError = null;
			selectedExternalAccount = null;
			externalAccounts = [];
			accountsError = null;
			usedSharedUrl = false;
		}, 300);
	}
});

// Validate access URL format
function validateAccessUrl(url: string): boolean {
	if (!url.trim()) {
		accessUrlError = 'Access URL is required';
		return false;
	}
	if (!url.includes('simplefin.org')) {
		accessUrlError = 'Invalid SimpleFIN URL. It should contain "simplefin.org"';
		return false;
	}
	if (!url.startsWith('https://')) {
		accessUrlError = 'URL must start with https://';
		return false;
	}
	accessUrlError = null;
	return true;
}

// Navigation handlers
function goToEnterUrl() {
	currentStep = 'enter-url';
}

async function goToSelectAccount() {
	if (!validateAccessUrl(accessUrl)) {
		return;
	}

	currentStep = 'select-account';
	isLoadingAccounts = true;
	accountsError = null;

	try {
		const accounts = await fetchAccountsMutation.mutateAsync({ accessUrl });
		externalAccounts = accounts;
	} catch (error) {
		accountsError = error instanceof Error ? error.message : 'Failed to fetch accounts';
	} finally {
		isLoadingAccounts = false;
	}
}

function goBack() {
	if (currentStep === 'enter-url') {
		currentStep = 'instructions';
	} else if (currentStep === 'select-account') {
		currentStep = 'enter-url';
	} else if (currentStep === 'confirm') {
		currentStep = 'select-account';
	}
}

function selectAccount(ext: ExternalAccount) {
	selectedExternalAccount = ext;
	currentStep = 'confirm';
}

async function handleCreate() {
	if (!selectedExternalAccount) return;

	try {
		await createConnectionMutation.mutateAsync({
			accountId: account.id,
			accessUrl,
			externalAccountId: selectedExternalAccount.id,
			institutionName: selectedExternalAccount.institution
		});

		onSuccess?.();
		open = false;
	} catch (error) {
		// Error handled by mutation state
	}
}

function formatBalance(balance: number | undefined, currency: string | undefined): string {
	if (balance === undefined) return '';
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency || 'USD'
	}).format(balance);
}

function formatAccountType(type: string): string {
	return type.charAt(0).toUpperCase() + type.slice(1);
}
</script>

<ResponsiveSheet
	bind:open
	{onOpenChange}
	side="right"
	defaultWidth={500}
	minWidth={400}
	maxWidth={600}
	resizable={false}>
	{#snippet header()}
		<div class="flex flex-col gap-1">
			<h2 class="text-lg font-semibold">Connect with SimpleFIN</h2>
			<p class="text-muted-foreground text-sm">
				{#if currentStep === 'instructions'}
					Get your access URL from SimpleFIN
				{:else if currentStep === 'enter-url'}
					Enter your SimpleFIN access URL
				{:else if currentStep === 'select-account'}
					Select the account to connect
				{:else}
					Confirm your connection
				{/if}
			</p>
		</div>
	{/snippet}

	{#snippet content()}
		<div class="flex flex-col gap-6">
			{#if currentStep === 'instructions'}
				<!-- Step 1: Instructions -->
				<div class="space-y-4">
					{#if hasSharedUrl}
						<!-- Shared URL available -->
						<div class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
							<div class="flex gap-3">
								<CheckCircle class="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
								<div class="text-sm">
									<p class="font-medium text-green-900 dark:text-green-100">Access URL Ready</p>
									<p class="text-green-700 dark:text-green-300">
										Your saved SimpleFIN Access URL from Settings will be used automatically.
									</p>
								</div>
							</div>
						</div>
					{:else}
						<div class="bg-muted/50 rounded-lg border p-4">
							<h3 class="mb-3 font-medium">How to get your Access URL</h3>
							<ol class="text-muted-foreground space-y-3 text-sm">
								<li class="flex gap-3">
									<span
										class="bg-primary text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium"
										>1</span>
									<span
										>Visit <a
											href="https://beta-bridge.simplefin.org/"
											target="_blank"
											rel="noopener noreferrer"
											class="text-primary hover:underline"
											>beta-bridge.simplefin.org
											<ExternalLink class="mb-0.5 inline h-3 w-3" /></a>
									</span>
								</li>
								<li class="flex gap-3">
									<span
										class="bg-primary text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium"
										>2</span>
									<span>Sign in or create an account ($15/year)</span>
								</li>
								<li class="flex gap-3">
									<span
										class="bg-primary text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium"
										>3</span>
									<span>Connect your bank account(s) through their interface</span>
								</li>
								<li class="flex gap-3">
									<span
										class="bg-primary text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium"
										>4</span>
									<span
										>Click "Get Access URL" and copy the URL starting with
										<code class="bg-muted rounded px-1 py-0.5 text-xs">https://</code></span>
								</li>
							</ol>
						</div>
					{/if}

					<div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
						<div class="flex gap-3">
							<AlertCircle class="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
							<div class="text-sm">
								<p class="font-medium text-blue-900 dark:text-blue-100">About SimpleFIN</p>
								<p class="text-blue-700 dark:text-blue-300">
									SimpleFIN provides secure read-only access to 16,000+ US financial institutions.
									Your credentials are stored securely by SimpleFIN, not in this app.
								</p>
							</div>
						</div>
					</div>
				</div>

			{:else if currentStep === 'enter-url'}
				<!-- Step 2: Enter URL -->
				<div class="space-y-4">
					{#if usedSharedUrl}
						<div class="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900 dark:bg-green-950">
							<Settings class="h-4 w-4 text-green-600 dark:text-green-400" />
							<span class="text-sm text-green-700 dark:text-green-300">
								Pre-filled from your saved Access URL in Settings
							</span>
						</div>
					{/if}

					<div class="space-y-2">
						<Label for="access-url">SimpleFIN Access URL</Label>
						<Input
							id="access-url"
							type="password"
							bind:value={accessUrl}
							placeholder="https://...@beta-bridge.simplefin.org/simplefin"
							class={accessUrlError ? 'border-destructive' : ''} />
						{#if accessUrlError}
							<p class="text-destructive text-sm">{accessUrlError}</p>
						{/if}
					</div>

					{#if !usedSharedUrl}
						<div class="text-muted-foreground space-y-2 text-sm">
							<p>
								Your Access URL contains embedded authentication and looks like:
							</p>
							<code class="bg-muted block overflow-x-auto rounded p-2 text-xs">
								https://abc123...@beta-bridge.simplefin.org/simplefin
							</code>
						</div>
					{/if}
				</div>

			{:else if currentStep === 'select-account'}
				<!-- Step 3: Select Account -->
				<div class="space-y-4">
					{#if isLoadingAccounts}
						<div class="flex items-center justify-center gap-2 py-8 text-muted-foreground">
							<RefreshCw class="h-4 w-4 animate-spin" />
							<span>Loading accounts from SimpleFIN...</span>
						</div>
					{:else if accountsError}
						<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
							<p class="text-destructive text-sm">{accountsError}</p>
							<Button variant="outline" size="sm" onclick={goBack} class="mt-3">
								<ArrowLeft class="mr-2 h-4 w-4" />
								Go Back
							</Button>
						</div>
					{:else if externalAccounts.length === 0}
						<div class="text-muted-foreground py-8 text-center">
							<Building2 class="mx-auto mb-3 h-12 w-12 opacity-50" />
							<p>No accounts found. Make sure you've connected at least one bank in SimpleFIN.</p>
						</div>
					{:else}
						<p class="text-muted-foreground text-sm">
							Select the external account to link with <strong class="text-foreground">{account.name}</strong>:
						</p>
						<div class="space-y-2">
							{#each externalAccounts as ext}
								<button
									type="button"
									class="hover:border-primary hover:bg-accent w-full rounded-lg border p-4 text-left transition-colors"
									onclick={() => selectAccount(ext)}>
									<div class="flex items-start justify-between gap-3">
										<div class="flex items-start gap-3">
											<div class="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
												<Wallet class="text-primary h-5 w-5" />
											</div>
											<div>
												<p class="font-medium">{ext.name}</p>
												<p class="text-muted-foreground text-sm">{ext.institution}</p>
											</div>
										</div>
										<div class="text-right">
											{#if ext.balance !== undefined}
												<p class="font-medium">{formatBalance(ext.balance, ext.currency)}</p>
											{/if}
											<Badge variant="secondary" class="mt-1">
												{formatAccountType(ext.type)}
											</Badge>
										</div>
									</div>
								</button>
							{/each}
						</div>
					{/if}
				</div>

			{:else if currentStep === 'confirm'}
				<!-- Step 4: Confirm -->
				<div class="space-y-4">
					<div class="bg-muted/50 rounded-lg border p-4">
						<h3 class="mb-4 font-medium">Connection Summary</h3>
						<div class="space-y-3">
							<div class="flex justify-between text-sm">
								<span class="text-muted-foreground">Local Account</span>
								<span class="font-medium">{account.name}</span>
							</div>
							<div class="bg-border h-px"></div>
							<div class="flex justify-between text-sm">
								<span class="text-muted-foreground">External Account</span>
								<span class="font-medium">{selectedExternalAccount?.name}</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-muted-foreground">Institution</span>
								<span class="font-medium">{selectedExternalAccount?.institution}</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-muted-foreground">Provider</span>
								<Badge variant="secondary">SimpleFIN</Badge>
							</div>
						</div>
					</div>

					{#if createConnectionMutation.error}
						<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
							<p class="text-destructive text-sm">{createConnectionMutation.error.message}</p>
						</div>
					{/if}

					<div class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
						<div class="flex gap-3">
							<CheckCircle class="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
							<div class="text-sm">
								<p class="font-medium text-green-900 dark:text-green-100">Ready to connect</p>
								<p class="text-green-700 dark:text-green-300">
									After connecting, transactions will be automatically synced from your bank.
								</p>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/snippet}

	{#snippet footer()}
		<div class="flex justify-between gap-3">
			{#if currentStep === 'instructions'}
				<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
				{#if hasSharedUrl}
					<Button onclick={goToSelectAccount}>
						Continue
						<ArrowRight class="ml-2 h-4 w-4" />
					</Button>
				{:else}
					<Button onclick={goToEnterUrl}>
						I have my Access URL
						<ArrowRight class="ml-2 h-4 w-4" />
					</Button>
				{/if}
			{:else if currentStep === 'enter-url'}
				<Button variant="outline" onclick={goBack}>
					<ArrowLeft class="mr-2 h-4 w-4" />
					Back
				</Button>
				<Button onclick={goToSelectAccount} disabled={!accessUrl.trim()}>
					Continue
					<ArrowRight class="ml-2 h-4 w-4" />
				</Button>
			{:else if currentStep === 'select-account'}
				<Button variant="outline" onclick={goBack}>
					<ArrowLeft class="mr-2 h-4 w-4" />
					Back
				</Button>
				<div></div>
			{:else if currentStep === 'confirm'}
				<Button variant="outline" onclick={goBack} disabled={isCreating}>
					<ArrowLeft class="mr-2 h-4 w-4" />
					Back
				</Button>
				<Button onclick={handleCreate} disabled={isCreating}>
					{#if isCreating}
						<RefreshCw class="mr-2 h-4 w-4 animate-spin" />
						Connecting...
					{:else}
						<CheckCircle class="mr-2 h-4 w-4" />
						Connect Account
					{/if}
				</Button>
			{/if}
		</div>
	{/snippet}
</ResponsiveSheet>
