<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import { ResponsiveSheet } from '$lib/components/ui/responsive-sheet';
import { rpc } from '$lib/query';
import type { Account } from '$lib/schema';
import type { ExternalAccount } from '$lib/schema/account-connections';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import ArrowRight from '@lucide/svelte/icons/arrow-right';
import CheckCircle from '@lucide/svelte/icons/check-circle';
import RefreshCw from '@lucide/svelte/icons/refresh-cw';
import AlertCircle from '@lucide/svelte/icons/alert-circle';
import Building2 from '@lucide/svelte/icons/building-2';
import Wallet from '@lucide/svelte/icons/wallet';
import Zap from '@lucide/svelte/icons/zap';

interface Props {
	open: boolean;
	account: Account;
	onOpenChange?: (open: boolean) => void;
	onSuccess?: () => void;
}

let { open = $bindable(), account, onOpenChange, onSuccess }: Props = $props();

// Query provider settings from database
const providerSettingsQuery = rpc.connections.getProviderSettings().options();

// Wizard state
type Step = 'intro' | 'connect' | 'select-account' | 'confirm';
let currentStep = $state<Step>('intro');
let enrollmentId = $state<string | null>(null);
let accessToken = $state<string | null>(null);
let externalAccounts = $state<ExternalAccount[]>([]);
let selectedExternalAccount = $state<ExternalAccount | null>(null);
let connectError = $state<string | null>(null);
let isLoadingAccounts = $state(false);

// Mutations
const fetchAccountsMutation = rpc.connections.getTellerAccounts.options();
const createConnectionMutation = rpc.connections.createTellerConnection.options();

let isCreating = $derived(createConnectionMutation.isPending);

// Reset state when opening/closing
$effect(() => {
	if (!open) {
		setTimeout(() => {
			currentStep = 'intro';
			enrollmentId = null;
			accessToken = null;
			externalAccounts = [];
			selectedExternalAccount = null;
			connectError = null;
		}, 300);
	}
});

// Initialize Teller Connect when entering connect step
$effect(() => {
	if (currentStep === 'connect' && typeof window !== 'undefined') {
		initTellerConnect();
	}
});

function initTellerConnect() {
	// Check if Teller script is loaded
	if (!(window as any).TellerConnect) {
		// Load Teller Connect script
		const script = document.createElement('script');
		script.src = 'https://cdn.teller.io/connect/connect.js';
		script.async = true;
		script.onload = () => setupTellerConnect();
		script.onerror = () => {
			connectError = 'Failed to load Teller Connect. Please try again.';
		};
		document.head.appendChild(script);
	} else {
		setupTellerConnect();
	}
}

function setupTellerConnect() {
	const TellerConnect = (window as any).TellerConnect;
	if (!TellerConnect) {
		connectError = 'Teller Connect not available';
		return;
	}

	// Get application ID from DB settings first, then fall back to environment
	const dbSettings = providerSettingsQuery.data?.teller;
	const applicationId = dbSettings?.applicationId || import.meta.env.VITE_TELLER_APPLICATION_ID;
	const environment = dbSettings?.environment || import.meta.env.VITE_TELLER_ENVIRONMENT || 'sandbox';

	if (!applicationId) {
		connectError = 'Teller application ID not configured. Please configure it in Settings > Bank Connections.';
		return;
	}

	const tellerConnect = TellerConnect.setup({
		applicationId,
		environment,
		onSuccess: handleTellerSuccess,
		onExit: handleTellerExit,
		onFailure: handleTellerFailure
	});

	// Open Teller Connect
	tellerConnect.open();
}

async function handleTellerSuccess(enrollment: { accessToken: string; enrollment: { id: string; institution: { name: string } } }) {
	accessToken = enrollment.accessToken;
	enrollmentId = enrollment.enrollment.id;

	// Fetch accounts from Teller
	isLoadingAccounts = true;
	try {
		const accounts = await fetchAccountsMutation.mutateAsync({
			accessToken: enrollment.accessToken,
			enrollmentId: enrollment.enrollment.id
		});

		externalAccounts = accounts;
		currentStep = 'select-account';
	} catch (error) {
		connectError = error instanceof Error ? error.message : 'Failed to fetch accounts';
	} finally {
		isLoadingAccounts = false;
	}
}

function handleTellerExit() {
	// User closed Teller Connect without completing
	currentStep = 'intro';
}

function handleTellerFailure(error: { message: string }) {
	connectError = error.message || 'Failed to connect with Teller';
	currentStep = 'intro';
}

function goBack() {
	if (currentStep === 'connect') {
		currentStep = 'intro';
	} else if (currentStep === 'select-account') {
		currentStep = 'intro';
	} else if (currentStep === 'confirm') {
		currentStep = 'select-account';
	}
}

function selectAccount(ext: ExternalAccount) {
	selectedExternalAccount = ext;
	currentStep = 'confirm';
}

async function handleCreate() {
	if (!selectedExternalAccount || !accessToken || !enrollmentId) return;

	try {
		await createConnectionMutation.mutateAsync({
			accountId: account.id,
			accessToken,
			enrollmentId,
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
			<h2 class="text-lg font-semibold">Connect with Teller</h2>
			<p class="text-muted-foreground text-sm">
				{#if currentStep === 'intro'}
					Connect your bank account securely
				{:else if currentStep === 'connect'}
					Authenticating with your bank...
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
			{#if currentStep === 'intro'}
				<!-- Step 1: Introduction -->
				<div class="space-y-4">
					<div class="bg-muted/50 rounded-lg border p-4">
						<h3 class="mb-3 font-medium">About Teller</h3>
						<ul class="text-muted-foreground space-y-2 text-sm">
							<li class="flex items-start gap-2">
								<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
								<span>Connect directly to your bank using official APIs</span>
							</li>
							<li class="flex items-start gap-2">
								<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
								<span>7,000+ supported financial institutions</span>
							</li>
							<li class="flex items-start gap-2">
								<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
								<span>Free for personal use (100 connections)</span>
							</li>
							<li class="flex items-start gap-2">
								<CheckCircle class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
								<span>Real-time transaction updates</span>
							</li>
						</ul>
					</div>

					<div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
						<div class="flex gap-3">
							<Zap class="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
							<div class="text-sm">
								<p class="font-medium text-blue-900 dark:text-blue-100">Secure Connection</p>
								<p class="text-blue-700 dark:text-blue-300">
									You'll be redirected to Teller's secure login. Your bank credentials are never
									shared with this app.
								</p>
							</div>
						</div>
					</div>

					{#if connectError}
						<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
							<div class="flex gap-3">
								<AlertCircle class="text-destructive h-5 w-5 shrink-0" />
								<p class="text-destructive text-sm">{connectError}</p>
							</div>
						</div>
					{/if}
				</div>

			{:else if currentStep === 'connect'}
				<!-- Step 2: Connecting -->
				<div class="flex flex-col items-center justify-center gap-4 py-12 text-center">
					{#if isLoadingAccounts}
						<RefreshCw class="text-primary h-12 w-12 animate-spin" />
						<div>
							<p class="font-medium">Loading your accounts...</p>
							<p class="text-muted-foreground text-sm">This may take a moment.</p>
						</div>
					{:else}
						<Building2 class="text-muted-foreground h-12 w-12" />
						<div>
							<p class="font-medium">Teller Connect is opening...</p>
							<p class="text-muted-foreground text-sm">Complete the login in the popup window.</p>
						</div>
					{/if}
				</div>

			{:else if currentStep === 'select-account'}
				<!-- Step 3: Select Account -->
				<div class="space-y-4">
					{#if externalAccounts.length === 0}
						<div class="text-muted-foreground py-8 text-center">
							<Building2 class="mx-auto mb-3 h-12 w-12 opacity-50" />
							<p>No accounts found. Please try connecting again.</p>
						</div>
					{:else}
						<p class="text-muted-foreground text-sm">
							Select the external account to link with <strong class="text-foreground"
								>{account.name}</strong
							>:
						</p>
						<div class="space-y-2">
							{#each externalAccounts as ext}
								<button
									type="button"
									class="hover:border-primary hover:bg-accent w-full rounded-lg border p-4 text-left transition-colors"
									onclick={() => selectAccount(ext)}>
									<div class="flex items-start justify-between gap-3">
										<div class="flex items-start gap-3">
											<div
												class="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
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
								<Badge variant="secondary">Teller</Badge>
							</div>
						</div>
					</div>

					{#if createConnectionMutation.error}
						<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
							<p class="text-destructive text-sm">{createConnectionMutation.error.message}</p>
						</div>
					{/if}

					<div
						class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
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
			{#if currentStep === 'intro'}
				<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button onclick={() => (currentStep = 'connect')}>
					Connect Bank
					<ArrowRight class="ml-2 h-4 w-4" />
				</Button>
			{:else if currentStep === 'connect'}
				<Button variant="outline" onclick={goBack}>
					<ArrowLeft class="mr-2 h-4 w-4" />
					Cancel
				</Button>
				<div></div>
			{:else if currentStep === 'select-account'}
				<Button variant="outline" onclick={goBack}>
					<ArrowLeft class="mr-2 h-4 w-4" />
					Start Over
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
