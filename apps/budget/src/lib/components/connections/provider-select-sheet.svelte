<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import { ResponsiveSheet } from '$lib/components/ui/responsive-sheet';
import { rpc } from '$lib/query';
import type { Account } from '$lib/schema';
import Link from '@lucide/svelte/icons/link';
import Building2 from '@lucide/svelte/icons/building-2';
import Zap from '@lucide/svelte/icons/zap';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import AlertCircle from '@lucide/svelte/icons/alert-circle';

interface Props {
	open: boolean;
	account: Account;
	onOpenChange?: (open: boolean) => void;
	onSelectProvider?: (provider: 'simplefin' | 'teller') => void;
}

let { open = $bindable(), account, onOpenChange, onSelectProvider }: Props = $props();

// Query provider settings to check if Teller is enabled/configured
const providerSettingsQuery = rpc.connections.getProviderSettings().options();

// Check if Teller is available (either via env or DB settings)
const tellerAvailable = $derived(() => {
	const dbSettings = providerSettingsQuery.data?.teller;
	const envApplicationId = import.meta.env.VITE_TELLER_APPLICATION_ID;
	return (dbSettings?.enabled && dbSettings.applicationId) || envApplicationId;
});

function handleSelect(provider: 'simplefin' | 'teller') {
	onSelectProvider?.(provider);
	open = false;
}
</script>

<ResponsiveSheet
	bind:open
	{onOpenChange}
	side="right"
	defaultWidth={500}
	minWidth={400}
	maxWidth={600}>
	{#snippet header()}
		<div class="flex flex-col gap-1">
			<h2 class="text-lg font-semibold">Connect Bank Account</h2>
			<p class="text-muted-foreground text-sm">
				Choose how you'd like to connect <strong class="text-foreground">{account.name}</strong>
			</p>
		</div>
	{/snippet}

	{#snippet content()}
		<div class="flex flex-col gap-4">
			<!-- SimpleFIN Option -->
			<button
				type="button"
				class="hover:border-primary group rounded-lg border p-5 text-left transition-all hover:shadow-md"
				onclick={() => handleSelect('simplefin')}>
				<div class="flex items-start gap-4">
					<div class="bg-primary/10 group-hover:bg-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors">
						<Building2 class="text-primary h-6 w-6" />
					</div>
					<div class="flex-1">
						<div class="mb-1 flex items-center gap-2">
							<h3 class="font-semibold">SimpleFIN</h3>
							<Badge variant="default" class="text-xs">Recommended</Badge>
						</div>
						<p class="text-muted-foreground mb-3 text-sm">
							Connect via SimpleFIN Bridge for broad bank coverage and reliable syncing.
						</p>
						<div class="flex flex-wrap gap-3 text-xs">
							<span class="text-muted-foreground flex items-center gap-1">
								<DollarSign class="h-3 w-3" />
								$15/year
							</span>
							<span class="text-muted-foreground flex items-center gap-1">
								<Building2 class="h-3 w-3" />
								16,000+ institutions
							</span>
						</div>
					</div>
				</div>
			</button>

			<!-- Teller Option -->
			<button
				type="button"
				class="group rounded-lg border p-5 text-left transition-all {tellerAvailable() ? 'hover:border-primary hover:shadow-md' : 'opacity-60 cursor-not-allowed'}"
				disabled={!tellerAvailable()}
				onclick={() => handleSelect('teller')}>
				<div class="flex items-start gap-4">
					<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors {tellerAvailable() ? 'bg-blue-500/10 group-hover:bg-blue-500/20' : 'bg-muted'}">
						<Zap class="h-6 w-6 {tellerAvailable() ? 'text-blue-500' : 'text-muted-foreground'}" />
					</div>
					<div class="flex-1">
						<div class="mb-1 flex items-center gap-2">
							<h3 class="font-semibold">Teller</h3>
							{#if tellerAvailable()}
								<Badge variant="secondary" class="text-xs">Free</Badge>
							{:else}
								<Badge variant="outline" class="text-xs">Not Configured</Badge>
							{/if}
						</div>
						<p class="text-muted-foreground mb-3 text-sm">
							Connect directly to official bank APIs for real-time transaction updates.
						</p>
						{#if !tellerAvailable()}
							<div class="mb-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
								<AlertCircle class="h-3 w-3" />
								<span>Configure Teller in Settings to enable</span>
							</div>
						{/if}
						<div class="flex flex-wrap gap-3 text-xs">
							<span class="text-muted-foreground flex items-center gap-1">
								<DollarSign class="h-3 w-3" />
								Free (100 connections)
							</span>
							<span class="text-muted-foreground flex items-center gap-1">
								<Building2 class="h-3 w-3" />
								7,000+ institutions
							</span>
						</div>
					</div>
				</div>
			</button>

			<!-- Comparison Info -->
			<div class="bg-muted/50 mt-2 rounded-lg border p-4">
				<h4 class="mb-3 text-sm font-medium">Which should I choose?</h4>
				<div class="text-muted-foreground space-y-2 text-sm">
					<p>
						<strong class="text-foreground">SimpleFIN</strong> is best for most users. It has the
						widest bank coverage and uses MX as the backend, ensuring reliable data access.
					</p>
					<p>
						<strong class="text-foreground">Teller</strong> is a good free alternative if your
						bank is supported. It connects directly to bank APIs for real-time updates.
					</p>
				</div>
			</div>
		</div>
	{/snippet}

	{#snippet footer()}
		<div class="flex justify-end">
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
		</div>
	{/snippet}
</ResponsiveSheet>
