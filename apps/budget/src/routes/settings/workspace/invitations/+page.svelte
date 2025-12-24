<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { rpc } from '$lib/query';
	import Clock from '@lucide/svelte/icons/clock';
	import Loader from '@lucide/svelte/icons/loader';
	import Mail from '@lucide/svelte/icons/mail';
	import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
	import Plus from '@lucide/svelte/icons/plus';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

	// Fetch invitations list - options() already returns a query
	const invitationsQuery = rpc.workspaceInvitations.listWorkspaceInvitations().options();
	const myMembershipQuery = rpc.workspaceMembers.getMyMembership().options();

	// Use reactive mutations
	const createMutation = rpc.workspaceInvitations.createInvitation.options();
	const revokeMutation = rpc.workspaceInvitations.revokeInvitation.options();
	const resendMutation = rpc.workspaceInvitations.resendInvitation.options();

	const invitations = $derived(invitationsQuery.data ?? []);
	const myMembership = $derived(myMembershipQuery.data);
	const isLoading = $derived(invitationsQuery.isPending);
	const canManageInvitations = $derived(
		myMembership?.role === 'owner' || myMembership?.role === 'admin'
	);

	// Dialog state
	let isDialogOpen = $state(false);
	let inviteEmail = $state('');
	let inviteRole = $state<'admin' | 'editor' | 'viewer'>('editor');
	let inviteMessage = $state('');
	const isCreating = $derived(createMutation.isPending);

	const roleOptions = [
		{ value: 'admin', label: 'Admin - Can manage members and settings' },
		{ value: 'editor', label: 'Editor - Can create and edit data' },
		{ value: 'viewer', label: 'Viewer - Read-only access' }
	];

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function isExpired(dateStr: string) {
		return new Date(dateStr) < new Date();
	}

	async function handleCreateInvitation(e: Event) {
		e.preventDefault();

		try {
			await createMutation.mutateAsync({
				email: inviteEmail,
				role: inviteRole,
				message: inviteMessage || undefined
			});
			isDialogOpen = false;
			inviteEmail = '';
			inviteRole = 'editor';
			inviteMessage = '';
		} catch {
			// Error is handled by mutation
		}
	}

	async function handleRevoke(invitationId: number) {
		await revokeMutation.mutateAsync({ invitationId });
	}

	async function handleResend(invitationId: number) {
		await resendMutation.mutateAsync({ invitationId });
	}
</script>

<svelte:head>
	<title>Invitations - Workspace Settings</title>
</svelte:head>

<Card.Root>
	<Card.Header class="flex-row items-center justify-between space-y-0">
		<div>
			<Card.Title>Pending Invitations</Card.Title>
			<Card.Description>Manage invitations sent to new members</Card.Description>
		</div>
		{#if canManageInvitations}
			<Button onclick={() => (isDialogOpen = true)}>
				<Plus class="mr-2 h-4 w-4" />
				Invite
			</Button>
		{/if}
	</Card.Header>
	<Card.Content>
		{#if isLoading}
			<div class="flex items-center justify-center py-8">
				<Loader class="text-muted-foreground h-6 w-6 animate-spin" />
			</div>
		{:else if invitations.length === 0}
			<div class="text-center py-8">
				<Mail class="text-muted-foreground mx-auto mb-3 h-10 w-10" />
				<p class="text-muted-foreground text-sm">No pending invitations</p>
				{#if canManageInvitations}
					<Button variant="link" onclick={() => (isDialogOpen = true)} class="mt-2">
						Invite someone to your workspace
					</Button>
				{/if}
			</div>
		{:else}
			<div class="space-y-4">
				{#each invitations as invitation}
					{@const expired = isExpired(invitation.expiresAt)}

					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
								<Mail class="h-5 w-5" />
							</div>
							<div>
								<p class="font-medium">{invitation.email}</p>
								<div class="text-muted-foreground flex items-center gap-2 text-sm">
									<Badge variant="outline">{invitation.role}</Badge>
									<span class="flex items-center gap-1">
										<Clock class="h-3 w-3" />
										{#if expired}
											<span class="text-destructive">Expired</span>
										{:else}
											Expires {formatDate(invitation.expiresAt)}
										{/if}
									</span>
								</div>
							</div>
						</div>

						{#if canManageInvitations}
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									<Button variant="ghost" size="icon">
										<MoreHorizontal class="h-4 w-4" />
									</Button>
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									<DropdownMenu.Item onclick={() => handleResend(invitation.id)}>
										<RefreshCw class="mr-2 h-4 w-4" />
										Resend invitation
									</DropdownMenu.Item>
									<DropdownMenu.Separator />
									<DropdownMenu.Item
										class="text-destructive"
										onclick={() => handleRevoke(invitation.id)}
									>
										<Trash2 class="mr-2 h-4 w-4" />
										Revoke invitation
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>

<!-- Invite Dialog -->
<Dialog.Root bind:open={isDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Invite to workspace</Dialog.Title>
			<Dialog.Description>
				Send an invitation to join your workspace. They will receive an email with a link to join.
			</Dialog.Description>
		</Dialog.Header>
		<form onsubmit={handleCreateInvitation} class="space-y-4">
			<div class="space-y-2">
				<Label for="email">Email address</Label>
				<Input
					id="email"
					type="email"
					placeholder="name@example.com"
					bind:value={inviteEmail}
					required
					disabled={isCreating}
				/>
			</div>

			<div class="space-y-2">
				<Label for="role">Role</Label>
				<Select.Root type="single" bind:value={inviteRole}>
					<Select.Trigger id="role" class="w-full">
						{roleOptions.find((r) => r.value === inviteRole)?.label.split(' - ')[0] || 'Select role'}
					</Select.Trigger>
					<Select.Content>
						{#each roleOptions as role}
							<Select.Item value={role.value}>
								<div>
									<p class="font-medium">{role.label.split(' - ')[0]}</p>
									<p class="text-muted-foreground text-xs">{role.label.split(' - ')[1]}</p>
								</div>
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-2">
				<Label for="message">Personal message (optional)</Label>
				<Textarea
					id="message"
					placeholder="Add a personal note to your invitation..."
					bind:value={inviteMessage}
					disabled={isCreating}
					rows={3}
				/>
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={() => (isDialogOpen = false)} disabled={isCreating}>
					Cancel
				</Button>
				<Button type="submit" disabled={isCreating || !inviteEmail}>
					{#if isCreating}
						<Loader class="mr-2 h-4 w-4 animate-spin" />
						Sending...
					{:else}
						Send invitation
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
