<script lang="ts">
import { useQueryClient } from '@tanstack/svelte-query';
import { Button } from '$lib/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
import { Badge } from '$lib/components/ui/badge';
import { Separator } from '$lib/components/ui/separator';
import { rpc, connectionKeys } from '$lib/query';
import {
	ProviderSelectSheet,
	SimplefinSetupWizard,
	TellerSetupWizard
} from '$lib/components/connections';
import type { Account } from '$lib/schema';
import Link from '@lucide/svelte/icons/link';
import Unlink from '@lucide/svelte/icons/unlink';
import RefreshCw from '@lucide/svelte/icons/refresh-cw';
import CheckCircle from '@lucide/svelte/icons/check-circle';
import XCircle from '@lucide/svelte/icons/x-circle';
import Clock from '@lucide/svelte/icons/clock';
import AlertCircle from '@lucide/svelte/icons/alert-circle';
import { formatTimeAgo } from '$lib/utils/dates';

interface Props {
	account: Account;
}

let { account }: Props = $props();

const queryClient = useQueryClient();

// Fetch connection for this account (reactive to account.id changes)
const connectionQuery = $derived(rpc.connections.getConnectionForAccount(account.id).options());

// Mutations
const syncMutation = rpc.connections.syncConnection.options();
const disconnectMutation = rpc.connections.disconnectConnectionByAccount.options();

// Connection state
let connection = $derived(connectionQuery.data);
let isLoading = $derived(connectionQuery.isLoading);
let isSyncing = $derived(syncMutation.isPending);
let isDisconnecting = $derived(disconnectMutation.isPending);

// Sheet/wizard state
let showProviderSelect = $state(false);
let showSimplefinWizard = $state(false);
let showTellerWizard = $state(false);

// Status badge helpers
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
	switch (status) {
		case 'active':
			return 'default';
		case 'error':
			return 'destructive';
		case 'disconnected':
			return 'secondary';
		default:
			return 'outline';
	}
}

function getProviderName(provider: string): string {
	switch (provider) {
		case 'simplefin':
			return 'SimpleFIN';
		case 'teller':
			return 'Teller';
		default:
			return provider;
	}
}

// Handlers
async function handleSync() {
	if (!connection) return;
	await syncMutation.mutateAsync({ connectionId: connection.id });
	await queryClient.invalidateQueries({ queryKey: connectionKeys.forAccount(account.id) });
}

async function handleDisconnect() {
	if (!confirm('Are you sure you want to disconnect this bank account? You will need to reconnect to sync transactions.')) {
		return;
	}
	await disconnectMutation.mutateAsync(account.id);
	await queryClient.invalidateQueries({ queryKey: connectionKeys.forAccount(account.id) });
}

function handleProviderSelect(provider: 'simplefin' | 'teller') {
	if (provider === 'simplefin') {
		showSimplefinWizard = true;
	} else {
		showTellerWizard = true;
	}
}

async function handleConnectionSuccess() {
	await queryClient.invalidateQueries({ queryKey: connectionKeys.forAccount(account.id) });
}
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-lg font-semibold">Bank Connection</h2>
		<p class="text-muted-foreground text-sm">
			Connect your bank account to automatically import transactions.
		</p>
	</div>

	<Separator />

	{#if isLoading}
		<Card>
			<CardContent class="py-8">
				<div class="flex items-center justify-center gap-2 text-muted-foreground">
					<RefreshCw class="h-4 w-4 animate-spin" />
					<span>Loading connection status...</span>
				</div>
			</CardContent>
		</Card>
	{:else if connection}
		<!-- Connected State -->
		<Card>
			<CardHeader>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
							<Link class="h-5 w-5 text-primary" />
						</div>
						<div>
							<CardTitle class="text-base">{connection.institutionName}</CardTitle>
							<CardDescription>via {getProviderName(connection.provider)}</CardDescription>
						</div>
					</div>
					<Badge variant={getStatusVariant(connection.syncStatus)}>
						{#if connection.syncStatus === 'active'}
							<CheckCircle class="mr-1 h-3 w-3" />
						{:else if connection.syncStatus === 'error'}
							<XCircle class="mr-1 h-3 w-3" />
						{:else}
							<AlertCircle class="mr-1 h-3 w-3" />
						{/if}
						{connection.syncStatus}
					</Badge>
				</div>
			</CardHeader>
			<CardContent class="space-y-4">
				<!-- Last Sync Info -->
				<div class="flex items-center justify-between rounded-lg border p-3">
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<Clock class="h-4 w-4" />
						<span>Last synced:</span>
					</div>
					<span class="text-sm font-medium">
						{#if connection.lastSyncAt}
							{formatTimeAgo(new Date(connection.lastSyncAt))}
						{:else}
							Never
						{/if}
					</span>
				</div>

				<!-- Error Message -->
				{#if connection.syncStatus === 'error' && connection.syncError}
					<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
						<p class="text-sm text-destructive">{connection.syncError}</p>
					</div>
				{/if}

				<!-- Actions -->
				<div class="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onclick={handleSync}
						disabled={isSyncing}>
						<RefreshCw class="mr-2 h-4 w-4 {isSyncing ? 'animate-spin' : ''}" />
						{isSyncing ? 'Syncing...' : 'Sync Now'}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onclick={handleDisconnect}
						disabled={isDisconnecting}
						class="text-destructive hover:text-destructive">
						<Unlink class="mr-2 h-4 w-4" />
						{isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
					</Button>
				</div>
			</CardContent>
		</Card>
	{:else}
		<!-- Not Connected State -->
		<Card>
			<CardContent class="py-8">
				<div class="flex flex-col items-center justify-center gap-4 text-center">
					<div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
						<Link class="h-6 w-6 text-muted-foreground" />
					</div>
					<div>
						<h3 class="font-medium">No Bank Connection</h3>
						<p class="text-sm text-muted-foreground">
							Connect your bank account to automatically import transactions.
						</p>
					</div>
					<Button onclick={() => (showProviderSelect = true)}>
						<Link class="mr-2 h-4 w-4" />
						Connect Bank Account
					</Button>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Info Section -->
	<div class="rounded-lg border bg-muted/50 p-4">
		<h3 class="mb-2 text-sm font-medium">About Bank Connections</h3>
		<ul class="space-y-1 text-xs text-muted-foreground">
			<li>• Transactions are imported through your existing import pipeline</li>
			<li>• Duplicate transactions are automatically detected and skipped</li>
			<li>• Your credentials are encrypted and stored securely</li>
			<li>• You can disconnect at any time without losing imported data</li>
		</ul>
	</div>
</div>

<!-- Provider Selection Sheet -->
<ProviderSelectSheet
	bind:open={showProviderSelect}
	{account}
	onSelectProvider={handleProviderSelect}
/>

<!-- SimpleFIN Setup Wizard -->
<SimplefinSetupWizard
	bind:open={showSimplefinWizard}
	{account}
	onSuccess={handleConnectionSuccess}
/>

<!-- Teller Setup Wizard -->
<TellerSetupWizard
	bind:open={showTellerWizard}
	{account}
	onSuccess={handleConnectionSuccess}
/>
