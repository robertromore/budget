<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { rpc } from '$lib/query';
	import Crown from '@lucide/svelte/icons/crown';
	import Loader from '@lucide/svelte/icons/loader';
	import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
	import Shield from '@lucide/svelte/icons/shield';
	import User from '@lucide/svelte/icons/user';
	import UserMinus from '@lucide/svelte/icons/user-minus';

	// Fetch members list - options() already returns a query
	const membersQuery = rpc.workspaceMembers.listWorkspaceMembers().options();
	const myMembershipQuery = rpc.workspaceMembers.getMyMembership().options();

	// Use reactive mutations
	const updateRoleMutation = rpc.workspaceMembers.updateMemberRole.options();
	const removeMemberMutation = rpc.workspaceMembers.removeMember.options();

	const members = $derived(membersQuery.data ?? []);
	const myMembership = $derived(myMembershipQuery.data);
	const isLoading = $derived(membersQuery.isPending);
	const canManageMembers = $derived(
		myMembership?.role === 'owner' || myMembership?.role === 'admin'
	);

	let memberToRemove = $state<{ id: number; name: string } | null>(null);
	const isRemoving = $derived(removeMemberMutation.isPending);

	function getRoleIcon(role: string) {
		switch (role) {
			case 'owner':
				return Crown;
			case 'admin':
				return Shield;
			default:
				return User;
		}
	}

	function getRoleBadgeVariant(role: string) {
		switch (role) {
			case 'owner':
				return 'default';
			case 'admin':
				return 'secondary';
			case 'editor':
				return 'outline';
			default:
				return 'outline';
		}
	}

	async function handleRoleChange(userId: string, newRole: 'admin' | 'editor' | 'viewer') {
		await updateRoleMutation.mutateAsync({ userId, role: newRole });
	}

	async function handleRemoveMember() {
		if (!memberToRemove) return;

		try {
			await removeMemberMutation.mutateAsync({ userId: memberToRemove.id });
			memberToRemove = null;
		} catch {
			// Error handled by mutation
		}
	}
</script>

<svelte:head>
	<title>Members - Workspace Settings</title>
</svelte:head>

<Card.Root>
	<Card.Header>
		<Card.Title>Members</Card.Title>
		<Card.Description>People who have access to this workspace</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if isLoading}
			<div class="flex items-center justify-center py-8">
				<Loader class="text-muted-foreground h-6 w-6 animate-spin" />
			</div>
		{:else if members.length === 0}
			<p class="text-muted-foreground text-center py-8 text-sm">No members found</p>
		{:else}
			<div class="space-y-4">
				{#each members as member}
					{@const RoleIcon = getRoleIcon(member.role)}
					{@const isOwner = member.role === 'owner'}
					{@const isMe = member.userId === myMembership?.userId}

					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
								{#if member.user.image}
									<img
										src={member.user.image}
										alt={member.user.displayName}
										class="h-10 w-10 rounded-full"
									/>
								{:else}
									<User class="h-5 w-5" />
								{/if}
							</div>
							<div>
								<p class="font-medium">
									{member.user.displayName}
									{#if isMe}
										<span class="text-muted-foreground text-sm">(you)</span>
									{/if}
								</p>
								<p class="text-muted-foreground text-sm">{member.user.email}</p>
							</div>
						</div>

						<div class="flex items-center gap-2">
							<Badge variant={getRoleBadgeVariant(member.role)}>
								<RoleIcon class="mr-1 h-3 w-3" />
								{member.role}
							</Badge>

							{#if canManageMembers && !isOwner && !isMe}
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										<Button variant="ghost" size="icon">
											<MoreHorizontal class="h-4 w-4" />
										</Button>
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end">
										<DropdownMenu.Group>
											<DropdownMenu.GroupHeading>Change Role</DropdownMenu.GroupHeading>
											<DropdownMenu.Item
												disabled={member.role === 'admin'}
												onclick={() => handleRoleChange(member.userId, 'admin')}
											>
												<Shield class="mr-2 h-4 w-4" />
												Admin
											</DropdownMenu.Item>
											<DropdownMenu.Item
												disabled={member.role === 'editor'}
												onclick={() => handleRoleChange(member.userId, 'editor')}
											>
												<User class="mr-2 h-4 w-4" />
												Editor
											</DropdownMenu.Item>
											<DropdownMenu.Item
												disabled={member.role === 'viewer'}
												onclick={() => handleRoleChange(member.userId, 'viewer')}
											>
												<User class="mr-2 h-4 w-4" />
												Viewer
											</DropdownMenu.Item>
										</DropdownMenu.Group>
										<DropdownMenu.Separator />
										<DropdownMenu.Item
											class="text-destructive"
											onclick={() => {
												memberToRemove = {
													id: member.userId,
													name: member.user.displayName
												};
											}}
										>
											<UserMinus class="mr-2 h-4 w-4" />
											Remove
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>

<!-- Remove Member Dialog -->
<AlertDialog.Root open={!!memberToRemove} onOpenChange={(open) => !open && (memberToRemove = null)}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Remove member?</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to remove <strong>{memberToRemove?.name}</strong> from this workspace?
				They will lose access to all workspace data.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={isRemoving}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
				disabled={isRemoving}
				onclick={handleRemoveMember}
			>
				{#if isRemoving}
					<Loader class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Remove
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
