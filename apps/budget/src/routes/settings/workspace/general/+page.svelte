<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Select from '$lib/components/ui/select';
	import { rpc } from '$lib/query';
	import Crown from '@lucide/svelte/icons/crown';
	import Loader from '@lucide/svelte/icons/loader';
	import LogOut from '@lucide/svelte/icons/log-out';
	import User from '@lucide/svelte/icons/user';

	// Fetch data - options() already returns a query
	const membersQuery = rpc.workspaceMembers.listWorkspaceMembers().options();
	const myMembershipQuery = rpc.workspaceMembers.getMyMembership().options();

	// Use reactive mutations
	const transferOwnershipMutation = rpc.workspaceMembers.transferOwnership.options();
	const leaveWorkspaceMutation = rpc.workspaceMembers.leaveWorkspace.options();

	const members = $derived(membersQuery.data ?? []);
	const myMembership = $derived(myMembershipQuery.data);
	const isOwner = $derived(myMembership?.role === 'owner');
	const otherMembers = $derived(members.filter((m) => m.userId !== myMembership?.userId));

	// Transfer ownership state
	let showTransferDialog = $state(false);
	let newOwnerId = $state<number | null>(null);
	const isTransferring = $derived(transferOwnershipMutation.isPending);

	// Leave workspace state
	let showLeaveDialog = $state(false);
	const isLeaving = $derived(leaveWorkspaceMutation.isPending);

	async function handleTransferOwnership() {
		if (!newOwnerId) return;

		try {
			await transferOwnershipMutation.mutateAsync({ newOwnerId });
			showTransferDialog = false;
			newOwnerId = null;
		} catch {
			// Error handled by mutation
		}
	}

	async function handleLeaveWorkspace() {
		try {
			await leaveWorkspaceMutation.mutateAsync(undefined);
			goto('/');
		} catch {
			// Error handled by mutation
		}
	}
</script>

<svelte:head>
	<title>General - Workspace Settings</title>
</svelte:head>

<div class="space-y-6">
	<!-- Transfer Ownership (Owner only) -->
	{#if isOwner}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Crown class="h-5 w-5" />
					Transfer Ownership
				</Card.Title>
				<Card.Description>
					Transfer ownership of this workspace to another member. You will become an admin.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if otherMembers.length === 0}
					<p class="text-muted-foreground text-sm">
						You need at least one other member to transfer ownership.
					</p>
				{:else}
					<Button variant="outline" onclick={() => (showTransferDialog = true)}>
						Transfer ownership
					</Button>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Leave Workspace -->
	<Card.Root class="border-destructive/20">
		<Card.Header>
			<Card.Title class="text-destructive flex items-center gap-2">
				<LogOut class="h-5 w-5" />
				Leave Workspace
			</Card.Title>
			<Card.Description>
				{#if isOwner}
					As the owner, you must transfer ownership before leaving the workspace.
				{:else}
					Leave this workspace. You will lose access to all workspace data.
				{/if}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<Button variant="destructive" disabled={isOwner} onclick={() => (showLeaveDialog = true)}>
				Leave workspace
			</Button>
		</Card.Content>
	</Card.Root>
</div>

<!-- Transfer Ownership Dialog -->
<AlertDialog.Root bind:open={showTransferDialog}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Transfer Ownership</AlertDialog.Title>
			<AlertDialog.Description>
				Select the member who will become the new owner of this workspace. You will be demoted to admin.
			</AlertDialog.Description>
		</AlertDialog.Header>

		<div class="py-4">
			<Select.Root
				type="single"
				onValueChange={(v) => (newOwnerId = v ? Number(v) : null)}
			>
				<Select.Trigger class="w-full">
					{#if newOwnerId}
						{@const selected = otherMembers.find((m) => m.userId === newOwnerId)}
						{selected?.user.displayName || 'Select member'}
					{:else}
						Select member
					{/if}
				</Select.Trigger>
				<Select.Content>
					{#each otherMembers as member}
						<Select.Item value={String(member.userId)}>
							<div class="flex items-center gap-2">
								<div class="bg-muted flex h-6 w-6 items-center justify-center rounded-full">
									{#if member.user.image}
										<img
											src={member.user.image}
											alt={member.user.displayName}
											class="h-6 w-6 rounded-full"
										/>
									{:else}
										<User class="h-3 w-3" />
									{/if}
								</div>
								<span>{member.user.displayName}</span>
							</div>
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={isTransferring}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				disabled={isTransferring || !newOwnerId}
				onclick={handleTransferOwnership}
			>
				{#if isTransferring}
					<Loader class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Transfer ownership
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- Leave Workspace Dialog -->
<AlertDialog.Root bind:open={showLeaveDialog}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Leave workspace?</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to leave this workspace? You will lose access to all workspace data
				and will need to be re-invited to rejoin.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={isLeaving}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
				disabled={isLeaving}
				onclick={handleLeaveWorkspace}
			>
				{#if isLeaving}
					<Loader class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Leave workspace
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
