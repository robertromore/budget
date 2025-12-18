<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { deleteAllData } from '$lib/query/settings';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

	let dialogOpen = $state(false);
	let isDeleting = $state(false);

	const deleteAllDataMutation = deleteAllData.options();

	async function handleDeleteAllData() {
		dialogOpen = false;
		isDeleting = true;
		try {
			await deleteAllDataMutation.mutateAsync();
			// Hard reload to clear all in-memory state (context stores, query cache, etc.)
			window.location.href = '/';
		} catch {
			isDeleting = false;
		}
	}
</script>

<svelte:head>
	<title>Advanced - Settings</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold">Advanced</h2>
		<p class="text-muted-foreground text-sm">Advanced settings and data management</p>
	</div>

	<!-- Danger Zone -->
	<Card.Root class="border-destructive/50">
		<Card.Header>
			<Card.Title class="text-destructive flex items-center gap-2">
				<TriangleAlert class="h-5 w-5" />
				Danger Zone
			</Card.Title>
			<Card.Description>Irreversible and destructive actions</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex items-center justify-between gap-4">
				<div class="space-y-1">
					<p class="font-medium">Delete all data</p>
					<p class="text-muted-foreground text-sm">
						Permanently delete all your data from this application. This action cannot be undone.
					</p>
				</div>
				<AlertDialog.Root bind:open={dialogOpen}>
					<AlertDialog.Trigger>
						{#snippet child({ props })}
							<Button variant="destructive" {...props} disabled={isDeleting}>
								{#if isDeleting}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									Deleting...
								{:else}
									Delete All Data
								{/if}
							</Button>
						{/snippet}
					</AlertDialog.Trigger>
					<AlertDialog.Content>
						<AlertDialog.Header>
							<AlertDialog.Title class="flex items-center gap-2">
								<TriangleAlert class="text-destructive h-5 w-5" />
								Are you absolutely sure?
							</AlertDialog.Title>
							<AlertDialog.Description class="space-y-3">
								<p>
									This action <strong>cannot be undone</strong>. This will permanently delete all your
									data including:
								</p>
								<ul class="text-muted-foreground ml-4 list-disc space-y-1 text-sm">
									<li>All accounts and transactions</li>
									<li>All budgets and schedules</li>
									<li>All categories and payees</li>
									<li>All views and import profiles</li>
									<li>All recommendations and detected patterns</li>
								</ul>
								<p class="text-destructive font-medium">
									There is no way to recover this data after deletion.
								</p>
							</AlertDialog.Description>
						</AlertDialog.Header>
						<AlertDialog.Footer>
							<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
							<AlertDialog.Action
								onclick={handleDeleteAllData}
								class={buttonVariants({ variant: 'destructive' })}>
								Yes, delete everything
							</AlertDialog.Action>
						</AlertDialog.Footer>
					</AlertDialog.Content>
				</AlertDialog.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>
