<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { useSession } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { rpc } from '$lib/query';
	import { createMutation } from '@tanstack/svelte-query';
	import Building from '@lucide/svelte/icons/building';
	import Check from '@lucide/svelte/icons/check';
	import Loader from '@lucide/svelte/icons/loader';
	import User from '@lucide/svelte/icons/user';
	import X from '@lucide/svelte/icons/x';

	const token = $derived(page.params.token);
	const session = useSession();

	// Fetch invitation details - wrap in $derived for reactivity
	const invitationQuery = $derived(
		rpc.workspaceInvitations.getInvitationByToken.options({ token })
	);

	// Use reactive mutations
	const acceptMutation = rpc.workspaceInvitations.acceptInvitation.options();
	const declineMutation = rpc.workspaceInvitations.declineInvitation.options();

	let error = $state<string | null>(null);

	const invitation = $derived(invitationQuery?.data);
	const isLoading = $derived(invitationQuery?.isPending ?? true);
	const isError = $derived(invitationQuery?.isError ?? false);
	const isLoggedIn = $derived(!!session.data);
	const isAccepting = $derived(acceptMutation.isPending);
	const isDeclining = $derived(declineMutation.isPending);

	function getRoleBadgeVariant(role: string) {
		switch (role) {
			case 'admin':
				return 'default';
			case 'editor':
				return 'secondary';
			case 'viewer':
				return 'outline';
			default:
				return 'outline';
		}
	}

	async function handleAccept() {
		if (!isLoggedIn) {
			// Redirect to login with return URL
			goto(`/login?redirect=/invite/${token}`);
			return;
		}

		error = null;

		try {
			const result = await acceptMutation.mutateAsync({ token });
			if (result.success) {
				goto('/');
			}
		} catch (err) {
			if (err instanceof Error) {
				error = err.message;
			} else {
				error = 'Failed to accept invitation';
			}
		}
	}

	async function handleDecline() {
		error = null;

		try {
			await declineMutation.mutateAsync({ token });
			goto('/');
		} catch (err) {
			if (err instanceof Error) {
				error = err.message;
			} else {
				error = 'Failed to decline invitation';
			}
		}
	}
</script>

<svelte:head>
	<title>Workspace Invitation</title>
</svelte:head>

<div class="bg-background flex min-h-screen items-center justify-center p-4">
	<div class="w-full max-w-md">
		{#if isLoading}
			<Card.Root>
				<Card.Content class="flex items-center justify-center py-12">
					<Loader class="text-muted-foreground h-8 w-8 animate-spin" />
				</Card.Content>
			</Card.Root>
		{:else if isError || !invitation}
			<Card.Root>
				<Card.Header class="text-center">
					<div class="bg-destructive/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
						<X class="text-destructive h-6 w-6" />
					</div>
					<Card.Title class="text-2xl">Invalid Invitation</Card.Title>
					<Card.Description>
						This invitation link is invalid, has expired, or has already been used.
					</Card.Description>
				</Card.Header>
				<Card.Footer class="justify-center">
					<Button href="/">Go to Home</Button>
				</Card.Footer>
			</Card.Root>
		{:else if invitation.status !== 'pending'}
			<Card.Root>
				<Card.Header class="text-center">
					<div class="bg-muted mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
						<Check class="text-muted-foreground h-6 w-6" />
					</div>
					<Card.Title class="text-2xl">
						{#if invitation.status === 'accepted'}
							Already Accepted
						{:else if invitation.status === 'declined'}
							Already Declined
						{:else}
							Invitation {invitation.status}
						{/if}
					</Card.Title>
					<Card.Description>
						This invitation has already been {invitation.status}.
					</Card.Description>
				</Card.Header>
				<Card.Footer class="justify-center">
					<Button href="/">Go to Home</Button>
				</Card.Footer>
			</Card.Root>
		{:else}
			<Card.Root>
				<Card.Header class="text-center">
					<div class="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
						<Building class="text-primary h-6 w-6" />
					</div>
					<Card.Title class="text-2xl">You're invited!</Card.Title>
					<Card.Description>
						You've been invited to join a workspace
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-6">
					{#if error}
						<div class="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
							{error}
						</div>
					{/if}

					<!-- Workspace Info -->
					<div class="bg-muted/50 rounded-lg p-4">
						<div class="space-y-3">
							<div>
								<p class="text-muted-foreground text-xs font-medium uppercase tracking-wider">
									Workspace
								</p>
								<p class="text-lg font-semibold">
									{invitation.workspace.displayName || invitation.workspace.slug || 'Unnamed Workspace'}
								</p>
							</div>

							<div class="flex items-center gap-2">
								<p class="text-muted-foreground text-xs font-medium uppercase tracking-wider">
									Role
								</p>
								<Badge variant={getRoleBadgeVariant(invitation.role)}>
									{invitation.role}
								</Badge>
							</div>

							<div class="flex items-center gap-2">
								<User class="text-muted-foreground h-4 w-4" />
								<p class="text-sm">
									Invited by <span class="font-medium">{invitation.inviter.displayName}</span>
								</p>
							</div>
						</div>
					</div>

					<!-- Personal Message -->
					{#if invitation.message}
						<div class="border-l-primary/50 border-l-4 pl-4">
							<p class="text-muted-foreground text-sm italic">"{invitation.message}"</p>
						</div>
					{/if}

					<!-- Login Prompt -->
					{#if !isLoggedIn}
						<div class="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 rounded-md p-3 text-sm">
							You need to sign in to accept this invitation. The invitation was sent to{' '}
							<span class="font-medium">{invitation.email}</span>.
						</div>
					{/if}

					<!-- Actions -->
					<div class="flex gap-3">
						<Button
							variant="outline"
							class="flex-1"
							disabled={isDeclining || isAccepting}
							onclick={handleDecline}
						>
							{#if isDeclining}
								<Loader class="mr-2 h-4 w-4 animate-spin" />
								Declining...
							{:else}
								Decline
							{/if}
						</Button>
						<Button class="flex-1" disabled={isAccepting || isDeclining} onclick={handleAccept}>
							{#if isAccepting}
								<Loader class="mr-2 h-4 w-4 animate-spin" />
								Accepting...
							{:else if !isLoggedIn}
								Sign in to accept
							{:else}
								Accept invitation
							{/if}
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>
